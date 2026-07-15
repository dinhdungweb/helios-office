"use client";

import { useId, useState, type ReactNode } from "react";
import { FormCheckbox, FormDatePicker, FormSelect, type FormSelectOption } from "@/components/ui/form-controls";
import type { EmployeeCreateData } from "@/lib/employee-profile-api";
import { CaretDown, CheckCircle, MagnifyingGlass, Paperclip, Plus, UploadSimple, X } from "@/lib/icons";

const contractOptions = {
  names: [
    { value: "official", label: "Hợp đồng lao động chính thức" },
    { value: "probation", label: "Hợp đồng thử việc" },
    { value: "seasonal", label: "Hợp đồng thời vụ" },
    { value: "service", label: "Hợp đồng dịch vụ" }
  ],
  workModes: [
    { value: "fulltime", label: "Nhân viên Fulltime" },
    { value: "parttime", label: "Nhân viên Parttime" },
    { value: "remote", label: "Làm việc từ xa" }
  ],
  workplaces: [
    { value: "office", label: "Văn phòng" },
    { value: "store", label: "Cửa hàng" },
    { value: "warehouse", label: "Kho vận" }
  ],
  workingHours: [
    { value: "office-hours", label: "Giờ hành chính" },
    { value: "shift", label: "Theo ca" },
    { value: "flexible", label: "Linh hoạt" }
  ],
  salaryTypes: [
    { value: "salary", label: "Lương" },
    { value: "allowance", label: "Phụ cấp" },
    { value: "bonus", label: "Thưởng" }
  ],
  salaryForms: [
    { value: "fixed", label: "Lương cố định" },
    { value: "hourly", label: "Theo giờ" },
    { value: "commission", label: "Theo doanh số" }
  ]
} satisfies Record<string, FormSelectOption[]>;

function dataOptions<T extends { id: string; name: string }>(items: T[]) {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

function fieldLabel(label?: string, placeholder?: string) {
  return label ?? placeholder;
}

function TextField({
  className,
  defaultValue,
  label,
  name,
  placeholder,
  required
}: {
  className?: string;
  defaultValue?: string;
  label?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  const labelText = fieldLabel(label, placeholder);

  return (
    <label className={["personnel-create-field", className].filter(Boolean).join(" ")}>
      {labelText ? <span>{labelText}{required ? " *" : ""}</span> : null}
      <input defaultValue={defaultValue} name={name} placeholder={placeholder ?? label} required={required} />
    </label>
  );
}

function DateField({
  className,
  label,
  name,
  placeholder,
  required
}: {
  className?: string;
  label?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  const labelText = fieldLabel(label, placeholder);

  return (
    <label className={["personnel-create-field", "personnel-create-field--date", className].filter(Boolean).join(" ")}>
      {labelText ? <span>{labelText}{required ? " *" : ""}</span> : null}
      <FormDatePicker name={name} placeholder={placeholder ?? label ?? "dd/mm/yyyy"} required={required} />
    </label>
  );
}

function SelectField({
  className,
  defaultValue,
  label,
  name,
  options,
  placeholder,
  required
}: {
  className?: string;
  defaultValue?: string;
  label?: string;
  name: string;
  options: FormSelectOption[];
  placeholder?: string;
  required?: boolean;
}) {
  const labelText = fieldLabel(label, placeholder);
  const controlLabel = label || placeholder || name;

  return (
    <label className={["personnel-create-field", className].filter(Boolean).join(" ")}>
      {labelText ? <span>{labelText}{required ? " *" : ""}</span> : null}
      <FormSelect
        ariaLabel={`Chọn ${controlLabel}`}
        defaultValue={defaultValue}
        menuLabel={controlLabel}
        name={name}
        options={options}
        placeholder={placeholder ?? label ?? "Chọn"}
        required={required}
      />
    </label>
  );
}

function SearchField(props: Parameters<typeof TextField>[0]) {
  return (
    <div className="personnel-create-search-field">
      <TextField {...props} />
      <MagnifyingGlass size={18} weight="duotone" aria-hidden="true" />
    </div>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const contentId = useId();

  return (
    <section className={isCollapsed ? "personnel-create-section is-collapsed" : "personnel-create-section"}>
      <h2>
        <button
          className="personnel-create-section-toggle"
          type="button"
          aria-controls={contentId}
          aria-expanded={!isCollapsed}
          onClick={() => setIsCollapsed((current) => !current)}
        >
          <CaretDown size={16} weight="duotone" aria-hidden="true" />
          <span>{title}</span>
        </button>
      </h2>
      <div className="personnel-create-section-body" id={contentId} hidden={isCollapsed}>
        {children}
      </div>
    </section>
  );
}

function AddRowButton({ label }: { label: string }) {
  return (
    <button className="personnel-create-add-row" type="button" aria-label={label}>
      <Plus size={17} weight="duotone" aria-hidden="true" />
    </button>
  );
}

function AttachmentDropzone() {
  return (
    <section className="personnel-create-attachment-dropzone" aria-label="Đính kèm">
      <span className="personnel-create-attachment-legend">Đính kèm</span>
      <span className="personnel-create-attachment-icon" aria-hidden="true">
        <UploadSimple size={26} weight="duotone" />
      </span>
      <div className="personnel-create-attachment-content">
        <p>Kéo thả file vào đây để tải lên hoặc</p>
        <div className="personnel-create-attachment-actions">
          <label className="personnel-create-source-button is-primary">
            <Paperclip size={15} weight="duotone" aria-hidden="true" />
            <span>CHỌN TỪ MÁY</span>
            <input name="attachments" type="file" multiple />
          </label>
          <button className="personnel-create-source-button" type="button">
            <UploadSimple size={15} weight="duotone" aria-hidden="true" />
            <span>CHỌN TỪ CLOUD</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export function PersonnelContractCreateBoard({ data }: { data: EmployeeCreateData }) {
  const departments = dataOptions(data.departments);
  const positions = dataOptions(data.positions);
  const jobTitles = dataOptions(data.jobTitles);

  return (
    <main className="personnel-profile-create-page personnel-contract-create-page" aria-label="Tạo mới hợp đồng">
      {data.source === "unavailable" ? (
        <section className="account-api-banner admin-user-api-banner" role="status">
          <strong>Chưa kết nối được dữ liệu nhân sự</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      <form className="personnel-create-form personnel-contract-create-form" onSubmit={(event) => event.preventDefault()}>
        <Section title="Thông tin chung">
          <div className="personnel-create-grid personnel-create-grid--labor-contract">
            <SearchField className="is-wide" label="Nhân sự" name="employeeId" placeholder="Nhân sự" required />
            <TextField defaultValue="-01" label="Mã HĐ" name="contractCode" required />
            <SelectField className="is-span-2" name="contractName" options={contractOptions.names} placeholder="Tên hợp đồng" />
            <SelectField className="is-wide" name="departmentId" options={departments} placeholder="Phòng ban" />
            <SelectField className="is-wide" name="positionId" options={positions} placeholder="Vị trí" />
            <SelectField className="is-wide" name="jobTitleId" options={jobTitles} placeholder="Chức vụ" />
            <SelectField className="is-wide" name="rankId" options={jobTitles} placeholder="Cấp bậc" />
            <SelectField name="workMode" options={contractOptions.workModes} placeholder="Hình thức làm việc" />
            <SelectField className="is-span-2" name="workplace" options={contractOptions.workplaces} placeholder="Nơi làm việc" />
            <DateField label="Hiệu lực từ ngày" name="effectiveFrom" required />
            <DateField name="effectiveTo" placeholder="Hiệu lực đến ngày" />
            <SelectField name="workingHours" options={contractOptions.workingHours} placeholder="Giờ làm việc" />
            <DateField name="signedDate" placeholder="Ngày ký" />
            <SearchField className="is-span-2" name="signerId" placeholder="Người ký" />
          </div>
          <FormCheckbox className="personnel-create-contract-check" name="isDigitalContract" label="Ký số" />
        </Section>

        <Section title="Thông tin lương và phụ cấp">
          <div className="personnel-create-compensation-card">
            <button className="personnel-create-row-remove personnel-create-compensation-remove" type="button" aria-label="Xóa nhóm lương và phụ cấp">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
            <div className="personnel-create-grid personnel-create-grid--compensation-top">
              <DateField label="Từ ngày" name="compensationStartDate" required />
              <TextField label="Ghi chú" name="compensationNote" placeholder="Viết ghi chú" />
            </div>
            <div className="personnel-create-grid personnel-create-grid--compensation-pay">
              <SelectField label="Lương và phụ cấp" name="compensationType" options={contractOptions.salaryTypes} defaultValue="salary" required />
              <SelectField label="Hình thức" name="compensationForm" options={contractOptions.salaryForms} placeholder="Chọn hình thức" />
              <TextField label="Số tiền" name="compensationAmount" placeholder="Nhập lương" />
              <button className="personnel-create-row-remove" type="button" aria-label="Xóa dòng lương và phụ cấp">
                <X size={18} weight="duotone" aria-hidden="true" />
              </button>
            </div>
            <AddRowButton label="Thêm lương hoặc phụ cấp" />
          </div>
          <AddRowButton label="Thêm nhóm lương và phụ cấp" />
        </Section>

        <label className="personnel-create-field personnel-create-note">
          <span>Mô tả</span>
          <textarea name="description" placeholder="Nhập mô tả" />
        </label>

        <AttachmentDropzone />

        <footer className="personnel-create-actionbar">
          <button className="primary-button" disabled={data.source === "unavailable"} type="submit">
            <CheckCircle size={16} weight="duotone" aria-hidden="true" />
            CẬP NHẬT
          </button>
          <a className="secondary-button" href="/apps/personnel-contract-contract">
            HỦY BỎ
          </a>
        </footer>
      </form>
    </main>
  );
}
