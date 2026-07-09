import {
  CalendarBlank,
  CaretDown,
  Check,
  Clock,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plus,
  UploadSimple,
  X
} from "@/lib/icons";

import { LeaveFormSelect } from "@/components/user/leave-form-select";

const overtimeReasons = [
  { label: "Hoàn thành deadline" },
  { label: "Xử lý đơn hàng gấp" },
  { label: "Bàn giao hệ thống" },
  { label: "Hỗ trợ sự kiện" },
  { label: "Khác" }
];

export function OvertimeRequestCreateBoard() {
  return (
    <main className="leave-create-page" aria-label="Tạo mới đơn làm thêm">
      <form className="leave-create-form">
        <section className="leave-create-section leave-create-section--full" aria-labelledby="overtime-general-title">
          <header className="leave-create-section-header">
            <button className="leave-create-collapse" type="button" aria-expanded="true" aria-label="Thu gọn thông tin chung">
              <CaretDown size={16} weight="duotone" aria-hidden="true" />
            </button>
            <h2 id="overtime-general-title">Thông tin chung</h2>
          </header>

          <div className="leave-horizontal-scroll" role="region" aria-label="Thông tin làm thêm">
            <div className="leave-create-grid leave-create-grid--overtime">
              <label className="leave-field">
                <span>
                  Ngày làm thêm <strong>*</strong>
                </span>
                <div className="leave-input-icon">
                  <input value="09/07/2026" readOnly aria-label="Ngày làm thêm" />
                  <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
                </div>
              </label>

              <label className="leave-field">
                <span>
                  Giờ <strong>*</strong>
                </span>
                <div className="leave-input-icon">
                  <input placeholder="Từ" aria-label="Giờ bắt đầu làm thêm" />
                  <Clock size={17} weight="duotone" aria-hidden="true" />
                </div>
              </label>

              <label className="leave-field">
                <span>
                  Giờ <strong>*</strong>
                </span>
                <div className="leave-input-icon">
                  <input placeholder="Đến" aria-label="Giờ kết thúc làm thêm" />
                  <Clock size={17} weight="duotone" aria-hidden="true" />
                </div>
              </label>

              <label className="leave-field leave-field--readonly">
                <span>Ca làm việc</span>
                <input value="Office Full SC" readOnly />
              </label>

              <label className="leave-field">
                <span>Lý do</span>
                <LeaveFormSelect
                  ariaLabel="Chọn lý do làm thêm"
                  menuLabel="Các lý do làm thêm"
                  options={overtimeReasons}
                  placeholder="Chọn lý do"
                />
              </label>

              <label className="leave-field leave-field--compact">
                <span>Chốt</span>
                <button className="leave-control leave-control--clearable has-value" type="button" aria-label="Chốt làm thêm">
                  <span>Không</span>
                  <X size={15} weight="duotone" aria-hidden="true" />
                </button>
              </label>

              <label className="leave-field">
                <span>Địa điểm chấm công</span>
                <div className="leave-input-icon">
                  <input placeholder="Tìm kiếm" aria-label="Tìm kiếm địa điểm chấm công" />
                  <MagnifyingGlass size={17} weight="duotone" aria-hidden="true" />
                </div>
              </label>

              <label className="leave-field">
                <span>Vị trí chấm công</span>
                <div className="leave-input-icon">
                  <input placeholder="Tìm kiếm" aria-label="Tìm kiếm vị trí chấm công" />
                  <MagnifyingGlass size={17} weight="duotone" aria-hidden="true" />
                </div>
              </label>

              <label className="leave-field leave-field--note">
                <span>Ghi chú</span>
                <input placeholder="..." aria-label="Ghi chú đơn làm thêm" title="Ghi chú đơn làm thêm" />
              </label>

              <button className="icon-button leave-row-remove" type="button" aria-label="Xóa dòng làm thêm">
                <X size={18} weight="duotone" aria-hidden="true" />
              </button>
            </div>
          </div>

          <button className="leave-add-time" type="button" aria-label="Thêm dòng làm thêm">
            <Plus size={18} weight="duotone" aria-hidden="true" />
          </button>

          <label className="leave-field leave-simple-description">
            <span>
              Mô tả <strong>*</strong>
            </span>
            <textarea placeholder="Nhập mô tả" aria-label="Nhập mô tả đơn làm thêm" />
          </label>

          <fieldset className="leave-attachment">
            <legend>Đính kèm</legend>
            <div className="leave-upload-dropzone">
              <span className="leave-upload-icon">
                <UploadSimple size={24} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <p>Kéo thả file vào đây để tải lên hoặc</p>
                <div className="leave-upload-actions">
                  <button className="primary-button" type="button">
                    <PaperPlaneTilt size={15} weight="duotone" aria-hidden="true" />
                    Chọn từ máy
                  </button>
                  <button className="secondary-button" type="button">
                    <UploadSimple size={15} weight="duotone" aria-hidden="true" />
                    Chọn từ cloud
                  </button>
                </div>
              </div>
            </div>
          </fieldset>
        </section>

        <section className="leave-create-section" aria-labelledby="overtime-related-title">
          <header className="leave-create-section-header">
            <button className="leave-create-collapse" type="button" aria-expanded="true" aria-label="Thu gọn đối tượng liên quan">
              <CaretDown size={16} weight="duotone" aria-hidden="true" />
            </button>
            <h2 id="overtime-related-title">Đối tượng liên quan</h2>
          </header>

          <div className="leave-related-row">
            <label className="leave-field leave-field--wide">
              <span className="sr-only">Đối tượng liên quan</span>
              <button className="leave-control" type="button" aria-label="Chọn đối tượng liên quan">
                <span>Đối tượng liên quan</span>
                <CaretDown size={16} weight="duotone" aria-hidden="true" />
              </button>
            </label>
            <button className="icon-button" type="button" aria-label="Xóa đối tượng liên quan">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>

          <button className="leave-add-time" type="button" aria-label="Thêm đối tượng liên quan">
            <Plus size={18} weight="duotone" aria-hidden="true" />
          </button>
        </section>

        <footer className="leave-create-actionbar">
          <button className="primary-button" type="submit">
            <Check size={15} weight="duotone" aria-hidden="true" />
            Cập nhật
          </button>
          <a className="secondary-button" href="/user?customMenu=user-board-requests">
            Hủy bỏ
          </a>
        </footer>
      </form>
    </main>
  );
}
