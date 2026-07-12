# Progress Changelog

File này dùng để theo dõi tiến độ triển khai Helios Office: đã làm gì, đang ở trạng thái nào, còn phần nào cần làm tiếp.

## Quy ước cập nhật

- Mỗi mốc hoàn thành sẽ thêm một entry mới theo ngày.
- Ghi rõ phạm vi, file/module chính, trạng thái kiểm tra và việc tiếp theo.
- Những phần chưa hoàn tất phải ghi là `Chưa xong` hoặc `Tiếp theo` để tránh nhầm là đã chạy thật.

## 2026-07-11

### Phase 3 - Employee Directory Baseline

Trạng thái: Đã triển khai và kiểm tra

- Thêm trường hồ sơ nhân sự vào `Employee`: ngày chính thức, loại nhân sự, avatar, mã chấm công, hình thức chấm công, bảng lương, công chuẩn.
- Thêm API sửa hồ sơ:
  - `PATCH /api/v1/employees/:id`
  - `PATCH /api/v1/employees/:id/account`
- Thêm validation phòng ban/quản lý:
  - Phòng ban gán cho nhân sự phải active.
  - Manager phải là nhân sự active.
  - Chặn self-manager và reporting cycle.
- Thêm trang `/admin/hr/employees`:
  - Bảng danh sách hồ sơ nhân sự.
  - Modal sửa hồ sơ.
  - Link/unlink account.
  - Đường dẫn tạo hồ sơ mới.
- Cập nhật `/admin/hr/employees/new` để gửi avatar và revalidate danh sách hồ sơ.
- Cập nhật `docs/feature-map.md` và `docs/implementation-plan.md` để Phase 3 phân tách rõ HR master data với Phase 4 profile.

Kiểm tra:

- `npm run prisma:generate -w apps/api`: Pass
- `npm run db:migrate -w apps/api`: timeout do Prisma migrate dev treo, nhưng `npm exec -w apps/api prisma migrate status` báo database schema up to date.
- `npm run db:seed -w apps/api`: Pass
- `npm run typecheck -w apps/api`: Pass
- `npm run typecheck -w apps/web`: Pass
- `npm run build -w apps/api`: Pass
- `npm run build -w apps/web`: Pass, route `/admin/hr/employees` build OK.
- `npm run test -w apps/api`: Pass, 3 suites / 11 tests.
- `npm run test -w apps/web`: Không có script `test` trong workspace web.

Tiếp theo:

1. Phase 4: nối current user/profile thật từ `auth/me` + Employee thay vì `currentUser` mock.
2. Dùng reporting line từ Phase 3 cho approval workflow ở Phase 5.

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

### Quick Account Provisioning

Trạng thái: Đã triển khai modal cấp tài khoản nhanh cho nhân sự đã có hồ sơ nhưng chưa có account.

- Siết quyền đọc dữ liệu quản trị:
  - `GET /api/v1/account-access/*` yêu cầu JWT admin.
  - `GET /api/v1/employees`, `/employees/:id`, `/employees/org-chart`, `/departments` yêu cầu JWT admin.
- Web server components gọi API admin bằng access token từ session, có tự refresh nếu cần.
- Trang `/admin/settings/accounts`:
  - Nút “Cấp tài khoản” mở modal thay vì chuyển thẳng sang trang tạo HSNS.
  - Modal chỉ liệt kê nhân sự chưa có `accountEmail`.
  - Form gửi `employeeId`, `username`, `initialPassword`, email, role, license, group, status lên `POST /account-access/accounts`.
  - Nếu không còn nhân sự chờ cấp account, modal hiển thị empty state và link sang trang tạo HSNS.
- Chuẩn hóa form control:
  - `FormSelect` có `onValueChange` để form dùng dropdown chung mà vẫn sync state.
  - Action buttons trong dialog giữ cùng một hàng trên mobile.

Kiểm tra:

- `npm run typecheck`: Pass.
- `npm run test`: Pass.
- `npm run build`: Pass.
- `GET /api/v1/account-access/accounts` không token: 401 Unauthorized.
- `GET /api/v1/account-access/accounts` với token admin `dungdd`: 200 OK.
- Login app `dungdd / Welcome@123` rồi mở `/admin/settings/accounts`: 200 OK.
- Seed hiện tại: `employees=3`, `availableWithoutAccount=0`, modal render empty state đúng.
- Trang `/admin/hr/employees/new` bằng phiên admin: 200 OK.

Tiếp theo:

1. Tạo dữ liệu test có nhân sự chưa có account để bấm thử full modal bằng trình duyệt.
2. Chốt luồng gửi email/invite và chính sách mật khẩu mặc định.
3. Bắt đầu CRUD nhóm quyền/ma trận quyền thật thay vì chỉ xem dữ liệu.
### Shared UI Primitives Phase 1

Trang thai: Da bat dau trien khai Phase 1 theo `docs/implementation-plan.md`.

- Them `apps/web/components/ui/primitives.tsx`:
  - `Button`
  - `IconButton`
  - `ModalDialog`
  - `FormField`
  - `FormInput`
  - `FormTextarea`
  - `ToolbarActions`
  - `ResponsiveTable`
  - `StateBlock`, `EmptyState`, `ErrorState`, `LoadingState`
- Bo sung CSS states/responsive primitives trong `apps/web/app/globals.css`:
  - form field aliases
  - focus-visible/disabled button states
  - responsive table shell
  - state block styles
- Migrate account edit dialog sang primitives chung.
- Migrate account provision dialog sang primitives chung va giu portal de tranh vo layout mobile.
- Migrate cac nut action trong device-auth policy dialog sang `Button`.
- Migrate group editor dialog sang primitives chung:
  - trigger tao/sua nhom dung `Button`/`IconButton`.
  - dialog dung `ModalDialog`.
  - input/textarea dung `FormField`, `FormInput`, `FormTextarea`.
- Migrate device-auth policy dialog wrapper va field sang primitives chung.
- Doi icon tick checkbox tu CSS border ve tay sang Hugeicons `Check`, can giua bang grid va transition opacity/scale.
- Chinh `ModalDialog` dung `useId()` cho `aria-labelledby` de khong phu thuoc title tieng Viet.

Kiem tra:

- `npm run typecheck`: Pass.
- `npm run build -w apps/web`: Pass.
- `npm run test`: Pass.

Tiep theo:

1. Chuan hoa toolbar/button/table primitives tren account table, device table va group table.
2. Migrate employee create form sang primitives theo tung section.
3. Sau khi form/table on dinh, bat dau Phase 2 permission catalog/effective permission.

### Friendly Permission Group IDs

Trang thai: Da trien khai sinh ma nhom quyen than thien khi tao nhom moi.

- Them `account-access.utils.ts`:
  - Sinh base id tu ten nhom theo dang `grp-ten-nhom`.
  - Ho tro bo dau tieng Viet va ky tu dac biet.
  - Sinh candidate trung lap theo dang `grp-ten-nhom-2`, `grp-ten-nhom-3`.
- Doi `POST /account-access/groups`:
  - Khong de DB tu sinh UUID cho nhom moi.
  - API tu gan `PermissionGroup.id` tu ten nhom.
  - Neu id da ton tai thi retry suffix den toi da 20 lan.
  - Neu ten nhom trung thi tra `ConflictException`.
- Modal tao/sua nhom hien help text:
  - Tao moi: ma nhom se tu sinh dang `grp-ten-nhom`.
  - Sua: ma nhom hien tai giu nguyen.

Kiem tra:

- `npm run typecheck -w apps/api`: Pass.
- `npm run test -w apps/api`: Pass.

### Permission Group Safe Archive

Trang thai: Da trien khai theo huong an toan, khong xoa cung nhom quyen.

- Them `PermissionGroupStatus` vao Prisma schema:
  - `active`
  - `archived`
- Them migration `20260711133000_permission_group_archive`.
- Them `POST /account-access/groups/:id/archive`.
- Them `POST /account-access/groups/:id/restore`.
- Rule an toan:
  - Khong archive nhom mac dinh seed san.
  - Khong archive nhom dang co account.
  - Nhom archived khong duoc sua va khong duoc gan moi cho account.
  - Nhom archived co the restore ve `active` de gan lai.
  - Neu du lieu cu van tro vao nhom archived thi effective group permissions khong duoc tinh.
- UI `/admin/settings/accounts/groups`:
  - Hien status `Da luu tru`.
  - Them nut archive co confirm.
  - Nhom archived hien nut kich hoat lai co confirm.
  - Disable edit/archive theo rule.
  - Dropdown cap/sua account va form tao HSNS loc bo nhom archived.

Kiem tra:

- `npm run prisma:generate`: Pass.
- `npm run db:migrate`: Pass.
- `npm run typecheck`: Pass.
- `npm run test`: Pass.
- `npm run build -w apps/web`: Pass.
- `npm run build -w apps/api`: Pass.

### Remove User/Group License From Admin UI

Trang thai: Da chuyen license ra khoi nghiep vu phan quyen theo user/group.

- Bo cot/filter/card/panel license tren `/admin/settings/accounts`.
- Bo truong license trong modal cap tai khoan va sua tai khoan.
- Bo filter/cot/truong license tren `/admin/settings/accounts/groups`.
- Bo license khoi modal tao/sua nhom quyen, ma tran quyen, panel chi tiet nhom.
- Bo license khoi form tao ho so nhan su khi cap account kem.
- Doi link "Doi soat license" thanh "Doi soat tai khoan".
- Giu field DB/API hien tai voi default `standard` de tranh migration pha du lieu; UI khong con cho Admin xem/chinh sua license theo user/group.
- Neu sau nay can goi doanh nghiep, nen dua ve cap company/tenant, khong gan tren tung user.

Kiem tra:

- `npm run typecheck`: Pass.
- `npm run build -w apps/web`: Pass.

### Permission Foundation Cleanup

Trang thai: Dang trien khai Phase 2 theo huong permission-only.

- Bo `minimumLicense` khoi permission catalog API hien tai.
- Bo endpoint `/account-access/licenses` khoi controller.
- Bo license khoi DTO cap/sua account, tao/sua nhom quyen va tao ho so nhan su kem account.
- Bo license khoi auth user payload.
- API account tra `effectivePermissionKeys` theo:
  - account active moi co quyen hieu luc.
  - system admin active co toan bo permission catalog.
  - user active lay quyen tu group active + custom override.
  - archived group khong duoc tinh quyen.
- Frontend account data layer khong fetch `/account-access/licenses` nua.
- Bang account dung `effectivePermissionKeys` tu API thay vi tu tinh rieng tren client.
- Cap nhat `docs/implementation-plan.md` va `docs/feature-map.md` de bo nhanh license user/group khoi roadmap.

Tiep theo:

1. Persist permission catalog vao DB thay vi static mock.
2. Hoan thien trang `accounts/permissions` doc tu catalog/effective permission that.
3. Them API permission guard cho account/device/employee mutations.

### Permission Catalog Persistence

Trang thai: Da dua permission catalog vao DB de account/group/API dung chung mot nguon.

- Them Prisma model `PermissionDefinition`:
  - `key`
  - `category`
  - `label`
  - `description`
  - `adminOnly`
  - `sortOrder`
- Them migration `20260711152000_permission_definition_catalog`.
- Seed `accountPermissionCatalog` vao bang `PermissionDefinition`.
- `GET /account-access/permissions` doc tu DB, fallback static catalog neu DB chua seed.
- Account/group resolver doc permission catalog tu DB de tra:
  - `effectivePermissionKeys`
  - `effectivePermissions`
  - `group.permissions`
- Validate permission keys khi:
  - cap account moi voi custom permissions.
  - sua account voi custom permissions.
  - tao nhom quyen.
  - sua nhom quyen.
- Seed cung validate permission keys cua group/account de tranh key la rot vao du lieu mau.

Tiep theo:

1. Hoan thien trang `accounts/permissions` de doc catalog/effective permissions that thay vi `detailedPermissionObjects`.
2. Them API permission guard cho mutation account/device/employee.
3. Sau khi guard on dinh moi tinh chuyen sang invite/password policy.

### Detailed Permission Screen Uses Real Data

Trang thai: Da noi `/admin/settings/accounts/permissions` vao Account API.

- Page `accounts/permissions` fetch `getAccountAccessData()`.
- `DetailedPermissionSettingsBoard` khong con import:
  - `detailedPermissionObjects`
  - `permissionGroups`
  - `permissionMergeExamples`
- Man hinh hien:
  - danh muc quyen tu `PermissionDefinition`.
  - so nhom active dang dung tung quyen.
  - so tai khoan active co `effectivePermissionKeys`.
  - tai khoan co custom override.
  - panel nhom dang dung quyen dau tien trong catalog.
- Bo nut luu quyen gia tren man hinh chi tiet; edit quyen hien van nam o group/account dialog.
- Them chip category tinh thay vi button filter khong co hanh vi.

Kiem tra:

- `npm run typecheck -w apps/web`: Pass.

Tiep theo:

1. Them API permission guard cho account/device/employee mutations.
2. Sau guard, chot invite/password policy cho cap account moi.

### API Permission Guard

Trang thai: Da them guard theo permission key cho cac API quan trong.

- Them `RequirePermissions(...keys)` va `RequireAnyPermission(...keys)`.
- Them `PermissionGuard`:
  - doc metadata permission tren handler/class.
  - system admin active duoc bypass.
  - user thuong tinh effective permissions tu DB:
    - permission group active.
    - custom permissions neu enabled.
    - account lifecycle active.
    - permission catalog tu `PermissionDefinition`.
  - tra 403 neu thieu quyen bat buoc.
- Doi account-access controller sang `JwtAuthGuard + PermissionGuard`.
  - yeu cau `system.accounts.manage`.
- Doi device-auth controller sang `JwtAuthGuard + PermissionGuard`.
  - them permission key `attendance.device.manage`.
  - yeu cau `attendance.device.manage`.
- Doi employees/departments controller sang `JwtAuthGuard + PermissionGuard`.
  - tao ho so nhan su yeu cau `employees.department.manage`.
  - doc employees/departments cho phep mot trong hai quyen:
    - `employees.department.manage`
    - `system.accounts.manage`
- Seed lai permission catalog, hien DB co 11 permission definitions.

Kiem tra:

- `npm run typecheck -w apps/api`: Pass.
- `npm run test -w apps/api`: Pass.
- `npm run build -w apps/api`: Pass.
- `npm run typecheck -w apps/web`: Pass.

Tiep theo:

1. Chot invite/password policy cho cap account moi.
2. Ra soat guard cho endpoint phu nhu contracts khi man hinh admin dung du lieu that.

### Account Invite And Temporary Password Policy

Trang thai: Da co baseline cho luong cap tai khoan moi.

- Them migration `20260711165000_account_invite_policy`.
- `UserAccount` luu them:
  - `passwordResetRequired`
  - `temporaryPasswordIssuedAt`
  - `inviteEmailRequested`
  - `inviteSentAt`
- Keycloak provisioning ho tro:
  - password tam bang credential `temporary`.
  - required action `UPDATE_PASSWORD`.
  - email action qua `execute-actions-email` khi bat `ACCOUNT_INVITE_EMAIL_ENABLED=true`.
- Sua Keycloak update profile khong con tu xoa `requiredActions`.
- `account-access`:
  - form cap account co checkbox yeu cau doi password lan dau.
  - form cap account co checkbox gui email moi khi SMTP/Keycloak email da bat.
  - tao account ghi metadata policy va audit.
  - kich hoat account se thu gui invite neu truoc do da request va account chua gui.
- `employees/create`:
  - tao account kem HSNS dung cung policy password/invite.
  - ghi audit `account.create` rieng ngoai `employee.create`.
- Invite khong lam hong thao tac cap tai khoan:
  - pending account -> audit `account.invite.deferred`.
  - env chua bat mail -> audit `account.invite.skipped`.
  - Keycloak mail loi -> audit `account.invite.failed`.

Tiep theo:

1. Lam UI cau hinh SMTP/test mail that trong Admin Settings.
2. Them nut gui lai invite/reset password cho account da tao.
3. Ra soat guard cho endpoint phu nhu contracts khi man hinh admin dung du lieu that.

### SMTP Settings And Resend Invite

Trang thai: Da co baseline SMTP that cho invite/reset password.

- Them dependency API:
  - `nodemailer`
  - `@types/nodemailer`
- Them DTO:
  - `UpdateSmtpSettingsDto`
  - `TestSmtpSettingsDto`
- `admin-settings`:
  - Them `GET /admin-settings/smtp`.
  - Them `PATCH /admin-settings/smtp`.
  - Them `POST /admin-settings/smtp/test`.
  - Route duoc bao ve bang `JwtAuthGuard + PermissionGuard`.
  - Yeu cau permission `system.accounts.manage`.
- SMTP config duoc luu vao `AdminSetting.payload`.
  - API khong tra raw password, chi tra `passwordSet`.
  - Audit khong ghi raw password.
  - SMTP password duoc luu duoi dang `passwordSecret` ma hoa AES-256-GCM.
  - Key ma hoa lay tu `SETTINGS_SECRET_KEY`.
  - Du lieu cu dang co `payload.password` plaintext se duoc lazy migrate sang encrypted khi doc SMTP settings.
  - Khi bat SMTP va du thong tin, service sync config sang Keycloak realm `smtpServer`.
  - `POST /smtp/test` gui email that qua SMTP da luu.
- Invite/reset password:
  - Them `POST /account-access/accounts/:id/resend-invite`.
  - Chi gui cho account dang active.
  - Set lai Keycloak required action `UPDATE_PASSWORD`.
  - Gui email qua Keycloak `execute-actions-email`.
  - Ghi audit `account.invite.resent` hoac `account.invite.failed`.
  - Account co `local-*` se duoc provision sang Keycloak truoc khi gui.
- Web:
  - `/admin/settings/smtp` fetch API that.
  - Trang SMTP hien cau hinh dang read-only theo panel server/auth/sender/delivery.
  - Sua cau hinh SMTP mo trong modal, khong sua truc tiep tren trang.
  - Gui thu email that mo trong modal rieng.
  - Bang account co nut gui lai invite/reset password cho account active.

Con no:

1. Them toast/hien thi loi ro hon cho nut resend invite tren bang account.
2. Tiep tuc noi company info/module settings vao `AdminSetting`.

### SMTP Secret Encryption

Trang thai: Da ma hoa secret SMTP.

- Them `SettingsSecretService`.
- Secret format:
  - `algorithm: aes-256-gcm`
  - `version: 1`
  - `iv`
  - `tag`
  - `value`
  - `keyId`
- `SETTINGS_SECRET_KEY` ho tro:
  - `base64:<32 bytes>`
  - `hex:<32 bytes>`
  - chuoi raw, se hash SHA-256 thanh key 32 bytes.
- Production bat buoc co `SETTINGS_SECRET_KEY` toi thieu 32 ky tu.
- Development co fallback dev neu chua set key, nhung local `.env` da them key rieng.
- `AdminSetting.payload` khong luu `password` nua khi save SMTP.
- `password` plaintext chi ton tai trong runtime cua service de:
  - test SMTP bang nodemailer.
  - sync SMTP sang Keycloak.
- Them lazy migration:
  - neu payload cu con `password` plaintext, `GET /admin-settings/smtp` se ghi lai thanh `passwordSecret`.
  - ghi audit `admin_setting.smtp.secret_migrated`.
- Them unit test cho encrypt/decrypt va sai key.

### Phase 9 Admin Settings Completion

Trang thai: Da hoan thien baseline Phase 9 theo `docs/implementation-plan.md`.

- `admin-settings` API:
  - `GET /admin-settings` khong con chi tra static mock; snapshot merge default catalog voi `AdminSetting`, active users va audit events.
  - Them `GET/PATCH /admin-settings/company-info`.
  - Them `GET/PATCH /admin-settings/intranet`.
  - Them `GET/PATCH /admin-settings/module-config`.
  - Company/Intranet/Module mutations deu ghi `AuditLog`.
- Web:
  - `/admin/settings` doc API that qua `getAdminSettingsData()`.
  - `/admin/settings/company-info` doc/ghi API that, sua bang modal.
  - `/admin/settings/intranet` doc/ghi API that, sua bang modal.
  - Module config API/DB duoc giu noi bo; UI bat/tat phan he da duoc go khoi tab Phan he de tranh gay hieu nham.
  - Nut gui lai invite/reset password tren bang account co feedback hien thi ro hon.
- Tieu chi Phase 9:
  - Sua company info reload van con.
  - Test SMTP that da co tu nhanh truoc.
  - Cap account/gui lai invite dung SMTP/Keycloak khi da cau hinh.
  - AdminSetting mutations ghi audit.

Kiem tra:

- `npm run typecheck -w apps/api`: Pass.
- `npm run typecheck -w apps/web`: Pass.

Tiep theo:

1. Chay full test/build sau khi merge Phase 9.
2. Quay ve Phase 3 HR master data: Department CRUD, Position/Title CRUD, Org chart API-backed UI.

### Phase 2 Account Foundation Hardening

Trang thai: Da bo sung hardening cho Phase 2.

- Permission catalog API:
  - Them `POST /account-access/permissions`.
  - Them `PATCH /account-access/permissions/:key`.
  - Them `DELETE /account-access/permissions/:key`.
  - `key` quyen duoc giu immutable de tranh pha permission references.
  - Delete bi chan neu quyen dang nam trong permission group hoac custom permission cua account.
  - Cac mutation ghi `AuditLog` voi entity `PermissionDefinition`.
- Audit/settings:
  - Admin settings audit resolver hien ten `PermissionDefinition` theo label/key.
  - Web audit log co nhan dien action `permission_definition.create/update/delete`.
- Guard coverage:
  - Them `JwtAuthGuard` + `PermissionGuard` cho `/contracts`.
  - Them `JwtAuthGuard` + `PermissionGuard` cho `/reports/executive-dashboard`.
  - Reports module import `AuthModule` de guard co dependency.

Kiem tra:

- `npm run typecheck -w apps/api`: Pass.

### Phase 3 Department CRUD Baseline

Trang thai: Da trien khai baseline cho phong ban va org chart.

- API/DB:
  - Them `DepartmentStatus` voi `active`/`archived`.
  - Them `Department.status` va `Department.archivedAt`.
  - Them migration `20260711190000_department_status`.
  - `GET /departments` mac dinh chi tra active, ho tro `includeArchived=true`.
  - Them `POST /departments`.
  - Them `PATCH /departments/:id`.
  - Them `POST /departments/:id/archive`.
  - Them `POST /departments/:id/restore`.
  - Archive bi chan neu phong ban con nhan su hoac phong ban con.
  - Parent archived khong duoc gan moi; khong cho tao cycle parent/child.
  - Gan truong phong chi chap nhan employee active.
  - Department mutations ghi `AuditLog`.
- Web:
  - `/admin/settings/org-chart` doc department/employees tu API thay vi dung `organizationTree` mock lam source chinh.
  - Them modal tao/sua phong ban bang component form chung.
  - Them cay phong ban selectable, panel chi tiet va bang danh sach phong ban.
  - Them action archive/restore an toan trong bang.
  - Position/title panel van la placeholder va la buoc Phase 3 tiep theo.
- Docs:
  - Cap nhat feature map va implementation plan de Phase 3 phan anh department CRUD da xong baseline.

Kiem tra:

- `npm run prisma:generate -w apps/api`: Pass.
- `npm run db:migrate -w apps/api`: Migration da apply; da don advisory lock Prisma bi treo sau timeout.
- `npm run db:seed -w apps/api`: Pass.
- `npm run typecheck -w apps/api`: Pass.
- `npm run typecheck -w apps/web`: Pass.
- `npm run test -w apps/api`: Pass, 11 tests.
- `npm run build -w apps/api`: Pass.
- `npm run build -w apps/web`: Pass.

Tiep theo:

1. Phase 3 Position/Title CRUD: model/API/UI cho `/admin/settings/positions-titles`.
2. Sau do den employee directory admin: danh sach/chi tiet/sua/link account.

### Phase 3 Position/Title CRUD Baseline

Trang thai: Da trien khai baseline cho danh muc vi tri va chuc danh.

- API/DB:
  - Them `JobCatalogStatus` voi `active`/`archived`.
  - Them `JobPosition` va `JobTitle`.
  - Noi `Employee.positionId` va `Employee.jobTitleId`.
  - Them migration `20260711193000_job_position_title_catalog`.
  - Them API `/job-positions` va `/job-titles` cho list/create/update/archive/restore.
  - Archive bi chan khi danh muc con nhan su dang gan.
  - Employee create lay vi tri/chuc danh tu catalog active va sinh display title tu catalog khi can.
  - Mutations ghi `AuditLog` voi target ten danh muc.
- Web:
  - `/admin/settings/positions-titles` doc API thay mock.
  - Them bang vi tri/chuc danh, modal tao/sua, panel chi tiet, action archive/restore.
  - Form tao ho so nhan su chon vi tri/chuc danh tu catalog active.
  - Audit log web co nhan dien action `job_position.*` va `job_title.*`.
- Docs:
  - Cap nhat feature map voi boundary ro rang: Department, JobPosition, JobTitle, PermissionGroup.
  - Cap nhat implementation plan Phase 3 de buoc tiep theo la employee directory/admin edit profile.

Tiep theo:

1. Phase 3 Employee directory admin: danh sach nhan su, chi tiet, sua Department/JobPosition/JobTitle.
2. Sau do chuan hoa manager/reporting line de approval dung chung.
