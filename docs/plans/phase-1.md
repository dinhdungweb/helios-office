# Phase 1 — Hạ tầng dùng chung

Roadmap: [../roadmap.md](../roadmap.md#phase-1--hạ-tầng-dùng-chung) · Phạm vi: `npm run audit:features -- --phase 1` · Nhánh: `feat/phase-1`

Thiết kế đã chốt: [data-scope](../design/data-scope.md) · [file-storage](../design/file-storage.md) · [notification](../design/notification.md)

## Mục tiêu

Có sẵn các khối dùng chung mà Phase 2–9 cần: phạm vi dữ liệu theo quyền, audit log, hàng đợi + thông báo, lưu trữ file, import/export, và các chức năng tài khoản còn thiếu.

## Điều kiện bắt đầu

- [x] Phase 0 đã đóng (PR #1 merge 2026-10-20).
- [x] 3 tài liệu thiết kế đã chốt.

## Task

Chia thành 6 cụm, làm theo thứ tự. Mỗi cụm là một (hoặc vài) commit, có test riêng; đóng cụm nào chạy `npm run typecheck && npm run lint && npm run test && npm run audit:features -- --strict`.

### 1a. Phạm vi dữ liệu (quan trọng nhất)

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 1 | CORE-10 | Helper phân trang/lọc/sắp xếp dùng chung (`?page&limit&sort&q`), response `{ items, total, page, limit }` | Unit test parse query; giới hạn `limit ≤ 200` | ✅ 9 test |
| 2 | CORE-15 | Migration `scopable`, `defaultScope`, `permissionScopes`, `customPermissionScopes`; seed key scopable; ghi `company` cho quyền đang có | `prisma migrate` sạch; nhóm quyền cũ không đổi hành vi | ✅ 39 quyền scopable; nhóm cũ = company; seed cập nhật |
| 3 | CORE-15 | `DataScopeService` (cây phòng ban có cache, quản lý trực tiếp đệ quy, rộng nhất thắng) | Unit test theo bảng ở data-scope.md §10 | ✅ 17 test. Bỏ cache: đọc cây mỗi request (rẻ, không bị cũ sau điều chuyển) |
| 4 | AU-10, HR-33 | Áp vào `GET /employees` (kèm phân trang), `GET/PATCH /employees/:id` (ngoài phạm vi → 404) | E2E: tài khoản `department` chỉ thấy phòng mình | ✅ 5 test e2e. Phân trang `/employees` hoãn tới HR-33 (8 chỗ web dùng dạng mảng) |
| 5 | AU-12 | `GET /account-access/accounts/:id/effective-permissions`; `GET /auth/me` trả `permissionScopes` | E2E | ✅ 2 unit + 2 e2e; kiểm tra trên API thật với admin/haianh/khanglm |
| 6 | AU-10 | UI: dropdown phạm vi trong ma trận nhóm quyền | Trình duyệt: đổi phạm vi, lưu, tải lại | ✅ Nối dropdown có sẵn (trước chỉ trang trí) vào phạm vi thật; thử tạo → sửa → giữ phạm vi quyền không hiện → xoá nhóm thử |

### 1b. Audit log

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 7 | CORE-14 | Interceptor ghi audit cho mutation có decorator `@Audited(entity)`; gỡ code ghi audit thủ công trùng lặp | Unit + E2E: PATCH employee sinh 1 bản ghi audit | ✅ Đổi cách làm: giữ audit ở service (có before/after) + `contextFields()` (tài khoản, IP, UA, request id) + interceptor lưới an toàn cho mutation chưa có audit. Migration `audit_context`. 6 e2e; kiểm tra thật: tạo/xoá cấp bậc ghi đủ actor + request id |
| 8 | CORE-13 | `GET /audit-logs` (lọc entity, actor, khoảng ngày, phân trang), `GET /audit-logs/:id` — chỉ `system.accounts.manage` | E2E quyền | ✅ API + e2e quyền; trang UI xem nhật ký để sau |

### 1c. Hàng đợi + thông báo

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 9 | CORE-16 | `QueueModule` (BullMQ, `REDIS_URL`); `worker.ts` process riêng; `start:worker`, `npm run dev` chạy thêm worker | Worker khởi động, nhận job mẫu | ✅ bullmq trực tiếp + Redis kết nối lười (API/test chạy được khi không có Redis); ioredis ghim 5.10.1 cho khớp bullmq. Nhận job thật kiểm ở task 11 |
| 10 | CORE-20 | `GET /health` (`@Public`): DB, Redis, heartbeat worker | Tắt Redis → báo degraded | ✅ Thật: worker chạy → ok; tắt worker 50s → degraded/worker down |
| 11 | NT-05 | Migration `Notification(accountId, link, data, actorId)`, `NotificationPreference`, `NotificationEventType` + seed 4 sự kiện email mặc định; `NotificationsService.notify()` → job → worker | Unit: giải người nhận, bỏ trùng, áp preference | ✅ 8 unit. Thật: test → queue → worker → inbox; Redis không có → ghi thẳng in-app, health degraded |
| 12 | NT-02, NT-03 | `GET /notifications`, `unread-count`, `POST :id/read`, `read-all` theo tài khoản đăng nhập; bỏ mock + query `userId` | E2E: không đọc được thông báo người khác (404) | ✅ Kiểm tra thật: khanglm đọc thông báo của admin → 404, gửi test → 403 |
| 13 | CORE-17, NT-04 | Gateway xác thực handshake, room `account:<id>`; worker emit qua Redis emitter; route web `GET /api/auth/socket-token`; bỏ handler demo | Socket không token bị ngắt; có token nhận sự kiện | ✅ 3 e2e (socket.io-client thật). Thật: admin nhận sau ~0,1s, người khác không nhận, không token → connect_error. Chưa có client UI |
| 14 | NT-06 | Hàng đợi `email` dùng SMTP đã cấu hình, retry 3 lần | Transport giả trong test | ✅ 9 unit (mẫu email, processor, sendEmail). Thật: job email chạy, SMTP tắt → smtp_disabled, không retry. Test dựng toàn bộ WorkerModule (bắt lỗi thiếu provider) |

### 1d. Lưu trữ file

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 15 | CORE-11 | `StoredFile`, `FilesModule` (S3 client tới MinIO), tạo bucket khi khởi động; `POST /files/presign`, `POST /files/:id/complete`, `GET /files/:id` (302), `DELETE /files/:id`, `POST /files` (multipart dự phòng) | E2E với MinIO local | |
| 16 | CORE-12 | MIME + dung lượng theo purpose (ảnh 10MB, tài liệu 25MB), `FileAccessPolicy` theo purpose | Unit + E2E sai loại bị từ chối | |
| 17 | HR-07 | Script chuyển `EmployeeDocument.content` lên MinIO; route tài liệu hồ sơ chuyển sang file service; web upload qua presign; hạ giới hạn body về 1MB | Tải lại tài liệu cũ sau migrate khớp checksum | |

### 1e. Import / export

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 18 | CORE-18 | Khung import: upload file (1d) → job validate → preview lỗi theo dòng → commit | Unit với file Excel mẫu | |
| 19 | CORE-19 | Khung export: job sinh xlsx → StoredFile → link tải | E2E | |

### 1f. Tài khoản & sửa lỗi

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 20 | AU-24 | Đăng nhập: user Keycloak chưa gắn tài khoản Helios → báo lỗi rõ, không cho vào | Trình duyệt với user `dungdd` hiện tại | |
| 21 | AU-11 | Ghi đè quyền riêng (có phạm vi) | E2E | |
| 22 | AU-13, AU-14, AU-15 | Đổi mật khẩu, quên mật khẩu (email qua 1c), admin đặt lại mật khẩu — qua Keycloak Admin API | E2E với Keycloak local | |
| 23 | AU-16, AU-17, AU-20 | Phiên đăng nhập, buộc đăng xuất, lịch sử đăng nhập (từ Keycloak events) | E2E | |
| 24 | AU-18, AU-19 | API chính sách 2FA và phiên, nối trang UI có sẵn | Trình duyệt | |
| 25 | CORE-25 | Sửa lỗi hydration mismatch trên mọi trang | Console không còn lỗi hydration | |

## Kiểm tra tay khi đóng phase

- [ ] Tài khoản phạm vi phòng ban chỉ thấy nhân sự phòng mình trên `/apps/personnel-profile-profile`.
- [ ] Upload tài liệu hồ sơ → lưu MinIO → tải về được; người ngoài phạm vi không tải được.
- [ ] Một sự kiện mẫu sinh thông báo realtime + email tới đúng người.
- [ ] `/health` báo đúng khi tắt Redis / worker.

## Gate đóng phase

Theo checklist "Khi đóng phase" trong roadmap.
