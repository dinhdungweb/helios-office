# Thiết kế: Ca làm việc và engine tính công

Backlog: `AT-05` → `AT-21`, `AT-23`, `AT-24`, `DV-05` → `DV-07` · Phase 2 · Trạng thái: **Bản nháp 2026-10-21**. Giá trị mặc định chọn theo thông lệ phổ biến; HR chỉnh lại trên giao diện, xem mục 10.

## 1. Vấn đề

Hiện tại `POST /attendance/sync` nhận log từ máy chấm công và ghi `AttendanceRecord`: lần chấm đầu là giờ vào, lần cuối là giờ ra. Thiếu lần ra thì đánh dấu `missing_checkout`. Cách này có ba lỗi:

1. **Không có ca.** Không biết giờ vào chuẩn, nên không tính được đi muộn, về sớm, thiếu công.
2. **Gom log theo ngày dương lịch.** Ca 22:00 → 06:00 bị tách thành hai ngày, mỗi ngày đều thiếu log.
3. **Phụ thuộc múi giờ máy chủ.** `new Date(y, m, d)` lấy múi giờ của server, nên deploy lên server UTC thì ngày công lệch 7 tiếng.

Phase 2 cần từ log chấm công, ca, ngày lễ và chính sách công ty ra được **bảng công tháng khớp cách HR tính tay**, chốt được, và xuất được cho tính lương ở Phase 5.

## 2. Mục tiêu và ngoài phạm vi

Mục tiêu:

- Mọi quy tắc tính công là **cài đặt**, không viết cứng: chính sách chung của công ty, từng ca được phép ghi đè.
- Engine là **hàm thuần**: cùng đầu vào cho cùng kết quả. Phần này được test dày theo bảng trường hợp.
- Tính lại được bất cứ lúc nào cho ngày chưa chốt; ngày đã chốt thì không đổi.
- HR sửa công tay có lịch sử, và lần tính lại sau **không ghi đè** phần HR đã sửa.

Ngoài phạm vi (phase khác):

- Đơn nghỉ, OT, đổi ca, giải trình được duyệt thì cập nhật công: `AT-22`, Phase 3. Thiết kế ở đây chừa sẵn chỗ (mục 6.6).
- Tính tiền lương, tiền phạt đi muộn: Phase 5. Engine chỉ ra số phút, số công và số giờ OT.
- Ca động theo từng giờ (bán lẻ chia ca 2–4 tiếng nhiều lần mỗi ngày): chưa hỗ trợ. Mỗi người mỗi ngày tối đa **một ca**. Nếu cần thì thêm sau, mô hình dữ liệu không chặn.

## 3. Khái niệm

| Khái niệm | Nghĩa |
|---|---|
| **Ngày công** (`workDate`) | Ngày mà một ca được tính công cho. Ca qua đêm tính cho **ngày bắt đầu ca** (mặc định). |
| **Ca** (`Shift`) | Mẫu giờ làm: giờ vào, giờ ra, nghỉ giữa ca, số công, ngưỡng muộn/sớm. |
| **Lịch ca** (`ShiftAssignment`) | Người X làm ca Y vào ngày Z. |
| **Khung nhận log** | Khoảng quanh ca mà log chấm được coi là của ca đó, mặc định từ 4 giờ trước giờ vào tới 4 giờ sau giờ ra. |
| **Công** | Đơn vị ngày công. Ca hành chính đủ giờ = 1 công. |
| **Kết quả ngày** (`AttendanceDay`) | Kết quả engine cho một người trong một ngày công: giờ vào/ra, phút muộn/sớm, số công, trạng thái. |
| **Kỳ công** (`AttendancePeriod`) | Một tháng, có trạng thái mở hoặc đã chốt. |

**Múi giờ:** mọi phép tính ngày và giờ dùng **múi giờ công ty**, cấu hình được, mặc định `Asia/Ho_Chi_Minh`. Không dùng múi giờ của máy chủ. Log máy chấm công gửi lên không kèm múi giờ thì hiểu là giờ công ty. Sửa luôn chỗ `parsePunchTime` và `rebuildDailyAttendance` hiện tại.

## 4. Chính sách chấm công

Một bản ghi `AttendancePolicy` chung cho công ty. Ca có các trường cùng tên để để trống (dùng giá trị của chính sách) hoặc ghi đè.

| Cài đặt | Các lựa chọn | Mặc định |
|---|---|---|
| Ngày làm việc trong tuần | Chọn các thứ | Thứ 2 → thứ 6 |
| Ca mặc định khi chưa xếp ca | Một ca trong danh mục | Ca hành chính 08:00–17:00 |
| Cho phép đi muộn (phút) | 0–120 | 0 (như 1Office: ghi nguyên phút muộn) |
| Cho phép về sớm (phút) | 0–120 | 0 |
| Muộn/sớm vượt ngưỡng thì tính | Toàn bộ số phút / chỉ phần vượt ngưỡng | Toàn bộ số phút |
| Làm tròn giờ vào/ra | Không / 5 / 15 / 30 phút | Không làm tròn |
| Nhiều lần chấm trong ngày | Lần đầu + lần cuối / ghép từng cặp vào–ra | Lần đầu + lần cuối |
| Khung nhận log trước giờ vào / sau giờ ra | 0–12 giờ | 4 giờ / 4 giờ |
| Ca qua đêm tính công cho | Ngày bắt đầu / ngày kết thúc ca | Ngày bắt đầu ca |
| Quên chấm vào hoặc ra | Thiếu công, chờ giải trình (0 công) / nửa công / lấy giờ chuẩn của ca | Thiếu công, chờ giải trình |
| Cách tính số công | Theo giờ làm thực tế / đủ công nếu có mặt đủ vào–ra | Theo giờ làm thực tế |
| Làm tròn số công | 0,01 / 0,5 / 0,25 | 0,01 |
| Giờ làm ngoài ca | Ghi nhận để tham khảo / bỏ qua | Ghi nhận để tham khảo (chỉ thành OT khi có đơn OT được duyệt, Phase 3) |
| Hệ số OT ngày thường / ngày nghỉ tuần / ngày lễ | Số | 150% / 200% / 300% (Bộ luật Lao động 2019, Điều 98) |
| Phụ cấp làm đêm (22:00–06:00) | Số | +30% (Điều 98) |
| Ngày lễ không đi làm | Hưởng nguyên công / không tính | Hưởng nguyên công của ca |

Đổi chính sách thì tính lại các ngày **chưa chốt**. Mỗi `AttendanceDay` lưu lại bản chính sách đã dùng (`policySnapshot`), nên tra được vì sao ra con số đó.

## 5. Ca làm việc

### 5.1 Loại ca

- **Cố định** (`fixed`): giờ vào và giờ ra cố định, có thể qua đêm. Ví dụ hành chính 08:00–17:00, ca đêm 22:00–06:00.
- **Linh hoạt** (`flexible`): chỉ cần đủ số giờ trong một khung. Ví dụ đủ 8 giờ trong khoảng 07:00–19:00. Không tính đi muộn; chỉ tính thiếu giờ.

### 5.2 Trường của ca

| Trường | Ghi chú |
|---|---|
| `code`, `name`, `color` | Mã ngắn hiện trên lịch, ví dụ `HC`, `CĐ`, `C1` |
| `type` | `fixed` / `flexible` |
| `startMinute`, `endMinute` | Phút trong ngày (0–1439). `end ≤ start` nghĩa là ca qua đêm |
| `breakStartMinute`, `breakEndMinute` | Nghỉ giữa ca, có thể để trống |
| `requiredMinutes` | Ca linh hoạt: số phút cần đủ. Ca cố định: tự tính bằng độ dài ca trừ nghỉ |
| `workUnits` | Số công của ca khi đủ giờ, mặc định 1. Ca nửa ngày = 0,5 |
| Trường ghi đè chính sách | Ngưỡng muộn/sớm, cách tính muộn, quên chấm, khung nhận log; để trống thì dùng chính sách chung |
| `status` | `active` / `archived`. Ca đã dùng thì không xoá, chỉ lưu trữ |

**Ca có sẵn khi khởi tạo:** `HC` hành chính 08:00–17:00, nghỉ 12:00–13:00, 1 công (8 giờ làm). Thêm ca khác là việc của HR.

### 5.3 Xếp ca

Thứ tự tìm ca của một người cho một ngày:

1. **Lịch ca riêng** (`ShiftAssignment`) của người đó trong ngày đó, nếu có. Lịch này cũng có thể là "nghỉ".
2. Nếu không có: **ca mặc định của phòng ban** (trường mới `Department.defaultShiftId`), áp cho các ngày làm việc trong tuần.
3. Nếu không có: **ca mặc định của công ty**, áp cho các ngày làm việc trong tuần.
4. Các ngày còn lại trong tuần là ngày nghỉ.

Nhờ bậc 2 và 3, công ty làm hành chính **không phải xếp ca từng ngày**; chỉ người làm ca khác mới cần xếp.

Lịch ca lưu **từng ngày một** (`employeeId + date`, duy nhất), để truy vấn và sửa từng ngày dễ dàng. Xếp ca hàng loạt hoặc theo lịch lặp (`AT-08`, ví dụ "tuần A ca 1, tuần B ca 2, lặp 3 tháng") sinh ra các dòng từng ngày và ghi lại mẫu đã dùng (`ShiftPattern`) để làm lại khi cần. Xếp ca cho phòng ban sinh dòng cho các nhân sự **đang ở phòng đó lúc xếp**.

Xếp ca cho ngày nằm trong kỳ đã chốt thì bị từ chối.

## 6. Engine tính công

### 6.1 Đầu vào và đầu ra

```
calculateDay(input) → result

input:
  employee      : { id, startDate, endDate }     // chưa vào làm / đã nghỉ việc → không tính
  workDate      : "2026-10-21"                   // ngày công, theo múi giờ công ty
  shift         : Shift | null                    // ca đã giải theo mục 5.3; null = ngày nghỉ
  holiday       : Holiday | null
  punches       : Instant[]                       // log trong khung nhận log, đã sắp xếp
  policy        : AttendancePolicy                // đã gộp phần ghi đè của ca
  adjustments   : Adjustment[]                    // HR sửa tay; Phase 3: đơn được duyệt

result:
  checkIn, checkOut, workedMinutes, lateMinutes, earlyMinutes,
  outsideShiftMinutes, nightMinutes, workUnits, paidLeaveUnits,
  status, flags[], policySnapshot
```

Engine **không đọc DB**. Service lấy dữ liệu, gọi engine, rồi ghi kết quả. Nhờ vậy test theo bảng không cần DB.

### 6.2 Các bước

1. **Ngoài thời gian làm việc** (trước `startDate` hoặc sau `endDate`): không tạo kết quả.
2. **Khung ca:** từ `workDate` và ca, dựng `scheduledStart` và `scheduledEnd` theo múi giờ công ty. Ca qua đêm thì `scheduledEnd` sang ngày hôm sau. Khung nhận log là `[scheduledStart − before, scheduledEnd + after]`.
3. **Chọn log:** lấy log trong khung nhận log. Một log rơi vào khung của hai ca liền nhau thì thuộc ca có giờ chuẩn gần log hơn. Không log nào được tính hai lần.
4. **Giờ vào/ra:** theo chính sách là lần đầu + lần cuối, hoặc ghép từng cặp. Có đúng một log thì log đó là giờ vào nếu gần giờ vào hơn, ngược lại là giờ ra. Sau đó làm tròn nếu có cấu hình.
5. **Đi muộn:** `late = max(0, checkIn − scheduledStart)`. Nếu `late ≤ grace` thì 0. Nếu vượt ngưỡng: tính toàn bộ, hoặc chỉ phần `late − grace`, tuỳ chính sách. Về sớm tính tương tự. Ca linh hoạt không tính muộn hay sớm.
6. **Phút làm:** phần giao giữa `[checkIn, checkOut]` và khung ca, trừ phần trùng với giờ nghỉ giữa ca. Phần nằm ngoài khung ca ghi vào `outsideShiftMinutes`.
7. **Số công:**
   - Theo giờ thực tế: `workUnits = shift.workUnits × min(1, workedMinutes / requiredMinutes)`, làm tròn theo chính sách.
   - Đủ công nếu có mặt: có đủ vào và ra thì được `shift.workUnits`.
8. **Thiếu log:** áp lựa chọn "quên chấm", trạng thái `missing_checkin` hoặc `missing_checkout`, cờ `needs_explanation`.
9. **Ngày lễ:** không đi làm và lễ có hưởng lương thì `paidLeaveUnits = shift.workUnits`, trạng thái `holiday`. Có đi làm thì tính công như thường, kèm cờ `worked_on_holiday` để Phase 3/5 áp hệ số OT.
10. **Không có log, ngày có ca, không phải lễ:** trạng thái `absent`, 0 công.
11. **Sửa tay** (mục 7): ghi đè các trường HR đã sửa, sau mọi bước trên.

### 6.3 Trạng thái

`on_time`, `late`, `early_leave`, `late_and_early`, `missing_checkin`, `missing_checkout`, `absent`, `holiday`, `day_off`, `leave` (Phase 3), `adjusted` (HR đã sửa). Trạng thái dùng để lọc và giải thích; ô bảng công tháng hiện theo cách của 1Office (mục 8).

### 6.4 Ví dụ (cũng là test bắt buộc)

Ca HC 08:00–17:00, nghỉ 12:00–13:00 (480 phút, 1 công), ngưỡng muộn/sớm 5 phút (giá trị của bộ test, mặc định thật là 0), tính toàn bộ phút, theo giờ thực tế.

| # | Log | Muộn | Sớm | Phút làm | Công | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | 07:55, 17:02 | 0 | 0 | 480 | 1 | on_time |
| 2 | 08:04, 17:00 | 0 (trong ngưỡng) | 0 | 476 | 0,99 | on_time |
| 3 | 08:12, 17:00 | 12 | 0 | 468 | 0,98 | late |
| 4 | 08:00, 16:30 | 0 | 30 | 450 | 0,94 | early_leave |
| 5 | 08:00 | – | – | – | 0 | missing_checkout |
| 6 | (không có) | – | – | 0 | 0 | absent |
| 7 | 08:00, 12:00, 13:00, 17:00 | 0 | 0 | 480 | 1 | on_time |
| 8 | 13:00, 17:00 (đi làm buổi chiều) | 300 | 0 | 240 | 0,5 | late |

Ca đêm 22:00–06:00 (sang hôm sau), không nghỉ, 1 công: log 21:58 ngày 21/10 và 06:01 ngày 22/10 → **một** kết quả cho ngày công 21/10, đủ 1 công, `nightMinutes = 480`.

Trường hợp 2 cho 0,99 công dù không bị tính muộn. Nếu HR muốn trong ngưỡng vẫn đủ 1 công, thì chọn "đủ công nếu có mặt", hoặc làm tròn số công theo 0,5. Đây là điểm cần HR xem lại đầu tiên (mục 10).

### 6.5 Khi nào tính lại

| Sự kiện | Phạm vi tính lại | Cách chạy |
|---|---|---|
| Đồng bộ log từ máy chấm công, check-in web/app | Ngày công của các log mới (gồm ngày trước đó, cho ca đêm) | Ngay trong request, vì số ngày ít |
| Đổi lịch ca | Người và ngày bị đổi | Ngay |
| Thêm/sửa/xoá ngày lễ | Mọi người trong ngày đó | Job BullMQ `attendance-recalc` |
| Đổi chính sách hoặc sửa ca | Các ngày **chưa chốt** có dùng chính sách/ca đó | Job |
| `POST /attendance/recalculate` (`AT-12`) | Khoảng ngày, có thể lọc phòng ban hoặc người | Job, trả về id job để theo dõi |

Ngày thuộc kỳ đã chốt luôn bị bỏ qua và được ghi vào kết quả của job. Tính lại idempotent: chạy hai lần ra cùng kết quả.

Đã làm (AT-12, 2026-10-22): mỗi yêu cầu là một dòng `AttendanceRecalcJob` (khoảng ngày, người, lý do, trạng thái, kết quả), xem ở Cài đặt → Tính lại công. Yêu cầu nhỏ (≤ 400 người × ngày) chạy ngay trong request, lớn hơn thì vào hàng đợi `attendance-recalc` (worker chạy từng job một); Redis không có thì chạy nền trong API. Không tính ngày chưa tới. Đổi chính sách / sửa ca đang dùng / ca mặc định phòng ban tính lại từ đầu tháng trước đến hôm nay, cho tới khi có chốt kỳ (AT-17) thì đổi thành "từ kỳ chưa chốt". Một ngày chỉ được ghi lại (và đổi nguồn thay đổi) khi số liệu đổi; nếu chỉ khác bản chính sách lưu kèm thì cập nhật bản đó, không tính là thay đổi.

### 6.6 Chỗ chừa cho Phase 3

`adjustments` có thêm loại `leave` (nghỉ có/không lương, số công), `business_trip`, `explanation` (giải trình quên chấm → coi như có log), `overtime` (giờ OT được duyệt), `shift_swap` (đổi ca → đổi ca của ngày). Phase 3 ghi các adjustment này khi đơn được duyệt rồi gọi tính lại. Engine Phase 2 đã nhận loại `manual`; các loại khác thêm vào sau mà không phải đổi cấu trúc.

## 7. Sửa công tay (AT-15)

- HR sửa trên một `AttendanceDay` các trường giờ vào, giờ ra, số công, trạng thái, ghi chú. **Lý do là bắt buộc.**
- Mỗi lần sửa ghi một `AttendanceAdjustment` (`type = manual`): giá trị trước/sau, người sửa, lý do. Kèm thêm một dòng audit log.
- Tính lại không ghi đè trường đã sửa tay. HR có nút "Bỏ sửa tay" để trả về kết quả của engine.
- Không sửa được ngày thuộc kỳ đã chốt.

## 8. Bảng công tháng và chốt công (AT-16, AT-17, AT-24)

- **Bảng công tháng:** mỗi dòng một người, mỗi cột một ngày (đầu cột ghi thứ và ngày, cuối tuần tô xám). Ô ngày theo 1Office: hiện **số giờ làm** (bao gồm làm thêm) hoặc **số công**, HR chọn trong chính sách; chữ nhỏ phía trên là mã nghỉ (Phase 3), `V` khi có vi phạm (muộn, sớm, thiếu log), `+` khi có giờ ngoài ca/làm thêm; `N` khi không có ca; ngày lễ ghi `L`. Bấm ô xem giờ vào/ra, phút muộn/sớm, log gốc và lịch sử thay đổi của ô. Cột tổng theo nhóm của 1Office: Đi muộn (số phút), Về sớm (số phút), Quên chốt (số lần), Nghỉ không lý do (số ngày), Công chính (công ca, công lễ, giờ làm đêm, giờ ngày lễ, giờ ngày nghỉ), Giờ ngoài ca, Công chuẩn (AT-25), Công tổng (tổng giờ, số công). Cột tiền phạt / công phạt, nghỉ theo loại, phép đầu kỳ–cuối kỳ thêm khi có đơn từ (Phase 3) và công thức (AT-27). Lọc theo phòng ban, có phân trang (CORE-10), và theo **phạm vi dữ liệu** (CORE-15): trưởng phòng chỉ thấy phòng mình.
- **Chốt kỳ:** `AttendancePeriod(month, status, lockedAt, lockedBy)`. Chốt xong thì cấm tính lại, cấm sửa tay, cấm xếp ca trong tháng. Ghi `PayrollCycle.lockedAttendanceAt` nếu có kỳ lương trùng tháng. Mở chốt cần quyền riêng, bắt buộc lý do và có audit.
- **Nhân viên xác nhận công** (`AT-24`): sau khi HR mở cho xác nhận, nhân viên xem bảng công của mình rồi bấm "Xác nhận" hoặc "Phản hồi" kèm nội dung. HR thấy ai chưa xác nhận và ai có phản hồi. Mặc định không bắt buộc xác nhận mới được chốt; HR bật bắt buộc trong chính sách nếu cần.
- **Export** (`AT-18`): dùng khung Export Excel của CORE-19, gồm bảng tháng và chi tiết từng ngày.

## 9. Check-in trên web/app và điểm chấm công (AT-13, AT-14, DV-05 → DV-07)

- **Lưu log:** log từ web/app ghi vào `AttendanceRawLog` như log máy, thêm `source = web | app`. `deviceId` của máy thì cho phép để trống. Các trường mới: toạ độ, độ chính xác GPS, SSID/BSSID, IP, `deviceAuthRequestId`, `photoFileId` (ảnh qua file service, mục đích `attendance_photo`), `locationId`.
- **Điểm chấm công hợp lệ** (`AttendanceLocation`, `DV-07`): loại GPS (toạ độ + bán kính, mặc định 100 m), wifi (SSID/BSSID), dải IP. Có thể gắn với nơi làm việc (`Workplace`).
- **Kiểm tra khi check-in:**
  - thiết bị đã được duyệt (`DV-06`, theo `DeviceAuthPolicy`);
  - đứng trong một điểm hợp lệ, theo `requireGpsForAttendance` và `requireWifiForOffice`;
  - ảnh có kèm nếu chính sách yêu cầu.

  Sai điều kiện nào thì từ chối, kèm lý do cụ thể. **Không** lưu log "nghi ngờ" để tự duyệt sau.
- Chống bấm hai lần: lần check-in cách lần trước dưới 1 phút thì bỏ qua.
- **Trình duyệt không đọc được wifi.** Trên web, "wifi văn phòng" kiểm tra bằng dải IP công cộng của văn phòng (điểm kiểu IP); SSID/BSSID chỉ dùng cho app. Web server chuyển IP của trình duyệt cho API kèm `WEB_SERVICE_TOKEN`; API chỉ tin IP chuyển tiếp khi token đúng. Mỗi cách kiểm tra được bật là một cách hợp lệ: GPS khớp hoặc mạng văn phòng khớp đều được; tắt cả hai thì không kiểm tra vị trí.
- Lấy vị trí luôn lấy mới (không dùng vị trí cũ trong bộ nhớ trình duyệt), vì vị trí cũ có thể là lúc nhân viên còn ở ngoài.
- **Nhân viên tự đăng ký thiết bị** (`DV-05`): gửi yêu cầu từ trình duyệt hoặc app, HR duyệt trong màn hình đã có (DV-01 → 04).

## 9a. Đối chiếu với 1Office

Hành vi 1Office đang dùng ghi ở [1office-attendance-reference.md](1office-attendance-reference.md). Chủ dự án chốt ngày 2026-10-22:

- **Công thức tuỳ biến** (cột mới, phạt tiền, công chuẩn dạng công thức) làm ở Phase 5 cùng bộ công thức lương (`AT-27`). Phase 2 engine tính sẵn các đại lượng gốc, đặt tên để sau này dùng làm từ khoá: phút muộn/sớm, giờ làm, công ca, công lễ, giờ đêm, giờ ngoài ca, quên chốt.
- **Ô bảng công** hiện như 1Office (mục 8).
- **Ngưỡng muộn/sớm** mặc định 0 như 1Office.
- Thêm vào Phase 2: công chuẩn theo phòng ban / vị trí (`AT-25`), cài đặt chung kiểu 1Office (`AT-28`), tự động nhận ca (`AT-29`), lịch ca xem theo tháng. Mẫu bảng chấm công nhiều đối tượng (`AT-26`) làm ở Phase 5; ca nhiều khoảng (`AT-30`) để Phase 9.

## 10. Mặc định cần HR xem lại

Tất cả đổi được trên giao diện sau khi chạy. Thứ tự theo mức ảnh hưởng tới bảng công:

| # | Câu hỏi | Mặc định đang chọn |
|---|---|---|
| 1 | Đi muộn trong ngưỡng có trừ công không? (ví dụ 6.4 #2) | Có trừ theo phút làm thực tế (0,99 công) |
| 2 | Ngưỡng cho phép đi muộn / về sớm | 0 / 0 (như 1Office; miễn hay phạt sẽ do công thức ở AT-27) |
| 3 | Vượt ngưỡng thì tính toàn bộ phút hay phần vượt? | Toàn bộ |
| 4 | Quên chấm ra xử lý thế nào? | 0 công, chờ giải trình (Phase 3) hoặc HR sửa |
| 5 | Ngày làm việc trong tuần | Thứ 2 → thứ 6 |
| 6 | Ca hành chính | 08:00–17:00, nghỉ 12:00–13:00 |
| 7 | Ca đêm tính cho ngày nào? | Ngày bắt đầu ca |
| 8 | Hệ số OT, phụ cấp đêm | 150% / 200% / 300%, đêm +30% |
| 9 | Có bắt buộc nhân viên xác nhận công trước khi chốt? | Không |
| 10 | Ngày lễ âm lịch (Tết Nguyên đán, Giỗ Tổ) và ngày nghỉ liền kề Quốc khánh | HR nhập theo lịch nghỉ Chính phủ công bố mỗi năm; hệ thống chỉ có sẵn các ngày lễ dương lịch cố định 1/1, 30/4, 1/5, 2/9 |

## 11. Mô hình dữ liệu (tóm tắt)

| Bảng | Vai trò |
|---|---|
| `AttendancePolicy` | Chính sách chung (một dòng) + múi giờ công ty |
| `Shift` | Danh mục ca (5.2) |
| `ShiftAssignment` | Lịch ca theo ngày, duy nhất theo `employeeId + date`; `shiftId` để trống = nghỉ |
| `ShiftPattern` | Mẫu xếp ca lặp, để sinh lại |
| `Department.defaultShiftId` | Ca mặc định của phòng ban |
| `Holiday` | Ngày lễ, ngày làm bù, ngày công ty nghỉ; có/không hưởng công |
| `AttendanceDay` | Kết quả engine, duy nhất theo `employeeId + workDate`. Đã thay `AttendanceRecord` (bảng cũ bỏ ngày 2026-10-22; trước đó: giữ tới khi GET `/attendance`, `/attendance/me` chuyển xong, rồi bỏ) |
| `AttendanceAdjustment` | Sửa tay (và Phase 3: đơn được duyệt), có trước/sau |
| `AttendancePeriod` | Kỳ công tháng: mở / chốt |
| `AttendanceConfirmation` | Nhân viên xác nhận / phản hồi công theo tháng |
| `AttendanceLocation` | Điểm chấm công hợp lệ |
| `AttendanceRawLog` (sửa) | Thêm `source`, toạ độ, wifi, IP, ảnh, điểm chấm công; `deviceId` cho phép để trống |

## 12. Quyền

Dùng lại các khoá đang có, và áp phạm vi dữ liệu (CORE-15) cho mọi màn hình xem công của người khác:

| Việc | Khoá quyền |
|---|---|
| Xem công, bảng công | `permission.attendance.view`, `permission.attendance-timesheets.view` (có phạm vi) |
| Sửa công tay, tính lại | `permission.attendance.manage` (có phạm vi) |
| Danh mục ca, xếp ca, ngày lễ, chính sách | `permission.attendance-timesheets.manage` |
| Chốt / mở chốt kỳ công | khoá mới `permission.attendance-period.lock` (nhóm Chấm công) |
| Máy chấm công, điểm chấm công | `attendance.device.manage` |
| Công và lịch ca của tôi | Chỉ cần đăng nhập |

## 13. Rủi ro

- **Cách tính khác thói quen của HR**, nên bảng công lệch so với bảng tính tay. Cách giảm: mọi quy tắc đều là cài đặt, và trước khi đóng phase đối chiếu bằng **một tháng dữ liệu thật** (tiêu chí của roadmap).
- **Dữ liệu cũ** trong `AttendanceRecord` được tính theo múi giờ máy chủ. Khi chuyển sang `AttendanceDay`, tính lại toàn bộ log gốc trong `AttendanceRawLog` theo múi giờ công ty, không chép dữ liệu cũ sang.
- **Hiệu năng tính lại cả tháng** (khoảng 200 người × 31 ngày ≈ 6.200 ngày công): chạy trong job, đọc log theo lô, không gọi DB trong engine.
