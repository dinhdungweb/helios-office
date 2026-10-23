# Phase 2 — Ca làm việc & engine tính công

Roadmap: [../roadmap.md](../roadmap.md#phase-2--ca-làm-việc--engine-tính-công) · Phạm vi: `npm run audit:features -- --phase 2` · Nhánh: `feat/phase-2`

Thiết kế: [attendance-engine](../design/attendance-engine.md). Mặc định theo thông lệ phổ biến, HR chỉnh sau; danh sách cần xem lại ở mục 10 của thiết kế.

## Mục tiêu

Từ log chấm công, ca, ngày lễ và chính sách công ty ra được bảng công tháng chính xác, chốt được, xuất được cho tính lương, và check-in được trên web/app ở điểm chấm công hợp lệ.

## Điều kiện bắt đầu

- [x] Phase 1 đã đóng (2026-10-21, PR `feat/phase-1` → `main` chờ merge).
- [x] Thiết kế engine tính công đã viết; các quy tắc là cài đặt, mặc định theo thông lệ (chủ dự án duyệt hướng này 2026-10-21).
- [ ] Nhánh `feat/phase-2` tạo từ `main` sau khi merge Phase 1.

## Phạm vi

22 item `todo` ban đầu: AT-05 → AT-21, AT-23, AT-24, DV-05 → DV-07; thêm AT-25, AT-28, AT-29 sau khi đối chiếu 1Office. Đã xong từ trước: AT-01 → AT-04, DV-01 → DV-04 (AT-02/03 sẽ được chuyển sang đọc kết quả của engine ở task 10). AT-22 (đơn được duyệt thì cập nhật công) thuộc Phase 3.

## Task

Chia 7 cụm, làm theo thứ tự. Đóng cụm nào chạy `npm run typecheck && npm run lint && npm run test && npm run audit:features -- --strict`; task có giao diện thì thử trên trình duyệt.

### 2a. Ca, ngày lễ, chính sách

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 1 | AT-05, AT-06 | Migration `Shift`, `AttendancePolicy` (kèm múi giờ công ty), `Department.defaultShiftId`; seed ca `HC` và chính sách mặc định. CRUD `/shifts` (ca đã dùng chỉ lưu trữ được, không xoá được). Trang danh mục ca trong cài đặt chấm công | Unit: validate giờ, ca qua đêm, nghỉ nằm trong ca. E2E quyền. Trình duyệt: tạo ca đêm, ca linh hoạt | ✅ 18 unit. Thật: ca đêm/linh hoạt, ca sai bị từ chối kèm lý do, ca mặc định không lưu trữ/xoá được, lưu trữ/khôi phục/xoá |
| 2 | AT-06 | `GET/PATCH /attendance-policy` + trang Chính sách chấm công (các lựa chọn ở thiết kế mục 4); ca ghi đè chính sách | Unit: gộp chính sách với phần ghi đè của ca | ✅ Trang Chính sách chấm công (6 nhóm, có ví dụ cho HR); lưu và tải lại giữ nguyên |
| 3 | AT-10 | CRUD `/holidays` (lễ, làm bù, công ty nghỉ; có/không hưởng công); seed các ngày lễ dương lịch cố định; trang lịch ngày lễ theo năm | E2E. Trình duyệt: thêm Tết theo lịch Chính phủ | ✅ 6 unit. Thật: thêm Tết, trùng ngày bị từ chối, ngày làm bù, sửa, thêm lễ cố định 2028 |

### 2b. Xếp ca

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 4 | AT-07 | `ShiftAssignment` (duy nhất `employeeId + date`), API xếp/xoá; `ShiftResolver`: lịch riêng → ca phòng ban → ca công ty → nghỉ; trang lịch ca theo tuần (người × ngày), lọc theo phòng ban, áp phạm vi dữ liệu | Unit theo bảng cho resolver. Từ chối xếp vào kỳ đã chốt | ✅ 10 unit resolver + 7 unit service. Trang Lịch ca trong HCNS; thật: làm bù thứ 7 hiện ca, xếp / về mặc định, ca mặc định phòng ban. Chặn kỳ đã chốt làm ở task 13 |
| 5 | AT-08 | `POST /shift-assignments/bulk`: chọn người/phòng ban × khoảng ngày × ca hoặc mẫu lặp (`ShiftPattern`); xem trước số dòng tạo/ghi đè trước khi lưu | Unit: sinh lịch lặp 2 tuần trong 3 tháng. Trình duyệt | ✅ `ShiftPattern` + `POST /shift-assignments/bulk` (xem trước / ghi đè hoặc giữ), 14 unit mới. Trình duyệt: mẫu 14 ngày → lưới tháng đúng mẫu |
| 6 | AT-09 | `GET /shift-assignments/me` + lịch ca của tôi (tháng) trên `/user/attendance` | Trình duyệt với `khanglm` | ✅ 2 unit. Bảng công cá nhân: ca từng ngày, ngày lễ, công chuẩn theo lịch ca, xem chi tiết ca; bỏ số liệu cứng (26 công, 208 giờ, tiền phạt mẫu) |

### 2c. Engine tính công

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 7 | AT-11 | Engine thuần `calculateDay` (thiết kế mục 6.2), tiện ích thời gian theo múi giờ công ty | **Bảng trường hợp**: 9 ví dụ ở mục 6.4 + ca đêm qua 0 giờ, ca linh hoạt, lễ có/không đi làm, một log duy nhất, log rơi vào khung hai ca, mọi lựa chọn chính sách, đổi giờ server sang UTC vẫn ra cùng kết quả | ✅ 26 test (9 ví dụ thiết kế + mọi lựa chọn chính sách + ca linh hoạt/lễ/làm bù/sửa tay + chia log giữa hai ca); chạy dưới TZ UTC và New York vẫn đạt |
| 8 | AT-11 | Migration `AttendanceDay`, `AttendanceAdjustment`; service đọc log theo lô → engine → ghi kết quả; sửa `parsePunchTime`/ghép ngày theo múi giờ công ty; đồng bộ máy chấm công gọi tính lại ngày bị ảnh hưởng (kể cả ngày trước đó, cho ca đêm) | E2E: sync log ca đêm → một ngày công. Tính lại toàn bộ log gốc hiện có | ✅ 13 test mới (ca đêm qua 0 giờ, chia log giữa ca đêm và ca sáng, ngày nghỉ, làm bù, ngoài thời gian làm việc, sửa tay, giờ không kèm múi giờ). `npm run attendance:recalculate` cho 461 ngày công, chạy lại 0 thay đổi. Thật: đồng bộ 08:10–17:05 → muộn 10, 0,98 công |
| 9 | AT-12 | Hàng đợi `attendance-recalc` + `POST /attendance/recalculate` (khoảng ngày, phòng ban, người) trả id job; tự tính lại khi đổi lịch ca / ngày lễ / chính sách / ca; bỏ qua kỳ đã chốt | Unit: idempotent, bỏ qua kỳ chốt. Thật: đổi ngưỡng muộn → bảng công đổi | ✅ 9 unit (job nhỏ/lớn, hết Redis, ngày tương lai, lỗi, khoảng tính khi đổi quy tắc, trigger không làm hỏng thao tác) + trigger trong các service. Thật: ngưỡng 15 phút → hết muộn, về 0 → muộn 10. Trang Cài đặt → Tính lại công. Bỏ qua kỳ chốt làm ở task 13 |
| 10 | AT-02, AT-03 | `GET /attendance`, `GET /attendance/me` đọc `AttendanceDay` (phân trang CORE-10, phạm vi dữ liệu); `/user/attendance` hiện giờ vào/ra, muộn/sớm, công theo ca; bỏ ghi vào `AttendanceRecord` | Trình duyệt. Sau đó bỏ bảng cũ | ✅ 3 unit. Thật với khanglm: muộn 12' → 7,8 giờ V, 0,98 công; sớm 30'; thiếu giờ ra → cần giải trình; dashboard HCNS và tổng hợp đọc kết quả mới. Bảng `AttendanceRecord` đã bỏ (migration `20261022080000_drop_attendance_record`) |

### 2d. Bảng công tháng

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 11 | AT-15 | `PATCH /attendance/:id` sửa tay (bắt buộc lý do), lịch sử sửa, "Bỏ sửa tay"; tính lại giữ phần đã sửa | Unit: tính lại sau khi sửa tay. E2E: kỳ chốt từ chối | ✅ 6 unit (gộp sửa, giờ theo múi công ty, ra hôm sau, bỏ sửa tay, lịch sử). Thật: sửa / bỏ sửa từ bảng chấm công. Kỳ chốt từ chối làm ở task 13 |
| 12 | AT-16 | `GET /attendance/timesheets?month&departmentId` (dòng người × cột ngày + tổng), phạm vi dữ liệu; trang bảng công tháng (ký hiệu, tô màu, bấm vào ô để xem chi tiết và sửa) | E2E: trưởng phòng chỉ thấy phòng mình. Trình duyệt | ✅ 2 unit (ô, tổng, công chuẩn trừ lễ, người vào giữa tháng, phạm vi dữ liệu). Trang Công → Bảng chấm công; thử với admin và khanglm (không có quyền thì không thấy tab) |
| 13 | AT-17 | `AttendancePeriod`; chốt / mở chốt (khoá `attendance.period.lock`, mở bắt buộc lý do, có audit); ghi `PayrollCycle.lockedAttendanceAt` | E2E: sau khi chốt, sửa/tính lại/xếp ca đều bị từ chối | ✅ 9 unit (chốt / mở chốt, đóng dấu kỳ lương, thông báo kỳ đã chốt, tính lại bỏ qua, sửa công và xếp ca bị chặn). Thật: chốt tháng 10 → không sửa, không xếp ca, tính lại bỏ qua 88 ngày; mở chốt bắt buộc lý do |
| 14 | AT-24 | `GET /attendance/me/timesheet`, `POST .../confirm` (xác nhận hoặc phản hồi); HR thấy ai chưa xác nhận / có phản hồi | Trình duyệt hai vai | ✅ 6 unit. Thật: HR mở xác nhận → khanglm phản hồi → HR ghi cách xử lý → khanglm thấy và xác nhận lại → bộ đếm 1/4 |
| 15 | AT-18 | Export bảng công qua khung Export của CORE-19 (bảng tháng + sheet chi tiết ngày) | Mở file .xlsx, tổng khớp màn hình | ✅ 2 unit. File 2 sheet; HL-003 tháng 10 khớp màn hình (7,8 / 7,5 giờ, 1,92 công, chuẩn 22, 15,3 giờ) |

### 2e. Máy chấm công và log gốc

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 16 | AT-19 | CRUD `/attendance-devices` (tên, mã cửa hàng/nơi làm việc, trạng thái, lần đồng bộ cuối); máy bị tắt thì từ chối sync | Unit + trình duyệt (thay E2E): tắt máy → sync 403 | ✅ |
| 17 | AT-20 | `GET /attendance/sync-errors`, `POST .../:id/resolve`: gán mã chấm công cho nhân sự rồi xử lý lại các log lỗi của mã đó | Unit + trình duyệt (thay E2E): log `EMPLOYEE_NOT_FOUND` → gán mã → vào log gốc, tính lại công | ✅ |
| 18 | AT-21 | `GET /attendance/raw-logs` (lọc người/máy/khoảng ngày, phân trang, phạm vi dữ liệu); xem từ ô bảng công | Trình duyệt | ✅ |
| 19 | AT-23 | Job hằng ngày: nhắc qua thông báo (NT-05) những người thiếu log của ngày hôm trước; giờ chạy cấu hình được | Unit: chọn đúng người, không nhắc ngày nghỉ/lễ | ✅ |

### 2f. Check-in trên web/app

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 20 | DV-07 | CRUD `/attendance-locations` (GPS + bán kính, wifi SSID/BSSID, dải IP; gắn nơi làm việc); trang quản lý có bản đồ chọn điểm | Unit: kiểm tra khoảng cách, dải IP | |
| 21 | DV-05 | `POST /device-auth/my-requests`, `GET /device-auth/my-devices`: nhân viên tự đăng ký thiết bị; HR duyệt ở màn hình đã có | Trình duyệt hai vai | |
| 22 | AT-13, DV-06 | `POST /attendance/check-in`, `check-out`: kiểm tra thiết bị đã duyệt + điểm hợp lệ theo `DeviceAuthPolicy`, ghi `AttendanceRawLog(source = web/app)`, tính lại ngày; nút chấm công trên `/user/attendance` | E2E: từng lý do từ chối. Trình duyệt với vị trí giả lập | |
| 23 | AT-14 | Ảnh khi check-in (file service, mục đích `attendance_photo`) + toạ độ; HR xem ảnh từ ô bảng công | Trình duyệt | |

### 2h. Bổ sung theo 1Office

Tổ chức màn hình (2026-10-22): HCNS là nhóm quyền như 1Office, không có khu riêng. Mọi màn chấm công nằm trong phân hệ **Công** (`/user/attendance/...`) với tab hiện theo quyền: Bảng công cá nhân, Phân ca, Cài đặt; Bảng chấm công (task 12) và Máy chấm công (task 16–18, `/user/attendance/devices`) thêm vào cùng chỗ.

Đọc 1Office ngày 2026-10-22 (chỉ xem): [1office-attendance-reference.md](../design/1office-attendance-reference.md). Quyết định ở thiết kế mục 9a. Ngưỡng muộn/sớm đã đổi mặc định về 0 (migration `20261022040000_zero_late_grace`).

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 25 | AT-07 | Lịch ca xem theo tháng như Phân ca của 1Office (ô hiện mã ca, `N` khi không có ca), giữ xem theo tuần | Trình duyệt | ✅ Nút Tuần / Tháng, cột cuối tuần tô xám, `N` khi không có ca |
| 26 | AT-25 | Công chuẩn theo nhóm phòng ban × vị trí: tự tính (ngày trong kỳ trừ chủ nhật) hoặc số cố định; cột Công chuẩn ở bảng công | Unit: chọn đúng nhóm, tháng 2 và tháng 31 ngày | |
| 27 | AT-28 | Cài đặt kiểu 1Office: giới hạn sửa phân ca sau N ngày và tạo trước tối đa N ngày, muộn/sớm theo giây, tách giờ qua ngày, làm thêm qua ngày tính ngày trước, số ngày liên tiếp không cần chốt | Unit engine cho từng cài đặt | |
| 28 | AT-29 | Tự động nhận ca: ngày chưa xếp ca thì chọn ca khớp log nhất trong các ca áp dụng cho phòng ban / vị trí | Unit: hai ca sáng/chiều, log 13:05 → ca chiều | |

### 2g. Đối chiếu và đóng phase

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 24 | – | Nạp một tháng log thật từ máy chấm công, HR chỉnh chính sách theo mục 10 thiết kế, so bảng công với bảng HR tính tay; mỗi chỗ lệch phải giải thích được bằng một cài đặt hoặc thành bug | **Tiêu chí hoàn thành của roadmap** | |

## Rủi ro và cách xử lý

- **Lệch so với cách HR tính tay:** mọi quy tắc là cài đặt; task 24 là cổng bắt buộc trước khi đóng phase.
- **Dữ liệu công cũ theo múi giờ máy chủ:** không chép sang; tính lại từ `AttendanceRawLog` (task 8).
- **Tính lại cả tháng chậm:** chạy trong job, đọc log theo lô, engine không gọi DB (task 7–9).
- **Máy dev thiếu bộ nhớ:** chạy test lần lượt (`--runInBand`), không build khi đang chạy dev.
