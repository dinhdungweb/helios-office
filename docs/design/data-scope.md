# Thiết kế: Phạm vi dữ liệu theo quyền

Backlog: `CORE-15`, `AU-10`, `AU-12` · Phase 1 · Trạng thái: **Đã chốt 2026-10-20** (xem mục 11)

## 1. Vấn đề

Quyền hiện tại là danh sách key phẳng (`permission.payroll.view`, `employees.department.manage`…) gán cho nhóm quyền hoặc riêng từng tài khoản. `PermissionGuard` chỉ trả lời **"được làm hay không"**. Ai có `employees.department.manage` thì thấy **toàn bộ** nhân sự công ty.

1Office (và mọi HRM cho công ty 200 người) cần thêm câu trả lời **"được làm trên những bản ghi nào"**:

- Trưởng phòng Kinh doanh xem công, đơn từ của **phòng mình**.
- Giám đốc chi nhánh xem **chi nhánh mình** (gồm các phòng con).
- Nhân viên chỉ xem **của chính mình**.
- HR / Ban giám đốc xem **toàn công ty**.

Thiếu lớp này thì không làm được đơn từ (Phase 3), bảng công (Phase 2), lương (Phase 5) một cách an toàn.

## 2. Mục tiêu và ngoài phạm vi

Mục tiêu:

- Mỗi quyền đọc/ghi dữ liệu nhân sự mang thêm một **phạm vi**.
- Service lọc dữ liệu bằng một hàm dùng chung, không tự viết điều kiện riêng.
- Không thay đổi hành vi hiện tại khi vừa triển khai (quyền đang có giữ nguyên "toàn công ty").

Ngoài phạm vi: phân quyền theo từng trường (ẩn cột lương với một số người) — để Phase 5 (`PY-19`).

## 3. Các mức phạm vi

Thứ tự từ hẹp đến rộng:

| Mức | Ý nghĩa | Tập nhân sự được thấy |
|---|---|---|
| `self` | Cá nhân | Chỉ nhân sự gắn với tài khoản đang đăng nhập |
| `department` | Phòng ban | Nhân sự thuộc đúng phòng ban của mình |
| `department_tree` | Phòng ban và cấp dưới | Phòng của mình + mọi phòng con, cháu (theo `Department.parentId`) |
| `branch` | Đơn vị / chi nhánh | Toàn bộ cây con của phòng ban **tổ tiên gần nhất** có `permissionStructure = "branch"` (hoặc `"company"`) |
| `company` | Toàn công ty | Không lọc |

Ghi chú:

- `branch` tận dụng trường `Department.permissionStructure` đã có trong DB (giá trị `company` / `branch` / `department`) — đúng khái niệm "cấu trúc phân quyền" của 1Office.
- `system_admin` luôn là `company`.
- Tài khoản chưa gắn hồ sơ nhân sự: mọi mức trừ `company` cho ra tập rỗng.

## 4. Quyền nào có phạm vi

Thêm 2 cột vào `PermissionDefinition`:

```prisma
model PermissionDefinition {
  // ... các trường hiện có
  scopable     Boolean @default(false)   // quyền này có áp phạm vi không
  defaultScope String? // mức mặc định khi cấp mới: self | department | department_tree | branch | company
}
```

- **Có phạm vi:** quyền xem/quản lý dữ liệu theo người — nhân sự, hợp đồng, chấm công, đơn từ, lương, KPI, tài sản, báo cáo nhân sự.
- **Không phạm vi:** quyền cấu hình hệ thống (`system.*`, `menu.*`, `module.*`) — chỉ có/không.

## 5. Lưu phạm vi trên nhóm quyền và tài khoản

```prisma
model PermissionGroup {
  permissions      String[]         // giữ nguyên
  permissionScopes Json  @default("{}")  // { "permission.payroll.view": "department", ... }
}

model UserAccount {
  customPermissions      Json?    // giữ nguyên
  customPermissionScopes Json?    // cùng cấu trúc, cho quyền riêng
}
```

Quy tắc đọc:

1. Key có trong `permissions` nhưng không có trong `permissionScopes` → dùng `defaultScope` của định nghĩa, nếu không có thì `company`.
2. Một tài khoản có quyền từ nhiều nguồn (nhóm + quyền riêng) → **lấy phạm vi rộng nhất**.
3. Route yêu cầu "bất kỳ quyền nào trong danh sách" (`@RequireAnyPermission`) → phạm vi là **rộng nhất trong các quyền tài khoản thực sự có** trong danh sách đó.

Chọn cột JSON thay vì bảng riêng `PermissionGrant` vì: số nhóm quyền ít (dưới vài chục), luôn đọc cả nhóm một lần, và giữ tương thích với cột `permissions String[]` đang dùng ở mọi nơi.

## 6. Thực thi trong API

### 6.1 Dịch vụ dùng chung

```ts
// apps/api/src/common/data-scope/data-scope.service.ts
type ScopeLevel = "self" | "department" | "department_tree" | "branch" | "company";

type ResolvedScope =
  | { level: "company" }
  | { level: Exclude<ScopeLevel, "company">; employeeIds?: string[]; departmentIds: string[] };

class DataScopeService {
  // Phạm vi rộng nhất mà tài khoản có trong các key được truyền vào.
  resolve(user: AuthenticatedUser, permissionKeys: string[]): Promise<ResolvedScope>;

  // Điều kiện Prisma cho model Employee.
  employeeWhere(scope: ResolvedScope): Prisma.EmployeeWhereInput;

  // Cho model có quan hệ employee (AttendanceRecord, LeaveRequest, Contract, PayrollItem...).
  viaEmployee(scope: ResolvedScope): { employee: Prisma.EmployeeWhereInput } | {};

  // Kiểm tra 1 bản ghi; ngoài phạm vi → NotFoundException.
  assertEmployeeInScope(scope: ResolvedScope, employeeId: string): Promise<void>;
}
```

Cách dùng trong service:

```ts
async findAll(user: AuthenticatedUser, query: ListQuery) {
  const scope = await this.dataScope.resolve(user, ["employees.department.manage", "system.accounts.manage"]);
  return this.prisma.employee.findMany({ where: { ...this.dataScope.employeeWhere(scope), ...filters(query) } });
}
```

- `PermissionGuard` vẫn giữ vai trò cổng vào (có quyền hay không). `DataScopeService` lọc bên trong.
- Danh sách key truyền vào `resolve` trùng với key trong decorator của route. Một helper `@ScopeFrom()` có thể đọc lại metadata của `@Require...Permission` để không phải viết hai lần (quyết định khi làm).

### 6.2 Tính cây phòng ban

- Công ty ~200 người, vài chục phòng ban → nạp **toàn bộ** `Department(id, parentId, permissionStructure)` vào bộ nhớ, cache trong process.
- Xoá cache khi có mutation phòng ban (`DepartmentsService` gọi `dataScope.invalidate()`), thêm TTL 60 giây phòng khi có nhiều instance API.
- Chống vòng lặp cây (dữ liệu hỏng) bằng tập đã thăm.

### 6.3 Bản ghi đơn lẻ

`GET/PATCH /employees/:id` và tương tự: bản ghi ngoài phạm vi trả **404**, không trả 403, để không lộ việc bản ghi tồn tại (xem câu hỏi 3).

### 6.4 Quan hệ quản lý trực tiếp

Đơn từ (Phase 3) cần quản lý duyệt cho nhân viên dưới quyền dù khác phòng ban. Đề xuất: ngoài phạm vi theo phòng ban, người có cấp dưới (`Employee.managerId`, đệ quy) luôn thấy dữ liệu **của cấp dưới mình** cho các quyền có phạm vi (xem câu hỏi 1). Khi đó `ResolvedScope.employeeIds` = tập cấp dưới, gộp (OR) với điều kiện phòng ban.

## 7. Trả về cho giao diện

- `GET /auth/me` thêm `permissionScopes: Record<string, ScopeLevel>` (chỉ quyền có phạm vi).
- `AU-12` `GET /account-access/accounts/:id/effective-permissions` trả quyền + phạm vi + nguồn (nhóm / riêng).
- Ma trận phân quyền nhóm (`/admin/settings/accounts/groups`): ô "Xem" / "Quản lý" của quyền có phạm vi thêm dropdown chọn mức.

## 8. Chuyển đổi dữ liệu

Migration:

1. Thêm cột `scopable`, `defaultScope`, `permissionScopes`, `customPermissionScopes`.
2. Đánh dấu `scopable = true` cho các key dữ liệu nhân sự đã có (danh sách cụ thể chốt trong plan Phase 1).
3. Với mọi nhóm quyền hiện có, ghi rõ `"company"` cho các key scopable mà nhóm đang có → **không đổi hành vi** sau khi deploy.
4. Quyền cấp mới sau đó dùng `defaultScope` (đề xuất `department`).

## 9. Thứ tự triển khai

1. Migration + `DataScopeService` + test đơn vị (chưa áp vào route nào).
2. Áp vào `GET /employees`, `GET /employees/:id`, `PATCH /employees/:id` (cùng lúc với `HR-33` lọc/phân trang).
3. Áp vào `attendance`, `leave-requests`, `contracts`, `payroll-cycles` khi các module đó được làm ở Phase 2–5 — mỗi route mới phải dùng `DataScopeService`.
4. UI dropdown phạm vi trong ma trận nhóm quyền.
5. Script audit (`audit:features`) cảnh báo service đọc `employee`/`attendanceRecord`/… mà không gọi `dataScope` (kiểm tra tĩnh đơn giản).

## 10. Kiểm thử

Unit (`data-scope.service.spec.ts`), cây mẫu:

```
Công ty (company)
├── Chi nhánh HN (branch)
│   ├── Kinh doanh HN
│   │   └── Nhóm Online
│   └── Kế toán HN
└── Chi nhánh HCM (branch)
    └── Kinh doanh HCM
```

| Người | Phạm vi | Phải thấy | Không được thấy |
|---|---|---|---|
| NV Nhóm Online | self | chính mình | đồng nghiệp cùng nhóm |
| TP Kinh doanh HN | department | Kinh doanh HN | Nhóm Online |
| TP Kinh doanh HN | department_tree | Kinh doanh HN + Nhóm Online | Kế toán HN |
| GĐ Chi nhánh HN | branch | toàn chi nhánh HN | Kinh doanh HCM |
| Quản lý trực tiếp ở Kế toán HN có cấp dưới ở Nhóm Online | department + cấp dưới | Kế toán HN + cấp dưới đó | phần còn lại Nhóm Online |
| Tài khoản không gắn nhân sự | department | (rỗng) | mọi người |
| Có nhóm `department` + quyền riêng `company` | — | toàn công ty (rộng nhất thắng) | — |

E2E: thêm vào bộ `auth-guards.e2e-spec.ts` — `GET /employees` với tài khoản phạm vi `department` chỉ trả nhân sự phòng đó; `GET /employees/:id` ngoài phạm vi trả 404.

## 11. Quyết định đã chốt (2026-10-20)

1. **Quản lý trực tiếp tự động thấy dữ liệu cấp dưới** (đệ quy theo `managerId`, kể cả khác phòng ban), gộp với phạm vi theo phòng ban.
2. **Quyền đang có giữ phạm vi `company`** khi migrate (không đổi hành vi); quyền cấp mới mặc định `department`.
3. **Bản ghi ngoài phạm vi trả 404.**
4. **Mức `branch` dùng `Department.permissionStructure`** (`branch` / `company`) làm ranh giới; HR đánh dấu trong cài đặt sơ đồ tổ chức.
