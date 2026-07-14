import type { AccountPermission } from "@/lib/account-access-api";

export type GroupPermissionItem = {
  actionKeys?: Partial<Record<GroupPermissionActionColumn, string[]>>;
  create?: string;
  id: string;
  label: string;
  manage?: string;
  permissionKeys: string[];
  view?: string;
};

export type GroupPermissionSection = {
  category: string;
  items: GroupPermissionItem[];
};

export type GroupPermissionActionColumn = "manage" | "view" | "create";

export function getGroupPermissionActionKeys(item: GroupPermissionItem, column: GroupPermissionActionColumn) {
  return item.actionKeys?.[column] ?? [];
}

export function getGroupPermissionBaseKeys(item: GroupPermissionItem) {
  const actionKeys = new Set(
    (["manage", "view", "create"] as const).flatMap((column) => getGroupPermissionActionKeys(item, column))
  );

  return item.permissionKeys.filter(
    (permissionKey) => !actionKeys.has(permissionKey)
  );
}

export function hasGroupPermissionAction(
  item: GroupPermissionItem,
  allowedPermissionKeys: Set<string>,
  column: GroupPermissionActionColumn
) {
  return getGroupPermissionActionKeys(item, column).some((permissionKey) => allowedPermissionKeys.has(permissionKey));
}

export const groupPermissionSystemSections: GroupPermissionSection[] = [
  {
    category: "QUẢN TRỊ HỆ THỐNG",
    items: [
      {
        id: "system-organization",
        label: "Cài đặt sơ đồ tổ chức",
        permissionKeys: ["system.organization.manage"]
      },
      {
        id: "system-accounts",
        label: "Kích hoạt, đóng tài khoản nhân viên",
        permissionKeys: ["system.accounts.manage"]
      },
      {
        id: "system-approval-flow",
        label: "Thiết lập quy trình duyệt",
        permissionKeys: ["system.approval_flow.manage"]
      },
      {
        id: "system-open-api",
        label: "Cấu hình Open API",
        permissionKeys: ["system.open_api.manage"]
      },
      {
        id: "system-branding",
        label: "Thay đổi giao diện và logo công ty",
        permissionKeys: ["system.branding.manage"]
      }
    ]
  }
];

export const groupSystemPermissionKeys = groupPermissionSystemSections.flatMap((section) =>
  section.items.flatMap((item) => item.permissionKeys)
);

export function hasGroupSystemPermissions(permissionKeys: readonly string[]) {
  const permissionKeySet = new Set(permissionKeys);

  return groupSystemPermissionKeys.every((permissionKey) => permissionKeySet.has(permissionKey));
}

export const groupPermissionModuleSections: GroupPermissionSection[] = [
  {
    category: "NHÂN SỰ",
    items: [
      {
        id: "hrm-employees",
        label: "Hồ sơ nhân sự",
        manage: "Quản lý tất cả",
        view: "Xem tất cả",
        create: "Tạo mới",
        actionKeys: {
          manage: ["employees.department.manage"]
        },
        permissionKeys: [
          "module.hrm.employees",
          "employees.department.manage",
          "menu.hrm.employees",
          "hr.dashboard.people.view",
          "hr.dashboard.organization.view",
          "hr.dashboard.birthdays.view",
          "hr.dashboard.shortcuts.view"
        ]
      },
      {
        id: "hrm-contracts",
        label: "Hợp đồng",
        manage: "Quản lý tất cả",
        view: "Xem tất cả",
        create: "Tạo mới",
        permissionKeys: ["module.hrm.contracts", "menu.hrm.contracts", "hr.dashboard.contracts.view"]
      },
      {
        id: "hrm-decisions",
        label: "Quyết định",
        manage: "Quản lý tất cả",
        view: "Xem tất cả",
        create: "Tạo mới",
        permissionKeys: ["module.hrm.decisions"]
      }
    ]
  },
  {
    category: "TUYỂN DỤNG",
    items: [
      {
        id: "recruitment-proposals",
        label: "Đề xuất tuyển",
        manage: "Quản lý tất cả",
        view: "Xem tất cả",
        create: "Tạo mới",
        permissionKeys: ["module.recruitment.proposals"]
      },
      {
        id: "recruitment-pipeline",
        label: "Tuyển dụng",
        manage: "Quản lý tất cả",
        view: "Xem tất cả",
        create: "Tạo mới",
        permissionKeys: ["module.recruitment.pipeline", "menu.hrm.recruitment"]
      },
      {
        id: "recruitment-care",
        label: "Chăm sóc",
        manage: "Quản lý tất cả",
        view: "Xem tất cả",
        create: "Tạo mới",
        permissionKeys: ["module.recruitment.care"]
      }
    ]
  },
  {
    category: "CHẤM CÔNG",
    items: [
      {
        id: "attendance",
        label: "Chấm công",
        manage: "Quản lý tất cả",
        view: "Xem tất cả",
        create: "Tạo mới",
        actionKeys: {
          manage: ["attendance.device.manage"]
        },
        permissionKeys: [
          "module.attendance",
          "attendance.device.manage",
          "menu.user.attendance",
          "hr.dashboard.attendance.view"
        ]
      },
      {
        id: "attendance-timesheets",
        label: "Bảng chấm công",
        create: "Không tạo mới",
        permissionKeys: ["module.attendance.timesheets"]
      }
    ]
  },
  {
    category: "BẢNG LƯƠNG",
    items: [
      {
        id: "payroll",
        label: "Bảng lương",
        permissionKeys: ["module.payroll.tables", "menu.user.payroll"]
      },
      {
        id: "payroll-types",
        label: "Loại bảng lương",
        create: "Không tạo mới",
        permissionKeys: ["module.payroll.types"]
      }
    ]
  },
  {
    category: "ĐƠN TỪ",
    items: [
      {
        id: "requests",
        label: "Đơn từ",
        create: "Tạo mới",
        actionKeys: {
          create: ["requests.personal.create"]
        },
        permissionKeys: ["module.requests", "requests.personal.create", "menu.user.requests", "hr.dashboard.requests.view"]
      }
    ]
  },
  {
    category: "PHÊ DUYỆT",
    items: [
      {
        id: "approvals",
        label: "Phê duyệt đơn từ quan trọng",
        manage: "Quản lý tất cả",
        view: "Xem tất cả",
        actionKeys: {
          manage: ["approvals.critical.approve"]
        },
        permissionKeys: ["approvals.critical.approve"]
      }
    ]
  },
  {
    category: "TÀI SẢN",
    items: [
      {
        id: "assets",
        label: "Tài sản",
        create: "Không tạo mới",
        permissionKeys: ["module.assets"]
      }
    ]
  },
  {
    category: "BẢO HIỂM",
    items: [
      {
        id: "insurance",
        label: "IVAN",
        create: "Không tạo mới",
        permissionKeys: ["module.insurance"]
      }
    ]
  },
  {
    category: "LỊCH BIỂU",
    items: [
      {
        id: "calendar-events",
        label: "Sự kiện",
        create: "Không tạo mới",
        permissionKeys: ["module.calendar.events"]
      }
    ]
  },
  {
    category: "TÀI LIỆU",
    items: [
      {
        id: "documents-company",
        label: "Tài liệu công ty",
        permissionKeys: ["module.documents.company", "menu.work.documents"]
      },
      {
        id: "documents-personal",
        label: "Tài liệu cá nhân",
        create: "Không tạo mới",
        permissionKeys: ["module.documents.personal"]
      }
    ]
  },
  {
    category: "KPI",
    items: [
      {
        id: "kpi-evaluation",
        label: "Đánh giá KPI",
        create: "Không tạo mới",
        permissionKeys: ["module.kpi.evaluation"]
      },
      {
        id: "kpi-goals",
        label: "Quản lý mục tiêu",
        create: "Không tạo mới",
        permissionKeys: ["module.kpi.goals"]
      }
    ]
  },
  {
    category: "CÔNG VIỆC",
    items: [
      {
        id: "work-tasks",
        label: "Công việc",
        create: "Không tạo mới",
        actionKeys: {
          manage: ["tasks.assigned.update"]
        },
        permissionKeys: ["module.work.tasks", "tasks.assigned.update", "menu.work.tasks"]
      },
      {
        id: "work-timesheet",
        label: "Timesheet",
        create: "Không tạo mới",
        permissionKeys: ["module.work.timesheet", "menu.work.timesheets"]
      },
      {
        id: "work-projects",
        label: "Dự án",
        permissionKeys: ["module.work.projects", "menu.work.projects"]
      }
    ]
  },
  {
    category: "ĐÁNH GIÁ",
    items: [
      {
        id: "performance-reviews",
        label: "Đánh giá",
        create: "Không tạo mới",
        permissionKeys: ["module.performance.reviews", "menu.hrm.performance"]
      }
    ]
  },
  {
    category: "KÝ SỐ",
    items: [
      {
        id: "digital-signatures",
        label: "Chữ ký số",
        create: "Không tạo mới",
        permissionKeys: ["module.digital_signature.signatures"]
      },
      {
        id: "digital-signature-records",
        label: "Hồ sơ ký số",
        create: "Không tạo mới",
        permissionKeys: ["module.digital_signature.records"]
      }
    ]
  },
  {
    category: "BÁO CÁO",
    items: [
      {
        id: "reports",
        label: "Báo cáo",
        create: "Không tạo mới",
        actionKeys: {
          view: ["reports.company.view", "reports.personal.view"]
        },
        permissionKeys: ["module.reports", "reports.company.view", "reports.personal.view"]
      },
      {
        id: "reports-dashboard",
        label: "Dashboard",
        create: "Không tạo mới",
        permissionKeys: [
          "module.reports.dashboard",
          "menu.hrm.dashboard",
          "hr.dashboard.modules.view",
          "hr.dashboard.analytics.view"
        ]
      }
    ]
  },
  {
    category: "KẾT NỐI",
    items: [
      {
        id: "social-groups",
        label: "Nhóm",
        create: "Không tạo mới",
        permissionKeys: ["module.social.groups"]
      },
      {
        id: "social-posts",
        label: "Bài viết",
        create: "Không tạo mới",
        permissionKeys: ["module.social.posts"]
      },
      {
        id: "social-wall",
        label: "Tường công ty",
        permissionKeys: ["module.social.wall"]
      }
    ]
  },
  {
    category: "HỖ TRỢ",
    items: [
      {
        id: "support-tickets",
        label: "Ticket",
        create: "Không tạo mới",
        permissionKeys: ["module.support.tickets"]
      }
    ]
  },
  {
    category: "ĐÀO TẠO",
    items: [
      {
        id: "training",
        label: "Đào tạo",
        create: "Không tạo mới",
        permissionKeys: ["module.training"]
      }
    ]
  },
  {
    category: "TỰ ĐỘNG",
    items: [
      {
        id: "automation",
        label: "Tự động",
        create: "Không tạo mới",
        permissionKeys: ["module.automation.rules"]
      },
      {
        id: "automation-alerts",
        label: "Cảnh báo",
        create: "Không tạo mới",
        permissionKeys: ["module.automation.alerts"]
      },
      {
        id: "automation-approval-flow",
        label: "Quy trình duyệt",
        create: "Không tạo mới",
        permissionKeys: ["module.automation.approvals", "menu.work.processes"]
      }
    ]
  },
  {
    category: "1ASSISTANT",
    items: [
      {
        id: "assistant-knowledge",
        label: "Tri thức",
        create: "Không tạo mới",
        permissionKeys: ["module.assistant.knowledge"]
      }
    ]
  }
];

export const groupPermissionFormSections = [
  ...groupPermissionModuleSections
];

export function filterGroupPermissionSectionsByCatalog(
  sections: GroupPermissionSection[],
  permissions: AccountPermission[]
): GroupPermissionSection[] {
  if (permissions.length === 0) {
    return sections;
  }

  const knownPermissionKeys = new Set(permissions.map((permission) => permission.key));

  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => ({
          ...item,
          permissionKeys: item.permissionKeys.filter((permissionKey) => knownPermissionKeys.has(permissionKey))
        }))
        .filter((item) => item.permissionKeys.length > 0)
    }))
    .filter((section) => section.items.length > 0);
}
