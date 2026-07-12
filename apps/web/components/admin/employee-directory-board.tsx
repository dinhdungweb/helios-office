"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { FormDatePicker, FormSelect, type FormSelectOption } from "@/components/ui/form-controls";
import { Button, FormField, FormInput, ModalDialog, ResponsiveTable, StateBlock } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/badge";
import {
  Buildings,
  CheckCircle,
  Key,
  PencilSimple,
  Plus,
  Users,
  X
} from "@/lib/icons";
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

const statusLabels: Record<EmployeeDirectoryRecord["status"], string> = {
  active: "Đang làm việc",
  onboarding: "Đang onboarding",
  offboarding: "Đang bàn giao",
  resigned: "Đã nghỉ việc"
};

const accountStatusLabels = {
  active: "Hoạt động",
  pending_activation: "Chưa kích hoạt",
  closed: "Đã đóng"
} as const;

type EmployeeDirectoryBoardProps = {
  basePath?: string;
  data: EmployeeDirectoryData;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function buildOptionList(items: EmployeeDirectoryData["departments"], emptyLabel?: string) {
  const options = items.map((item) => ({
    value: item.id,
    label: item.name,
    description: item.description
  }));

  return emptyLabel ? [{ value: "none", label: emptyLabel }, ...options] : options;
}

function StatusBadge({ status }: { status: EmployeeDirectoryRecord["status"] }) {
  const className = status === "active" ? "org-status org-status--active" : "org-status org-status--paused";

  return (
    <Badge className={className} tone={status === "active" ? "success" : "neutral"}>
      {statusLabels[status]}
    </Badge>
  );
}

function AccountBadge({ employee }: { employee: EmployeeDirectoryRecord }) {
  if (!employee.accountId) {
    return <span className="employee-directory-muted">Chưa liên kết</span>;
  }

  return (
    <Badge className="employee-directory-account" icon={<Key size={14} weight="duotone" aria-hidden="true" />} tone="info">
      {employee.accountStatus ? accountStatusLabels[employee.accountStatus] : "Đã liên kết"}
    </Badge>
  );
}

function EmployeeEditorDialog({
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

export function EmployeeDirectoryBoard({ basePath = "/admin/hr/employees", data }: EmployeeDirectoryBoardProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDirectoryRecord | null>(null);
  const summary = useMemo(() => {
    const activeCount = data.employees.filter((employee) => employee.status === "active").length;
    const linkedAccountCount = data.employees.filter((employee) => employee.accountId).length;
    const departmentCount = new Set(data.employees.map((employee) => employee.departmentId)).size;

    return [
      { label: "Hồ sơ nhân sự", value: data.employees.length, icon: Users },
      { label: "Đang làm việc", value: activeCount, icon: CheckCircle },
      { label: "Phòng ban", value: departmentCount, icon: Buildings },
      { label: "Đã liên kết tài khoản", value: linkedAccountCount, icon: Key }
    ];
  }, [data.employees]);

  return (
    <main className="employee-directory-page" aria-label="Quản trị hồ sơ nhân sự">
      {data.source === "unavailable" ? (
        <section className="account-api-banner" role="status">
          <strong>Chưa kết nối được dữ liệu hồ sơ</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      <section className="org-summary-grid" aria-label="Tổng quan hồ sơ nhân sự">
        {summary.map((item) => (
          <article className="org-summary-card" key={item.label}>
            <span>
              <item.icon size={19} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <strong>{item.value}</strong>
              <p>{item.label}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="org-panel" aria-labelledby="employee-directory-title">
        <header className="org-panel-header">
          <div>
            <h2 id="employee-directory-title">Danh sách hồ sơ nhân sự</h2>
            <p>Liên kết phòng ban, vị trí, quản lý trực tiếp và tài khoản đăng nhập.</p>
          </div>
          <div className="org-panel-actions">
            <a className="primary-button" href={`${basePath}/new`}>
              <Plus size={16} weight="duotone" aria-hidden="true" />
              Tạo hồ sơ
            </a>
          </div>
        </header>

        {data.employees.length > 0 ? (
          <ResponsiveTable className="employee-directory-table-shell" label="Danh sách hồ sơ nhân sự có thể cuộn ngang">
            <table className="employee-directory-table">
              <thead>
                <tr>
                  <th scope="col">Nhân sự</th>
                  <th scope="col">Phòng ban</th>
                  <th scope="col">Vị trí</th>
                  <th scope="col">Quản lý</th>
                  <th scope="col">Tài khoản</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Hiệu lực</th>
                  <th scope="col">Tác vụ</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((employee) => (
                  <tr key={employee.id} onClick={() => setSelectedEmployee(employee)}>
                    <th scope="row">
                      <div className="employee-directory-person">
                        <span>
                          {employee.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={employee.avatarUrl} alt="" />
                          ) : (
                            initialsFromName(employee.fullName)
                          )}
                        </span>
                        <div>
                          <strong>{employee.fullName}</strong>
                          <small>{employee.code}</small>
                        </div>
                      </div>
                    </th>
                    <td>
                      <strong>{employee.department}</strong>
                      <small>{employee.departmentCode ?? "Chưa có mã"}</small>
                    </td>
                    <td>
                      <strong>{employee.positionName ?? employee.title}</strong>
                      <small>{employee.jobTitleName ?? "Chưa gán chức danh"}</small>
                    </td>
                    <td>
                      <strong>{employee.managerName ?? "Chưa gán"}</strong>
                      <small>{employee.managerCode ?? "Không có quản lý trực tiếp"}</small>
                    </td>
                    <td>
                      <strong>{employee.accountEmail ?? "Chưa có tài khoản"}</strong>
                      <AccountBadge employee={employee} />
                    </td>
                    <td>
                      <StatusBadge status={employee.status} />
                    </td>
                    <td>
                      <strong>{formatDate(employee.startDate)}</strong>
                      <small>{employee.endDate ? `Nghỉ: ${formatDate(employee.endDate)}` : "Đang hiệu lực"}</small>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Sửa hồ sơ ${employee.fullName}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedEmployee(employee);
                        }}
                      >
                        <PencilSimple size={16} weight="duotone" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        ) : (
          <StateBlock
            action={
              <a className="primary-button" href={`${basePath}/new`}>
                <Plus size={16} weight="duotone" aria-hidden="true" />
                Tạo hồ sơ đầu tiên
              </a>
            }
            title="Chưa có hồ sơ nhân sự"
          >
            Tạo hồ sơ để liên kết phòng ban, chức danh và tài khoản đăng nhập.
          </StateBlock>
        )}
      </section>

      {selectedEmployee ? (
        <EmployeeEditorDialog
          key={selectedEmployee.id}
          data={data}
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      ) : null}
    </main>
  );
}
