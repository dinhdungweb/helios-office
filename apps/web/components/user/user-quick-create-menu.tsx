"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DepartmentDialog } from "@/components/admin/org-chart-settings-board";
import { FormSelect } from "@/components/ui/form-controls";
import { FormField, FormInput, ModalDialog } from "@/components/ui/primitives";
import { CaretRight, Plus } from "@/lib/icons";
import type { OrgChartData } from "@/lib/org-chart-api";

type UserQuickCreateMode = "default" | "admin";

const requestCreateItems = [
  { label: "Đơn xin nghỉ", href: "/user/requests/new?type=leave" },
  { label: "Đơn vắng mặt", href: "/user/requests/new?type=absence" },
  { label: "Đơn làm thêm", href: "/user/requests/new?type=overtime" },
  { label: "Đơn checkin/out", href: "/user/requests/new?type=checkin-out" },
  { label: "Đơn đổi ca", href: "/user/requests/new?type=shift-change" },
  { label: "Đơn thôi việc", href: "/user/requests/new?type=resignation" }
];

const adminShortcutItems = [
  { label: "Phòng ban, chi nhánh", href: "/admin/settings/org-chart" },
  { label: "Khối nghiệp vụ", href: "/admin/settings/positions-titles" },
  { label: "Loại phòng ban", href: "/admin/settings/org-chart" },
  { label: "Nhóm người dùng", href: "/admin/settings/accounts/groups/new" },
  { label: "Quản lý tiền tệ", href: "/admin/settings#system-settings" },
  { label: "Cấu hình SSO", href: "/admin/settings#system-settings" },
  { label: "BÁO CÁO TÌNH HÌNH SỬ DỤNG CỦA NGƯỜI DÙNG THÁNG 07/2026", href: "/admin/settings#audit-logs" }
];

type UserQuickCreateMenuProps = {
  mode?: UserQuickCreateMode;
  orgChartData?: Pick<OrgChartData, "departments" | "employees">;
};

function BusinessUnitDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <ModalDialog
      className="business-unit-dialog org-department-dialog org-department-dialog--quick"
      onCloseRequest={onClose}
      ref={dialogRef}
      title="Tạo mới nghiệp vụ"
    >
      <form className="account-dialog-form org-department-form business-unit-form" autoComplete="off">
        <div className="account-dialog-grid org-department-form-grid business-unit-form-grid">
          <FormField label={<>Tên nghiệp vụ <b aria-hidden="true">*</b></>} wide>
            <FormInput name="name" required minLength={2} placeholder="Tên nghiệp vụ" autoComplete="off" />
          </FormField>
          <FormField label="Trạng thái" wide>
            <FormSelect
              ariaLabel="Chọn trạng thái"
              defaultValue="active"
              menuLabel="Trạng thái nghiệp vụ"
              name="status"
              options={[
                { label: "Hoạt động", value: "active" },
                { label: "Tạm dừng", value: "inactive" }
              ]}
              placeholder="Trạng thái"
            />
          </FormField>
        </div>
        <div className="account-dialog-actions org-department-actions business-unit-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            HỦY BỎ
          </button>
          <button className="primary-button" type="button" onClick={onClose}>
            CẬP NHẬT
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

function DepartmentTypeDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <ModalDialog
      className="department-type-dialog business-unit-dialog org-department-dialog org-department-dialog--quick"
      onCloseRequest={onClose}
      ref={dialogRef}
      title="Tạo mới loại phòng ban"
    >
      <form className="account-dialog-form org-department-form business-unit-form" autoComplete="off">
        <div className="account-dialog-grid org-department-form-grid business-unit-form-grid">
          <FormField label={<>Tiêu đề <b aria-hidden="true">*</b></>} wide>
            <FormInput name="title" required minLength={2} placeholder="Tiêu đề" autoComplete="off" />
          </FormField>
          <FormField label="Trạng thái" wide>
            <FormSelect
              ariaLabel="Chọn trạng thái"
              menuLabel="Trạng thái loại phòng ban"
              name="status"
              options={[
                { label: "Hoạt động", value: "active" },
                { label: "Tạm dừng", value: "inactive" }
              ]}
              placeholder="Trạng thái"
            />
          </FormField>
        </div>
        <div className="account-dialog-actions org-department-actions business-unit-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            HỦY BỎ
          </button>
          <button className="primary-button" type="button" onClick={onClose}>
            CẬP NHẬT
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

export function UserQuickCreateMenu({ mode = "default", orgChartData }: UserQuickCreateMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [isDepartmentTypeDialogOpen, setIsDepartmentTypeDialogOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<"requests" | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const isAdminMode = mode === "admin";

  useEffect(() => {
    if (!isOpen) {
      setActiveGroup(null);
      return;
    }

    firstItemRef.current?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveGroup(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setActiveGroup(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="user-quick-create-wrap" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={isAdminMode ? "Mở menu cấu hình nhanh" : "Tạo nhanh"}
        className={isAdminMode ? "icon-button user-quick-create is-admin-mode" : "icon-button user-quick-create"}
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          setActiveGroup(null);
        }}
      >
        <Plus size={19} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className={[
            "user-quick-create-popover",
            activeGroup ? "is-nested" : "",
            isAdminMode ? "is-admin-menu" : ""
          ].filter(Boolean).join(" ")}
          id={menuId}
          role="menu"
          aria-label={isAdminMode ? "Cấu hình nhanh" : "Tạo nhanh"}
        >
          {isAdminMode ? (
            <div className="user-quick-create-column">
              {adminShortcutItems.map((item, index) => {
                const ref = index === 0 ? (node: HTMLAnchorElement | HTMLButtonElement | null) => {
                  firstItemRef.current = node;
                } : undefined;

                if (index === 0) {
                  return (
                    <button
                      className="user-quick-create-item"
                      key={item.label}
                      ref={ref}
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setIsDepartmentDialogOpen(true);
                      }}
                    >
                      {item.label}
                    </button>
                  );
                }

                if (index === 1) {
                  return (
                    <button
                      className="user-quick-create-item"
                      key={item.label}
                      ref={ref}
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setIsBusinessDialogOpen(true);
                      }}
                    >
                      {item.label}
                    </button>
                  );
                }

                if (index === 2) {
                  return (
                    <button
                      className="user-quick-create-item"
                      key={item.label}
                      ref={ref}
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setIsDepartmentTypeDialogOpen(true);
                      }}
                    >
                      {item.label}
                    </button>
                  );
                }

                return (
                  <a
                    className="user-quick-create-item"
                    href={item.href}
                    key={item.label}
                    ref={ref}
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          ) : (
            <>
              <div className="user-quick-create-column">
                <button
                  aria-expanded={activeGroup === "requests"}
                  aria-haspopup="menu"
                  className={activeGroup === "requests" ? "user-quick-create-item is-active" : "user-quick-create-item"}
                  ref={(node) => {
                    firstItemRef.current = node;
                  }}
                  role="menuitem"
                  type="button"
                  onClick={() => setActiveGroup("requests")}
                  onMouseEnter={() => setActiveGroup("requests")}
                >
                  <span>Đơn từ</span>
                  <CaretRight size={15} weight="duotone" aria-hidden="true" />
                </button>
              </div>

              {activeGroup === "requests" ? (
                <div className="user-quick-create-column" role="menu" aria-label="Đơn từ">
                  {requestCreateItems.map((item) => (
                    <a className="user-quick-create-item" href={item.href} key={item.label} role="menuitem" onClick={() => setIsOpen(false)}>
                      {item.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {isDepartmentDialogOpen ? (
        <DepartmentDialog
          departments={orgChartData?.departments ?? []}
          employees={orgChartData?.employees ?? []}
          mode="create"
          onClose={() => setIsDepartmentDialogOpen(false)}
        />
      ) : null}

      {isBusinessDialogOpen ? <BusinessUnitDialog onClose={() => setIsBusinessDialogOpen(false)} /> : null}
      {isDepartmentTypeDialogOpen ? <DepartmentTypeDialog onClose={() => setIsDepartmentTypeDialogOpen(false)} /> : null}
    </div>
  );
}
