import {
  CalendarBlank,
  CaretDown,
  Check,
  PaperPlaneTilt,
  Plus,
  UploadSimple,
  X
} from "@/lib/icons";

import { LeaveFormSelect } from "@/components/user/leave-form-select";
import { CollapseButton } from "@/components/user/collapse-button";

const desiredShiftOptions = [
  { label: "Office Full SC" },
  { label: "Ca sáng" },
  { label: "Ca chiều" },
  { label: "Ca tối" }
];

export function ShiftChangeRequestCreateBoard() {
  return (
    <main className="leave-create-page" aria-label="Tạo mới đơn đổi ca">
      <form className="leave-create-form">
        <section className="leave-create-section leave-create-section--shift" aria-labelledby="shift-general-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Thông tin chung" />
            <h2 id="shift-general-title">Thông tin chung</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--shift-kind">
            <label className="leave-field">
              <span>
                Kiểu đổi ca <small className="leave-field-hint">?</small>
              </span>
              <button className="leave-control leave-control--clearable has-value" type="button" aria-label="Kiểu đổi ca">
                <span>Chính mình</span>
                <X size={15} weight="duotone" aria-hidden="true" />
              </button>
            </label>
          </div>

          <div className="leave-create-grid leave-create-grid--shift">
            <label className="leave-field">
              <span>
                Ngày cần đổi <strong>*</strong>
              </span>
              <div className="leave-input-icon">
                <input value="09/07/2026" readOnly aria-label="Ngày cần đổi" />
                <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Ca cần đổi <strong>*</strong>
              </span>
              <button className="leave-control leave-control--chip has-value" type="button" aria-label="Ca cần đổi">
                <span className="leave-control-chip">
                  Office Full SC
                  <X size={13} weight="duotone" aria-hidden="true" />
                </span>
                <X size={15} weight="duotone" aria-hidden="true" />
              </button>
            </label>

            <label className="leave-field">
              <span>Ngày đổi</span>
              <div className="leave-input-icon">
                <input value="09/07/2026" readOnly aria-label="Ngày đổi" />
                <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
              </div>
            </label>

            <label className="leave-field">
              <span>
                Ca muốn làm <strong>*</strong>
              </span>
              <LeaveFormSelect
                ariaLabel="Chọn ca muốn làm"
                menuLabel="Các ca muốn làm"
                options={desiredShiftOptions}
                placeholder="Chọn ca"
              />
            </label>

            <button className="icon-button leave-row-remove" type="button" aria-label="Xóa dòng đổi ca">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>

          <button className="leave-add-time" type="button" aria-label="Thêm dòng đổi ca">
            <Plus size={18} weight="duotone" aria-hidden="true" />
          </button>

          <label className="leave-field leave-simple-description">
            <span>Mô tả</span>
            <textarea placeholder="Nhập mô tả" aria-label="Nhập mô tả đơn đổi ca" />
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
