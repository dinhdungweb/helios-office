# Phase 3 — Engine phê duyệt & đơn từ

Roadmap: [../roadmap.md](../roadmap.md#phase-3--engine-phê-duyệt--đơn-từ) · Phạm vi: `npm run audit:features -- --phase 3` · Nhánh: `feat/phase-2` (tách nhánh `feat/phase-3` khi Phase 2 merge)

Thiết kế: [approval-engine](../design/approval-engine.md), đã duyệt 2026-11-26 cùng toàn bộ đề xuất ở mục 13.

## Mục tiêu

Nhân viên tạo đơn → đúng người duyệt → kết quả tự cập nhật vào công và quỹ phép → người tạo nhận thông báo.

## Điều kiện bắt đầu

- [x] Phase 1 đã đóng.
- [x] Engine tính công của Phase 2 đã xong (33/33 item). Phase 2 còn chờ đối chiếu dữ liệu thật (task 24), không chặn Phase 3.
- [x] Thiết kế engine phê duyệt đã duyệt.

## Task

Chia hai đợt như thiết kế mục 12. Đóng task nào chạy `npm run typecheck && npm run lint && npm run test && npm run audit:features -- --strict`; task có giao diện thì thử trên trình duyệt.

### 3a. Engine + nghỉ phép

| # | Item | Việc | Kiểm tra | Trạng thái |
|---|---|---|---|---|
| 1 | – | Migration: `Request`, `ApprovalWorkflowVersion`, `ApprovalStep`, `ApprovalAssignee`, `ApprovalAction`, `RequestFollower`, `RequestComment`, `ApprovalDelegation`, `LeaveType`, `LeaveBalance`, `LeaveBalanceTransaction`; loại adjustment công mới + `sourceRequestId`; chép `LeaveRequest` sang `Request`, xoá `ApprovalRequest`; phiên bản 1 cho quy trình đang có | `prisma validate`, typecheck | |
| 2 | AP-04 → AP-08, AP-25 | Sửa (sinh phiên bản mới), chi tiết, danh sách phiên bản, nhân bản, bật / tắt quy trình; kiểm tra sơ đồ; lọc HTML node thông báo / email phía server | Unit: sơ đồ hợp lệ / thiếu kết thúc / vòng lặp / node không tới được | |
| 3 | AP-11 | Hàm thuần: đánh giá điều kiện, xác định người duyệt (quản lý trực tiếp, trưởng phòng, vị trí / chức vụ trong đơn vị, lùi khi thiếu, bỏ người tạo, người thay, admin) | Unit bảng trường hợp | |
| 4 | AP-10, AP-12, AP-13 | Engine: chọn quy trình (hoặc mặc định), chạy sơ đồ, `any` / `all`, lưu bước / người được giao / hành động, giới hạn 100 bước, khoá lạc quan | Unit bảng trường hợp + đồng thời | |
| 5 | LV-02 → LV-07, AP-14 → AP-16, AP-19 | API đơn chung, hộp duyệt, duyệt / từ chối / trả lại, timeline, bình luận | Unit + E2E 401/403 | |
| 6 | LV-09 → LV-15 | Loại nghỉ (seed theo Bộ luật Lao động), quỹ phép sổ cái, tính số ngày nghỉ theo lịch ca, cộng phép hằng tháng + thâm niên, chuyển / hết hạn phép tồn | Unit bảng trường hợp | |
| 7 | LV-16, LV-24, LV-01 | Form đơn nghỉ, trang danh sách đơn, hộp duyệt, quỹ phép của tôi nối API thật | Trình duyệt hai vai | |
| 8 | AT-22, AP-23 | Duyệt đơn nghỉ → adjustment `leave` + tính lại công; thông báo người duyệt / người tạo | Unit + trình duyệt đầu–cuối | |

### 3b. Các loại đơn còn lại và vận hành

| # | Item | Việc | Trạng thái |
|---|---|---|---|
| 9 | LV-17 → LV-21, AT-22 | Đơn vắng mặt, OT, giải trình, đổi ca, thôi việc + cập nhật công | |
| 10 | AP-17, AP-18, AP-20, LV-08 | Chuyển tiếp, duyệt hàng loạt, người theo dõi, đính kèm | |
| 11 | AU-21, AP-21, AP-22, AP-24, AP-26 | Uỷ quyền, quá hạn, trang cảnh báo duyệt, đính kèm email | |
| 12 | LV-22, LV-23, LV-25 | Đơn công tác, đề xuất chung, lịch nghỉ phòng ban | |

## Tiêu chí hoàn thành (roadmap)

Tạo đơn nghỉ phép → quản lý duyệt → quỹ phép giảm → bảng công ghi nghỉ phép → người tạo nhận thông báo.
