import {
  CalendarBlank,
  CaretDown,
  Check,
  Clock,
  PaperPlaneTilt,
  Plus,
  UploadSimple,
  X
} from "@/lib/icons";

import { LeaveFormSelect } from "@/components/user/leave-form-select";

const shiftOptions = [
  { label: "Office Full SC" },
  { label: "Ca sáng" },
  { label: "Ca chiều" }
];

const checkinOutReasons = [
  { label: "Quên check in" },
  { label: "Quên check out" },
  { label: "Máy chấm công lỗi" },
  { label: "Làm việc ngoài văn phòng" },
  { label: "Đi công tác" }
];

export function CheckinOutRequestCreateBoard() {
  return (
    <main className="leave-create-page" aria-label="Tạo mới đơn checkin/out">
      <form className="leave-create-form">
        <section className="leave-create-section leave-create-section--checkin" aria-labelledby="checkin-general-title">
          <header className="leave-create-section-header">
            <button className="leave-create-collapse" type="button" aria-expanded="true" aria-label="Thu gọn thông tin chung">
              <CaretDown size={16} weight="duotone" aria-hidden="true" />
            </button>
            <h2 id="checkin-general-title">Thông tin chung</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--checkin">
            <label className="leave-field">
              <span>
                Ngày <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input value="09/07/2026" readOnly aria-label="Ngày checkin/out" />
                <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Giờ <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input placeholder="hh:mm" aria-label="Giờ checkin/out" />
                <Clock size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Ca <small className="leave-field-hint">?</small>
              </span>
              <LeaveFormSelect
                ariaLabel="Chọn ca checkin/out"
                menuLabel="Các ca checkin/out"
                options={shiftOptions}
                placeholder="Chọn một"
              />
            </label>

            <label className="leave-field">
              <span>
                Lý do <strong>*</strong>
              </span>
              <LeaveFormSelect
                ariaLabel="Chọn lý do checkin/out"
                menuLabel="Các lý do checkin/out"
                options={checkinOutReasons}
                placeholder="Chọn lý do"
              />
            </label>

            <label className="leave-field leave-field--readonly">
              <span>Phạt tiền</span>
              <input value="Có" readOnly aria-label="Phạt tiền" />
            </label>

            <button className="icon-button leave-row-remove" type="button" aria-label="Xóa dòng checkin/out">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>

          <button className="leave-add-time" type="button" aria-label="Thêm dòng checkin/out">
            <Plus size={18} weight="duotone" aria-hidden="true" />
          </button>

          <label className="leave-field leave-simple-description">
            <span>Mô tả</span>
            <textarea placeholder="Nhập mô tả" aria-label="Nhập mô tả đơn checkin/out" />
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

        <section className="leave-create-section" aria-labelledby="checkin-related-title">
          <header className="leave-create-section-header">
            <button className="leave-create-collapse" type="button" aria-expanded="true" aria-label="Thu gọn đối tượng liên quan">
              <CaretDown size={16} weight="duotone" aria-hidden="true" />
            </button>
            <h2 id="checkin-related-title">Đối tượng liên quan</h2>
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
