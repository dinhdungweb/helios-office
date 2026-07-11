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

1. Thêm AuthModule, JWT/Keycloak guard và current user context.
2. Map user đăng nhập về `UserAccount`.
3. Bảo vệ route admin theo `adminRole`.
4. Làm CRUD hồ sơ nhân sự, phòng ban, vị trí/chức vụ.

### Account Settings API Wiring

Trạng thái: Đã triển khai và kiểm tra

- Nối trang `/admin/settings/accounts` với API DB thật qua `NEXT_PUBLIC_API_BASE_URL`.
- Thêm adapter frontend tại `apps/web/lib/account-access-api.ts` để lấy:
  - `GET /api/v1/account-access/summary`
  - `GET /api/v1/account-access/accounts`
  - `GET /api/v1/account-access/groups`
  - `GET /api/v1/account-access/licenses`
  - `GET /api/v1/account-access/permissions`
- Chuyển `AccountAccessBoard` khỏi dữ liệu mock trực tiếp, nhận dữ liệu account/group/license/permission từ API.
- Thêm server actions frontend để gọi:
  - `POST /api/v1/account-access/accounts/:id/activate`
  - `POST /api/v1/account-access/accounts/:id/close`
- Thêm trạng thái cảnh báo khi Account API chưa chạy, tránh nhầm dữ liệu mock là dữ liệu thật.
- Route `/admin/settings/accounts` hiện là dynamic server-rendered route để đọc dữ liệu mới theo request.
- API runtime đã load thêm `.env` ở root repo để đồng bộ với seed/database scripts.

Kiểm tra:

- `npm run typecheck`: Pass
- `npm run test`: Pass
- `npm run build`: Pass
- Dev server:
  - Web `http://localhost:3000/admin/settings/accounts`: HTTP 200
  - Tạo database local `helios_office` từ `DATABASE_URL` trong `.env`.
  - `npm run db:migrate`: Pass
  - `npm run db:seed`: Pass
  - API `GET /api/v1/account-access/summary`: Pass, trả 5 tài khoản, 3 active, 1 pending, 1 closed.
  - Trang account không còn hiển thị cảnh báo mất kết nối API.

Tiếp theo:

1. Hoàn thiện mutation cấp/sửa tài khoản bằng form/modal.
2. Thêm AuthModule, JWT/Keycloak guard và current user context.
3. Bảo vệ route admin theo `adminRole`.

### Auth Foundation

Trạng thái: Đã triển khai nền tảng, chưa bật chặn admin routes

- Thêm dependency `jose` cho API để verify JWT/JWKS từ Keycloak.
- Thêm `AuthModule` với:
  - `AuthService`
  - `JwtAuthGuard`
  - `AdminRoleGuard`
  - `CurrentUser` decorator
  - `GET /api/v1/auth/me`
- `AuthService` verify bearer token theo `KEYCLOAK_ISSUER`, hỗ trợ `JWT_AUDIENCE` nếu cấu hình.
- Resolve user đăng nhập về `UserAccount` bằng `keycloakUserId` hoặc `email`.
- Chưa gắn guard vào các route admin/account để tránh khóa UI hiện tại trước khi frontend login có token thật.

Kiểm tra:

- `npm run typecheck`: Pass
- `npm run test`: Pass
- `npm run build`: Pass
- Runtime:
  - `GET /api/v1/auth/me` không token: 401 Unauthorized
  - `GET /api/v1/account-access/summary`: Pass
  - `/admin/settings/accounts`: HTTP 200, không còn cảnh báo API

Tiếp theo:

1. Nối login frontend với Keycloak để lấy access token.
2. Gửi bearer token từ web server actions/API client.
3. Gắn `JwtAuthGuard` + `AdminRoleGuard` vào các mutation và admin route nhạy cảm.

### Account Responsive Fix

Trạng thái: Đã sửa và kiểm tra

- Sửa bottom nav mobile của `UserFrame` để bám theo viewport, không bị kéo rộng theo nội dung trang có bảng ngang.
- Giữ bảng tài khoản `/admin/settings/accounts` là bảng thật trên mobile, cuộn ngang trong `.account-table-shell`, đồng bộ cách responsive với các bảng admin khác.
- Bỏ layout card mobile cho account table vì gây lệch cấu trúc và khó đối chiếu cột.
- Đặt `min-width` cho bảng tài khoản và khóa overflow ở panel cha để nội dung rộng không đẩy toàn bộ page/nav.

Kiểm tra:

- Mobile viewport 360px: bottom nav nằm trong màn hình, không tràn ngang.
- Mobile viewport 360px: bảng tài khoản cuộn ngang trong vùng bảng, không vỡ thành card.
- `npm run typecheck -w apps/web`: Pass

### Web Auth Flow

Trạng thái: Đã triển khai luồng login/logout/session, đã guard mutation account-admin

- Thêm helper web đọc `.env` root repo khi chạy trong workspace.
- Thêm OIDC Authorization Code + PKCE cho web:
  - `POST /api/auth/login`
  - `GET /api/auth/login`
  - `GET /api/auth/callback`
  - `GET|POST /api/auth/logout`
  - `GET /api/auth/session`
- Trang `/login` submit vào `/api/auth/login`, redirect sang Keycloak theo `KEYCLOAK_ISSUER` và `KEYCLOAK_CLIENT_ID`.
- Callback exchange `code` lấy token từ Keycloak, lưu access/refresh/id token vào cookie `httpOnly`.
- Logout clear cookie local và redirect sang Keycloak logout endpoint.
- Web account API client tự gắn `Authorization: Bearer <access_token>` khi session cookie tồn tại.
- Profile menu đã trỏ "Đăng xuất" vào route logout thật.
- Gắn `JwtAuthGuard` + `AdminRoleGuard` cho các mutation nhạy cảm trong `account-access`:
  - `POST /api/v1/account-access/accounts`
  - `PATCH /api/v1/account-access/accounts/:id`
  - `POST /api/v1/account-access/accounts/:id/activate`
  - `POST /api/v1/account-access/accounts/:id/close`
  - `POST /api/v1/account-access/groups`
  - `PATCH /api/v1/account-access/groups/:id`
- Tạm thời chưa khóa các GET `account-access` và page admin để tránh làm mất dữ liệu đọc trước khi test xong mapping Keycloak user -> `UserAccount`.

Kiểm tra:

- `POST /api/auth/login`: 303 sang Keycloak auth URL, có cookie `state`, `pkce_verifier`, `redirect`.
- `GET /api/auth/session` khi chưa login: `{ authenticated: false, user: null }`.
- `GET /api/auth/logout`: 303 sang Keycloak logout URL và clear cookie session.
- `GET /api/v1/auth/me` không token: 401 Unauthorized.
- `GET /api/v1/account-access/summary` không token: 200 OK.
- `POST /api/v1/account-access/accounts/:id/activate` không token: 401 Unauthorized.
- `npm run typecheck`: Pass
- `npm run test`: Pass
- `npm run build`: Pass

Tiếp theo:

1. Test end-to-end login với Keycloak thật và đảm bảo user admin seed map đúng theo `keycloakUserId` hoặc email.
2. Sau khi E2E login ổn, cân nhắc khóa tiếp các GET admin bằng `JwtAuthGuard` + `AdminRoleGuard` hoặc middleware web.
3. Kiểm thử mutation tạo/sửa tài khoản bằng admin token thật sau khi Keycloak local chạy.

### Account Create/Edit Dialog

Trạng thái: Đã triển khai, mutation yêu cầu admin token

- Thêm client dialog cho `/admin/settings/accounts`:
  - Nút `Cấp tài khoản` mở form tạo tài khoản.
  - Icon bút chì từng dòng mở form sửa tài khoản.
- Form hỗ trợ các trường chính:
  - Họ tên
  - Email
  - Quyền admin/user
  - License
  - Nhóm quyền
  - Trạng thái
  - Quyền cá nhân
  - Ghi chú quyền riêng
- Thêm server actions:
  - `createAccountAction`
  - `updateAccountAction`
- Thêm web API client mutation:
  - `POST /api/v1/account-access/accounts`
  - `PATCH /api/v1/account-access/accounts/:id`
- Dialog dùng server action và `revalidatePath("/admin/settings/accounts")` sau khi lưu.
- Lỗi 401/403 từ account API được hiển thị bằng thông báo tiếng Việt thay vì message kỹ thuật.
- Sửa HTML row actions từ `span` sang `div` vì bên trong có `dialog`.

Kiểm tra:

- Keycloak local `http://localhost:8080/realms/helios-office/.well-known/openid-configuration`: chưa truy cập được trong môi trường hiện tại.
- API dev server đã bật lại ở `http://localhost:4000`.
- `GET /api/v1/account-access/summary`: 200 OK.
- `/admin/settings/accounts`: 200 OK.
- Mobile screenshot 390px: bottom nav nằm trong viewport, bảng cuộn ngang trong table shell.
- `npm run typecheck`: Pass
- `npm run test`: Pass
- `npm run build`: Pass

Tiếp theo:

1. Bật Keycloak local, đăng nhập thử admin và xác nhận mutation tạo/sửa chạy với bearer token thật.
2. Sau khi E2E auth ổn, khóa tiếp các GET admin hoặc thêm middleware web bảo vệ `/admin`.
3. Làm create/edit dialog tương tự cho `PermissionGroup`.

### 1Office Account Provisioning Flow

Trạng thái: Đã điều chỉnh theo luồng trang riêng HSNS + modal thao tác nhanh

- Điều chỉnh theo hành vi 1Office:
  - Tạo mới người dùng/tài khoản đi qua trang riêng tạo Hồ sơ nhân sự.
  - Modal chỉ dùng cho chỉnh nhanh tài khoản/quyền/trạng thái tài khoản đã có.
- Đổi nút `Cấp tài khoản` trong bảng tài khoản sang link `/admin/hr/employees/new`.
- Thêm trang `/admin/hr/employees/new` với form nhiều nhóm thông tin:
  - Thông tin định danh & vị trí
  - Thông tin tài khoản
  - Cấu hình tài khoản & quyền hạn
  - Cấu hình chấm công & lương
- Thêm API frontend lấy dữ liệu tạo HSNS:
  - Phòng ban
  - Nhân sự quản lý trực tiếp
  - Nhóm quyền
  - License
- Thêm server action `createEmployeeProfileAction`.
- Thêm backend `POST /api/v1/employees`:
  - Tạo `Employee`.
  - Nếu bật `createAccount`, tạo `UserAccount` và liên kết với `Employee`.
  - Guard bằng `JwtAuthGuard` + `AdminRoleGuard`.
  - Ghi audit `employee.create`.
  - Trả 409 nếu trùng mã nhân sự, username hoặc email tài khoản.
- Dọn modal account editor để chỉ còn vai trò sửa nhanh.
- Sửa CSS trang tạo HSNS và account dialog dùng nền trắng đúng token admin panel.
- Đồng bộ design system cho form cấp tài khoản:
  - Dropdown dùng lại pattern `LeaveFormSelect` của luồng làm đơn, có hidden value để server action vẫn nhận đúng dữ liệu.
  - Date picker ngày vào làm/ngày chính thức dùng popover lịch cùng tinh thần bộ chọn tháng ở trang công.
  - Dropdown/date picker tự đổi hướng mở lên khi gần đáy viewport mobile để không bị cắt hoặc tràn màn hình.
- Chuẩn hóa bộ form controls dùng chung:
  - Thêm `apps/web/components/ui/form-controls.tsx` gồm `FormSelect`, `FormDatePicker`, `FormCheckbox`, `FormSwitch`.
  - `LeaveFormSelect` cũ chuyển thành alias để các trang đơn từ dùng chung một lõi component.
  - Trang tạo HSNS, modal sửa tài khoản và checkbox ghi nhớ đăng nhập đều dùng component chung thay vì native/default control riêng lẻ.
  - CSS checkbox/switch được gom về `.form-checkbox` và `.form-switch`, các màn chỉ giữ selector layout theo ngữ cảnh.

Kiểm tra:

- `/admin/hr/employees/new`: 200 OK.
- `/admin/settings/accounts`: 200 OK.
- `GET /api/v1/account-access/summary`: 200 OK.
- `POST /api/v1/employees` không token: 401 Unauthorized.
- Mobile screenshot 390px: trang tạo HSNS không tràn ngang, bottom nav nằm trong viewport.
- Chrome CDP mobile 390px:
  - Dropdown thấp trong form mở `is-above`, nằm trong viewport.
  - Date picker mở `is-above`, nằm trong viewport.
  - Switch/checkbox shared controls hiển thị đúng kích thước, action bar mobile vẫn nằm một hàng.
- `npm run typecheck`: Pass
- `npm run test`: Pass
- `npm run build`: Pass

Tiếp theo:

1. Bật Keycloak local để test submit tạo HSNS + tài khoản bằng admin token thật.
2. Tích hợp tạo user thật trên Keycloak thay cho `local-<username>` khi provisioning account.
3. Bổ sung lưu trữ các trường bổ trợ chưa có schema riêng như phone, attendance mode, payroll template nếu cần vận hành thật.

### Auth E2E + Keycloak Provisioning

Trạng thái: Đã bật Keycloak runtime, bootstrap realm/client/user seed, đăng nhập app và kiểm thử provisioning E2E thành công.

- Thêm `KeycloakAdminService` trong API:
  - Lấy admin token qua realm `master` / client `admin-cli`.
  - Tạo hoặc đồng bộ user Keycloak khi tạo tài khoản.
  - Set mật khẩu tạm nếu form gửi `initialPassword`.
  - Gán realm role `system_admin` hoặc `user`.
  - Đồng bộ enabled theo trạng thái tài khoản: chỉ `active` mới login được.
- Đổi `POST /api/v1/employees`:
  - Khi bật `createAccount`, API tạo user Keycloak trước.
  - DB lưu `UserAccount.keycloakUserId` bằng ID thật từ Keycloak thay vì `local-*`.
- Đổi account mutation:
  - `POST /account-access/accounts` tạo user Keycloak và lưu ID thật.
  - `PATCH /account-access/accounts/:id`, activate, close đồng bộ email/tên/role/enabled sang Keycloak.
  - Nếu account seed cũ còn `local-*`, lần update sẽ provision user Keycloak và thay lại ID thật.
- Siết `GET /api/v1/auth/me`:
  - Token Keycloak phải map được vào `UserAccount`.
  - Account phải đang `active`.
- Thêm script `npm run keycloak:bootstrap`:
  - Tạo realm/client/roles seed users.
  - Đồng bộ DB `keycloakUserId` theo user ID thật.
  - Ưu tiên trạng thái/role/displayName hiện có trong DB khi bootstrap lại để Keycloak không lệch dữ liệu đang test.
- Bảo vệ web `/admin/*`:
  - `apps/web/proxy.ts` redirect người chưa có session về `/login?redirectTo=...`.
  - `apps/web/app/admin/layout.tsx` yêu cầu account `system_admin` đang active.
  - Login form nhận `redirectTo` động.
- Đổi login form:
  - `POST /api/auth/login` dùng password grant nội bộ với Keycloak rồi set session cookie trong app.
  - Người dùng không còn bị chuyển sang màn login mặc định của Keycloak.

Kiểm tra:

- `npm run db:seed`: Pass.
- API dev server chạy lại ở `http://localhost:4000`.
- Web dev server chạy lại ở `http://localhost:3000`.
- `GET /api/v1/account-access/summary`: 200 OK.
- `GET /api/v1/auth/me` không token: 401 Unauthorized.
- `GET /admin/settings/accounts` không cookie: 307 -> `/login?redirectTo=%2Fadmin%2Fsettings%2Faccounts`.
- `/login?redirectTo=/admin/settings/accounts`: 200 OK và form giữ redirect target.
- `npm run typecheck`: Pass.
- `npm run test`: Pass.
- `npm run build`: Pass.
- `npm run keycloak:bootstrap`: Pass với Keycloak local `http://localhost:8080`.
- Account provisioning E2E: Pass.
  - Tạo user QA active qua `POST /api/v1/account-access/accounts`.
  - Đăng nhập user QA bằng Keycloak token endpoint.
  - `GET /api/v1/auth/me` map đúng `UserAccount`.
  - Close account qua API làm Keycloak disable user.
  - User đã close không lấy được token mới.
  - Dữ liệu QA đã cleanup khỏi Keycloak và DB.

Tiếp theo:

1. Bổ sung refresh-token flow để phiên app không hết hạn đột ngột.
2. Kiểm thử UI form tạo HSNS + tài khoản bằng trình duyệt và chốt thông báo mật khẩu/invite email.
3. Chuẩn hóa quick action “Cấp tài khoản” cho nhân sự đã có hồ sơ nhưng chưa có account.

### Refresh Token Session Flow

Trạng thái: Đã triển khai refresh-token flow cho web session.

- Thêm `GET /api/auth/refresh`:
  - Dùng `helios_refresh_token` để lấy token set mới từ Keycloak.
  - Set lại `helios_access_token`, `helios_refresh_token`, `helios_id_token`.
  - Redirect người dùng về trang đang truy cập.
  - Nếu refresh token thiếu/hết hạn, clear session và đưa về `/login?error=session_expired`.
- Cập nhật `apps/web/proxy.ts`:
  - Kiểm tra hạn JWT access token trước khi cho vào `/admin/*`.
  - GET/HEAD có refresh token nhưng access token thiếu/sắp hết hạn sẽ đi qua `/api/auth/refresh`.
  - POST/server action có refresh token được cho đi tiếp để server action tự refresh token trong helper.
- Cập nhật `getSessionAccessToken()`:
  - Tự refresh access token bằng refresh token khi access token thiếu hoặc sắp hết hạn.
  - Ghi cookie mới khi đang chạy trong Route Handler/Server Action.
  - Server Component vẫn nhận access token mới cho request hiện tại.
- Login form bổ sung thông báo `session_expired`.

Kiểm tra:

- `npm run typecheck -w apps/web`: Pass.
- Login app trả refresh cookie.
- `GET /api/auth/refresh?redirectTo=/admin/settings/accounts` với refresh cookie: `303` về `/admin/settings/accounts` và set access cookie mới.
- Truy cập `/admin/settings/accounts` chỉ với refresh cookie: `307 -> 303 -> 200 OK`.

Tiếp theo:

1. Kiểm thử server action sau khi access token hết hạn tự nhiên.
2. Chuẩn hóa quick action “Cấp tài khoản” cho nhân sự đã có hồ sơ nhưng chưa có account.
3. Chốt thông báo/invite email khi admin cấp tài khoản mới.
