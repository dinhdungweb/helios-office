import {
  CalendarBlank,
  CaretDown,
  Check,
  PaperPlaneTilt,
  Plus,
  UploadSimple,
  X
} from "@phosphor-icons/react/dist/ssr";

import { LeaveFormSelect } from "@/components/user/leave-form-select";

const resignationReasons = [
  { label: "Lý do cá nhân" },
  { label: "Thay đổi định hướng nghề nghiệp" },
  { label: "Tìm cơ hội mới" },
  { label: "Sức khỏe" },
  { label: "Khác" }
];

export function ResignationRequestCreateBoard() {
  return (
    <main className="leave-create-page" aria-label="Tạo mới đơn xin thôi việc">
      <form className="leave-create-form">
        <section className="leave-create-section leave-create-section--resignation" aria-labelledby="resignation-general-title">
          <header className="leave-create-section-header">
            <button className="leave-create-collapse" type="button" aria-expanded="true" aria-label="Thu gọn thông tin chung">
              <CaretDown size={16} weight="duotone" aria-hidden="true" />
            </button>
            <h2 id="resignation-general-title">Thông tin chung</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--resignation-reason">
            <label className="leave-field">
              <span className="sr-only">Lý do thôi việc</span>
              <LeaveFormSelect
                ariaLabel="Chọn lý do thôi việc"
                menuLabel="Các lý do thôi việc"
                options={resignationReasons}
                placeholder="Lý do thôi việc *"
              />
            </label>
          </div>

          <div className="leave-create-grid leave-create-grid--resignation-dates">
            <label className="leave-field">
              <span>Ngày nộp đơn</span>
              <div className="leave-input-icon">
                <input value="09/07/2026" readOnly aria-label="Ngày nộp đơn" />
                <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>Ngày làm việc cuối</span>
              <div className="leave-input-icon">
                <input value="8/7/2026" readOnly aria-label="Ngày làm việc cuối" />
                <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Ngày thôi việc <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input value="09/07/2026" readOnly aria-label="Ngày thôi việc" />
                <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>
          </div>

          <label className="leave-field leave-simple-description">
            <span>Mô tả</span>
            <textarea placeholder="Nhập mô tả..." aria-label="Nhập mô tả đơn xin thôi việc" />
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

        <section className="leave-create-section" aria-labelledby="resignation-related-title">
          <header className="leave-create-section-header">
            <button className="leave-create-collapse" type="button" aria-expanded="true" aria-label="Thu gọn đối tượng liên quan">
              <CaretDown size={16} weight="duotone" aria-hidden="true" />
            </button>
            <h2 id="resignation-related-title">Đối tượng liên quan</h2>
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
