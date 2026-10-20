# Phase 0 — Vá bảo mật & chuẩn hoá repo

Roadmap: [../roadmap.md](../roadmap.md#phase-0--vá-bảo-mật--chuẩn-hoá-repo) · Phạm vi: `npm run audit:features -- --phase 0` · Nhánh: `feat/phase-0`

## Mục tiêu

Không còn route API nào lộ dữ liệu khi chưa đăng nhập; repo có lint + CI để giữ chất lượng cho các phase sau.

## Hiện trạng khi bắt đầu (2026-10-20)

- 8 route không có guard: `GET /announcements`, `GET /approvals`, `POST /approvals/:id/decision`, `GET /leave-requests`, `GET /notifications/unread`, `GET /payroll-cycles`, `GET /payroll-cycles/workflow`, `GET /posts`.
- Token hết hạn / sai chữ ký làm API trả **500** thay vì 401 (lỗi của `jose` không được bắt trong `AuthService.verifyAuthorizationHeader`).
- Proxy web chỉ chặn `/`, `/user/*`, `/admin/*`.
- Không có helmet, rate limit, ESLint, CI. API chỉ có unit test, chưa có test e2e.

## Quyết định đã chốt

Quyền cho các route sắp gắn guard (đã duyệt 2026-10-19, bổ sung quyền tương đương để không làm mất widget dashboard):

| Route | Quyền |
|---|---|
| `GET /payroll-cycles`, `GET /payroll-cycles/workflow` | bất kỳ: `permission.payroll.view`, `permission.payroll.manage` |
| `GET /approvals` | bất kỳ: `permission.approvals.view`, `permission.approvals.manage` |
| `POST /approvals/:id/decision` | `permission.approvals.manage` |
| `GET /leave-requests` | bất kỳ: `permission.requests.view`, `permission.requests.manage`, `hr.dashboard.requests.view` |
| `GET /posts`, `GET /announcements`, `GET /notifications/unread` | chỉ cần đăng nhập |
| `POST /attendance/sync` | `@Public` — đã có `AttendanceSyncGuard` bằng token riêng của máy chấm công |

`system_admin` vẫn bỏ qua kiểm tra quyền như hiện tại.

## Task

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 1 | — | Viết plan này, cập nhật bảng trạng thái roadmap | — | ✅ |
| 2 | CORE-09 | `.gitattributes` (LF cho text, binary cho ảnh/font) + renormalize | `git status` không còn cảnh báo CRLF | ✅ |
| 3 | CORE-01 | Decorator `@Public()`; `JwtAuthGuard` thành `APP_GUARD`, bỏ qua route `@Public`, không verify lại khi `request.user` đã có; lỗi `jose` → 401 (không tới được Keycloak → 503); WebSocket bị từ chối tới CORE-17 | e2e: route không token → 401, token hỏng → 401, Keycloak không tới được → 503 | ✅ |
| 4 | CORE-02 | Gắn quyền theo bảng trên cho 6 controller; `@Public` cho `attendance/sync` | e2e: thiếu quyền → 403; audit báo 0 route không guard | ✅ |
| 5 | — | Script audit hiểu guard toàn cục + `@Public`; liệt kê route public và route chỉ cần đăng nhập | `npm run audit:features` | ✅ |
| 6 | — | Bộ test e2e API (supertest): mọi route không token → 401 trừ danh sách public; quyền của các route ở bảng trên | `npm run test` (14 test) | ✅ |
| 7 | CORE-03 | Proxy web chặn thêm `/hcns`, `/apps`, `/social`, `/personnel-profile-profile` | Chưa đăng nhập → `/login` | ✅ Đảo ngược matcher: mọi trang trừ `/login`, `/api/*`, file tĩnh |
| 8 | CORE-04 | Helmet + `@nestjs/throttler` (giới hạn chung + chặt hơn cho `attendance/sync`) | Có security header; vượt ngưỡng → 429 | ✅ Giới hạn theo token (web SSR dùng chung 1 IP), chạy trước xác thực; e2e 17 test |
| 9 | CORE-05 | Gộp route trùng, redirect route cũ trong `next.config.ts` | Route cũ redirect về route chính | ✅ Giữ bộ B `/apps/personnel-profile-profile`; chuyển hộp thoại sửa của bộ A sang bộ B rồi xoá bộ A |
| 10 | CORE-06 | Dashboard không âm thầm dùng mock-data khi API lỗi | Tắt API → thấy trạng thái lỗi | |
| 11 | CORE-07 | ESLint cho web + api (bắt đầu ở mức cảnh báo) | `npm run lint` | |
| 12 | CORE-08 | GitHub Actions: typecheck, test, build, `audit:features --strict` | CI xanh trên nhánh | |

## Kiểm tra tay (cần Postgres + Keycloak)

- [ ] Đăng nhập web, mở `/admin/settings/accounts`, `/hcns`, `/admin/approvals-alerts` — dữ liệu vẫn hiển thị.
- [ ] App chấm công gửi `POST /api/v1/attendance/sync` với token máy chấm công → 200.
- [ ] User không có quyền lương gọi `GET /api/v1/payroll-cycles` → 403.

## Gate đóng phase

Theo checklist "Khi đóng phase" trong roadmap.
