"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FormCheckbox, FormDatePicker, FormSelect, formatDateInputValue, type FormSelectOption } from "@/components/ui/form-controls";
import { createEmployeeProfileAction, type EmployeeCreateFormState } from "@/lib/employee-profile-actions";
import type { EmployeeCreateData } from "@/lib/employee-profile-api";
import { CaretDown, CheckCircle, MagnifyingGlass, Paperclip, Plus, UploadSimple, X } from "@/lib/icons";

const initialState: EmployeeCreateFormState = { ok: false };

const tabs = [
  { id: "resume", label: "Sơ yếu lý lịch" },
  { id: "contract", label: "Hợp đồng" },
  { id: "health", label: "Sức khỏe" },
  { id: "onboarding", label: "Tiếp nhận" },
  { id: "attachments", label: "Đính kèm" },
  { id: "relations", label: "Đối tượng liên quan" }
] as const;

type PersonnelCreateTabId = (typeof tabs)[number]["id"];

const simpleOptions = {
  gender: [
    { value: "female", label: "Nữ" },
    { value: "male", label: "Nam" },
    { value: "other", label: "Khác" }
  ],
  military: [
    { value: "none", label: "Nghĩa vụ quân sự" },
    { value: "completed", label: "Đã hoàn thành" },
    { value: "exempted", label: "Miễn nghĩa vụ" }
  ],
  marital: [
    { value: "single", label: "Độc thân" },
    { value: "married", label: "Kết hôn" }
  ],
  education: [
    { value: "high-school", label: "Trình độ phổ thông" },
    { value: "college", label: "Cao đẳng" },
    { value: "university", label: "Đại học" },
    { value: "master", label: "Thạc sĩ" }
  ],
  labor: [
    { value: "official", label: "Nhân viên chính thức" },
    { value: "probation", label: "Thử việc" },
    { value: "parttime", label: "Parttime" }
  ],
  yesNo: [
    { value: "no", label: "Không" },
    { value: "yes", label: "Có" }
  ],
  contractTypes: [
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

function todayValue() {
  return formatDateInputValue(new Date());
}

function dataOptions<T extends { id: string; name: string }>(items: T[]) {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

function getFieldLabel(label?: string, placeholder?: string) {
  return label ?? placeholder;
}

function TextField({
  className,
  defaultValue,
  label,
  name,
  placeholder,
  required,
  type = "text"
}: {
  className?: string;
  defaultValue?: string;
  label?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  const fieldLabel = getFieldLabel(label, placeholder);

  return (
    <label className={["personnel-create-field", className].filter(Boolean).join(" ")}>
      {fieldLabel ? <span>{fieldLabel}{required ? " *" : ""}</span> : null}
      <input defaultValue={defaultValue} name={name} placeholder={placeholder ?? label} required={required} type={type} />
    </label>
  );
}

function DateField({
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
  const fieldLabel = getFieldLabel(label, placeholder);

  return (
    <label className={["personnel-create-field", "personnel-create-field--date", className].filter(Boolean).join(" ")}>
      {fieldLabel ? <span>{fieldLabel}{required ? " *" : ""}</span> : null}
      <FormDatePicker defaultValue={defaultValue} name={name} placeholder={placeholder ?? label ?? "dd/mm/yyyy"} required={required} />
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
  const fieldLabel = getFieldLabel(label, placeholder);
  const controlLabel = label || placeholder || name;

  return (
    <label className={["personnel-create-field", className].filter(Boolean).join(" ")}>
      {fieldLabel ? <span>{fieldLabel}{required ? " *" : ""}</span> : null}
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

function UploadBox({ label, name, wide = false }: { label: string; name: string; wide?: boolean }) {
  return (
    <label className={wide ? "personnel-create-upload is-wide" : "personnel-create-upload"}>
      <span>{label}</span>
      <input name={name} type="file" />
      <strong aria-hidden="true">
        <UploadSimple size={34} weight="duotone" />
      </strong>
    </label>
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

const onboardingItems = [
  "Ảnh cá nhân",
  "Bản sao giấy khai sinh",
  "Bản sao sổ hộ khẩu",
  "Bằng cấp, trình độ chuyên môn",
  "Bảo hiểm xã hội",
  "Cam kết chính thức",
  "Cam kết làm việc",
  "Cam kết tài sản",
  "Cam kết thử việc",
  "CMT/Căn cước/HC",
  "Cơ cấu lương",
  "Đánh giá thử việc",
  "Đề xuất điều chỉnh chức vụ, thu nhập",
  "Giấy khám sức khỏe",
  "Hợp đồng lao động",
  "Information security agreement",
  "Quyết định bổ nhiệm",
  "Quyết định chấm dứt HĐLĐ",
  "Sơ yếu lý lịch",
  "Tạo tài khoản email",
  "Thư mời làm việc"
] as const;

function HealthTab() {
  return (
    <div className="personnel-create-grid personnel-create-grid--health">
      <TextField label="" name="birthCount" placeholder="Lần sinh" />
      <DateField label="" name="dueDate" placeholder="Ngày dự sinh" />
      <TextField label="" name="bloodPressure" placeholder="Huyết áp" />
      <TextField label="" name="heartRate" placeholder="Nhịp tim" />
      <TextField label="" name="height" placeholder="Chiều cao" />
      <TextField label="" name="weight" placeholder="Cân nặng" />
      <TextField className="is-wide" label="" name="bloodType" placeholder="Nhóm máu" />
    </div>
  );
}

function OnboardingTab() {
  return (
    <div className="personnel-create-onboarding-list">
      {onboardingItems.map((item, index) => (
        <FormCheckbox key={item} name={`onboardingItem${index + 1}`} label={item} />
      ))}
    </div>
  );
}

function AttachmentsTab() {
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

function RelatedObjectsTab() {
  return (
    <div className="personnel-create-related-list">
      <div className="personnel-create-related-row">
        <SelectField
          className="personnel-create-related-select"
          label=""
          name="relatedObject1"
          options={[
            { value: "manager", label: "Người quản lý trực tiếp" },
            { value: "mentor", label: "Người hướng dẫn" },
            { value: "employee", label: "Nhân sự liên quan" }
          ]}
          placeholder="Đối tượng liên quan"
        />
        <button className="personnel-create-row-remove" type="button" aria-label="Xóa đối tượng liên quan">
          <X size={18} weight="duotone" aria-hidden="true" />
        </button>
      </div>
      <AddRowButton label="Thêm đối tượng liên quan" />
    </div>
  );
}

function ContractTab({
  departmentOptions,
  jobTitleOptions,
  managerOptions,
  positionOptions
}: {
  departmentOptions: FormSelectOption[];
  jobTitleOptions: FormSelectOption[];
  managerOptions: FormSelectOption[];
  positionOptions: FormSelectOption[];
}) {
  return (
    <>
      <Section title="Thông tin chung">
        <div className="personnel-create-grid personnel-create-grid--contract">
          <TextField label="Mã HĐ" name="contractCode" />
          <SelectField label="Loại hợp đồng" name="contractType" options={simpleOptions.contractTypes} />
          <SelectField className="is-wide" label="Phòng ban" name="departmentId" options={departmentOptions} defaultValue={departmentOptions[0]?.value} required />
          <SelectField className="is-wide" label="Vị trí" name="positionId" options={positionOptions} defaultValue={positionOptions[0]?.value} required />
          <SelectField className="is-wide" label="Chức danh" name="jobTitleId" options={jobTitleOptions} defaultValue={jobTitleOptions[0]?.value} required />
          <SelectField className="is-wide" label="Cấp bậc" name="contractRankId" options={jobTitleOptions} defaultValue={jobTitleOptions[0]?.value} />
          <TextField className="is-wide" name="skillCoefficient" placeholder="Hệ số tay nghề" />
          <SelectField className="is-wide" name="workplace" options={simpleOptions.workplaces} placeholder="Nơi làm việc" />
          <SelectField className="is-wide" name="workMode" options={simpleOptions.workModes} placeholder="Hình thức làm việc" />
          <DateField label="Hiệu lực từ ngày" name="contractStartDate" />
          <DateField name="contractEndDate" placeholder="Đến ngày" />
          <DateField name="contractSignedDate" placeholder="Ngày ký" />
          <SelectField name="contractSignerId" options={managerOptions} placeholder="Người ký" />
        </div>
        <FormCheckbox className="personnel-create-contract-check" name="isDigitalContract" label="Ký số" />
      </Section>

      <Section title="Thông tin lương và phụ cấp">
        <div className="personnel-create-compensation-card">
          <button className="personnel-create-row-remove personnel-create-compensation-remove" type="button" aria-label="Xóa nhóm lương và phụ cấp">
            <X size={18} weight="duotone" aria-hidden="true" />
          </button>
          <div className="personnel-create-grid personnel-create-grid--compensation-top">
            <DateField label="Từ ngày" name="compensationStartDate" />
            <TextField label="Ghi chú" name="compensationNote" placeholder="Viết ghi chú" />
          </div>
          <div className="personnel-create-grid personnel-create-grid--compensation-pay">
            <SelectField label="Lương và phụ cấp" name="compensationType" options={simpleOptions.salaryTypes} defaultValue="salary" />
            <SelectField label="Hình thức" name="compensationForm" options={simpleOptions.salaryForms} placeholder="Chọn hình thức" />
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
        <span>Ghi chú</span>
        <textarea name="contractNote" placeholder="Nhập ghi chú" />
      </label>
    </>
  );
}

export function PersonnelProfileCreateBoard({ data }: { data: EmployeeCreateData }) {
  const [state, formAction, isPending] = useActionState(createEmployeeProfileAction, initialState);
  const [activeTab, setActiveTab] = useState<PersonnelCreateTabId>("resume");
  const router = useRouter();
  const departmentOptions = dataOptions(data.departments);
  const positionOptions = dataOptions(data.positions);
  const jobTitleOptions = dataOptions(data.jobTitles);
  const managerOptions = [
    { value: "none", label: "Người quản lý trực tiếp" },
    ...data.managers.map((manager) => ({ value: manager.id, label: `${manager.code} - ${manager.name}` }))
  ];

  useEffect(() => {
    if (state.ok && state.employeeId) {
      router.push(`/user?customMenu=employee-profile&employeeId=${state.employeeId}`);
    }
  }, [router, state.employeeId, state.ok]);

  return (
    <main className="personnel-profile-create-page" aria-label="Tạo mới hồ sơ nhân sự">
      {data.source === "unavailable" ? (
        <section className="account-api-banner admin-user-api-banner" role="status">
          <strong>Chưa kết nối được dữ liệu nhân sự</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      <nav className="personnel-create-tabs" aria-label="Nhóm thông tin hồ sơ">
        {tabs.map((tab) => (
          <button className={activeTab === tab.id ? "is-active" : ""} key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      <form className="personnel-create-form" action={formAction}>
        <input name="status" type="hidden" value="active" />
        <input name="employeeType" type="hidden" value="official" />

        <fieldset className="personnel-create-tab-panel" hidden={activeTab !== "resume"}>
        <Section title="Thông tin cá nhân">
          <div className="personnel-create-grid personnel-create-grid--compact">
            <TextField label="Mã NS" name="code" required />
            <TextField name="attendanceCode" placeholder="Mã chấm công" />
            <TextField name="profileCode" placeholder="Mã hồ sơ" />
            <TextField className="is-wide" label="Họ và tên" name="fullName" required />
            <DateField name="birthDate" placeholder="Ngày sinh" />
            <SelectField defaultValue="female" label="Giới tính" name="gender" options={simpleOptions.gender} />
            <SelectField name="militaryStatus" options={simpleOptions.military} placeholder="Nghĩa vụ quân sự" />
            <SearchField className="is-wide" name="birthPlace" placeholder="Nơi sinh" />
            <SearchField className="is-wide" name="hometown" placeholder="Nguyên quán" />
            <SearchField name="nationality" placeholder="Quốc tịch" />
            <SelectField name="maritalStatus" options={simpleOptions.marital} placeholder="Tình trạng hôn nhân" />
            <SelectField name="ethnicity" options={[{ value: "kinh", label: "Dân tộc" }]} placeholder="Dân tộc" />
            <SelectField name="religion" options={[{ value: "none", label: "Tôn giáo" }]} placeholder="Tôn giáo" />
            <TextField name="taxCode" placeholder="Mã số thuế cá nhân" />
            <TextField name="syncCode" placeholder="Mã đồng bộ" />
            <DateField defaultValue={todayValue()} label="Ngày vào" name="startDate" required />
            <DateField name="officialStartDate" placeholder="Ngày ký HĐLĐ chính thức" />
            <SelectField name="generalEducation" options={simpleOptions.education} placeholder="Trình độ phổ thông" />
            <TextField name="previousExperienceYears" placeholder="Số năm kinh nghiệm trước đây" />
            <TextField name="major" placeholder="Chuyên ngành" />
            <SelectField name="highestEducation" options={simpleOptions.education} placeholder="Trình độ học vấn cao nhất" />
            <SelectField name="managerId" options={managerOptions} placeholder="Người quản lý trực tiếp" />
            <SelectField name="laborType" options={simpleOptions.labor} placeholder="Loại lao động" />
            <SelectField className="is-wide" name="minimumWageRegion" options={[{ value: "region-1", label: "Vùng áp dụng lương tối thiểu" }]} placeholder="Vùng áp dụng lương tối thiểu" />
            <SelectField className="is-wide" name="gpsAttendanceLocation" options={[{ value: "none", label: "Địa điểm chấm công GPS" }]} placeholder="Địa điểm chấm công GPS" />
          </div>
        </Section>

        <Section title="Thông tin CMT/CC/CCCD/Hộ chiếu">
          <div className="personnel-create-grid">
            <TextField name="identityNumber" placeholder="Số CC/CCCD/CMT" />
            <DateField name="identityIssuedDate" placeholder="Ngày cấp" />
            <SearchField name="identityIssuedPlace" placeholder="Nơi cấp" />
          </div>
          <div className="personnel-create-upload-grid">
            <UploadBox label="Ảnh CC/CCCD/CMND mặt trước" name="identityFrontImage" />
            <UploadBox label="Ảnh CC/CCCD/CMND mặt sau" name="identityBackImage" />
          </div>
          <div className="personnel-create-grid">
            <SelectField name="passportType" options={[{ value: "ordinary", label: "Loại hộ chiếu" }]} placeholder="Loại hộ chiếu" />
            <TextField name="passportNumber" placeholder="Số hộ chiếu" />
            <DateField name="passportIssuedDate" placeholder="Ngày cấp" />
            <DateField name="passportExpiredDate" placeholder="Ngày hết hạn" />
            <SelectField name="passportIssuedPlace" options={[{ value: "vn", label: "Nơi cấp" }]} placeholder="Nơi cấp" />
          </div>
          <UploadBox label="Ảnh hộ chiếu" name="passportImage" />
        </Section>

        <Section title="Thông tin ngân hàng">
          <div className="personnel-create-grid personnel-create-grid--bank">
            <TextField label="Số tài khoản" name="bankAccountNumber" />
            <TextField label="Tên tài khoản" name="bankAccountName" placeholder="Tên tài khoản" />
            <SelectField label="Ngân hàng" name="bankName" options={[{ value: "none", label: "Chọn ngân hàng" }]} placeholder="Chọn ngân hàng" />
            <TextField label="Chi nhánh" name="bankBranch" />
            <button className="personnel-create-row-remove" type="button" aria-label="Xóa thông tin ngân hàng">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>
          <AddRowButton label="Thêm thông tin ngân hàng" />
        </Section>

        <Section title="Thông tin giấy phép lao động">
          <div className="personnel-create-grid personnel-create-grid--permit">
            <TextField label="Số giấy phép lao động" name="workPermitNumber" placeholder="Nhập số giấy phép lao động" />
            <DateField label="Ngày cấp" name="workPermitIssuedDate" />
            <DateField label="Ngày hết hạn" name="workPermitExpiredDate" />
            <button className="personnel-create-row-remove" type="button" aria-label="Xóa giấy phép lao động">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>
          <AddRowButton label="Thêm giấy phép lao động" />
        </Section>

        <Section title="Thông tin Thị Thực/Tạm trú">
          <div className="personnel-create-grid personnel-create-grid--permit">
            <TextField label="Số Thị Thực/Tạm trú" name="visaNumber" placeholder="Nhập số Thị Thực/Tạm trú" />
            <DateField label="Ngày cấp" name="visaIssuedDate" />
            <DateField label="Ngày hết hạn" name="visaExpiredDate" />
            <button className="personnel-create-row-remove" type="button" aria-label="Xóa thị thực">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>
          <AddRowButton label="Thêm thị thực" />
        </Section>

        <Section title="Thông tin liên hệ">
          <div className="personnel-create-grid personnel-create-grid--contact">
            <TextField label="Điện thoại" name="phone" placeholder="Điện thoại" />
            <TextField label="Email" name="email" placeholder="Email" type="email" />
            <TextField name="permanentAddress" placeholder="Thường trú, số nhà, đường" />
            <SearchField name="permanentWard" placeholder="Phường xã, Quận huyện, Tỉnh thành" />
            <TextField name="currentAddress" placeholder="Chỗ ở hiện nay, số nhà, đường" />
            <SearchField name="currentWard" placeholder="Phường xã, Quận huyện, Tỉnh thành" />
          </div>
        </Section>

        <Section title="Thông tin gia đình & người phụ thuộc">
          <div className="personnel-create-wide-row">
            <SelectField label="Mối quan hệ" name="familyRelation" options={[{ value: "parent", label: "Chọn" }]} placeholder="Chọn" />
            <TextField label="Họ và tên" name="familyName" />
            <DateField label="Ngày sinh" name="familyBirthDate" />
            <TextField label="Điện thoại" name="familyPhone" placeholder="098..." />
            <TextField label="CMT/Căn cước" name="familyIdentity" />
            <DateField label="Ngày cấp" name="familyIdentityDate" />
            <SearchField label="Nơi cấp" name="familyIdentityPlace" placeholder="Chọn nơi cấp" />
            <SelectField label="Phụ thuộc" name="familyDependent" options={simpleOptions.yesNo} defaultValue="no" />
            <DateField label="Từ ngày" name="familyFromDate" />
            <DateField label="Đến ngày" name="familyToDate" />
            <TextField label="Mã số thuế" name="familyTaxCode" placeholder="Nhập mã số" />
          </div>
          <AddRowButton label="Thêm người phụ thuộc" />
        </Section>

        <Section title="Quá trình học tập">
          <div className="personnel-create-wide-row personnel-create-wide-row--study">
            <DateField label="Từ ngày" name="studyFrom" placeholder="mm/yyyy" />
            <DateField label="Đến ngày" name="studyTo" placeholder="mm/yyyy" />
            <SelectField label="Hình thức đào tạo" name="studyType" options={[{ value: "none", label: "Chọn hình thức" }]} />
            <TextField label="Chuyên ngành" name="studyMajor" placeholder="Chọn chuyên ngành" />
            <SelectField label="Trình độ học vấn" name="studyLevel" options={[{ value: "none", label: "Chọn trình độ" }]} />
            <TextField label="Nơi đào tạo" name="studyPlace" placeholder="Chọn nơi đào tạo" />
            <button className="personnel-create-row-remove" type="button" aria-label="Xóa quá trình học tập">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>
          <AddRowButton label="Thêm quá trình học tập" />
        </Section>

        <Section title="Lịch sử đảng viên">
          <div className="personnel-create-wide-row personnel-create-wide-row--party">
            <TextField label="Số thẻ" name="partyCardNumber" placeholder="Nhập số thẻ" />
            <SelectField label="Hình thức" name="partyType" options={[{ value: "none", label: "Chọn hình thức" }]} />
            <DateField label="Từ ngày" name="partyFrom" />
            <DateField label="Đến ngày" name="partyTo" />
            <TextField label="Nơi kết nạp" name="partyJoinPlace" placeholder="Nhập nơi kết nạp" />
            <TextField label="Nơi điều chuyển" name="partyTransferPlace" placeholder="Nhập nơi điều chuyển" />
            <button className="personnel-create-row-remove" type="button" aria-label="Xóa lịch sử đảng viên">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>
          <AddRowButton label="Thêm lịch sử đảng viên" />
        </Section>

        <Section title="Kinh nghiệm làm việc">
          <div className="personnel-create-wide-row personnel-create-wide-row--experience">
            <DateField label="Từ tháng" name="experienceFrom" placeholder="mm/yyyy" />
            <DateField label="Đến tháng" name="experienceTo" placeholder="mm/yyyy" />
            <TextField label="Công ty" name="experienceCompany" />
            <TextField label="Vị trí" name="experiencePosition" />
            <TextField label="Người tham chiếu" name="experienceReference" placeholder="Họ tên" />
            <TextField label="Điện thoại" name="experiencePhone" placeholder="Số điện thoại" />
            <TextField label="Mô tả công việc" name="experienceDescription" placeholder="Nhập mô tả" />
            <button className="personnel-create-row-remove" type="button" aria-label="Xóa kinh nghiệm làm việc">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>
          <AddRowButton label="Thêm kinh nghiệm làm việc" />
        </Section>

        <Section title="Chứng chỉ">
          <div className="personnel-create-wide-row personnel-create-wide-row--certificate">
            <TextField label="Số hiệu chứng chỉ" name="certificateNumber" placeholder="Nhập số hiệu" />
            <SelectField label="Đơn vị ban hành" name="certificateIssuer" options={[{ value: "none", label: "Chọn đơn vị ban hành" }]} />
            <SelectField label="Loại chứng chỉ" name="certificateType" options={[{ value: "none", label: "Chọn loại chứng chỉ" }]} />
            <TextField label="Phiên bản" name="certificateVersion" placeholder="Phiên bản" />
            <TextField label="Lần phát hành" name="certificateIssueRound" placeholder="Lần phát hành" />
            <DateField label="Ngày hiệu lực" name="certificateStart" />
            <DateField label="Ngày hết hiệu lực" name="certificateEnd" />
            <label className="personnel-create-file-button">
              Chọn tệp đính kèm
              <input name="certificateAttachment" type="file" />
            </label>
            <button className="personnel-create-row-remove" type="button" aria-label="Xóa chứng chỉ">
              <X size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>
          <AddRowButton label="Thêm chứng chỉ" />
          <UploadBox label="Ảnh đại diện" name="avatarImage" />
        </Section>

        <label className="personnel-create-field personnel-create-note">
          <span>Ghi chú</span>
          <textarea name="note" placeholder="Nhập ghi chú" />
        </label>
        </fieldset>

        <fieldset className="personnel-create-tab-panel" hidden={activeTab !== "contract"}>
          <ContractTab
            departmentOptions={departmentOptions}
            jobTitleOptions={jobTitleOptions}
            managerOptions={managerOptions}
            positionOptions={positionOptions}
          />
        </fieldset>

        <fieldset className="personnel-create-tab-panel" hidden={activeTab !== "health"}>
          <HealthTab />
        </fieldset>

        <fieldset className="personnel-create-tab-panel" hidden={activeTab !== "onboarding"}>
          <OnboardingTab />
        </fieldset>

        <fieldset className="personnel-create-tab-panel" hidden={activeTab !== "attachments"}>
          <AttachmentsTab />
        </fieldset>

        <fieldset className="personnel-create-tab-panel" hidden={activeTab !== "relations"}>
          <RelatedObjectsTab />
        </fieldset>

        {state.ok ? (
          <p className="employee-create-success personnel-create-message" role="status">
            Đã tạo hồ sơ nhân sự.
          </p>
        ) : null}
        {state.error ? <p className="employee-create-error personnel-create-message" role="alert">{state.error}</p> : null}

        <footer className="personnel-create-actionbar">
          <button className="primary-button" disabled={isPending || data.source === "unavailable"} type="submit">
            <CheckCircle size={16} weight="duotone" aria-hidden="true" />
            {isPending ? "ĐANG LƯU" : "CẬP NHẬT"}
          </button>
          <a className="secondary-button" href="/apps/personnel-profile-profile">
            HỦY BỎ
          </a>
        </footer>
      </form>
    </main>
  );
}
