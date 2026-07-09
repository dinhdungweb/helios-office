import {
  CalendarBlank,
  CaretDown,
  Check,
  Clock,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Microphone,
  Minus,
  PaperPlaneTilt,
  Plus,
  Smiley,
  TextAlignLeft,
  TextB,
  TextItalic,
  TextUnderline,
  UploadSimple,
  X
} from "@/lib/icons";

import { CollapseButton } from "@/components/user/collapse-button";
import { LeaveReasonSelect } from "@/components/user/leave-reason-select";

const editorTools = [
  Microphone,
  TextB,
  TextItalic,
  Smiley,
  Minus,
  TextUnderline,
  ListBullets,
  ListNumbers,
  LinkSimple,
  TextAlignLeft
];

export function LeaveRequestCreateBoard() {
  return (
    <main className="leave-create-page" aria-label="Tạo mới đơn xin nghỉ">
      <form className="leave-create-form">
        <section className="leave-create-section" aria-labelledby="leave-general-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Thông tin chung" />
            <h2 id="leave-general-title">Thông tin chung</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--summary">
            <label className="leave-field leave-field--wide">
              <span>
                Lý do <strong>*</strong>
              </span>
              <LeaveReasonSelect />
            </label>

            <label className="leave-field leave-field--readonly">
              <span>Tính công</span>
              <input value="Không" readOnly />
            </label>
          </div>

          <div className="leave-create-grid leave-create-grid--time">
            <label className="leave-field">
              <span>
                Từ giờ <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input placeholder="hh:mm" aria-label="Từ giờ" />
                <Clock size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Từ ngày <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input value="09/07/2026" readOnly aria-label="Từ ngày" />
                <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Đến giờ <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input placeholder="hh:mm" aria-label="Đến giờ" />
                <Clock size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Đến ngày <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input value="09/07/2026" readOnly aria-label="Đến ngày" />
                <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <button className="icon-button leave-row-remove" type="button" aria-label="Xóa dòng thời gian">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>

          <button className="leave-add-time" type="button" aria-label="Thêm khoảng thời gian nghỉ">
            <Plus size={18} weight="duotone" aria-hidden="true" />
          </button>

          <label className="leave-field leave-description">
            <span>
              Mô tả <strong>*</strong>
            </span>
            <div className="leave-editor">
              <div className="leave-editor-toolbar" aria-label="Công cụ định dạng mô tả">
                {editorTools.map((Tool, index) => (
                  <button className="icon-button" type="button" aria-label={`Công cụ soạn thảo ${index + 1}`} key={index}>
                    <Tool size={16} weight="duotone" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <textarea placeholder="Nhập mô tả" aria-label="Nhập mô tả đơn xin nghỉ" />
            </div>
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

        <section className="leave-create-section" aria-labelledby="leave-related-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Đối tượng liên quan" />
            <h2 id="leave-related-title">Đối tượng liên quan</h2>
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
