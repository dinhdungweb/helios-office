"use client";

import { useActionState, useState } from "react";
import {
  FormCheckbox,
  FormDatePicker,
  FormSelect,
  FormSwitch,
  formatDateInputValue,
  type FormSelectOption
} from "@/components/ui/form-controls";
import { CheckCircle, Key, ShieldCheck, Users, X } from "@/lib/icons";
import {
  createEmployeeProfileAction,
  type EmployeeCreateFormState
} from "@/lib/employee-profile-actions";
import type { EmployeeCreateData } from "@/lib/employee-profile-api";

const initialState: EmployeeCreateFormState = {
  ok: false
};

const employeeTypeOptions: FormSelectOption[] = [
  { value: "official", label: "Nhân viên chính thức" },
  { value: "probation", label: "Thử việc" },
  { value: "collaborator", label: "Cộng tác viên" }
];

const employeeStatusOptions: FormSelectOption[] = [
  { value: "active", label: "Đang làm việc" },
  { value: "onboarding", label: "Đang onboarding" },
  { value: "offboarding", label: "Đang bàn giao" },
  { value: "resigned", label: "Đã nghỉ việc" }
];

const accountStatusOptions: FormSelectOption[] = [
  { value: "pending_activation", label: "Chưa kích hoạt" },
  { value: "active", label: "Hoạt động" },
  { value: "closed", label: "Khóa" }
];

const adminRoleOptions: FormSelectOption[] = [
  { value: "user", label: "User" },
  { value: "system_admin", label: "Admin hệ thống" }
];

const attendanceModeOptions: FormSelectOption[] = [
  { value: "app_and_device", label: "App và máy chấm công" },
  { value: "device_only", label: "Chỉ máy chấm công" },
  { value: "app_only", label: "App GPS/Wifi" }
];

const payrollTemplateOptions: FormSelectOption[] = [
  { value: "office-standard", label: "Khối văn phòng" },
  { value: "sales", label: "Kinh doanh" },
  { value: "operations", label: "Vận hành" }
];

type EmployeeCreateBoardProps = {
  data: EmployeeCreateData;
};

function todayValue() {
  return formatDateInputValue(new Date());
}

export function EmployeeCreateBoard({ data }: EmployeeCreateBoardProps) {
  const [state, formAction, isPending] = useActionState(createEmployeeProfileAction, initialState);
  const [createAccount, setCreateAccount] = useState(true);
  const departmentOptions = data.departments.map((department) => ({
    value: department.id,
    label: department.name,
    description: department.headcount ? `${department.headcount} nhân sự` : undefined
  }));
  const managerOptions = [
    { value: "none", label: "Chưa gán" },
    ...data.managers.map((manager) => ({
      value: manager.id,
      label: `${manager.code} - ${manager.name}`,
      description: `${manager.title} · ${manager.department}`
    }))
  ];
  const groupOptions = [
    { value: "none", label: "Chưa gán" },
    ...data.groups.map((group) => ({
      value: group.id,
      label: group.name,
      description: group.summary
    }))
  ];
  const licenseOptions = data.licenses.map((license) => ({
    value: license.key,
    label: license.name,
    description: license.summary
  }));

  return (
    <main className="employee-create-page" aria-label="Tạo mới hồ sơ nhân sự">
      {data.source === "unavailable" ? (
        <section className="account-api-banner" role="status">
          <strong>Chưa kết nối được dữ liệu nhân sự</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      <form className="employee-create-form" action={formAction}>
        <section className="employee-create-section" aria-labelledby="employee-identity-title">
          <header>
            <span>
              <Users size={20} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h2 id="employee-identity-title">Thông tin định danh & vị trí</h2>
              <p>Hồ sơ nhân sự, phòng ban và vị trí trong sơ đồ tổ chức</p>
            </div>
          </header>

          <div className="employee-create-grid">
            <label className="employee-create-field">
              <span>Họ và tên</span>
              <input name="fullName" type="text" required minLength={2} autoComplete="name" />
            </label>

            <label className="employee-create-field">
              <span>Mã nhân sự</span>
              <input name="code" type="text" required minLength={2} placeholder="HL-006" />
            </label>

            <label className="employee-create-field">
              <span>Phòng ban</span>
              <FormSelect
                ariaLabel="Chọn phòng ban"
                menuLabel="Danh sách phòng ban"
                name="departmentId"
                options={departmentOptions}
                placeholder="Chọn phòng ban"
                required
              />
            </label>

            <label className="employee-create-field">
              <span>Vị trí & chức vụ</span>
              <input name="title" type="text" required minLength={2} placeholder="HR Executive" />
            </label>

            <label className="employee-create-field">
              <span>Quản lý trực tiếp</span>
              <FormSelect
                ariaLabel="Chọn quản lý trực tiếp"
                defaultValue="none"
                menuLabel="Danh sách quản lý"
                name="managerId"
                options={managerOptions}
                placeholder="Chưa gán"
              />
            </label>

            <label className="employee-create-field">
              <span>Phân loại người dùng</span>
              <FormSelect
                ariaLabel="Chọn phân loại người dùng"
                defaultValue="official"
                menuLabel="Phân loại người dùng"
                name="employeeType"
                options={employeeTypeOptions}
                placeholder="Chọn phân loại"
              />
            </label>

            <label className="employee-create-field">
              <span>Ngày vào làm</span>
              <FormDatePicker name="startDate" placeholder="Chọn ngày vào làm" required defaultValue={todayValue()} />
            </label>

            <label className="employee-create-field">
              <span>Ngày chính thức</span>
              <FormDatePicker name="officialStartDate" placeholder="Chọn ngày chính thức" />
            </label>

            <label className="employee-create-field">
              <span>Trạng thái nhân sự</span>
              <FormSelect
                ariaLabel="Chọn trạng thái nhân sự"
                defaultValue="active"
                menuLabel="Trạng thái nhân sự"
                name="status"
                options={employeeStatusOptions}
                placeholder="Chọn trạng thái"
              />
            </label>

            <label className="employee-create-field">
              <span>Ảnh đại diện</span>
              <input name="avatarUrl" type="url" placeholder="https://" />
            </label>
          </div>
        </section>

        <section className="employee-create-section" aria-labelledby="account-provision-title">
          <header>
            <span>
              <Key size={20} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h2 id="account-provision-title">Thông tin tài khoản</h2>
              <p>Tạo thông tin đăng nhập cùng lúc với hồ sơ nhân sự</p>
            </div>
            <FormSwitch
              className="employee-create-toggle"
              name="createAccount"
              checked={createAccount}
              label="Cấp tài khoản"
              onChange={(event) => setCreateAccount(event.target.checked)}
            />
          </header>

          <div className="employee-create-grid">
            <label className="employee-create-field">
              <span>Tên đăng nhập</span>
              <input name="username" type="text" required={createAccount} disabled={!createAccount} placeholder="dung.dd" />
            </label>

            <label className="employee-create-field">
              <span>Mật khẩu mặc định</span>
              <input name="initialPassword" type="password" disabled={!createAccount} autoComplete="new-password" />
            </label>

            <label className="employee-create-field">
              <span>Email đăng ký</span>
              <input name="email" type="email" required={createAccount} disabled={!createAccount} autoComplete="email" />
            </label>

            <label className="employee-create-field">
              <span>Số điện thoại</span>
              <input name="phone" type="tel" disabled={!createAccount} autoComplete="tel" />
            </label>

            <label className="employee-create-field">
              <span>Trạng thái tài khoản</span>
              <FormSelect
                ariaLabel="Chọn trạng thái tài khoản"
                defaultValue="pending_activation"
                disabled={!createAccount}
                menuLabel="Trạng thái tài khoản"
                name="accountStatus"
                options={accountStatusOptions}
                placeholder="Chọn trạng thái"
              />
            </label>

            <FormCheckbox
              className="employee-create-check"
              name="sendInviteEmail"
              defaultChecked
              disabled={!createAccount}
              label="Gửi email thông báo khi SMTP đã cấu hình"
            />
          </div>
        </section>

        <section className="employee-create-section" aria-labelledby="permission-config-title">
          <header>
            <span>
              <ShieldCheck size={20} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h2 id="permission-config-title">Cấu hình tài khoản & quyền hạn</h2>
              <p>Nhóm người dùng, license và quyền quản trị hệ thống</p>
            </div>
          </header>

          <div className="employee-create-grid">
            <label className="employee-create-field">
              <span>Nhóm người dùng</span>
              <FormSelect
                ariaLabel="Chọn nhóm người dùng"
                defaultValue="none"
                disabled={!createAccount}
                menuLabel="Danh sách nhóm quyền"
                name="permissionGroupId"
                options={groupOptions}
                placeholder="Chưa gán"
              />
            </label>

            <label className="employee-create-field">
              <span>License</span>
              <FormSelect
                ariaLabel="Chọn license"
                defaultValue={data.licenses[0]?.key ?? "standard"}
                disabled={!createAccount}
                menuLabel="Danh sách license"
                name="licensePlan"
                options={licenseOptions}
                placeholder="Chọn license"
              />
            </label>

            <label className="employee-create-field">
              <span>Quyền quản trị</span>
              <FormSelect
                ariaLabel="Chọn quyền quản trị"
                defaultValue="user"
                disabled={!createAccount}
                menuLabel="Quyền quản trị"
                name="adminRole"
                options={adminRoleOptions}
                placeholder="Chọn quyền"
              />
            </label>

            <FormCheckbox
              className="employee-create-check"
              name="isDepartmentManager"
              disabled={!createAccount}
              label="Là quản lý bộ phận"
            />
          </div>
        </section>

        <section className="employee-create-section" aria-labelledby="payroll-attendance-title">
          <header>
            <span>
              <CheckCircle size={20} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h2 id="payroll-attendance-title">Cấu hình chấm công & lương</h2>
              <p>Mã chấm công, hình thức ghi nhận công và mẫu bảng lương</p>
            </div>
          </header>

          <div className="employee-create-grid">
            <label className="employee-create-field">
              <span>Mã chấm công</span>
              <input name="attendanceCode" type="text" placeholder="HL-006" />
            </label>

            <label className="employee-create-field">
              <span>Hình thức chấm công</span>
              <FormSelect
                ariaLabel="Chọn hình thức chấm công"
                defaultValue="app_and_device"
                menuLabel="Hình thức chấm công"
                name="attendanceMode"
                options={attendanceModeOptions}
                placeholder="Chọn hình thức"
              />
            </label>

            <label className="employee-create-field">
              <span>Bảng lương</span>
              <FormSelect
                ariaLabel="Chọn bảng lương"
                defaultValue="office-standard"
                menuLabel="Danh sách bảng lương"
                name="payrollTemplate"
                options={payrollTemplateOptions}
                placeholder="Chọn bảng lương"
              />
            </label>

            <label className="employee-create-field">
              <span>Công chuẩn</span>
              <input name="standardWorkdays" type="number" min={0} max={31} defaultValue={26} />
            </label>
          </div>
        </section>

        {state.ok ? (
          <p className="employee-create-success" role="status">
            Đã tạo hồ sơ nhân sự và cập nhật tài khoản.
          </p>
        ) : null}
        {state.error ? <p className="employee-create-error" role="alert">{state.error}</p> : null}

        <div className="employee-create-actions">
          <a className="secondary-button" href="/admin/settings/accounts">
            <X size={16} weight="duotone" aria-hidden="true" />
            Hủy
          </a>
          <button className="primary-button" type="submit" disabled={isPending || data.source === "unavailable"}>
            <CheckCircle size={16} weight="duotone" aria-hidden="true" />
            {isPending ? "Đang lưu" : "Kích hoạt"}
          </button>
        </div>
      </form>
    </main>
  );
}
