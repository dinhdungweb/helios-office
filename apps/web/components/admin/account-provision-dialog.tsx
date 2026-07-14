"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FormCheckbox, FormSelect } from "@/components/ui/form-controls";
import { Button, EmptyState, FormField, FormInput, ModalDialog } from "@/components/ui/primitives";
import { CheckCircle, Plus, X } from "@/lib/icons";
import {
  createAccountAction,
  type AccountFormState
} from "@/lib/account-access-actions";
import type {
  AccountLifecycleStatus,
  AccountProvisionEmployee,
  AccountRole,
  PermissionGroup
} from "@/lib/account-access-api";

const roleOptions: Array<{ value: AccountRole; label: string }> = [
  { value: "user", label: "User" }
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
  onClose
}: AccountProvisionDialogProps & {
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createAccountAction, initialState);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id ?? "");
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const suggestedUsername = suggestUsername(selectedEmployee);
  const assignableGroups = useMemo(() => groups.filter((group) => group.status !== "archived"), [groups]);
  const defaultGroupId = useMemo(() => getDefaultGroupId(assignableGroups), [assignableGroups]);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [onClose, router, state.ok]);

  if (employees.length === 0) {
    return (
      <div className="account-dialog-form">
        <EmptyState
          className="account-dialog-empty"
          title="Không còn hồ sơ nhân sự chờ cấp tài khoản"
          action={
            <a className="primary-button" href="/admin/hr/employees/new">
              <Plus size={16} weight="duotone" aria-hidden="true" />
              Tạo hồ sơ nhân sự
            </a>
          }
        >
          Tạo hồ sơ nhân sự mới nếu cần cấp tài khoản cho người chưa có trong hệ thống.
        </EmptyState>
      </div>
    );
  }

  return (
    <form className="account-dialog-form" action={formAction}>
      <div className="account-dialog-grid">
        <FormField
          label="Nhân sự"
          helpText={selectedEmployee ? `${selectedEmployee.title} · ${selectedEmployee.department}` : undefined}
          wide
        >
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
        </FormField>

        <FormField label="Họ tên hiển thị">
          <FormInput
            name="displayName"
            type="text"
            required
            minLength={2}
            defaultValue={selectedEmployee?.name ?? ""}
            key={`name-${selectedEmployeeId}`}
          />
        </FormField>

        <FormField label="Email đăng ký">
          <FormInput
            name="email"
            type="email"
            required
            placeholder="name@company.vn"
            defaultValue={suggestedUsername ? `${suggestedUsername}@helios.vn` : ""}
            key={`email-${selectedEmployeeId}`}
          />
        </FormField>

        <FormField label="Tên đăng nhập">
          <FormInput
            name="username"
            type="text"
            required
            minLength={2}
            autoComplete="username"
            defaultValue={suggestedUsername}
            key={`username-${selectedEmployeeId}`}
          />
        </FormField>

        <FormField
          label="Mật khẩu tạm thời"
          helpText="Bật yêu cầu đổi mật khẩu để Keycloak bắt người dùng đổi ở lần đăng nhập đầu."
        >
          <FormInput
            name="initialPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            defaultValue="Welcome@123"
          />
        </FormField>

        <FormCheckbox
          className="account-dialog-check"
          name="requirePasswordChange"
          defaultChecked
          label="Yêu cầu đổi mật khẩu lần đầu"
        />

        <FormCheckbox
          className="account-dialog-check"
          name="sendInviteEmail"
          defaultChecked
          label="Gửi email mời khi SMTP đã bật"
        />

        <FormField label="Trạng thái">
          <FormSelect
            ariaLabel="Chọn trạng thái"
            defaultValue="active"
            menuLabel="Trạng thái tài khoản"
            name="accountStatus"
            options={statusOptions}
            placeholder="Chọn trạng thái"
          />
        </FormField>

        <FormField label="Quyền">
          <FormSelect
            ariaLabel="Chọn quyền"
            defaultValue="user"
            menuLabel="Quyền tài khoản"
            name="adminRole"
            options={roleOptions}
            placeholder="Chọn quyền"
          />
        </FormField>

        <FormField label="Nhóm quyền">
          <FormSelect
            ariaLabel="Chọn nhóm quyền"
            defaultValue={defaultGroupId}
            menuLabel="Danh sách nhóm quyền"
            name="permissionGroupId"
            options={[
              { value: "none", label: "Chưa gán" },
              ...assignableGroups.map((group) => ({
                value: group.id,
                label: group.name,
                description: group.summary
              }))
            ]}
            placeholder="Chưa gán"
          />
        </FormField>
      </div>

      {state.error ? <p className="account-dialog-error">{state.error}</p> : null}

      <div className="account-dialog-actions">
        <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={isPending} icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />}>
          {isPending ? "Đang cấp" : "Cấp tài khoản"}
        </Button>
      </div>
    </form>
  );
}

export function AccountProvisionDialog({ employees, groups }: AccountProvisionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <Button variant="primary" icon={<Plus size={16} weight="duotone" aria-hidden="true" />} onClick={() => dialogRef.current?.showModal()}>
        Cấp tài khoản
      </Button>
      {isMounted
        ? createPortal(
            <ModalDialog ref={dialogRef} title="Cấp tài khoản" onCloseRequest={() => dialogRef.current?.close()}>
              <DialogForm
                employees={employees}
                groups={groups}
                onClose={() => dialogRef.current?.close()}
              />
            </ModalDialog>,
            document.body
          )
        : null}
    </>
  );
}
