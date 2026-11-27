# Tham chiếu: Chấm công trên 1Office

Ghi lại hành vi quan sát được trên tenant 1Office công ty đang dùng (đọc ngày 2026-10-22, chỉ xem, không tạo/sửa gì). Mục đích: Helios làm đúng cách HR đang quen. Không chép code; chỉ mô tả màn hình, trường và quy tắc. Không ghi dữ liệu nhân sự hay mã bảo mật.

So sánh với thiết kế Helios: [attendance-engine.md](attendance-engine.md), mục "Chênh lệch" ở cuối.

## 1. Cấu trúc phân hệ

Menu: Dashboard · Chấm công (bảng chấm công, chi tiết bảng chấm công) · Phân ca · Máy chấm · Ngày nghỉ · Báo cáo · Tùy chỉnh · Cài đặt.

Thanh công cụ bảng chấm công: Tháng · Chốt · Chốt đơn · Import · Export · Thêm người · Tính toán · Lịch sử. Đầu trang hiện "Tiến trình tính công: 100%".

Cài đặt chia hai nhóm:
- **Cài đặt chung:** Ca làm việc · Chấm công GPS/Wifi · Quy trình duyệt.
- **Cài đặt đối tượng:** Chấm công · Nghỉ phép · Nghỉ bù.

Đọc lại ngày 2026-10-26 (giao diện tiếng Anh, chỉ xem):
- Menu phân hệ: Dashboard · Timekeeping (Bảng chấm công: tab Timesheet / Timesheet details) · Shift Assignment (Phân ca) · Attendance Device (Máy chấm) · Allow, compensation (Nghỉ phép, nghỉ bù) · Report · Customize; nút **Settings** mở trang cài đặt riêng của phân hệ, có "Back to module".
- Trang cài đặt của phân hệ là nơi duy nhất chứa cài đặt chấm công. Menu cài đặt của phân hệ Nhân sự (Vị trí, Chức vụ, Nơi làm việc, Nội quy, Phúc lợi, Lộ trình thăng tiến, Thẻ, Quy trình duyệt) **không** có mục chấm công nào.
- "Timekeeping settings" (đối tượng Chấm công) trên một trang: cài đặt chung (mã chấm công, thời gian sửa phân ca, số ngày tạo phân ca tối đa, thời gian rỗi giữa ca, hiển thị bảng công, thời gian xem công đã chốt, mã API), **GPS** (dùng GPS; cho chấm khi không có ca; không cho chấm trên điện thoại chưa xác thực; bắt buộc chụp ảnh; kiểm tra theo đối tượng áp dụng), **Wifi** (các tuỳ chọn tương tự), cài đặt khác (tách dòng, làm tròn, ứng công, quản lý sửa công, chốt đơn, định dạng giờ, số ngày liên tiếp không cần chấm — mặc định 2, tách giờ qua ngày, giờ ra ngoài, làm thêm qua ngày, muộn / sớm theo giây, ưu tiên đơn nghỉ).
- Thanh công cụ bảng chấm công: Month · Close timesheet · Close application · Import · Export · Add personnel · **Calculate** · **History**.
- Chưa thấy ngày lễ trong phân hệ Chấm công hay Nhân sự.

Helios làm theo bố cục này từ 2026-10-26: Công → Cài đặt (`/user/attendance/settings/*`): Ca làm việc, Chấm công GPS/Wifi, Ngày nghỉ lễ, Quy trình duyệt; Cài đặt đối tượng → Chấm công (chính sách, GPS / Wifi, cài đặt chung, nhắc quên chấm). Tính toán, Lịch sử, Công chuẩn là nút trên Bảng chấm công. Đường dẫn cũ `/admin/settings/...` tự chuyển sang.

## 2. Ca làm việc

### 2.1 Danh sách ca (cột)

Mã ca · Tên ca · Giờ vào · Giờ ra · Giờ nghỉ · Kết thúc nghỉ · Check in trước · Check out sau · Tổng giờ · Tổng công · Trạng thái · Kiểu linh hoạt · Linh hoạt sau checkin · Linh hoạt trước checkin · Qua ngày · Tính thời gian đi muộn, về sớm giữa ca · Giờ làm thêm giữa ca · Bắt buộc chốt giữa ca · Check in đầu ca sau · Check out cuối ca đầu · Ca tự động áp dụng cho nghỉ lễ · Chấm công tự động · Checkout tự động áp dụng cho vị trí · Tự động nhận ca · Nhiều khoảng làm việc · Tính giờ ca làm thêm theo ngày của ca chính · Vị trí định vị · Địa chỉ chấm Wifi · Đối tượng áp dụng ca · Tính toán lại phép dựa theo giờ linh hoạt. Có Export / Import.

Ví dụ ca của công ty (giữ lại vì là cấu hình, không phải dữ liệu cá nhân):

| Mã | Giờ | Nghỉ | Check in trước / out sau | Tổng giờ | Tổng công |
|---|---|---|---|---|---|
| Office Full SC | 08:30–18:00 | 12:30–14:00 | 02:00 / 04:00 | 8 | 1 |
| Office Part sáng | 08:30–12:30 | – | 02:00 / 04:00 | 4 | 0,5 |
| BH Fulltime SCT | 08:30–22:00 | 12:30–14:00 | 02:00 / 04:00 | 12 | 1,5 |
| TNP-CC | 13:30–18:00 | – | 02:00 / 04:00 | 4,5 | 0,56 |
| NT/LTN/BH-CC | 13:00–18:00 | – | 02:00 / 04:00 | 5 | 0,5 |

Nhận xét:
- **Tổng công do HR nhập**, không suy ra từ số giờ (ca 5 giờ vẫn 0,5 công, ca 4,5 giờ là 0,56).
- **Check in trước / Check out sau** là khung nhận log của từng ca (ở đây 2 giờ trước giờ vào, 4 giờ sau giờ ra).
- Một số ca gắn **vị trí định vị GPS** (cửa hàng) và có thể gắn wifi, đối tượng áp dụng.

### 2.2 Form tạo ca

Thông tin chung:
- Mã ca\*, Tên ca\*, công tắc **Nhiều khoảng làm việc**, công tắc **Hoạt động**.
- **Ca chính:** Giờ vào, Giờ ra, **Qua ngày\*** (chọn, không tự suy), Giờ nghỉ, Kết thúc nghỉ, Check in trước, Check out sau, Tổng giờ, **Tổng công\*** (mặc định 1).
- **Ca làm thêm** (nhiều dòng): Từ giờ\* + ngày (Hôm nay / …), Đến giờ\*, Qua ngày, Kiểu (mặc định "Tính công"), Số giờ, Số công; dòng Tổng. Ô "Tính giờ ca làm thêm theo ngày của ca chính".

Linh hoạt ca: "Áp dụng giờ linh hoạt" (mặc định Không áp dụng; danh sách lựa chọn tải khi mở, chưa đọc được) + Linh hoạt sau/trước checkin; công tắc "Tính toán lại phép dựa theo giờ linh hoạt".

Tự động nhận biết ca và đối tượng áp dụng: "Tự động nhận biết theo phòng ban, vị trí", Đối tượng áp dụng, "Ca tự động áp dụng cho ngày nghỉ lễ", "Chấm công tự động", "Checkout tự động áp dụng cho vị trí".

Cài đặt giữa ca (cho ca nhiều khoảng): "Bắt buộc chốt giữa ca"; "Giờ làm thêm giữa ca" = Không chấp nhận / Tự động tính / Tính theo đơn làm thêm; "Tính thời gian đi muộn, về sớm giữa ca"; Check in đầu ca sau, Check out cuối ca đầu (để trống thì lấy khung của cả ca).

Chấm công qua ứng dụng: chọn vị trí định vị (GPS), chọn wifi; Ghi chú.

## 3. Cài đặt chung chấm công (đối tượng "Chấm công")

| Cài đặt | Giá trị đang dùng / mặc định |
|---|---|
| Mã chấm công lấy theo | Mã nhân sự hoặc mã độc lập |
| Thời gian được phép sửa bảng phân ca (ngày, tính từ lúc tạo) | trống |
| Số ngày tối đa được phép tạo phân ca trước | trống |
| Khoảng thời gian rỗi được phép miễn chốt giữa hai ca liền nhau | 00:00 |
| Hiển thị trên bảng chấm công | **Tổng giờ làm việc (bao gồm làm thêm)** |
| Thời gian tối đa nhân sự xem bảng công cá nhân đã chốt | Tất cả |
| Mã bảo mật API chấm công + URL nhận log, tool đồng bộ | (không ghi lại) |
| Chấm GPS / Wifi | bật; các tuỳ chọn: chấm khi chưa có phân ca, bắt buộc thiết bị đã xác thực, bắt buộc chụp ảnh, kiểm tra địa điểm theo đối tượng áp dụng của ca |
| Tách dòng chấm công của nhân sự | Theo lương vị trí, Lương phụ cấp |
| Hệ số làm tròn (giờ) | **Không làm tròn** (ví dụ cài 0,125: vào 07:01 làm tròn lên 08:00) |
| Hệ số làm tròn phép, nghỉ bù | 3 chữ số thập phân |
| Ứng trước ngày công | tắt |
| Quản lý phòng ban được sửa chấm công (thêm chốt, tính lại, thêm công ngày) | tắt |
| Lương theo phòng ban kiêm nhiệm | tắt |
| Chốt đơn từ | **Thủ công** (hoặc tự động theo ngày cố định hằng tháng) |
| Định dạng thời gian | 24 giờ |
| Số ngày liên tiếp cho phép không cần checkin/out | 2 (tối đa 30) |
| Tách giờ làm việc qua ngày | **Không áp dụng tách giờ** / Tách giờ qua ngày / Tách giờ qua ngày (tính đủ giờ ca) |
| Tính thời gian ra ngoài trong ca theo máy chỉ-checkin / chỉ-checkout | tắt (từ khoá `OUTSIDE_MINUTE`) |
| Giờ làm thêm qua ngày tính vào ngày hôm trước | tắt |
| Lấy giờ của đơn làm thêm (không yêu cầu chốt) làm log cho ca chính | tắt |
| Lương lưu động = lương chính | bật |
| **Tính đi muộn / về sớm theo giây** | tắt (mặc định tính theo phút) |
| Ưu tiên đơn nghỉ khi trùng ngày đơn công tác | tắt |

Không có cài đặt "ngưỡng cho phép đi muộn" ở đây: phút muộn/sớm được ghi nguyên, việc miễn/phạt nằm trong công thức của bảng chấm công (mục 4.2).

## 4. Bảng chấm công

### 4.1 Mẫu bảng chấm công

Mỗi bảng chấm công là một mẫu (ví dụ "Bảng công toàn bộ công ty"):
- Loại đối tượng / Đối tượng; **Chu kỳ công** (ngày 1 → cuối tháng, hằng tháng); Thời gian áp dụng; Nhân sự có quyền xem; Hoạt động; Phòng ban áp dụng; Tách dòng; Mô tả.
- **Công thức chấm công** (mục 4.2).
- **Công chuẩn** theo nhóm phòng ban × vị trí: "Tùy chỉnh" bằng công thức (ví dụ `=TOTAL_DAY-TOTAL_SUNDAY-1`) hoặc "Số ngày trong bảng chấm công trừ chủ nhật" (tự động tính).

### 4.2 Công thức

Bảng công thức kiểu Excel, ba cấp: **Ca (SHIFTS)**, **Ngày (DATES)**, **Tháng (MONTH)**. Mỗi dòng: Bảng · Thay đổi (Cột mới / Công thức ghi đè / Hằng số) · Tên · Từ khoá · Công thức/giá trị · Kết quả · hiện ở bảng công cá nhân / bảng công · Tên hiển thị · Mô tả.

Từ khoá thấy được: `DATE`, `LATE_MINUTE`, `SOON_MINUTE`, `WORKDAY`, `WORKHOUR`, `TOTAL_HOUR`, `HOLIDAY`, `LEAVE_SIGN`, `LEAVE_NOREASON`, `CHECKINOUT_REASON` (ví dụ `"NO_FINGER"`), `CODE` (mã ca), `MONTH!JOB_TITLE`, `MONTH!DEPARTMENT_MAIN`, `TOTAL_DAY`, `TOTAL_SUNDAY`, `CAL_WORKDAY_SHIFT`, `CAL_WORKDAY_MISSION`, `CAL_WORKDAY_OVERTIME`, `OUTSIDE_MINUTE`. Hàm: `IF`, `AND`, `OR`, `ROUND`, `SUM`, `SUMIFS`, `COUNTIFS`, `IFERROR`, `DATEVALUE`.

Công thức công ty đang dùng (tóm tắt ý, không chép đủ):
- Mặc định `WORKDAY` đã **trừ phần đi muộn theo tỷ lệ** (công = giờ làm thực tế / tổng giờ ca × công ca). Công thức `CAL_WORKDAY` cộng trả lại phần muộn khi đã phạt tiền: `ROUND(IF(CAL_FINE_LATE>0, WORKDAY + LATE_MINUTE/60/TOTAL_HOUR, WORKDAY), 2)`; tương tự giờ làm `CAL_WORKHOUR` làm tròn 1 chữ số.
- Phạt tiền đi muộn, quên chấm theo chức danh; nghỉ không lý do = số ngày × 200.000.
- Công ngày = công ca + công công tác + công làm thêm; công/giờ ngày lễ tách riêng; đếm "ca kép" theo mã ca.

### 4.3 Bảng công tháng

Dòng: STT · Mã NV · Họ tên · Phòng ban · Vị trí (một người có thể nhiều dòng khi tách dòng). Cột ngày ghi thứ (T2…CN) và ngày; cuối tuần tô xám.

**Ô ngày** hiện **số giờ làm** (theo cài đặt hiển thị), kèm chữ nhỏ phía trên:
- mã loại nghỉ: `P`, `KL`, `KH`, `Ô`, `ONL`, … (khớp các cột Nghỉ);
- `V` (thường đi kèm ô có vi phạm muộn/sớm/thiếu log — cần HR xác nhận nghĩa);
- `+` (có làm thêm), `IO`.
- `N` = không có ca; mã nghỉ dài ngày (ví dụ `TS`) thay cả ô; `x`.
- Mỗi ô có lịch sử "cập nhật lần cuối …, thay đổi từ chốt vân tay được đẩy tự động lên phần mềm" hoặc "… từ việc tính toán lại hằng ngày".

**Cột tổng:**
- Đi muộn: Số phút · Tiền phạt · Công phạt. Về sớm: như trên.
- Quên chốt: Số lần · Tiền phạt · Công phạt. Nghỉ không lý do: Tiền phạt · Công phạt.
- Nghỉ theo từng loại: CÔ, HY, SÔ, STS, ĐT, KH, KL, Ô, P, TS, HIEU, ONL.
- Nghỉ phép: Đầu kỳ · Đã dùng · Cuối kỳ. Nghỉ bù: Đầu kỳ · Đã dùng · Số giờ thêm · Cuối kỳ.
- Công chính: Công ca · Công lễ · Công công tác · Giờ làm đêm · Giờ ngày lễ · Giờ ngày nghỉ · Giờ ngày ca.
- Làm thêm: Số giờ · Số công. Tăng ca: ngày thường / ngày nghỉ / ngày lễ × ca ngày / ca đêm.
- Công ăn: Số giờ · Số công. Công chuẩn. Công tổng: Giờ đêm · Tổng giờ · Số công.

## 5. Phân ca

Lưới **tháng** (người × ngày), ô hiện mã ca; `N` khi không có ca; ngày có đơn nghỉ hiện mã nghỉ hoặc chữ nhỏ (ví dụ `Office Full SC` + `P`). Cột cuối: Nghỉ phép (đầu kỳ / đã dùng / cuối kỳ), Nghỉ bù, Công tổng, Công chuẩn. Có Export. Phân ca gắn với từng bảng chấm công ("Bảng phân ca bảng công toàn bộ công ty").

## 6. Chênh lệch so với thiết kế Helios hiện tại

| # | 1Office | Helios hiện tại | Đề xuất |
|---|---|---|---|
| 1 | Không có ngưỡng muộn/sớm; phút muộn ghi nguyên, miễn/phạt bằng công thức | Ngưỡng 5/5 phút, "toàn bộ / phần vượt" | Đổi mặc định ngưỡng về 0; giữ cài đặt cho HR |
| 2 | Công = giờ thực tế / tổng giờ ca × Tổng công | `workUnitMode = actual` cùng ý | Giữ |
| 3 | Khung nhận log theo từng ca (Check in trước / Check out sau) | Có ở chính sách + ghi đè theo ca | Đưa lên form ca như trường chính |
| 4 | "Qua ngày" chọn rõ; tách giờ qua ngày 3 kiểu; làm thêm qua ngày tính ngày trước | Tự suy từ giờ ra ≤ giờ vào; tính cho ngày bắt đầu | Thêm cài đặt tách giờ qua ngày (mặc định không tách) |
| 5 | Làm tròn giờ theo hệ số (mặc định không); đi muộn tính theo phút hoặc giây | Làm tròn 0/5/15/30 phút | Thêm "tính theo giây" |
| 6 | Ô bảng công hiện số giờ + chữ nhỏ mã nghỉ/V/+ | Ô hiện ký hiệu trạng thái | Đổi cách hiển thị ô theo 1Office, cho chọn "hiển thị giờ / công" |
| 7 | Cột tổng có tiền phạt, công phạt, nghỉ theo loại, phép/nghỉ bù đầu kỳ–cuối kỳ, tăng ca theo loại ngày × ngày/đêm, công ăn, công chuẩn | Tổng công, công lễ, phút muộn/sớm | Bổ sung cột; phần phạt và phép cần Phase 3–4 |
| 8 | Công chuẩn theo phòng ban × vị trí, bằng công thức | Chưa có | Thêm (cần cho tính lương) |
| 9 | Nhiều mẫu bảng chấm công: đối tượng, chu kỳ công, ngày áp dụng, người xem, tách dòng | Một kỳ công tháng cho cả công ty | Thêm mẫu bảng chấm công (ít nhất chu kỳ công + phạm vi) |
| 10 | Công thức tuỳ biến 3 cấp (ca/ngày/tháng) | Chưa có, quy tắc cố định trong engine | Quyết định phạm vi (xem câu hỏi) |
| 11 | Tự nhận ca theo log trong các ca áp dụng cho phòng ban/vị trí khi chưa phân ca | Ca mặc định phòng ban/công ty | Thêm tuỳ chọn "Tự động nhận ca" |
| 12 | Ca có làm thêm cố định, nhiều khoảng làm việc, cài đặt giữa ca | Một khoảng + một nghỉ | Để sau (ít dùng ở công ty) |
| 13 | Phân ca lưới tháng | Lưới tuần | Thêm chế độ xem tháng |
| 14 | Tính lại hằng ngày + khi có log; lịch sử từng ô | Tính lại khi có log/sửa | Thêm job hằng ngày và lịch sử ô |
| 15 | Giới hạn sửa phân ca (N ngày sau tạo) và tạo trước tối đa N ngày | Chưa có | Thêm vào chính sách |
| 16 | GPS/wifi gắn theo ca và đối tượng | Điểm chấm công gắn nơi làm việc | Cho gắn thêm theo ca |
