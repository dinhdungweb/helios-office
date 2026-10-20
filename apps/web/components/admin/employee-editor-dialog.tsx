"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormDatePicker, FormSelect, type FormSelectOption } from "@/components/ui/form-controls";
import { Button, FormField, FormInput, ModalDialog } from "@/components/ui/primitives";
import { CheckCircle, X } from "@/lib/icons";
import {
  updateEmployeeDirectoryAction,
  type EmployeeDirectoryFormState
} from "@/lib/employee-directory-actions";
import type { EmployeeDirectoryData, EmployeeDirectoryRecord } from "@/lib/employee-directory-api";

const initialState: EmployeeDirectoryFormState = { ok: false };

const employeeStatusOptions: FormSelectOption[] = [
  { value: "active", label: "Đang làm việc" },
  { value: "onboarding", label: "Đang onboarding" },
  { value: "offboarding", label: "Đang bàn giao" },
  { value: "resigned", label: "Đã nghỉ việc" }
];

const employeeTypeOptions: FormSelectOption[] = [
  { value: "official", label: "Nhân viên chính thức" },
  { value: "probation", label: "Thử việc" },
  { value: "collaborator", label: "Cộng tác viên" }
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

function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function buildOptionList(items: EmployeeDirectoryData["departments"], emptyLabel?: string) {
  const options = items.map((item) => ({
    value: item.id,
    label: item.name,
    description: item.description
  }));

  return emptyLabel ? [{ value: "none", label: emptyLabel }, ...options] : options;
}

export function EmployeeEditorDialog({
  data,
  employee,
  onClose
}: {
  data: EmployeeDirectoryData;
  employee: EmployeeDirectoryRecord;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction, isPending] = useActionState(updateEmployeeDirectoryAction, initialState);
  const departmentOptions = buildOptionList(data.departments);
  const positionOptions = buildOptionList(data.positions, "Chưa gán vị trí");
  const jobTitleOptions = buildOptionList(data.jobTitles, "Chưa gán chức danh");
  const managerOptions = [
    { value: "none", label: "Chưa gán" },
    ...data.employees
      .filter((manager) => manager.id !== employee.id && manager.status === "active")
      .map((manager) => ({
        value: manager.id,
        label: manager.fullName,
        description: `${manager.code} · ${manager.title}`
      }))
  ];
  const accountSource = employee.accountId && !data.accounts.some((account) => account.id === employee.accountId)
    ? [
        {
          id: employee.accountId,
          name: employee.accountDisplayName ?? employee.accountEmail ?? "Tài khoản hiện tại",
          description: employee.accountEmail ?? undefined,
          employeeId: employee.id
        },
        ...data.accounts
      ]
    : data.accounts;
  const accountOptions = [
    { value: "none", label: "Chưa liên kết" },
    ...accountSource
      .filter((account) => !account.employeeId || account.employeeId === employee.id)
      .map((account) => ({
        value: account.id,
        label: account.name,
        description: account.description
      }))
  ];

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.ok) {
      onClose();
    }
  }, [onClose, state.ok]);

  return (
    <ModalDialog
      className="employee-directory-dialog"
      ref={dialogRef}
      title="Sửa hồ sơ nhân sự"
      onCloseRequest={onClose}
    >
      <form className="account-dialog-form employee-directory-form" action={formAction}>
        <input name="employeeId" type="hidden" value={employee.id} />
        <input name="currentAccountId" type="hidden" value={employee.accountId ?? "none"} />

        <div className="account-dialog-grid">
          <FormField label="Họ và tên">
            <FormInput name="fullName" required minLength={2} defaultValue={employee.fullName} />
          </FormField>
          <FormField label="Mã nhân sự">
            <FormInput name="code" required minLength={2} defaultValue={employee.code} />
          </FormField>
          <FormField label="Phòng ban">
            <FormSelect
              ariaLabel="Chọn phòng ban"
              defaultValue={employee.departmentId}
              menuLabel="Danh sách phòng ban"
              name="departmentId"
              options={departmentOptions}
              placeholder="Chọn phòng ban"
              required
            />
          </FormField>
          <FormField label="Quản lý trực tiếp">
            <FormSelect
              ariaLabel="Chọn quản lý trực tiếp"
              defaultValue={employee.managerId ?? "none"}
              menuLabel="Danh sách quản lý"
              name="managerId"
              options={managerOptions}
              placeholder="Chưa gán"
            />
          </FormField>
          <FormField label="Vị trí chuyên môn">
            <FormSelect
              ariaLabel="Chọn vị trí chuyên môn"
              defaultValue={employee.positionId ?? "none"}
              menuLabel="Danh sách vị trí"
              name="positionId"
              options={positionOptions}
              placeholder="Chọn vị trí"
            />
          </FormField>
          <FormField label="Chức danh/cấp bậc">
            <FormSelect
              ariaLabel="Chọn chức danh"
              defaultValue={employee.jobTitleId ?? "none"}
              menuLabel="Danh sách chức danh"
              name="jobTitleId"
              options={jobTitleOptions}
              placeholder="Chọn chức danh"
            />
          </FormField>
          <FormField label="Trạng thái nhân sự">
            <FormSelect
              ariaLabel="Chọn trạng thái nhân sự"
              defaultValue={employee.status}
              menuLabel="Trạng thái nhân sự"
              name="status"
              options={employeeStatusOptions}
              placeholder="Chọn trạng thái"
            />
          </FormField>
          <FormField label="Phân loại">
            <FormSelect
              ariaLabel="Chọn phân loại nhân sự"
              defaultValue={employee.employeeType ?? "official"}
              menuLabel="Phân loại nhân sự"
              name="employeeType"
              options={employeeTypeOptions}
              placeholder="Chọn phân loại"
            />
          </FormField>
          <FormField label="Ngày vào làm">
            <FormDatePicker name="startDate" placeholder="Chọn ngày vào làm" required defaultValue={toDateInputValue(employee.startDate)} />
          </FormField>
          <FormField label="Ngày chính thức">
            <FormDatePicker name="officialStartDate" placeholder="Chọn ngày chính thức" defaultValue={toDateInputValue(employee.officialStartDate)} />
          </FormField>
          <FormField label="Ngày nghỉ việc">
            <FormDatePicker name="endDate" placeholder="Chọn ngày nghỉ việc" defaultValue={toDateInputValue(employee.endDate)} />
          </FormField>
          <FormField label="Ảnh đại diện">
            <FormInput name="avatarUrl" type="url" defaultValue={employee.avatarUrl ?? ""} placeholder="https://" />
          </FormField>
        </div>

        <fieldset className="account-dialog-permissions employee-directory-fieldset">
          <legend>Cấu hình chấm công & lương</legend>
          <div className="account-dialog-grid">
            <FormField label="Mã chấm công">
              <FormInput name="attendanceCode" defaultValue={employee.attendanceCode ?? ""} />
            </FormField>
            <FormField label="Hình thức chấm công">
              <FormSelect
                ariaLabel="Chọn hình thức chấm công"
                defaultValue={employee.attendanceMode ?? "app_and_device"}
                menuLabel="Hình thức chấm công"
                name="attendanceMode"
                options={attendanceModeOptions}
                placeholder="Chọn hình thức"
              />
            </FormField>
            <FormField label="Bảng lương">
              <FormSelect
                ariaLabel="Chọn bảng lương"
                defaultValue={employee.payrollTemplate ?? "office-standard"}
                menuLabel="Danh sách bảng lương"
                name="payrollTemplate"
                options={payrollTemplateOptions}
                placeholder="Chọn bảng lương"
              />
            </FormField>
            <FormField label="Công chuẩn">
              <FormInput name="standardWorkdays" type="number" min={0} max={31} defaultValue={employee.standardWorkdays ?? 26} />
            </FormField>
          </div>
        </fieldset>

        <fieldset className="account-dialog-permissions employee-directory-fieldset">
          <legend>Liên kết tài khoản</legend>
          <div className="account-dialog-grid">
            <FormField label="Tài khoản đăng nhập" wide>
              <FormSelect
                ariaLabel="Chọn tài khoản đăng nhập"
                defaultValue={employee.accountId ?? "none"}
                menuLabel="Danh sách tài khoản đăng nhập"
                name="accountId"
                options={accountOptions}
                placeholder="Chưa liên kết"
              />
            </FormField>
          </div>
        </fieldset>

        {state.error ? <p className="account-dialog-error">{state.error}</p> : null}
        <div className="account-dialog-actions">
          <Button icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose} variant="secondary">
            Hủy
          </Button>
          <Button icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />} isLoading={isPending} type="submit" variant="primary">
            Lưu
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
