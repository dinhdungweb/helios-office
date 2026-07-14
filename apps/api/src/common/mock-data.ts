export const employees = [
  {
    id: "emp-001",
    code: "HL-001",
    name: "Đặng Đình Dũng",
    department: "Technology",
    title: "Web Lead",
    managerId: "emp-010",
    status: "active",
    startDate: "2024-03-15"
  },
  {
    id: "emp-002",
    code: "HL-002",
    name: "Nguyễn Hải Anh",
    department: "People Operations",
    title: "HR Executive",
    managerId: "emp-011",
    status: "active",
    startDate: "2023-09-01"
  },
  {
    id: "emp-003",
    code: "HL-003",
    name: "Lê Minh Khang",
    department: "Kinh doanh Miền Nam",
    title: "Sales Specialist",
    managerId: "emp-012",
    status: "active",
    startDate: "2025-01-06"
  }
];

export const accountPermissionCatalog = [
  {
    key: "module.hrm.employees",
    category: "Module",
    label: "Hồ sơ nhân sự",
    adminOnly: false
  },
  {
    key: "module.hrm.contracts",
    category: "Module",
    label: "Hợp đồng",
    adminOnly: false
  },
  {
    key: "module.hrm.decisions",
    category: "Module",
    label: "Quyết định",
    adminOnly: false
  },
  {
    key: "module.recruitment.proposals",
    category: "Module",
    label: "Đề xuất tuyển",
    adminOnly: false
  },
  {
    key: "module.recruitment.pipeline",
    category: "Module",
    label: "Tuyển dụng",
    adminOnly: false
  },
  {
    key: "module.recruitment.care",
    category: "Module",
    label: "Chăm sóc",
    adminOnly: false
  },
  {
    key: "module.attendance",
    category: "Module",
    label: "Chấm công",
    adminOnly: false
  },
  {
    key: "module.attendance.timesheets",
    category: "Module",
    label: "Bảng chấm công",
    adminOnly: false
  },
  {
    key: "module.payroll.tables",
    category: "Module",
    label: "Bảng lương",
    adminOnly: false
  },
  {
    key: "module.payroll.types",
    category: "Module",
    label: "Loại bảng lương",
    adminOnly: false
  },
  {
    key: "module.requests",
    category: "Module",
    label: "Đơn từ",
    adminOnly: false
  },
  {
    key: "module.assets",
    category: "Module",
    label: "Tài sản",
    adminOnly: false
  },
  {
    key: "module.insurance",
    category: "Module",
    label: "IVAN",
    adminOnly: false
  },
  {
    key: "module.calendar.events",
    category: "Module",
    label: "Sự kiện",
    adminOnly: false
  },
  {
    key: "module.documents.company",
    category: "Module",
    label: "Tài liệu công ty",
    adminOnly: false
  },
  {
    key: "module.documents.personal",
    category: "Module",
    label: "Tài liệu cá nhân",
    adminOnly: false
  },
  {
    key: "module.kpi.evaluation",
    category: "Module",
    label: "Đánh giá KPI",
    adminOnly: false
  },
  {
    key: "module.kpi.goals",
    category: "Module",
    label: "Quản lý mục tiêu",
    adminOnly: false
  },
  {
    key: "module.work.tasks",
    category: "Module",
    label: "Công việc",
    adminOnly: false
  },
  {
    key: "module.work.timesheet",
    category: "Module",
    label: "Timesheet",
    adminOnly: false
  },
  {
    key: "module.work.projects",
    category: "Module",
    label: "Dự án",
    adminOnly: false
  },
  {
    key: "module.performance.reviews",
    category: "Module",
    label: "Đánh giá",
    adminOnly: false
  },
  {
    key: "module.digital_signature.signatures",
    category: "Module",
    label: "Chữ ký số",
    adminOnly: false
  },
  {
    key: "module.digital_signature.records",
    category: "Module",
    label: "Hồ sơ ký số",
    adminOnly: false
  },
  {
    key: "module.reports",
    category: "Module",
    label: "Báo cáo",
    adminOnly: false
  },
  {
    key: "module.reports.dashboard",
    category: "Module",
    label: "Dashboard",
    adminOnly: false
  },
  {
    key: "module.social.groups",
    category: "Module",
    label: "Nhóm",
    adminOnly: false
  },
  {
    key: "module.social.posts",
    category: "Module",
    label: "Bài viết",
    adminOnly: false
  },
  {
    key: "module.social.wall",
    category: "Module",
    label: "Tường công ty",
    adminOnly: false
  },
  {
    key: "module.support.tickets",
    category: "Module",
    label: "Ticket",
    adminOnly: false
  },
  {
    key: "module.training",
    category: "Module",
    label: "Đào tạo",
    adminOnly: false
  },
  {
    key: "module.automation.rules",
    category: "Module",
    label: "Tự động",
    adminOnly: false
  },
  {
    key: "module.automation.alerts",
    category: "Module",
    label: "Cảnh báo",
    adminOnly: false
  },
  {
    key: "module.automation.approvals",
    category: "Module",
    label: "Quy trình duyệt",
    adminOnly: false
  },
  {
    key: "module.assistant.knowledge",
    category: "Module",
    label: "Tri thức",
    adminOnly: false
  },
  {
    key: "system.organization.manage",
    category: "Quản trị hệ thống",
    label: "Cài đặt sơ đồ tổ chức",
    adminOnly: true
  },
  {
    key: "system.accounts.manage",
    category: "Quản trị hệ thống",
    label: "Kích hoạt, đóng tài khoản nhân viên",
    adminOnly: true
  },
  {
    key: "system.approval_flow.manage",
    category: "Quản trị hệ thống",
    label: "Thiết lập quy trình duyệt",
    adminOnly: true
  },
  {
    key: "system.open_api.manage",
    category: "Quản trị hệ thống",
    label: "Cấu hình Open API",
    adminOnly: true
  },
  {
    key: "system.branding.manage",
    category: "Quản trị hệ thống",
    label: "Thay đổi giao diện và logo công ty",
    adminOnly: true
  },
  {
    key: "reports.company.view",
    category: "Báo cáo",
    label: "Xem báo cáo tổng thể",
    adminOnly: false
  },
  {
    key: "approvals.critical.approve",
    category: "Phê duyệt",
    label: "Phê duyệt đơn từ quan trọng",
    adminOnly: false
  },
  {
    key: "employees.department.manage",
    category: "Nhân sự",
    label: "Quản lý nhân sự trong bộ phận",
    adminOnly: false
  },
  {
    key: "hr.dashboard.attendance.view",
    category: "Dashboard HCNS",
    label: "Xem widget chấm công HCNS",
    adminOnly: false
  },
  {
    key: "hr.dashboard.requests.view",
    category: "Dashboard HCNS",
    label: "Xem widget đơn từ HCNS",
    adminOnly: false
  },
  {
    key: "hr.dashboard.people.view",
    category: "Dashboard HCNS",
    label: "Xem widget biến động nhân sự",
    adminOnly: false
  },
  {
    key: "hr.dashboard.contracts.view",
    category: "Dashboard HCNS",
    label: "Xem widget hợp đồng HCNS",
    adminOnly: false
  },
  {
    key: "hr.dashboard.organization.view",
    category: "Dashboard HCNS",
    label: "Xem widget cơ cấu tổ chức HCNS",
    adminOnly: false
  },
  {
    key: "hr.dashboard.analytics.view",
    category: "Dashboard HCNS",
    label: "Xem widget BI HRM",
    adminOnly: false
  },
  {
    key: "hr.dashboard.modules.view",
    category: "Dashboard HCNS",
    label: "Xem widget nghiệp vụ HRM",
    adminOnly: false
  },
  {
    key: "hr.dashboard.birthdays.view",
    category: "Dashboard HCNS",
    label: "Xem widget sinh nhật nội bộ",
    adminOnly: false
  },
  {
    key: "hr.dashboard.shortcuts.view",
    category: "Dashboard HCNS",
    label: "Xem lối tắt HCNS",
    adminOnly: false
  },
  {
    key: "attendance.device.manage",
    category: "Chấm công",
    label: "Quản lý xác thực thiết bị chấm công",
    adminOnly: false
  },
  {
    key: "requests.personal.create",
    category: "Cá nhân",
    label: "Tạo đơn từ cá nhân",
    adminOnly: false
  },
  {
    key: "tasks.assigned.update",
    category: "Cá nhân",
    label: "Cập nhật công việc được giao",
    adminOnly: false
  },
  {
    key: "reports.personal.view",
    category: "Cá nhân",
    label: "Xem báo cáo cá nhân",
    adminOnly: false
  },
  {
    key: "menu.user.loans",
    category: "Menu Trang cá nhân",
    label: "Thêm module Vay vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.user.attendance",
    category: "Menu Trang cá nhân",
    label: "Thêm module Công vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.user.payroll",
    category: "Menu Trang cá nhân",
    label: "Thêm module Lương vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.user.requests",
    category: "Menu Trang cá nhân",
    label: "Thêm module Đơn từ vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.user.profile",
    category: "Menu Trang cá nhân",
    label: "Thêm module Hồ sơ vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.work.tasks",
    category: "Menu WORKPLACE",
    label: "Thêm module Công việc thường vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.work.projects",
    category: "Menu WORKPLACE",
    label: "Thêm module Dự án vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.work.processes",
    category: "Menu WORKPLACE",
    label: "Thêm module Quy trình vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.work.timesheets",
    category: "Menu WORKPLACE",
    label: "Thêm module Timesheet vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.work.documents",
    category: "Menu WORKPLACE",
    label: "Thêm module Tài liệu vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.hrm.dashboard",
    category: "Menu HRM",
    label: "Thêm module Dashboard HCNS vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.hrm.employees",
    category: "Menu HRM",
    label: "Thêm module Hồ sơ nhân sự vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.hrm.contracts",
    category: "Menu HRM",
    label: "Thêm module Hợp đồng lao động vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.hrm.recruitment",
    category: "Menu HRM",
    label: "Thêm module Tuyển dụng vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.hrm.performance",
    category: "Menu HRM",
    label: "Thêm module Đánh giá vào sidebar",
    adminOnly: false
  },
  {
    key: "menu.admin.console",
    category: "Menu Quản trị",
    label: "Thêm module Quản trị vào sidebar",
    adminOnly: true
  },
  {
    key: "menu.admin.settings",
    category: "Menu Quản trị",
    label: "Thêm module Cấu hình vào sidebar",
    adminOnly: true
  }
];

export const permissionGroups = [
  {
    id: "grp-directors",
    name: "Ban giám đốc",
    description: "Xem báo cáo tổng thể và duyệt các đơn từ quan trọng.",
    roleScope: "user",
    memberCount: 4,
    permissionKeys: ["reports.company.view", "approvals.critical.approve"]
  },
  {
    id: "grp-managers",
    name: "Trưởng phòng",
    description: "Quản lý nhân sự, công việc và phê duyệt trong bộ phận.",
    roleScope: "user",
    memberCount: 18,
    permissionKeys: [
      "employees.department.manage",
      "approvals.critical.approve",
      "tasks.assigned.update",
      "menu.user.attendance",
      "menu.user.requests",
      "menu.user.profile",
      "menu.work.tasks",
      "menu.hrm.dashboard",
      "menu.hrm.employees"
    ]
  },
  {
    id: "grp-employees",
    name: "Nhân viên",
    description: "Tạo đơn cá nhân, xem công việc được giao và cập nhật báo cáo.",
    roleScope: "user",
    memberCount: 176,
    permissionKeys: [
      "requests.personal.create",
      "tasks.assigned.update",
      "reports.personal.view",
      "menu.user.loans",
      "menu.user.attendance",
      "menu.user.requests",
      "menu.user.profile"
    ]
  }
];

export const userAccounts = [
  {
    id: "acc-001",
    employeeId: null,
    displayName: "Admin",
    email: "admin@helios.vn",
    role: "system_admin",
    permissionGroupId: null,
    status: "active",
    customPermissionsEnabled: false,
    customPermissionKeys: [],
    customPermissionNote: null,
    activatedAt: "2024-02-26T02:00:00.000Z",
    closedAt: null
  },
  {
    id: "acc-002",
    employeeId: "emp-002",
    displayName: "Nguyễn Hải Anh",
    email: "haianh@helios.vn",
    role: "user",
    permissionGroupId: "grp-managers",
    status: "active",
    customPermissionsEnabled: false,
    customPermissionKeys: [],
    customPermissionNote: null,
    activatedAt: "2023-09-01T02:00:00.000Z",
    closedAt: null
  },
  {
    id: "acc-003",
    employeeId: "emp-003",
    displayName: "Lê Minh Khang",
    email: "khanglm@helios.vn",
    role: "user",
    permissionGroupId: "grp-employees",
    status: "active",
    customPermissionsEnabled: false,
    customPermissionKeys: [],
    customPermissionNote: null,
    activatedAt: "2025-01-06T02:00:00.000Z",
    closedAt: null
  },
  {
    id: "acc-004",
    employeeId: null,
    displayName: "Trần Bảo Minh",
    email: "baominh@helios.vn",
    role: "user",
    permissionGroupId: "grp-employees",
    status: "pending_activation",
    customPermissionsEnabled: false,
    customPermissionKeys: [],
    customPermissionNote: null,
    activatedAt: null,
    closedAt: null
  },
  {
    id: "acc-005",
    employeeId: null,
    displayName: "Phạm Thanh Trúc",
    email: "tructp@helios.vn",
    role: "user",
    permissionGroupId: "grp-employees",
    status: "closed",
    customPermissionsEnabled: false,
    customPermissionKeys: [],
    customPermissionNote: null,
    activatedAt: "2024-06-10T02:00:00.000Z",
    closedAt: "2026-06-30T10:00:00.000Z"
  }
];

export const systemSettingItems = [
  {
    id: "org-chart",
    tier: "system",
    category: "Quản trị Tổ chức & Nhân sự",
    title: "Sơ đồ tổ chức",
    summary: "Khai báo chi nhánh, phòng ban và sơ đồ phân cấp cha/con.",
    owner: "HR Admin",
    status: "configured",
    href: "/admin/settings/org-chart",
    controls: ["Chi nhánh", "Phòng ban", "Cấp cha/con", "Sơ đồ"]
  },
  {
    id: "positions",
    tier: "system",
    category: "Quản trị Tổ chức & Nhân sự",
    title: "Vị trí & chức vụ",
    summary: "Định nghĩa danh mục vị trí công việc và chức vụ để gán vào hồ sơ nhân sự.",
    owner: "HR Admin",
    status: "configured",
    href: "/admin/settings/positions-titles",
    controls: ["Vị trí", "Chức vụ", "Cấp bậc", "Hồ sơ"]
  },
  {
    id: "user-accounts",
    tier: "system",
    category: "Quản trị Tổ chức & Nhân sự",
    title: "Tài khoản người dùng",
    summary: "Quản lý danh sách người dùng, kích hoạt, khóa tài khoản và đặt lại mật khẩu.",
    owner: "IT Admin",
    status: "configured",
    href: "/admin/settings/accounts",
    controls: ["Danh sách", "Kích hoạt", "Khóa", "Reset mật khẩu"]
  },
  {
    id: "device-auth",
    tier: "system",
    category: "Quản trị Tổ chức & Nhân sự",
    title: "Xác thực thiết bị",
    summary: "Phê duyệt thiết bị di động được phép chấm công GPS.",
    owner: "HR Ops",
    status: "needs_review",
    href: "/admin/settings/accounts/device-auth",
    controls: ["Thiết bị", "GPS", "Phê duyệt", "Thu hồi"]
  },
  {
    id: "permission-groups",
    tier: "system",
    category: "Phân quyền",
    title: "Nhóm người dùng",
    summary: "Tạo nhóm Ban giám đốc, Kế toán, Nhân viên và các nhóm vận hành khác.",
    owner: "System Admin",
    status: "configured",
    href: "/admin/settings/accounts/groups",
    controls: ["Nhóm", "Vai trò", "Quyền", "Thành viên"]
  },
  {
    id: "detailed-permissions",
    tier: "system",
    category: "Phân quyền",
    title: "Quyền chi tiết",
    summary: "Gán quyền xem, thêm, sửa, xóa, quản lý cho từng nhóm hoặc cá nhân trên từng đối tượng.",
    owner: "System Admin",
    status: "configured",
    href: "/admin/settings/accounts/permissions",
    controls: ["Xem", "Thêm", "Sửa", "Xóa", "Quản lý"]
  },
  {
    id: "intranet-branding",
    tier: "system",
    category: "Cấu hình Hệ thống chung",
    title: "Mạng nội bộ",
    summary: "Thay đổi logo, màu giao diện, bảng tin và ẩn/hiện thông tin cá nhân như ngày sinh.",
    owner: "Internal Comms",
    status: "configured",
    href: "/admin/settings/intranet",
    controls: ["Logo", "Màu sắc", "Bảng tin", "Ngày sinh"]
  },
  {
    id: "security-policy",
    tier: "system",
    category: "Cấu hình Hệ thống chung",
    title: "Bảo mật",
    summary: "Cài đặt độ khó mật khẩu, OTP/2FA, SSO và chính sách phiên đăng nhập.",
    owner: "Security",
    status: "needs_review",
    controls: ["Mật khẩu", "OTP", "2FA", "SSO"]
  },
  {
    id: "company-info",
    tier: "system",
    category: "Cấu hình Hệ thống chung",
    title: "Thông tin doanh nghiệp",
    summary: "Cập nhật tên công ty, địa chỉ, mã số thuế và thông tin pháp lý.",
    owner: "Finance",
    status: "needs_review",
    href: "/admin/settings/company-info",
    controls: ["Tên công ty", "Địa chỉ", "Mã số thuế", "Pháp lý"]
  },
  {
    id: "currency-region",
    tier: "system",
    category: "Cấu hình Hệ thống chung",
    title: "Tiền tệ & khu vực",
    summary: "Thiết lập tiền tệ chính, định dạng ngày tháng và múi giờ làm việc.",
    owner: "IT Admin",
    status: "configured",
    controls: ["Tiền tệ", "Ngày tháng", "Múi giờ", "Khu vực"]
  },
  {
    id: "smtp",
    tier: "system",
    category: "Kết nối & Giao tiếp",
    title: "Cấu hình Email SMTP",
    summary: "Cài đặt server email gửi thông báo, phiếu lương, hợp đồng cho nhân viên và khách hàng.",
    owner: "IT Admin",
    status: "needs_review",
    href: "/admin/settings/smtp",
    controls: ["SMTP", "Email gửi đi", "Phiếu lương", "Hợp đồng"]
  },
  {
    id: "message-templates",
    tier: "system",
    category: "Kết nối & Giao tiếp",
    title: "Mẫu Email/SMS/Zalo",
    summary: "Thiết lập mẫu tự động cho sinh nhật, duyệt đơn và xác nhận đơn hàng.",
    owner: "Internal Comms",
    status: "configured",
    controls: ["Email", "SMS", "Zalo", "Mẫu tự động"]
  },
  {
    id: "system-open-api",
    tier: "system",
    category: "Kết nối & Giao tiếp",
    title: "Open API",
    summary: "Khởi tạo Access Key để kết nối với website, kế toán và phần mềm bên thứ ba.",
    owner: "IT Admin",
    status: "configured",
    controls: ["Access Key", "Website", "Kế toán", "Tích hợp"]
  },
  {
    id: "system-audit-log",
    tier: "system",
    category: "Giám sát & Đối soát",
    title: "Lịch sử hệ thống",
    summary: "Truy vết ai đã sửa gì, vào lúc nào để đảm bảo minh bạch dữ liệu.",
    owner: "Security",
    status: "configured",
    controls: ["Người thao tác", "Dữ liệu", "Thời gian", "IP"]
  },
  {
    id: "system-reconciliation",
    tier: "system",
    category: "Giám sát & Đối soát",
    title: "Thông tin đối soát",
    summary: "Theo dõi dung lượng, tài khoản hoạt động và hóa đơn thanh toán dịch vụ.",
    owner: "Finance",
    status: "needs_review",
    controls: ["Dung lượng", "Tài khoản", "Hóa đơn", "Gia hạn"]
  }
];

export const moduleSettingGroups = [
  {
    id: "hrm",
    module: "HRM",
    summary: "Thiết lập luật nhân sự, chấm công, lương và đánh giá.",
    status: "configured",
    settings: [
      {
        id: "hrm-dashboard-widgets",
        tier: "module",
        category: "Dashboard",
        title: "Dashboard HCNS & widget hiển thị",
        summary: "Cấu hình nhóm HCNS được xem widget nào trên dashboard riêng.",
        owner: "System Admin",
        status: "configured",
        controls: ["Chấm công", "Đơn từ", "Hợp đồng", "BI HRM"]
      },
      {
        id: "hrm-requests",
        tier: "module",
        category: "Đơn từ",
        title: "Loại đơn và quy trình duyệt",
        summary: "Định nghĩa nghỉ phép, tăng ca, công tác và duyệt nhiều cấp.",
        owner: "HR Ops",
        status: "configured",
        controls: ["Loại đơn", "Duyệt nhiều cấp", "Người thay thế", "SLA"]
      },
      {
        id: "hrm-attendance",
        tier: "module",
        category: "Chấm công",
        title: "Ca làm, công chuẩn và thiết bị",
        summary: "Cài đặt ca làm, bảng phân ca, công chuẩn tháng, máy chấm công và GPS.",
        owner: "HR Ops",
        status: "needs_review",
        controls: ["Ca làm", "Phân ca", "Công chuẩn", "GPS"]
      },
      {
        id: "hrm-payroll",
        tier: "module",
        category: "Tiền lương",
        title: "Thành phần và công thức lương",
        summary: "Thiết lập thành phần lương, công thức Excel-like, bảo hiểm và thuế TNCN.",
        owner: "Payroll",
        status: "needs_review",
        controls: ["Thành phần", "Công thức", "BHXH", "Thuế TNCN"]
      },
      {
        id: "hrm-performance",
        tier: "module",
        category: "KPI/OKR",
        title: "Bộ chỉ số và kỳ đánh giá",
        summary: "Quản lý chỉ số đánh giá, trọng số, chu kỳ và kết quả review.",
        owner: "HRBP",
        status: "planned",
        controls: ["Chỉ số", "Trọng số", "Kỳ đánh giá", "Review"]
      }
    ]
  },
  {
    id: "work",
    module: "WORK",
    summary: "Thiết lập công việc, dự án, quy trình tự động và kho tài liệu.",
    status: "planned",
    settings: [
      {
        id: "work-statuses",
        tier: "module",
        category: "Công việc",
        title: "Trạng thái và loại dự án",
        summary: "Cấu hình To do, Doing, Done, loại dự án và mẫu workflow tự động.",
        owner: "PMO",
        status: "planned",
        controls: ["Trạng thái", "Loại dự án", "Workflow", "Automation"]
      },
      {
        id: "work-documents",
        tier: "module",
        category: "Tài liệu",
        title: "Kho tài liệu và thư mục",
        summary: "Quản lý thư mục, phân quyền truy cập và chính sách chia sẻ tài liệu.",
        owner: "Admin",
        status: "planned",
        controls: ["Thư mục", "Phân quyền", "Chia sẻ", "Lưu trữ"]
      }
    ]
  },
  {
    id: "crm",
    module: "CRM",
    summary: "Thiết lập khách hàng, pipeline bán hàng, phê duyệt và kho.",
    status: "planned",
    settings: [
      {
        id: "crm-customer",
        tier: "module",
        category: "Khách hàng",
        title: "Nhóm, nguồn và sales pipeline",
        summary: "Cấu hình nhóm khách hàng, nguồn khách hàng và quy trình bán hàng.",
        owner: "Sales Ops",
        status: "planned",
        controls: ["Nhóm", "Nguồn", "Pipeline", "Stage"]
      },
      {
        id: "crm-approvals",
        tier: "module",
        category: "Bán hàng",
        title: "Duyệt báo giá, đơn hàng, hợp đồng",
        summary: "Thiết lập quy trình duyệt chứng từ bán hàng và điều kiện phê duyệt.",
        owner: "Sales Ops",
        status: "planned",
        controls: ["Báo giá", "Đơn hàng", "Hợp đồng", "Điều kiện"]
      },
      {
        id: "crm-inventory",
        tier: "module",
        category: "Kho",
        title: "Kho hàng và tồn kho",
        summary: "Cấu hình kho, định mức tồn và quy trình nhập/xuất kho.",
        owner: "Operations",
        status: "planned",
        controls: ["Kho", "Tồn tối thiểu", "Nhập kho", "Xuất kho"]
      }
    ]
  }
];

export const operationSettingItems = [
  {
    id: "reconciliation",
    tier: "operations",
    category: "Đối soát",
    title: "Thông tin đối soát",
    summary: "Theo dõi số người dùng thực tế, hóa đơn và lịch sử gia hạn dịch vụ.",
    owner: "Finance",
    status: "configured",
    controls: ["Người dùng", "Hóa đơn", "Gia hạn", "Thanh toán"]
  },
  {
    id: "audit-log",
    tier: "operations",
    category: "Log",
    title: "Lịch sử hệ thống",
    summary: "Truy vết thao tác của người dùng trên dữ liệu quan trọng.",
    owner: "Security",
    status: "configured",
    controls: ["Người thao tác", "Đối tượng", "Trước/Sau", "IP"]
  },
  {
    id: "import-export",
    tier: "operations",
    category: "Dữ liệu",
    title: "Import/Export Excel",
    summary: "Cấp quyền hoặc thực hiện đổ dữ liệu lớn cho nhân sự và khách hàng.",
    owner: "Data Ops",
    status: "needs_review",
    controls: ["Import", "Export", "Template", "Kiểm tra lỗi"]
  },
  {
    id: "open-api",
    tier: "operations",
    category: "Tích hợp",
    title: "Open API",
    summary: "Khởi tạo mã bảo mật và quản lý kết nối với kế toán, website và phần mềm khác.",
    owner: "IT Admin",
    status: "configured",
    controls: ["API key", "Webhook", "Kế toán", "Website"]
  }
];

export const adminOperationEvents = [
  {
    id: "evt-001",
    time: "10:15 10/07/2026",
    actor: "Đặng Đình Dũng",
    action: "Cập nhật quyền Open API",
    target: "Tài khoản acc-001",
    severity: "info"
  },
  {
    id: "evt-002",
    time: "09:20 10/07/2026",
    actor: "Nguyễn Hải Anh",
    action: "Import danh sách nhân sự",
    target: "People Operations",
    severity: "warning"
  },
  {
    id: "evt-003",
    time: "17:45 09/07/2026",
    actor: "System",
    action: "Khóa phiên đăng nhập nghi ngờ",
    target: "Thiết bị chưa duyệt",
    severity: "critical"
  }
];

export const departments = [
  { id: "dep-001", code: "DEP-001", name: "Ban Giám Đốc", headId: "emp-001", parentId: null, headcount: 3 },
  { id: "dep-002", code: "DEP-002", name: "Chi nhánh Miền Bắc", headId: "emp-010", parentId: null, headcount: 62 },
  { id: "dep-003", code: "DEP-003", name: "Kinh doanh Miền Bắc", headId: "emp-011", parentId: "dep-002", headcount: 34 },
  { id: "dep-004", code: "DEP-004", name: "Cửa hàng Hà Nội - Cầu Giấy", headId: "emp-012", parentId: "dep-003", headcount: 10 },
  { id: "dep-005", code: "DEP-005", name: "Cửa hàng Hà Nội - Long Biên", headId: "emp-013", parentId: "dep-003", headcount: 9 },
  { id: "dep-006", code: "DEP-006", name: "Cửa hàng Hải Phòng", headId: "emp-014", parentId: "dep-003", headcount: 8 },
  { id: "dep-007", code: "DEP-007", name: "Kho vận Miền Bắc", headId: "emp-015", parentId: "dep-002", headcount: 18 },
  { id: "dep-008", code: "DEP-008", name: "Chi nhánh Miền Nam", headId: "emp-003", parentId: null, headcount: 74 },
  { id: "dep-009", code: "DEP-009", name: "Kinh doanh Miền Nam", headId: "emp-003", parentId: "dep-008", headcount: 42 },
  { id: "dep-010", code: "DEP-010", name: "Cửa hàng TP.HCM - Quận 1", headId: "emp-016", parentId: "dep-009", headcount: 11 },
  { id: "dep-011", code: "DEP-011", name: "Cửa hàng TP.HCM - Thủ Đức", headId: "emp-017", parentId: "dep-009", headcount: 10 },
  { id: "dep-012", code: "DEP-012", name: "Cửa hàng Bình Dương", headId: "emp-018", parentId: "dep-009", headcount: 8 },
  { id: "dep-013", code: "DEP-013", name: "Kho vận Miền Nam", headId: "emp-019", parentId: "dep-008", headcount: 20 },
  { id: "dep-014", code: "DEP-014", name: "Kinh doanh toàn quốc", headId: "emp-020", parentId: null, headcount: 38 },
  { id: "dep-015", code: "DEP-015", name: "Telesales & Online", headId: "emp-021", parentId: "dep-014", headcount: 16 },
  { id: "dep-016", code: "DEP-016", name: "Key Account / B2B", headId: "emp-022", parentId: "dep-014", headcount: 12 },
  { id: "dep-017", code: "DEP-017", name: "CSKH & Chăm sóc sau bán", headId: "emp-023", parentId: "dep-014", headcount: 10 },
  { id: "dep-018", code: "DEP-018", name: "Marketing & Thương hiệu", headId: "emp-024", parentId: null, headcount: 18 },
  { id: "dep-019", code: "DEP-019", name: "Digital Marketing", headId: "emp-025", parentId: "dep-018", headcount: 9 },
  { id: "dep-020", code: "DEP-020", name: "Trade Marketing", headId: "emp-026", parentId: "dep-018", headcount: 7 },
  { id: "dep-021", code: "DEP-021", name: "Back Office", headId: "emp-027", parentId: null, headcount: 31 },
  { id: "dep-022", code: "DEP-022", name: "People Operations", headId: "emp-002", parentId: "dep-021", headcount: 8 },
  { id: "dep-023", code: "DEP-023", name: "Tài chính - Kế toán", headId: "emp-028", parentId: "dep-021", headcount: 7 },
  { id: "dep-024", code: "DEP-024", name: "Technology", headId: "emp-001", parentId: "dep-021", headcount: 12 }
];

export const contracts = [
  {
    id: "ctr-001",
    employeeId: "emp-001",
    type: "indefinite",
    startDate: "2024-03-15",
    endDate: null,
    status: "active"
  },
  {
    id: "ctr-002",
    employeeId: "emp-002",
    type: "fixed_term",
    startDate: "2025-09-01",
    endDate: "2026-08-31",
    status: "renewal_due"
  }
];

export const posts = [
  {
    id: "post-001",
    authorId: "emp-002",
    scope: "company",
    title: "Thông báo cập nhật chính sách hàng hóa vòng tay ngày 06/07/2026",
    body: "Các phòng ban bán hàng, marketing và kho vận cập nhật quy trình tư vấn, đóng gói và bàn giao.",
    reactions: 1,
    comments: 0,
    requiresAck: true,
    createdAt: "2026-07-06T04:01:00.000Z"
  },
  {
    id: "post-002",
    authorId: "emp-002",
    scope: "department",
    title: "Thông báo thay đổi sản phẩm ra mắt ngày 07/07/2026",
    body: "Phòng Marketing cập nhật nội dung, phòng bán hàng thay đổi kịch bản tư vấn.",
    reactions: 8,
    comments: 3,
    requiresAck: false,
    createdAt: "2026-07-04T02:36:00.000Z"
  }
];

export const announcements = [
  {
    id: "ann-001",
    title: "Điều chuyển vị trí",
    audience: "operations",
    readRate: 89,
    publishedAt: "2026-04-11T07:31:00.000Z"
  },
  {
    id: "ann-002",
    title: "Update v.v Nhân sự mua hàng nội bộ",
    audience: "company",
    readRate: 76,
    publishedAt: "2026-04-06T08:33:00.000Z"
  }
];

export const approvals = [
  {
    id: "apr-001",
    type: "leave_request",
    ownerId: "emp-002",
    ownerName: "Nguyễn Hải Anh",
    detail: "Nghỉ 1 ngày, còn 6 ngày phép",
    status: "pending",
    priority: "high",
    dueAt: "2026-07-09"
  },
  {
    id: "apr-002",
    type: "attendance_adjustment",
    ownerId: "emp-003",
    ownerName: "Lê Minh Khang",
    detail: "Bổ sung check-out 18:02",
    status: "pending",
    priority: "normal",
    dueAt: "2026-07-10"
  }
];

export const leaveRequests = [
  {
    id: "leave-001",
    employeeId: "emp-002",
    employeeName: "Nguyễn Hải Anh",
    type: "annual_leave",
    fromDate: "2026-07-10",
    toDate: "2026-07-10",
    totalDays: 1,
    status: "pending_manager",
    remainingBalance: 6
  },
  {
    id: "leave-002",
    employeeId: "emp-003",
    employeeName: "Lê Minh Khang",
    type: "business_trip",
    fromDate: "2026-07-14",
    toDate: "2026-07-15",
    totalDays: 2,
    status: "approved",
    remainingBalance: 9
  }
];

export const attendanceRecords = [
  {
    id: "att-001",
    employeeId: "emp-001",
    workDate: "2026-07-09",
    checkIn: "08:27",
    checkOut: "18:04",
    status: "valid"
  },
  {
    id: "att-002",
    employeeId: "emp-003",
    workDate: "2026-07-09",
    checkIn: "08:58",
    checkOut: null,
    status: "missing_checkout"
  }
];

export const payrollCycles = [
  {
    id: "pay-2026-06",
    name: "Lương tháng 06/2026",
    status: "reviewing",
    employeeCount: 200,
    grossAmount: 4250000000,
    lockedAttendanceAt: "2026-07-03T10:00:00.000Z"
  }
];

export const reports = {
  headcount: 200,
  attendanceRate: 0.96,
  pendingApprovals: 18,
  announcementReadRate: 0.86,
  turnoverThisQuarter: 0.035
};

export const notifications = [
  {
    id: "noti-001",
    userId: "emp-001",
    event: "approval.changed",
    title: "Đơn nghỉ phép cần duyệt",
    readAt: null,
    createdAt: "2026-07-09T02:00:00.000Z"
  }
];
