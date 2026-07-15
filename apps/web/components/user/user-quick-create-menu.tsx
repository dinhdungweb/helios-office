"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox, FormSelect } from "@/components/ui/form-controls";
import { FormField, FormInput, FormTextarea, ModalDialog } from "@/components/ui/primitives";
import { createDepartmentAction, type DepartmentFormState } from "@/lib/org-chart-actions";
import type { OrgChartData, OrgEmployeeOption } from "@/lib/org-chart-api";
import { CaretRight, MagnifyingGlass, Plus } from "@/lib/icons";

type UserQuickCreateMode = "default" | "admin";
type DynamicQuickCreateKind = "requests";

type DynamicQuickCreateItem =
  | {
      href: string;
      key: string;
      label: string;
      moduleKeys: string[];
      type: "link";
    }
  | {
      key: DynamicQuickCreateKind;
      label: string;
      moduleKeys: string[];
      type: "nested";
    };

type SidebarMenuChangeDetail = {
  menuKeys?: unknown;
  storageKey?: unknown;
};

const sidebarMenuChangedEvent = "helios:sidebar-menu-changed";

const requestCreateItems = [
  { label: "Đơn xin nghỉ", href: "/user/requests/new?type=leave" },
  { label: "Đơn vắng mặt", href: "/user/requests/new?type=absence" },
  { label: "Đơn làm thêm", href: "/user/requests/new?type=overtime" },
  { label: "Đơn checkin/out", href: "/user/requests/new?type=checkin-out" },
  { label: "Đơn đổi ca", href: "/user/requests/new?type=shift-change" },
  { label: "Đơn thôi việc", href: "/user/requests/new?type=resignation" }
];

const adminShortcutItems = [
  { label: "Phòng ban, chi nhánh" },
  { label: "Khối nghiệp vụ", href: "/admin/settings/positions-titles" },
  { label: "Loại phòng ban", href: "/admin/settings/org-chart" },
  { label: "Nhóm người dùng", href: "/admin/settings/accounts/groups/new" },
  { label: "Quản lý tiền tệ", href: "/admin/settings/currency/new" },
  { label: "Cấu hình SSO", href: "/admin/settings#system-settings" }
];

type UserQuickCreateMenuProps = {
  fallbackMenuKeys?: string[];
  menuStorageKey?: string;
  mode?: UserQuickCreateMode;
  orgChartData?: OrgChartData;
};

const dynamicQuickCreateItems: DynamicQuickCreateItem[] = [
  {
    href: "/apps/personnel-profile-profile/add",
    key: "employee-profile",
    label: "Hồ sơ nhân sự",
    moduleKeys: ["hcns-employees", "people"],
    type: "link"
  },
  {
    href: "/apps/personnel-contract-contract/add",
    key: "labor-contract",
    label: "Hợp đồng lao động",
    moduleKeys: ["hcns-contracts", "contracts"],
    type: "link"
  },
  {
    key: "requests",
    label: "Đơn từ",
    moduleKeys: ["requests"],
    type: "nested"
  },
  {
    href: "/user/requests/new?type=checkin-out",
    key: "attendance-checkin-out",
    label: "Đơn checkin/out",
    moduleKeys: ["attendance"],
    type: "link"
  }
];

const initialDepartmentState: DepartmentFormState = { ok: false };

function buildDepartmentOptions(data?: OrgChartData) {
  return [
    { label: "Không có cấp cha", value: "none" },
    ...(data?.departments ?? [])
      .filter((department) => department.status === "active")
      .map((department) => ({
        label: department.name,
        description: department.parentName ?? "Cấp cao nhất",
        value: department.id
      }))
  ];
}

function buildHeadOptions(data?: OrgChartData) {
  const employees: OrgEmployeeOption[] = data?.employees ?? [];

  return [
    { label: "Chưa gán trưởng phòng", value: "none" },
    ...employees.map((employee) => ({
      label: employee.name,
      description: `${employee.title} · ${employee.department}`,
      value: employee.id
    }))
  ];
}

function normalizeMenuKeys(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : null;
}

function readSidebarMenuKeys(storageKey?: string) {
  if (!storageKey || typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(storageKey);

    if (!value) {
      return null;
    }

    return normalizeMenuKeys(JSON.parse(value));
  } catch {
    return null;
  }
}

function getDynamicQuickCreateItems(menuKeys: string[] | null) {
  if (!menuKeys) {
    return [];
  }

  const itemByModuleKey = new Map<string, DynamicQuickCreateItem>();

  for (const item of dynamicQuickCreateItems) {
    for (const moduleKey of item.moduleKeys) {
      itemByModuleKey.set(moduleKey, item);
    }
  }

  const seen = new Set<string>();
  const orderedItems: DynamicQuickCreateItem[] = [];

  for (const menuKey of menuKeys) {
    const item = itemByModuleKey.get(menuKey);

    if (item && !seen.has(item.key)) {
      seen.add(item.key);
      orderedItems.push(item);
    }
  }

  return orderedItems;
}

function DepartmentQuickCreateDialog({
  data,
  onClose
}: {
  data?: OrgChartData;
  onClose: (shouldRefresh?: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction, isPending] = useActionState(createDepartmentAction, initialDepartmentState);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.ok) {
      onClose(true);
    }
  }, [onClose, state.ok]);

  return (
    <ModalDialog
      className="org-department-dialog org-department-dialog--quick"
      onCloseRequest={() => onClose(false)}
      ref={dialogRef}
      title="Tạo mới phòng ban, chi nhánh"
    >
      <form className="account-dialog-form org-department-form" action={formAction} autoComplete="off">
        <div className="account-dialog-grid org-department-form-grid">
          <FormField className="org-floating-field" label={<>Cấu trúc quyền <b aria-hidden="true">*</b></>}>
            <FormSelect
              ariaLabel="Chọn cấu trúc quyền"
              defaultValue="department"
              menuLabel="Danh sách cấu trúc quyền"
              name="permissionStructure"
              options={[
                { label: "Công ty", value: "company" },
                { label: "Chi nhánh công ty", value: "branch" },
                { label: "Phòng ban", value: "department" }
              ]}
              placeholder="Cấu trúc quyền"
              required
            />
          </FormField>
          <FormField label="Mã">
            <FormInput name="code" placeholder="Mã" autoComplete="off" />
          </FormField>
          <FormField label={<>Tên phòng ban <b aria-hidden="true">*</b></>} wide>
            <FormInput name="name" required minLength={2} placeholder="Tên phòng ban" autoComplete="off" />
          </FormField>
          <FormCheckbox className="org-department-manager-check" name="isManagementUnit" label="Là đơn vị cấp quản lý" />
          <FormField className="org-floating-field org-department-search-field" label="Giám sát công việc" wide>
            <FormSelect
              ariaLabel="Chọn giám sát công việc"
              menuLabel="Danh sách nhân sự"
              name="headId"
              options={buildHeadOptions(data)}
              placeholder="Giám sát công việc"
            />
            <MagnifyingGlass size={18} weight="duotone" aria-hidden="true" />
          </FormField>
          <FormField label="Thuộc phòng ban" wide>
            <FormSelect
              ariaLabel="Chọn phòng ban cấp cha"
              menuLabel="Danh sách phòng ban cấp cha"
              name="parentId"
              options={buildDepartmentOptions(data)}
              placeholder="Chọn phòng ban"
            />
          </FormField>
          <FormField
            helpText="Lựa chọn cài đặt này giúp người quản trị có thể xuất ra các báo cáo theo nghiệp vụ. VD: Báo cáo lương của khối nghiệp vụ kế toán, kinh doanh,..."
            label="Khối nghiệp vụ"
            wide
          >
            <FormSelect
              ariaLabel="Chọn khối nghiệp vụ"
              menuLabel="Danh sách khối nghiệp vụ"
              name="businessUnit"
              options={[
                { label: "Khối kinh doanh", value: "business" },
                { label: "Khối vận hành", value: "operations" },
                { label: "Khối kế toán", value: "accounting" },
                { label: "Khối nhân sự", value: "people" }
              ]}
              placeholder="Khối nghiệp vụ"
            />
          </FormField>
          <FormField
            helpText="Phòng ban là 1 đơn vị nội bộ trực thuộc doanh nghiệp, có thể là 1 nhóm, đội, phòng, ban hoặc khối."
            label="Loại phòng ban"
            wide
          >
            <FormSelect
              ariaLabel="Chọn loại phòng ban"
              menuLabel="Danh sách loại phòng ban"
              name="departmentType"
              options={[
                { label: "Phòng ban", value: "department" },
                { label: "Chi nhánh", value: "branch" },
                { label: "Nhóm", value: "team" },
                { label: "Khối", value: "division" }
              ]}
              placeholder="Loại phòng ban"
            />
          </FormField>
          <FormField className="org-floating-field" label="Mô tả" wide>
            <FormTextarea name="description" rows={2} placeholder="Mô tả" autoComplete="off" />
          </FormField>
        </div>
        {state.error ? <p className="account-dialog-error">{state.error}</p> : null}
        <div className="account-dialog-actions org-department-actions">
          <button className="secondary-button" type="button" onClick={() => onClose(false)}>
            HỦY BỎ
          </button>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "ĐANG XỬ LÝ" : "CẬP NHẬT"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

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

export function UserQuickCreateMenu({
  fallbackMenuKeys,
  menuStorageKey,
  mode = "default",
  orgChartData
}: UserQuickCreateMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [isDepartmentTypeDialogOpen, setIsDepartmentTypeDialogOpen] = useState(false);
  const [visibleMenuKeys, setVisibleMenuKeys] = useState<string[] | null>(fallbackMenuKeys ?? null);
  const [activeGroup, setActiveGroup] = useState<"requests" | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const isAdminMode = mode === "admin";
  const fallbackMenuSignature = fallbackMenuKeys?.join("|") ?? "";
  const quickCreateItems = isAdminMode ? [] : getDynamicQuickCreateItems(visibleMenuKeys);

  useEffect(() => {
    const fallbackKeys = fallbackMenuKeys ?? null;

    if (isAdminMode || !menuStorageKey) {
      setVisibleMenuKeys(fallbackKeys);
      return;
    }

    const syncFromStorage = () => {
      setVisibleMenuKeys(readSidebarMenuKeys(menuStorageKey) ?? fallbackKeys);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === menuStorageKey) {
        syncFromStorage();
      }
    };

    const onSidebarMenuChanged = (event: Event) => {
      const detail = (event as CustomEvent<SidebarMenuChangeDetail>).detail;

      if (detail?.storageKey !== menuStorageKey) {
        return;
      }

      setVisibleMenuKeys(normalizeMenuKeys(detail.menuKeys) ?? fallbackKeys);
    };

    syncFromStorage();
    window.addEventListener("storage", onStorage);
    window.addEventListener(sidebarMenuChangedEvent, onSidebarMenuChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(sidebarMenuChangedEvent, onSidebarMenuChanged);
    };
  }, [fallbackMenuKeys, fallbackMenuSignature, isAdminMode, menuStorageKey]);

  useEffect(() => {
    if (activeGroup && !quickCreateItems.some((item) => item.type === "nested" && item.key === activeGroup)) {
      setActiveGroup(null);
    }
  }, [activeGroup, quickCreateItems]);

  useEffect(() => {
    if (!isOpen) {
      setActiveGroup(null);
      return;
    }

    if (firstItemRef.current && rootRef.current?.contains(firstItemRef.current)) {
      firstItemRef.current.focus();
    }

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
                {quickCreateItems.length > 0 ? (
                  quickCreateItems.map((item, index) => {
                    const ref = index === 0 ? (node: HTMLAnchorElement | HTMLButtonElement | null) => {
                      firstItemRef.current = node;
                    } : undefined;

                    if (item.type === "nested") {
                      return (
                        <button
                          aria-expanded={activeGroup === item.key}
                          aria-haspopup="menu"
                          className={activeGroup === item.key ? "user-quick-create-item is-active" : "user-quick-create-item"}
                          key={item.key}
                          ref={ref}
                          role="menuitem"
                          type="button"
                          onClick={() => setActiveGroup(item.key)}
                          onMouseEnter={() => setActiveGroup(item.key)}
                        >
                          <span>{item.label}</span>
                          <CaretRight size={15} weight="duotone" aria-hidden="true" />
                        </button>
                      );
                    }

                    return (
                      <a
                        className="user-quick-create-item"
                        href={item.href}
                        key={item.key}
                        ref={ref}
                        role="menuitem"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </a>
                    );
                  })
                ) : (
                  <p className="user-quick-create-empty">Chưa có mục tạo nhanh</p>
                )}
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
        <DepartmentQuickCreateDialog
          data={orgChartData}
          onClose={(shouldRefresh = false) => {
            setIsDepartmentDialogOpen(false);

            if (shouldRefresh) {
              router.refresh();
            }
          }}
        />
      ) : null}
      {isBusinessDialogOpen ? <BusinessUnitDialog onClose={() => setIsBusinessDialogOpen(false)} /> : null}
      {isDepartmentTypeDialogOpen ? <DepartmentTypeDialog onClose={() => setIsDepartmentTypeDialogOpen(false)} /> : null}
    </div>
  );
}
