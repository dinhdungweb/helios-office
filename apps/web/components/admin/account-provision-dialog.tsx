"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormSelect } from "@/components/ui/form-controls";
import { CheckCircle, Plus, X } from "@/lib/icons";
import {
  createAccountAction,
  type AccountFormState
} from "@/lib/account-access-actions";
import type {
  AccountLifecycleStatus,
  AccountLicense,
  AccountProvisionEmployee,
  AccountRole,
  PermissionGroup
} from "@/lib/account-access-api";

const roleOptions: Array<{ value: AccountRole; label: string }> = [
  { value: "user", label: "User" },
  { value: "system_admin", label: "Admin" }
];

const statusOptions: Array<{ value: AccountLifecycleStatus; label: string }> = [
  { value: "active", label: "Đang hoạt động" },
  { value: "pending_activation", label: "Chưa kích hoạt" },
  { value: "closed", label: "Đã đóng" }
];

const initialState: AccountFormState = {
  ok: false
};

type AccountProvisionDialogProps = {
  employees: AccountProvisionEmployee[];
  groups: PermissionGroup[];
  licenses: AccountLicense[];
};

function suggestUsername(employee?: AccountProvisionEmployee) {
  const source = employee?.code || employee?.name || "";

  return source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function getDefaultGroupId(groups: PermissionGroup[]) {
  return (
    groups.find((group) => group.id === "grp-employees")?.id ??
    groups.find((group) => group.role === "user")?.id ??
    "none"
  );
}

function DialogForm({
  employees,
  groups,
  licenses,
  onClose
}: AccountProvisionDialogProps & {
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createAccountAction, initialState);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id ?? "");
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const suggestedUsername = suggestUsername(selectedEmployee);
  const defaultLicense = licenses[0]?.key ?? "standard";
  const defaultGroupId = useMemo(() => getDefaultGroupId(groups), [groups]);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [onClose, router, state.ok]);

  if (employees.length === 0) {
    return (
      <div className="account-dialog-form">
        <div className="account-dialog-empty">
          <strong>Không còn hồ sơ nhân sự chờ cấp tài khoản</strong>
          <p>Tạo hồ sơ nhân sự mới nếu cần cấp tài khoản cho người chưa có trong hệ thống.</p>
          <a className="primary-button" href="/admin/hr/employees/new">
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo hồ sơ nhân sự
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="account-dialog-form" action={formAction}>
      <div className="account-dialog-grid">
        <label className="account-dialog-field account-dialog-field--wide">
          <span>Nhân sự</span>
          <FormSelect
            ariaLabel="Chọn nhân sự"
            defaultValue={selectedEmployeeId}
            menuLabel="Nhân sự chưa có tài khoản"
            name="employeeId"
            onValueChange={setSelectedEmployeeId}
            options={employees.map((employee) => ({
              value: employee.id,
              label: employee.name,
              description: `${employee.code} · ${employee.department}`
            }))}
            placeholder="Chọn nhân sự"
            required
          />
          {selectedEmployee ? (
            <small className="account-provision-note">
              {selectedEmployee.title} · {selectedEmployee.department}
            </small>
          ) : null}
        </label>

        <label className="account-dialog-field">
          <span>Họ tên hiển thị</span>
          <input
            name="displayName"
            type="text"
            required
            minLength={2}
            defaultValue={selectedEmployee?.name ?? ""}
            key={`name-${selectedEmployeeId}`}
          />
        </label>

        <label className="account-dialog-field">
          <span>Email đăng ký</span>
          <input
            name="email"
            type="email"
            required
            placeholder="name@company.vn"
            defaultValue={suggestedUsername ? `${suggestedUsername}@helios.vn` : ""}
            key={`email-${selectedEmployeeId}`}
          />
        </label>

        <label className="account-dialog-field">
          <span>Tên đăng nhập</span>
          <input
            name="username"
            type="text"
            required
            minLength={2}
            autoComplete="username"
            defaultValue={suggestedUsername}
            key={`username-${selectedEmployeeId}`}
          />
        </label>

        <label className="account-dialog-field">
          <span>Mật khẩu mặc định</span>
          <input
            name="initialPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            defaultValue="Welcome@123"
          />
        </label>

        <label className="account-dialog-field">
          <span>Trạng thái</span>
          <FormSelect
            ariaLabel="Chọn trạng thái"
            defaultValue="active"
            menuLabel="Trạng thái tài khoản"
            name="accountStatus"
            options={statusOptions}
            placeholder="Chọn trạng thái"
          />
        </label>

        <label className="account-dialog-field">
          <span>Quyền</span>
          <FormSelect
            ariaLabel="Chọn quyền"
            defaultValue="user"
            menuLabel="Quyền tài khoản"
            name="adminRole"
            options={roleOptions}
            placeholder="Chọn quyền"
          />
        </label>

        <label className="account-dialog-field">
          <span>License</span>
          <FormSelect
            ariaLabel="Chọn license"
            defaultValue={defaultLicense}
            menuLabel="Danh sách license"
            name="licensePlan"
            options={licenses.map((license) => ({
              value: license.key,
              label: license.name,
              description: license.summary
            }))}
            placeholder="Chọn license"
          />
        </label>

        <label className="account-dialog-field">
          <span>Nhóm quyền</span>
          <FormSelect
            ariaLabel="Chọn nhóm quyền"
            defaultValue={defaultGroupId}
            menuLabel="Danh sách nhóm quyền"
            name="permissionGroupId"
            options={[
              { value: "none", label: "Chưa gán" },
              ...groups.map((group) => ({
                value: group.id,
                label: group.name,
                description: group.summary
              }))
            ]}
            placeholder="Chưa gán"
          />
        </label>
      </div>

      {state.error ? <p className="account-dialog-error">{state.error}</p> : null}

      <div className="account-dialog-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          <X size={16} weight="duotone" aria-hidden="true" />
          Hủy
        </button>
        <button className="primary-button" type="submit" disabled={isPending}>
          <CheckCircle size={16} weight="duotone" aria-hidden="true" />
          {isPending ? "Đang kích hoạt" : "Kích hoạt"}
        </button>
      </div>
    </form>
  );
}

export function AccountProvisionDialog({ employees, groups, licenses }: AccountProvisionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  return (
    <>
      <button
        className="primary-button"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Plus size={16} weight="duotone" aria-hidden="true" />
        Cấp tài khoản
      </button>
      <dialog className="account-dialog" ref={dialogRef}>
        <header className="account-dialog-header">
          <h2>Cấp tài khoản</h2>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={() => dialogRef.current?.close()}>
            <X size={16} weight="duotone" aria-hidden="true" />
          </button>
        </header>
        <DialogForm
          employees={employees}
          groups={groups}
          licenses={licenses}
          onClose={() => dialogRef.current?.close()}
        />
      </dialog>
    </>
  );
}
