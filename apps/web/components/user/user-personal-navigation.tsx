"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent
} from "react";
import { usePathname } from "next/navigation";
import { AppLauncher } from "@/components/dashboard/app-launcher";
import {
  Bank,
  BookOpenText,
  Briefcase,
  CalendarCheck,
  CaretDown,
  CaretUp,
  ChartLineUp,
  CheckCircle,
  ClipboardText,
  CurrencyDollar,
  DotsThree,
  FileClock,
  FileText,
  FlowArrow,
  GearSix,
  House,
  IdentificationBadge,
  LinkSimple,
  MagicWand,
  MagnifyingGlass,
  Megaphone,
  MoneyWavy,
  Network,
  Plus,
  ShieldCheck,
  User,
  Users,
  X
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";

const maxMenuItems = 10;
const requiredMenuKeys = new Set(["home"]);
const sidebarMenuChangedEvent = "helios:sidebar-menu-changed";

type PersonalModule = {
  key: string;
  label: string;
  href: string;
  group: "Cá nhân" | "WORKPLACE" | "HRM" | "Quản trị";
  icon: Icon;
  activeHashes?: string[];
  permissionKey?: string;
  legacyPermissionKeys?: string[];
  adminOnly?: boolean;
  exact?: boolean;
};

type UserPersonalNavigationProps = {
  activeModule?: string;
  accountId: string;
  isAdmin: boolean;
  permissionKeys: string[];
  variant?: "user" | "admin" | "hcns";
};

const settingsItem = {
  key: "settings",
  label: "Tùy chỉnh",
  icon: MagicWand
};

const moduleCatalog: PersonalModule[] = [
  { key: "home", label: "Trang chủ", href: "/user", group: "Cá nhân", icon: House },
  {
    key: "loans",
    label: "Vay",
    href: "#",
    group: "Cá nhân",
    icon: MoneyWavy,
    permissionKey: "menu.user.loans"
  },
  {
    key: "attendance",
    label: "Công",
    href: "/user?customMenu=user-board-attendance",
    group: "Cá nhân",
    icon: CalendarCheck,
    permissionKey: "menu.user.attendance"
  },
  {
    key: "payroll",
    label: "Lương",
    href: "/user?customMenu=user-board-payroll",
    group: "Cá nhân",
    icon: Bank,
    permissionKey: "menu.user.payroll"
  },
  {
    key: "requests",
    label: "Đơn từ",
    href: "/user?customMenu=user-board-requests",
    group: "Cá nhân",
    icon: ClipboardText,
    permissionKey: "menu.user.requests",
    legacyPermissionKeys: ["requests.personal.create"]
  },
  {
    key: "profile",
    label: "Hồ sơ",
    href: "/user?customMenu=user-board-profile",
    group: "Cá nhân",
    icon: IdentificationBadge,
    permissionKey: "menu.user.profile",
    legacyPermissionKeys: ["reports.personal.view"]
  },
  {
    key: "work-tasks",
    label: "Công việc thường",
    href: "#",
    group: "WORKPLACE",
    icon: ClipboardText,
    permissionKey: "menu.work.tasks",
    legacyPermissionKeys: ["tasks.assigned.update"]
  },
  {
    key: "work-projects",
    label: "Dự án",
    href: "#",
    group: "WORKPLACE",
    icon: Briefcase,
    permissionKey: "menu.work.projects"
  },
  {
    key: "work-processes",
    label: "Quy trình",
    href: "#",
    group: "WORKPLACE",
    icon: FlowArrow,
    permissionKey: "menu.work.processes"
  },
  {
    key: "work-timesheets",
    label: "Timesheet",
    href: "#",
    group: "WORKPLACE",
    icon: CalendarCheck,
    permissionKey: "menu.work.timesheets"
  },
  {
    key: "work-documents",
    label: "Tài liệu",
    href: "#",
    group: "WORKPLACE",
    icon: FileText,
    permissionKey: "menu.work.documents"
  },
  {
    key: "hcns-dashboard",
    label: "Dashboard HCNS",
    href: "/hcns",
    group: "HRM",
    icon: Users,
    permissionKey: "menu.hrm.dashboard",
    legacyPermissionKeys: ["hr.dashboard.modules.view"]
  },
  {
    key: "hcns-employees",
    label: "Nhân sự",
    href: "/apps/personnel-profile-profile",
    group: "HRM",
    icon: IdentificationBadge,
    permissionKey: "menu.hrm.employees",
    legacyPermissionKeys: ["employees.department.manage"]
  },
  {
    key: "hcns-contracts",
    label: "Hợp đồng lao động",
    href: "/apps/personnel-contract-contract",
    group: "HRM",
    icon: Briefcase,
    permissionKey: "menu.hrm.contracts",
    legacyPermissionKeys: ["hr.dashboard.contracts.view"]
  },
  {
    key: "hrm-recruitment",
    label: "Tuyển dụng",
    href: "#",
    group: "HRM",
    icon: BookOpenText,
    permissionKey: "menu.hrm.recruitment"
  },
  {
    key: "hrm-performance",
    label: "Đánh giá",
    href: "#",
    group: "HRM",
    icon: CheckCircle,
    permissionKey: "menu.hrm.performance"
  },
  {
    key: "admin-console",
    label: "Quản trị",
    href: "/admin",
    group: "Quản trị",
    icon: ShieldCheck,
    permissionKey: "menu.admin.console",
    adminOnly: true
  },
  {
    key: "admin-settings",
    label: "Cấu hình",
    href: "/admin/settings",
    group: "Quản trị",
    icon: GearSix,
    permissionKey: "menu.admin.settings",
    adminOnly: true
  }
];

const adminModuleCatalog: PersonalModule[] = [
  { key: "dashboard", label: "Trang chủ", href: "/admin", group: "Quản trị", icon: House, exact: true },
  { key: "approvals", label: "Phê duyệt", href: "/admin/approvals-alerts", group: "Quản trị", icon: CheckCircle },
  {
    key: "admin-users",
    label: "Người dùng",
    href: "/admin/settings/accounts",
    group: "Quản trị",
    icon: User,
    exact: true
  },
  {
    key: "admin-departments",
    label: "Phòng ban",
    href: "/admin/settings/org-chart",
    group: "Quản trị",
    icon: Network
  },
  {
    key: "admin-groups",
    label: "Nhóm",
    href: "/admin/settings/accounts/groups",
    group: "Quản trị",
    icon: Users
  },
  {
    key: "admin-reconciliation",
    label: "Đối soát",
    href: "/admin/settings#reconciliation",
    group: "Quản trị",
    icon: Bank,
    activeHashes: ["#reconciliation"]
  },
  {
    key: "admin-currency",
    label: "Tiền tệ",
    href: "/admin/settings/currency",
    group: "Quản trị",
    icon: CurrencyDollar
  },
  {
    key: "admin-history",
    label: "Lịch sử",
    href: "/admin/settings#audit-logs",
    group: "Quản trị",
    icon: FileClock,
    activeHashes: ["#audit-logs"]
  },
  {
    key: "admin-sso",
    label: "SSO",
    href: "/admin/settings/smtp",
    group: "Quản trị",
    icon: LinkSimple
  },
  {
    key: "settings",
    label: "Cấu hình",
    href: "/admin/settings",
    group: "Quản trị",
    icon: GearSix,
    exact: true
  },
  {
    key: "logs",
    label: "Nhật ký",
    href: "/admin/settings#audit-logs",
    group: "Quản trị",
    icon: ClipboardText,
    activeHashes: ["#audit-logs"]
  }
];

const hcnsModuleCatalog: PersonalModule[] = [
  { key: "dashboard", label: "Trang chủ", href: "/hcns", group: "HRM", icon: House, exact: true },
  { key: "attendance", label: "Công", href: "/hcns#attendance", group: "HRM", icon: CalendarCheck },
  { key: "requests", label: "Đơn từ", href: "/hcns#requests", group: "HRM", icon: ClipboardText },
  { key: "people", label: "Hồ sơ", href: "/apps/personnel-profile-profile", group: "HRM", icon: Users },
  { key: "contracts", label: "Hợp đồng", href: "/apps/personnel-contract-contract", group: "HRM", icon: Briefcase },
  { key: "analytics", label: "BI HRM", href: "/hcns#analytics", group: "HRM", icon: ChartLineUp }
];

const sidebarVariantConfig = {
  admin: {
    aiLabel: "AI Support",
    defaultKeys: [
      "admin-users",
      "admin-departments",
      "admin-groups",
      "admin-reconciliation",
      "admin-currency",
      "admin-history",
      "admin-sso"
    ],
    groupOrder: ["Quản trị"],
    mobileKeys: ["dashboard", "approvals", "settings", "logs"],
    navLabel: "Module quản trị",
    preferenceScope: "admin.sidebar",
    railClassName: "admin-rail",
    railLabel: "Điều hướng quản trị",
    railNavClassName: "admin-rail-nav",
    title: "Tùy chỉnh menu Quản trị"
  },
  hcns: {
    aiLabel: "AI Support",
    defaultKeys: ["dashboard", "attendance", "requests", "people", "contracts"],
    groupOrder: ["HRM"],
    mobileKeys: ["dashboard", "attendance", "requests", "people", "contracts"],
    navLabel: "Module HCNS",
    preferenceScope: "hcns.sidebar",
    railClassName: "hcns-rail",
    railLabel: "Điều hướng HCNS",
    railNavClassName: "hcns-rail-nav",
    title: "Tùy chỉnh menu HCNS"
  },
  user: {
    aiLabel: "AI Support",
    defaultKeys: null,
    groupOrder: ["Cá nhân", "WORKPLACE", "HRM", "Quản trị"],
    mobileKeys: null,
    navLabel: "Module cá nhân",
    preferenceScope: "user.sidebar",
    railClassName: "",
    railLabel: "Điều hướng cá nhân",
    railNavClassName: "",
    title: "Tùy chỉnh menu Trang cá nhân"
  }
} as const;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function readStoredMenu(storageKey: string) {
  try {
    const value = window.localStorage.getItem(storageKey);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : null;
  } catch {
    return null;
  }
}

function writeStoredMenu(storageKey: string, menuKeys: string[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(menuKeys));
  } catch {
    // Local storage is best-effort; the current session still updates immediately.
  }

  window.dispatchEvent(new CustomEvent(sidebarMenuChangedEvent, {
    detail: {
      menuKeys,
      storageKey
    }
  }));
}

function readPreferenceMenuKeys(value: unknown) {
  if (!value || typeof value !== "object" || !("menuKeys" in value)) {
    return null;
  }

  const menuKeys = (value as { menuKeys?: unknown }).menuKeys;

  return Array.isArray(menuKeys) ? menuKeys.filter((item): item is string => typeof item === "string") : null;
}

async function fetchSidebarPreference(preferenceScope: string) {
  const response = await fetch(`/api/user-preferences/${encodeURIComponent(preferenceScope)}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Preference read returned ${response.status}`);
  }

  return response.json() as Promise<{ value: unknown }>;
}

async function saveSidebarPreference(preferenceScope: string, menuKeys: string[]) {
  const response = await fetch(`/api/user-preferences/${encodeURIComponent(preferenceScope)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ value: { menuKeys } })
  });

  if (!response.ok) {
    throw new Error(`Preference update returned ${response.status}`);
  }

  return response.json() as Promise<{ value: unknown }>;
}

function normalizeMenuKeys(keys: readonly string[], availableKeys: Set<string>) {
  const normalized = Array.from(new Set(keys.filter((key) => availableKeys.has(key))));

  for (const key of requiredMenuKeys) {
    if (availableKeys.has(key) && !normalized.includes(key)) {
      normalized.unshift(key);
    }
  }

  return normalized.slice(0, maxMenuItems);
}

function reorderKeys(keys: string[], sourceKey: string, targetKey: string) {
  if (sourceKey === targetKey) {
    return keys;
  }

  const sourceIndex = keys.indexOf(sourceKey);
  const targetIndex = keys.indexOf(targetKey);

  if (sourceIndex < 0 || targetIndex < 0) {
    return keys;
  }

  const nextKeys = [...keys];
  const [source] = nextKeys.splice(sourceIndex, 1);
  nextKeys.splice(targetIndex, 0, source);

  return nextKeys;
}

function splitHref(href: string) {
  const [path, hash] = href.split("#");

  return {
    path,
    hash: hash ? `#${hash}` : ""
  };
}

function useCurrentHash() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  return hash;
}

function isActiveItem(pathname: string, currentHash: string, item: PersonalModule) {
  if (item.href === "#") {
    return false;
  }

  const itemHref = splitHref(item.href);

  if (!itemHref.path) {
    return false;
  }

  if (item.activeHashes) {
    const normalizedHash = currentHash || itemHref.hash;

    return pathname === itemHref.path && item.activeHashes.includes(normalizedHash);
  }

  if (item.exact) {
    return pathname === itemHref.path && currentHash === itemHref.hash;
  }

  if (itemHref.hash) {
    return pathname === itemHref.path && currentHash === itemHref.hash;
  }

  return pathname === itemHref.path || pathname.startsWith(`${itemHref.path}/`);
}

function hasModuleAccess(module: PersonalModule, permissionSet: Set<string>, isAdmin: boolean) {
  if (module.key === "home") {
    return true;
  }

  if (isAdmin && module.group === "Cá nhân") {
    return false;
  }

  if (isAdmin) {
    return true;
  }

  if (module.adminOnly) {
    return false;
  }

  const accessKeys = [module.permissionKey, ...(module.legacyPermissionKeys ?? [])].filter(
    (key): key is string => Boolean(key)
  );

  return accessKeys.some((key) => permissionSet.has(key));
}

function getDefaultMenuKeys(availableKeys: Set<string>, isAdmin: boolean, variant: "user" | "admin" | "hcns") {
  const configuredDefaultKeys = sidebarVariantConfig[variant].defaultKeys;
  const preferredKeys = configuredDefaultKeys ?? (
    isAdmin
      ? ["home", "admin-console", "admin-settings"]
      : ["home", "attendance", "requests", "profile", "work-tasks"]
  );

  return normalizeMenuKeys(preferredKeys, availableKeys);
}

function getModuleCatalog(variant: "user" | "admin" | "hcns") {
  if (variant === "admin") {
    return adminModuleCatalog;
  }

  if (variant === "hcns") {
    return hcnsModuleCatalog;
  }

  return moduleCatalog;
}

function UserMenuCustomizer({
  availableModules,
  defaultMenuKeys,
  draftKeys,
  groupOrder,
  isOpen,
  isSaving,
  onClose,
  onSave,
  saveError,
  setDraftKeys,
  title
}: {
  availableModules: PersonalModule[];
  defaultMenuKeys: string[];
  draftKeys: string[];
  groupOrder: readonly string[];
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (menuKeys: string[]) => void | Promise<void>;
  saveError: string | null;
  setDraftKeys: (keys: string[]) => void;
  title: string;
}) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const moduleByKey = useMemo(() => new Map(availableModules.map((item) => [item.key, item])), [availableModules]);
  const availableKeys = useMemo(() => new Set(availableModules.map((item) => item.key)), [availableModules]);
  const selectedSet = useMemo(() => new Set(draftKeys), [draftKeys]);
  const draftModules = draftKeys.map((key) => moduleByKey.get(key)).filter((item): item is PersonalModule => Boolean(item));
  const normalizedQuery = normalizeText(query.trim());
  const appModules = availableModules.filter((item) => item.key !== "home");
  const filteredAppModules = normalizedQuery
    ? appModules.filter((item) => normalizeText(`${item.label} ${item.group} ${item.key}`).includes(normalizedQuery))
    : appModules;
  const groupedModules = groupOrder.map((group) => ({
    group,
    modules: filteredAppModules.filter((item) => item.group === group)
  })).filter((group) => group.modules.length > 0);

  if (!isOpen) {
    return null;
  }

  const addModule = (key: string) => {
    if (!availableKeys.has(key) || selectedSet.has(key) || draftKeys.length >= maxMenuItems) {
      return;
    }

    setDraftKeys([...draftKeys, key]);
  };

  const removeModule = (key: string) => {
    if (requiredMenuKeys.has(key)) {
      return;
    }

    setDraftKeys(draftKeys.filter((item) => item !== key));
  };

  const moveModule = (key: string, direction: -1 | 1) => {
    const currentIndex = draftKeys.indexOf(key);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= draftKeys.length) {
      return;
    }

    const nextKeys = [...draftKeys];
    [nextKeys[currentIndex], nextKeys[nextIndex]] = [nextKeys[nextIndex], nextKeys[currentIndex]];
    setDraftKeys(nextKeys);
  };

  const onDropModule = (event: DragEvent<HTMLDivElement>, targetKey: string) => {
    event.preventDefault();

    if (!draggedKey) {
      return;
    }

    setDraftKeys(reorderKeys(draftKeys, draggedKey, targetKey));
    setDraggedKey(null);
  };

  return (
    <div className="user-menu-customizer-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}>
      <section className="user-menu-customizer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="user-menu-customizer-header">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" type="button" aria-label="Đóng tùy chỉnh menu" onClick={onClose}>
            <X size={19} weight="duotone" aria-hidden="true" />
          </button>
        </header>

        <div className="user-menu-customizer-body">
          <section className="user-menu-customizer-column" aria-label="Menu đang hiển thị">
            <header>
              <h3>Menu</h3>
              <span>{draftKeys.length}/{maxMenuItems}</span>
            </header>

            <div className="user-menu-customizer-list">
              {draftModules.map((item, index) => {
                const isRequired = requiredMenuKeys.has(item.key);

                return (
                  <div
                    className={draggedKey === item.key ? "user-menu-customizer-row is-dragging" : "user-menu-customizer-row"}
                    draggable
                    key={item.key}
                    onDragStart={() => setDraggedKey(item.key)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => onDropModule(event, item.key)}
                  >
                    <DotsThree size={16} weight="duotone" aria-hidden="true" />
                    <item.icon size={18} weight="duotone" aria-hidden="true" />
                    <span>{item.label}</span>
                    <div className="user-menu-customizer-row-actions">
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Đưa ${item.label} lên trên`}
                        disabled={index === 0}
                        onClick={() => moveModule(item.key, -1)}
                      >
                        <CaretUp size={15} weight="duotone" aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Đưa ${item.label} xuống dưới`}
                        disabled={index === draftModules.length - 1}
                        onClick={() => moveModule(item.key, 1)}
                      >
                        <CaretDown size={15} weight="duotone" aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Bỏ ${item.label} khỏi menu`}
                        disabled={isRequired}
                        onClick={() => removeModule(item.key)}
                      >
                        <X size={15} weight="duotone" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="user-menu-customizer-column" aria-label="Ứng dụng được cấp quyền">
            <header>
              <h3>Ứng dụng</h3>
              <label className="user-menu-search">
                <MagnifyingGlass size={17} weight="duotone" aria-hidden="true" />
                <span className="sr-only">Tìm module</span>
                <input value={query} type="search" onChange={(event) => setQuery(event.target.value)} />
              </label>
            </header>

            <div className="user-menu-customizer-apps">
              {groupedModules.length > 0 ? groupedModules.map((group) => (
                <section className="user-menu-app-group" key={group.group}>
                  <h4>{group.group}</h4>
                  <div className="user-menu-app-list">
                    {group.modules.map((item) => {
                      const isSelected = selectedSet.has(item.key);

                      return (
                        <article className={isSelected ? "user-menu-app-row is-selected" : "user-menu-app-row"} key={item.key}>
                          <span className="user-menu-app-icon">
                            <item.icon size={18} weight="duotone" aria-hidden="true" />
                          </span>
                          <div>
                            <strong>{item.label}</strong>
                          </div>
                          {isSelected ? (
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={`Bỏ ${item.label} khỏi menu`}
                              onClick={() => removeModule(item.key)}
                            >
                              <X size={15} weight="duotone" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={`Thêm ${item.label} vào menu`}
                              disabled={draftKeys.length >= maxMenuItems}
                              onClick={() => addModule(item.key)}
                            >
                              <Plus size={15} weight="duotone" aria-hidden="true" />
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )) : (
                <div className="user-menu-empty">
                  <ShieldCheck size={22} weight="duotone" aria-hidden="true" />
                  <strong>Chưa có module được cấp quyền</strong>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="user-menu-customizer-footer">
          <button className="secondary-button" type="button" onClick={() => setDraftKeys(normalizeMenuKeys(defaultMenuKeys, availableKeys))}>
            Mặc định
          </button>
          {saveError ? <p className="user-menu-customizer-error">{saveError}</p> : null}
          <div>
            <button className="secondary-button" type="button" disabled={isSaving} onClick={onClose}>
              Thoát
            </button>
            <button className="primary-button" type="button" disabled={isSaving} onClick={() => onSave(normalizeMenuKeys(draftKeys, availableKeys))}>
              Cập nhật
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export function UserPersonalNavigation({
  activeModule,
  accountId,
  isAdmin,
  permissionKeys,
  variant = "user"
}: UserPersonalNavigationProps) {
  const pathname = usePathname();
  const currentHash = useCurrentHash();
  const config = sidebarVariantConfig[variant];
  const permissionSet = useMemo(() => new Set(permissionKeys), [permissionKeys]);
  const catalog = useMemo(() => getModuleCatalog(variant), [variant]);
  const availableModules = useMemo(
    () => catalog.filter((item) => variant === "user" ? hasModuleAccess(item, permissionSet, isAdmin) : true),
    [catalog, isAdmin, permissionSet, variant]
  );
  const availableKeys = useMemo(() => new Set(availableModules.map((item) => item.key)), [availableModules]);
  const defaultMenuKeys = useMemo(() => getDefaultMenuKeys(availableKeys, isAdmin, variant), [availableKeys, isAdmin, variant]);
  const availableSignature = availableModules.map((item) => item.key).join("|");
  const storageKey = variant === "user"
    ? `helios:user-sidebar:${accountId}`
    : `helios:${config.preferenceScope}:${accountId}`;
  const [menuKeys, setMenuKeys] = useState(defaultMenuKeys);
  const [draftKeys, setDraftKeys] = useState(defaultMenuKeys);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const moduleByKey = useMemo(() => new Map(availableModules.map((item) => [item.key, item])), [availableModules]);
  const visibleModules = menuKeys.map((key) => moduleByKey.get(key)).filter((item): item is PersonalModule => Boolean(item));
  const mobileModules = visibleModules.slice(0, 4);
  const mobileStyle = {
    "--user-mobile-count": String(Math.max(1, Math.min(5, mobileModules.length + 1)))
  } as CSSProperties;

  useEffect(() => {
    let isActive = true;
    const storedMenu = readStoredMenu(storageKey);
    const nextMenu = normalizeMenuKeys(storedMenu ?? defaultMenuKeys, availableKeys);

    setMenuKeys(nextMenu);
    setDraftKeys(nextMenu);

    fetchSidebarPreference(config.preferenceScope)
      .then((preference) => {
        if (!isActive) {
          return;
        }

        const preferenceKeys = readPreferenceMenuKeys(preference.value);

        if (preferenceKeys) {
          const normalizedPreferenceKeys = normalizeMenuKeys(preferenceKeys, availableKeys);
          setMenuKeys(normalizedPreferenceKeys);
          setDraftKeys(normalizedPreferenceKeys);
          writeStoredMenu(storageKey, normalizedPreferenceKeys);
          return;
        }

        if (storedMenu) {
          void saveSidebarPreference(config.preferenceScope, nextMenu);
        }
      })
      .catch(() => {
        // The local cache keeps the UI usable if the preference API is temporarily unavailable.
      });

    return () => {
      isActive = false;
    };
  }, [availableKeys, availableSignature, config.preferenceScope, defaultMenuKeys, storageKey]);

  const openCustomizer = () => {
    setSaveError(null);
    setDraftKeys(menuKeys);
    setIsCustomizerOpen(true);
  };

  const saveMenu = async (nextMenuKeys: string[]) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await saveSidebarPreference(config.preferenceScope, nextMenuKeys);
      setMenuKeys(nextMenuKeys);
      setDraftKeys(nextMenuKeys);
      writeStoredMenu(storageKey, nextMenuKeys);
      setIsCustomizerOpen(false);
    } catch {
      setSaveError("Chưa lưu được lên tài khoản. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderRailLink = (item: PersonalModule) => {
    const isActive = activeModule ? item.key === activeModule : isActiveItem(pathname, currentHash, item);

    return (
      <a
        aria-current={isActive ? "page" : undefined}
        className={isActive ? "user-rail-link is-current" : "user-rail-link"}
        href={item.href}
        key={item.key}
      >
        <item.icon size={19} weight="duotone" aria-hidden="true" />
        <span>{item.label}</span>
      </a>
    );
  };

  const renderMobileLink = (item: PersonalModule) => {
    const isActive = activeModule ? item.key === activeModule : isActiveItem(pathname, currentHash, item);

    return (
      <a
        aria-current={isActive ? "page" : undefined}
        className={isActive ? "user-mobile-nav-link is-current" : "user-mobile-nav-link"}
        href={item.href}
        key={item.key}
      >
        <item.icon size={20} weight="duotone" aria-hidden="true" />
        <span>{item.label}</span>
      </a>
    );
  };

  return (
    <>
      <aside className={config.railClassName ? `user-rail ${config.railClassName}` : "user-rail"} aria-label={config.railLabel}>
        <div className="user-rail-launcher">
          <AppLauncher />
        </div>

        <nav className={config.railNavClassName ? `user-rail-nav ${config.railNavClassName}` : "user-rail-nav"} aria-label={config.navLabel}>
          {visibleModules.map(renderRailLink)}
          <button
            className={activeModule === settingsItem.key ? "user-rail-link user-rail-link-button is-current" : "user-rail-link user-rail-link-button"}
            type="button"
            aria-label={`Tùy chỉnh ${config.navLabel.toLowerCase()}`}
            onClick={openCustomizer}
          >
            <settingsItem.icon size={19} weight="duotone" aria-hidden="true" />
            <span>{settingsItem.label}</span>
          </button>
        </nav>

        <a className="user-ai-link" href="#ai-support" aria-label="AI Support">
          <Megaphone size={18} weight="duotone" aria-hidden="true" />
          <span>AI Support</span>
        </a>
      </aside>

      <nav className="user-mobile-nav" aria-label={`${config.railLabel} trên mobile`} style={mobileStyle}>
        {mobileModules.map(renderMobileLink)}
        <button className="user-mobile-nav-link user-mobile-nav-button" type="button" aria-label={`Tùy chỉnh ${config.navLabel.toLowerCase()}`} onClick={openCustomizer}>
          <settingsItem.icon size={20} weight="duotone" aria-hidden="true" />
          <span>{settingsItem.label}</span>
        </button>
      </nav>

      <UserMenuCustomizer
        availableModules={availableModules}
        defaultMenuKeys={defaultMenuKeys}
        draftKeys={draftKeys}
        groupOrder={config.groupOrder}
        isOpen={isCustomizerOpen}
        isSaving={isSaving}
        onClose={() => setIsCustomizerOpen(false)}
        onSave={saveMenu}
        saveError={saveError}
        setDraftKeys={setDraftKeys}
        title={config.title}
      />
    </>
  );
}
