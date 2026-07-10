# Progress Changelog

File này dùng để theo dõi tiến độ triển khai Helios Office: đã làm gì, đang ở trạng thái nào, còn phần nào cần làm tiếp.

## Quy ước cập nhật

- Mỗi mốc hoàn thành sẽ thêm một entry mới theo ngày.
- Ghi rõ phạm vi, file/module chính, trạng thái kiểm tra và việc tiếp theo.
- Những phần chưa hoàn tất phải ghi là `Chưa xong` hoặc `Tiếp theo` để tránh nhầm là đã chạy thật.

## 2026-07-10

### Admin Settings UI

Trạng thái: Đã push lên `origin/main`

- Commit: `cc2e04f feat: add admin settings management`
- Đã thêm khu vực quản trị kiểu 1Office cho tài khoản Admin.
- Đã có các trang:
  - `/admin/settings`
  - `/admin/settings/accounts`
  - `/admin/settings/accounts/device-auth`
  - `/admin/settings/accounts/groups`
  - `/admin/settings/accounts/permissions`
  - `/admin/settings/org-chart`
  - `/admin/settings/positions-titles`
  - `/admin/settings/intranet`
  - `/admin/settings/company-info`
  - `/admin/settings/smtp`
- Đã chỉnh nhiều lỗi UI theo phản hồi: tab, card, badge, alignment bảng tài khoản, matrix quyền, layout card admin settings.

Kiểm tra:

- `npm run typecheck`: Pass
- `npm run test`: Pass
- `npm run build`: Pass

### Account + HRM Database Foundation

Trạng thái: Đã triển khai và kiểm tra

- Thêm Prisma runtime dùng PostgreSQL adapter.
- Thêm migration đầu tiên tại `apps/api/prisma/migrations/20260710174000_init/migration.sql`.
- Thêm seed dữ liệu tại `apps/api/prisma/seed.ts`.
- Thêm scripts:
  - `npm run db:migrate`
  - `npm run db:seed`
- Chuyển các API sau từ mock data sang database:
  - Account summary/list/detail/groups/licenses/permissions
  - Employees/list/detail/departments/contracts/org chart
  - Attendance list/summary
  - Leave requests
  - Payroll cycles
- Thêm mutation tài khoản và nhóm quyền:
  - `POST /api/v1/account-access/accounts`
  - `PATCH /api/v1/account-access/accounts/:id`
  - `POST /api/v1/account-access/accounts/:id/activate`
  - `POST /api/v1/account-access/accounts/:id/close`
  - `POST /api/v1/account-access/groups`
  - `PATCH /api/v1/account-access/groups/:id`
- Thêm audit log tối thiểu cho mutation Account và Permission Group.
- Tạo `.env` local bị git ignore để máy hiện tại chạy được với Postgres local.

Kiểm tra:

- `npm run db:seed -w apps/api`: Pass
- `npm run typecheck`: Pass
- `npm run test`: Pass
- `npm run build`: Pass
- Runtime API build output đọc DB thật: Pass
  - Accounts: 5
  - Active accounts: 3
  - Employees: 3

Ghi chú môi trường:

- Docker CLI không có trong máy hiện tại.
- Postgres local hiện dùng credential trong `.env` local, không commit lên git.
- `.env.example` đã chỉnh về credential khớp `docker-compose`.

### Admin Login Thật

Trạng thái: Chưa xong

- DB đã có tài khoản admin seed, nhưng chưa đăng nhập thật được.
- Chưa có password/session/token thật.
- Chưa nối login frontend với Keycloak/JWT.
- API chưa có AuthGuard để verify bearer token.
- Route admin chưa chặn theo `adminRole`.

Tiếp theo:

1. Nối frontend trang Account với API DB thật.
2. Thêm AuthModule, JWT/Keycloak guard và current user context.
3. Map user đăng nhập về `UserAccount`.
4. Bảo vệ route admin theo `adminRole`.
5. Làm CRUD hồ sơ nhân sự, phòng ban, vị trí/chức vụ.
