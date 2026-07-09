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

import { LeaveFormSelect } from "@/components/user/leave-form-select";
import { CollapseButton } from "@/components/user/collapse-button";

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

const absenceReasons = [
  { label: "Việc cá nhân" },
  { label: "Đi gặp khách hàng" },
  { label: "Làm việc ngoài văn phòng" },
  { label: "Quên check in/out" },
  { label: "Đi muộn" },
  { label: "Về sớm" }
];

const attendanceOptions = [
  { label: "Có" },
  { label: "Không" }
];

const closingOptions = [
  { label: "Có" },
  { label: "Không" }
];

export function AbsenceRequestCreateBoard() {
  return (
    <main className="leave-create-page" aria-label="Tạo mới đơn vắng mặt">
      <form className="leave-create-form">
        <section className="leave-create-section leave-create-section--wide" aria-labelledby="absence-general-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Thông tin đơn" />
            <h2 id="absence-general-title">Thông tin đơn</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--absence">
            <label className="leave-field">
              <span>
                Ngày vắng mặt <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input value="09/07/2026" readOnly aria-label="Ngày vắng mặt" />
                <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Vắng mặt từ <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input placeholder="hh:mm" aria-label="Vắng mặt từ" />
                <Clock size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Vắng mặt đến <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input placeholder="hh:mm" aria-label="Vắng mặt đến" />
                <Clock size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Lý do <strong>*</strong>
              </span>
              <LeaveFormSelect
                ariaLabel="Chọn lý do vắng mặt"
                menuLabel="Các lý do vắng mặt"
                options={absenceReasons}
                placeholder="Chọn lý do..."
              />
            </label>

            <label className="leave-field leave-field--compact">
              <span>Tính công</span>
              <LeaveFormSelect
                ariaLabel="Chọn tính công"
                menuLabel="Tùy chọn tính công"
                options={attendanceOptions}
                placeholder="Chọn..."
              />
            </label>

            <label className="leave-field leave-field--compact">
              <span>Yêu cầu chốt</span>
              <LeaveFormSelect
                ariaLabel="Chọn yêu cầu chốt"
                menuLabel="Tùy chọn yêu cầu chốt"
                options={closingOptions}
                placeholder="Chọn..."
              />
            </label>

            <button className="icon-button leave-row-remove" type="button" aria-label="Xóa dòng vắng mặt">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>

          <button className="leave-add-time" type="button" aria-label="Thêm dòng vắng mặt">
            <Plus size={18} weight="duotone" aria-hidden="true" />
          </button>

          <label className="leave-field leave-description">
            <span>Mô tả</span>
            <div className="leave-editor">
              <div className="leave-editor-toolbar" aria-label="Công cụ định dạng mô tả">
                {editorTools.map((Tool, index) => (
                  <button className="icon-button" type="button" aria-label={`Công cụ soạn thảo ${index + 1}`} key={index}>
                    <Tool size={16} weight="duotone" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <textarea placeholder="Nhập mô tả" aria-label="Nhập mô tả đơn vắng mặt" />
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

        <section className="leave-create-section" aria-labelledby="absence-related-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Đối tượng liên quan" />
            <h2 id="absence-related-title">Đối tượng liên quan</h2>
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
