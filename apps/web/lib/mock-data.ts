import {
  Bell,
  Briefcase,
  Buildings,
  CalendarCheck,
  ChartLineUp,
  ClipboardText,
  FileClock,
  Flag,
  IdentificationBadge,
  GraduationCap,
  Bank,
  Megaphone,
  ChatCircle,
  Network,
  Package,
  ShieldCheck,
  ArrowSquareOut,
  Users
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";

export type UserProfile = {
  name: string;
  title: string;
  department: string;
  avatar: string;
  status: string;
};

export type ModuleItem = {
  label: string;
  description: string;
  icon: Icon;
  status: "ready" | "review" | "planned";
};

export type SocialNavItem = {
  label: string;
  icon: Icon;
  active?: boolean;
};

export type SystemNotice = {
  id: string;
  title: string;
  time: string;
  type: string;
};

export type FeedPost = {
  id: string;
  author: string;
  role: string;
  avatar: string;
  timestamp: string;
  scope: string;
  title: string;
  body: string;
  tags: string[];
  reactions: number;
  comments: number;
  requiresAck?: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  time: string;
  audience: string;
  readRate: number;
};

export type PendingApproval = {
  id: string;
  type: string;
  owner: string;
  detail: string;
  due: string;
  priority: "Cao" | "Vừa" | "Thấp";
};

export type Workflow = {
  name: string;
  owner: string;
  summary: string;
  steps: string[];
  health: "Ổn định" | "Cần rà soát" | "Sắp triển khai";
};

export const currentUser: UserProfile = {
  name: "Đặng Đình Dũng",
  title: "Web Lead",
  department: "Helios",
  avatar: "DD",
  status: "Đang làm việc"
};

export const modules: ModuleItem[] = [
  {
    label: "Bảng tin",
    description: "Tin nội bộ, thảo luận, xác nhận đã đọc",
    icon: Megaphone,
    status: "ready"
  },
  {
    label: "Tường công ty",
    description: "Thông báo chính thức và chính sách",
    icon: Bell,
    status: "ready"
  },
  {
    label: "Hồ sơ nhân sự",
    description: "Nhân viên, hợp đồng, dữ liệu cá nhân",
    icon: Users,
    status: "ready"
  },
  {
    label: "Sơ đồ tổ chức",
    description: "Phòng ban, quản lý trực tiếp, lịch sử điều chuyển",
    icon: Network,
    status: "review"
  },
  {
    label: "Chấm công",
    description: "Ca làm, check-in, điều chỉnh công",
    icon: CalendarCheck,
    status: "ready"
  },
  {
    label: "Bảng lương",
    description: "Kỳ lương, phiếu lương, duyệt chi trả",
    icon: Bank,
    status: "review"
  },
  {
    label: "KPI / OKR",
    description: "Mục tiêu, review, đánh giá năng lực",
    icon: ChartLineUp,
    status: "planned"
  },
  {
    label: "Đào tạo",
    description: "Khóa học, học viên, chứng nhận",
    icon: GraduationCap,
    status: "planned"
  }
];

export const socialNavigation: SocialNavItem[] = [
  { label: "Bảng tin", icon: ChatCircle, active: true },
  { label: "Tường công ty", icon: Buildings },
  { label: "Bài viết chờ duyệt", icon: FileClock },
  { label: "Nhóm, thảo luận", icon: Users },
  { label: "Lộ trình thăng tiến", icon: ArrowSquareOut },
  { label: "Sơ đồ tổ chức", icon: Network },
  { label: "Quá trình làm việc", icon: Flag }
];

export const systemNotices: SystemNotice[] = [
  {
    id: "sys-001",
    title: "[1OFFICE] THÔNG BÁO ĐỊNH KỲ CÁC TÍNH NĂNG NÂNG CẤP - THÁNG...",
    time: "17:45 29/06/2026",
    type: "Thông báo"
  },
  {
    id: "sys-002",
    title: "[1OFFICE] THÔNG BÁO NÂNG CẤP 1AI MONITOR",
    time: "11:59 26/06/2026",
    type: "Thông báo"
  },
  {
    id: "sys-003",
    title: "[1OFFICE] THÔNG BÁO THAY ĐỔI ĐỊA CHỈ DỊCH VỤ",
    time: "08:30 21/06/2026",
    type: "Thông báo"
  }
];

export const feedPosts: FeedPost[] = [
  {
    id: "post-001",
    author: "HELIOS",
    role: "Trần Văn Thức",
    avatar: "HE",
    timestamp: "11:01 06/07/2026",
    scope: "Công ty",
    title: "Thông báo cập nhật chính sách hàng hóa vòng tay ngày 06/07/2026",
    body:
      "Thời gian áp dụng: 06/07/2026. Đối tượng áp dụng: các sản phẩm vòng tay được sản xuất từ ngày 06/07/2026. Các phòng ban bán hàng, marketing và kho vận cần cập nhật quy trình tư vấn, đóng gói và bàn giao.",
    tags: ["Chính sách", "Bán hàng"],
    reactions: 1,
    comments: 0,
    requiresAck: true
  },
  {
    id: "post-002",
    author: "HELIOS",
    role: "Trần Văn Thức",
    avatar: "HE",
    timestamp: "09:36 04/07/2026",
    scope: "Phòng ban",
    title: "Thông báo thay đổi sản phẩm ra mắt ngày 07/07/2026",
    body:
      "Sản phẩm Lotus Signature Keychain sẽ dừng ra mắt vào đợt 07/07/2026. Các sản phẩm khác vẫn ra mắt bình thường. Phòng Marketing cập nhật nội dung, phòng bán hàng nhận thông tin và thay đổi kịch bản tư vấn.",
    tags: ["Ra mắt", "Marketing"],
    reactions: 8,
    comments: 3
  }
];

export const announcements: Announcement[] = [
  {
    id: "ann-001",
    title: "Điều chuyển vị trí",
    time: "14:31 11/04/2026",
    audience: "Khối vận hành",
    readRate: 89
  },
  {
    id: "ann-002",
    title: "Update v.v Nhân sự mua hàng nội bộ",
    time: "15:33 06/04/2026",
    audience: "Toàn công ty",
    readRate: 76
  },
  {
    id: "ann-003",
    title: "Chấm công tháng 03/2026",
    time: "08:52 01/04/2026",
    audience: "Toàn công ty",
    readRate: 94
  }
];

export const pendingApprovals: PendingApproval[] = [
  {
    id: "apr-001",
    type: "Nghỉ phép",
    owner: "Nguyễn Hải Anh",
    detail: "Nghỉ 1 ngày, còn 6 ngày phép",
    due: "Hôm nay",
    priority: "Cao"
  },
  {
    id: "apr-002",
    type: "Điều chỉnh công",
    owner: "Lê Minh Khang",
    detail: "Bổ sung check-out 18:02",
    due: "Ngày mai",
    priority: "Vừa"
  },
  {
    id: "apr-003",
    type: "Offer tuyển dụng",
    owner: "Phạm Thanh Trúc",
    detail: "Vị trí HR Executive",
    due: "12/07",
    priority: "Thấp"
  }
];

export const hrMetrics = [
  { label: "Nhân sự", value: "200", trend: "+4 tháng này" },
  { label: "Tỷ lệ đi làm", value: "96%", trend: "Ổn định" },
  { label: "Đơn chờ duyệt", value: "18", trend: "3 ưu tiên cao" },
  { label: "Đọc thông báo", value: "86%", trend: "+9% sau nhắc" }
];

export const birthdays = [
  { name: "Mai Linh", initials: "ML", date: "12/07" },
  { name: "Hoàng Đức", initials: "HD", date: "12/07" },
  { name: "Trần Bảo", initials: "TB", date: "14/07" }
];

export const groups = [
  { name: "HELIOS", members: 107, initials: "HE" },
  { name: "Vận hành", members: 42, initials: "VH" },
  { name: "Kinh doanh", members: 65, initials: "KD" }
];

export const workflows: Workflow[] = [
  {
    name: "Tuyển dụng",
    owner: "HR",
    summary: "Từ đề xuất headcount đến chuyển ứng viên trúng tuyển thành nhân viên.",
    steps: ["Đề xuất tuyển", "Duyệt định biên", "Pipeline ứng viên", "Offer", "Tạo nhân viên"],
    health: "Cần rà soát"
  },
  {
    name: "Chấm công và phép",
    owner: "HR + Manager",
    summary: "Đồng bộ máy chấm công, đơn điều chỉnh, nghỉ phép, OT và bảng công.",
    steps: ["Check-in", "Tổng hợp công", "Gửi đơn", "Duyệt", "Khóa kỳ công"],
    health: "Ổn định"
  },
  {
    name: "Bảng lương",
    owner: "HR + Finance",
    summary: "Tính lương nội bộ từ công, phụ cấp, OT, khấu trừ và phát hành phiếu lương.",
    steps: ["Tạo kỳ", "Tính nháp", "Rà soát", "Duyệt", "Phát hành"],
    health: "Cần rà soát"
  },
  {
    name: "Onboarding",
    owner: "HR + IT",
    summary: "Checklist nhận việc, cấp tài khoản, tài sản, hợp đồng và đào tạo hội nhập.",
    steps: ["Kế hoạch", "Tài khoản", "Tài sản", "Hợp đồng", "Hoàn tất"],
    health: "Sắp triển khai"
  }
];

export const quickActions = [
  { label: "Tạo thông báo", icon: Megaphone },
  { label: "Tạo đơn nghỉ", icon: ClipboardText },
  { label: "Thêm nhân viên", icon: IdentificationBadge },
  { label: "Giao KPI", icon: ShieldCheck },
  { label: "Cấp tài sản", icon: Package },
  { label: "Tạo vị trí tuyển", icon: Briefcase }
];

export type AccountRole = "system_admin" | "user";
export type AccountLifecycleStatus = "pending_activation" | "active" | "closed";

export type AccountPermission = {
  key: string;
  category: string;
  label: string;
  adminOnly: boolean;
};

export type PermissionGroup = {
  id: string;
  code: string;
  name: string;
  summary: string;
  role: AccountRole;
  memberCount: number;
  status: "active" | "paused";
  memberSources: Array<{
    type: "person" | "department" | "title";
    label: string;
    count: number;
  }>;
  dataScope: "personal" | "department" | "company" | "selected_departments";
  visibleDepartments: string[];
  visibleMenus: string[];
  hiddenMenus: string[];
  permissionRules: Array<{
    object: string;
    module: string;
    actions: Array<"view" | "create" | "edit" | "delete" | "manage">;
    scope: "personal" | "department" | "company";
  }>;
  permissionKeys: string[];
};

export type DetailedPermissionAction = "view" | "add" | "edit" | "delete" | "manage";
export type DetailedPermissionScope = "private" | "department" | "parent_department" | "public";
export type FieldPermissionMode = "hidden" | "readonly" | "editable";

export type DetailedPermissionObject = {
  id: string;
  groupId: string;
  module: string;
  object: string;
  objectCode: string;
  summary: string;
  actions: DetailedPermissionAction[];
  scope: DetailedPermissionScope;
  conditions: string[];
  fieldSecurity: Array<{
    field: string;
    mode: FieldPermissionMode;
    note: string;
  }>;
  toolbar: Array<{
    label: string;
    enabled: boolean;
  }>;
  menuVisible: boolean;
};

export type PermissionMergeExample = {
  id: string;
  employee: string;
  groups: string[];
  result: string;
};

export type ManagedUserAccount = {
  id: string;
  employeeCode?: string;
  name: string;
  email: string;
  avatar: string;
  title: string;
  department: string;
  role: AccountRole;
  groupId: string | null;
  status: AccountLifecycleStatus;
  customPermissionKeys: string[];
  customPermissionNote?: string;
  activatedAt?: string;
  closedAt?: string;
};

export type DeviceAuthStatus = "pending" | "approved" | "rejected" | "locked";

export type DeviceAuthRequest = {
  id: string;
  employeeCode: string;
  employeeName: string;
  avatar: string;
  department: string;
  branch: string;
  deviceName: string;
  deviceId: string;
  submittedAt: string;
  status: DeviceAuthStatus;
  lastUsedAt?: string;
  note?: string;
};

export type DeviceAuthPolicy = {
  maxDevicesPerUser: number;
  requireNotificationEnabled: boolean;
  requireGpsForAttendance: boolean;
  requireWifiForOffice: boolean;
  approvalRefreshHint: string;
};

export type IntranetSettingStatus = "enabled" | "disabled" | "review";

export type IntranetBrandAsset = {
  id: string;
  label: string;
  target: string;
  value: string;
  recommendation: string;
  status: IntranetSettingStatus;
};

export type IntranetPolicyItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: IntranetSettingStatus;
};

export type IntranetTemplateItem = {
  id: string;
  name: string;
  target: string;
  status: IntranetSettingStatus;
};

export type IntranetTagItem = {
  id: string;
  label: string;
  usage: number;
  status: IntranetSettingStatus;
};

export type CompanyInfoStatus = "complete" | "review" | "missing";

export type CompanyInfoItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: CompanyInfoStatus;
};

export type CompanyOffice = {
  id: string;
  name: string;
  type: "headquarters" | "office";
  address: string;
  note: string;
};

export type CompanyBankAccount = {
  id: string;
  accountNumber: string;
  bankName: string;
  branch: string;
  owner: string;
  isDefault: boolean;
};

export type CompanyLegalAsset = {
  id: string;
  name: string;
  fileName: string;
  usage: string;
  status: CompanyInfoStatus;
};

export type SmtpConfigStatus = "active" | "review" | "error" | "disabled";

export type SmtpConfigItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: SmtpConfigStatus;
};

export type SmtpEmailLog = {
  id: string;
  time: string;
  recipient: string;
  template: string;
  status: "sent" | "failed" | "queued";
  detail: string;
};

export type AdminSettingStatus = "configured" | "needs_review" | "planned";
export type AdminSettingTier = "system" | "module" | "operations";

export type AdminSettingItem = {
  id: string;
  tier: AdminSettingTier;
  category: string;
  title: string;
  summary: string;
  owner: string;
  status: AdminSettingStatus;
  href?: string;
  controls: string[];
};

export type AdminModuleSettingGroup = {
  id: string;
  module: "HRM" | "WORK" | "CRM";
  summary: string;
  status: AdminSettingStatus;
  settings: AdminSettingItem[];
};

export type AdminOperationEvent = {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  severity: "info" | "warning" | "critical";
};

export type OrgUnitNode = {
  id: string;
  name: string;
  code: string;
  type: "company" | "branch" | "department";
  status: "active" | "paused";
  head: string;
  headTitle: string;
  headcount: number;
  tags: string[];
  location: string;
  gps: string;
  ipRange: string;
  signatureProfile: string;
  children?: OrgUnitNode[];
};

export type OrganizationCatalogItem = {
  id: string;
  code: string;
  name: string;
  type: "position" | "title";
  group: string;
  summary: string;
  jobDescription: string;
  competencies: string[];
  workdays: number;
  salaryGrade: string;
  approvalWeight: number;
  allowance: string;
  payrollCode: string;
  permissionCode: string;
  tags: string[];
  status: "active" | "paused";
};

export type OrganizationChangeLog = {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
};

export const accountPermissions: AccountPermission[] = [
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
    label: "Thay đổi giao diện/logo công ty",
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
  }
,
  // Detail permission action selections persisted from group/account editors.
  {
    key: "permission.hrm-employees.manage",
    category: "Chi ti?t quy?n",
    label: "hrm-employees manage",
    adminOnly: false
  },
  {
    key: "permission.hrm-employees.view",
    category: "Chi ti?t quy?n",
    label: "hrm-employees view",
    adminOnly: false
  },
  {
    key: "permission.hrm-employees.create",
    category: "Chi ti?t quy?n",
    label: "hrm-employees create",
    adminOnly: false
  },
  {
    key: "permission.hrm-contracts.manage",
    category: "Chi ti?t quy?n",
    label: "hrm-contracts manage",
    adminOnly: false
  },
  {
    key: "permission.hrm-contracts.view",
    category: "Chi ti?t quy?n",
    label: "hrm-contracts view",
    adminOnly: false
  },
  {
    key: "permission.hrm-contracts.create",
    category: "Chi ti?t quy?n",
    label: "hrm-contracts create",
    adminOnly: false
  },
  {
    key: "permission.hrm-decisions.manage",
    category: "Chi ti?t quy?n",
    label: "hrm-decisions manage",
    adminOnly: false
  },
  {
    key: "permission.hrm-decisions.view",
    category: "Chi ti?t quy?n",
    label: "hrm-decisions view",
    adminOnly: false
  },
  {
    key: "permission.hrm-decisions.create",
    category: "Chi ti?t quy?n",
    label: "hrm-decisions create",
    adminOnly: false
  },
  {
    key: "permission.recruitment-proposals.manage",
    category: "Chi ti?t quy?n",
    label: "recruitment-proposals manage",
    adminOnly: false
  },
  {
    key: "permission.recruitment-proposals.view",
    category: "Chi ti?t quy?n",
    label: "recruitment-proposals view",
    adminOnly: false
  },
  {
    key: "permission.recruitment-proposals.create",
    category: "Chi ti?t quy?n",
    label: "recruitment-proposals create",
    adminOnly: false
  },
  {
    key: "permission.recruitment-pipeline.manage",
    category: "Chi ti?t quy?n",
    label: "recruitment-pipeline manage",
    adminOnly: false
  },
  {
    key: "permission.recruitment-pipeline.view",
    category: "Chi ti?t quy?n",
    label: "recruitment-pipeline view",
    adminOnly: false
  },
  {
    key: "permission.recruitment-pipeline.create",
    category: "Chi ti?t quy?n",
    label: "recruitment-pipeline create",
    adminOnly: false
  },
  {
    key: "permission.recruitment-care.manage",
    category: "Chi ti?t quy?n",
    label: "recruitment-care manage",
    adminOnly: false
  },
  {
    key: "permission.recruitment-care.view",
    category: "Chi ti?t quy?n",
    label: "recruitment-care view",
    adminOnly: false
  },
  {
    key: "permission.recruitment-care.create",
    category: "Chi ti?t quy?n",
    label: "recruitment-care create",
    adminOnly: false
  },
  {
    key: "permission.attendance.manage",
    category: "Chi ti?t quy?n",
    label: "attendance manage",
    adminOnly: false
  },
  {
    key: "permission.attendance.view",
    category: "Chi ti?t quy?n",
    label: "attendance view",
    adminOnly: false
  },
  {
    key: "permission.attendance.create",
    category: "Chi ti?t quy?n",
    label: "attendance create",
    adminOnly: false
  },
  {
    key: "permission.attendance-timesheets.manage",
    category: "Chi ti?t quy?n",
    label: "attendance-timesheets manage",
    adminOnly: false
  },
  {
    key: "permission.attendance-timesheets.view",
    category: "Chi ti?t quy?n",
    label: "attendance-timesheets view",
    adminOnly: false
  },
  {
    key: "permission.attendance-timesheets.create",
    category: "Chi ti?t quy?n",
    label: "attendance-timesheets create",
    adminOnly: false
  },
  {
    key: "permission.payroll.manage",
    category: "Chi ti?t quy?n",
    label: "payroll manage",
    adminOnly: false
  },
  {
    key: "permission.payroll.view",
    category: "Chi ti?t quy?n",
    label: "payroll view",
    adminOnly: false
  },
  {
    key: "permission.payroll.create",
    category: "Chi ti?t quy?n",
    label: "payroll create",
    adminOnly: false
  },
  {
    key: "permission.payroll-types.manage",
    category: "Chi ti?t quy?n",
    label: "payroll-types manage",
    adminOnly: false
  },
  {
    key: "permission.payroll-types.view",
    category: "Chi ti?t quy?n",
    label: "payroll-types view",
    adminOnly: false
  },
  {
    key: "permission.payroll-types.create",
    category: "Chi ti?t quy?n",
    label: "payroll-types create",
    adminOnly: false
  },
  {
    key: "permission.requests.manage",
    category: "Chi ti?t quy?n",
    label: "requests manage",
    adminOnly: false
  },
  {
    key: "permission.requests.view",
    category: "Chi ti?t quy?n",
    label: "requests view",
    adminOnly: false
  },
  {
    key: "permission.requests.create",
    category: "Chi ti?t quy?n",
    label: "requests create",
    adminOnly: false
  },
  {
    key: "permission.approvals.manage",
    category: "Chi ti?t quy?n",
    label: "approvals manage",
    adminOnly: false
  },
  {
    key: "permission.approvals.view",
    category: "Chi ti?t quy?n",
    label: "approvals view",
    adminOnly: false
  },
  {
    key: "permission.approvals.create",
    category: "Chi ti?t quy?n",
    label: "approvals create",
    adminOnly: false
  },
  {
    key: "permission.assets.manage",
    category: "Chi ti?t quy?n",
    label: "assets manage",
    adminOnly: false
  },
  {
    key: "permission.assets.view",
    category: "Chi ti?t quy?n",
    label: "assets view",
    adminOnly: false
  },
  {
    key: "permission.assets.create",
    category: "Chi ti?t quy?n",
    label: "assets create",
    adminOnly: false
  },
  {
    key: "permission.insurance.manage",
    category: "Chi ti?t quy?n",
    label: "insurance manage",
    adminOnly: false
  },
  {
    key: "permission.insurance.view",
    category: "Chi ti?t quy?n",
    label: "insurance view",
    adminOnly: false
  },
  {
    key: "permission.insurance.create",
    category: "Chi ti?t quy?n",
    label: "insurance create",
    adminOnly: false
  },
  {
    key: "permission.calendar-events.manage",
    category: "Chi ti?t quy?n",
    label: "calendar-events manage",
    adminOnly: false
  },
  {
    key: "permission.calendar-events.view",
    category: "Chi ti?t quy?n",
    label: "calendar-events view",
    adminOnly: false
  },
  {
    key: "permission.calendar-events.create",
    category: "Chi ti?t quy?n",
    label: "calendar-events create",
    adminOnly: false
  },
  {
    key: "permission.documents-company.manage",
    category: "Chi ti?t quy?n",
    label: "documents-company manage",
    adminOnly: false
  },
  {
    key: "permission.documents-company.view",
    category: "Chi ti?t quy?n",
    label: "documents-company view",
    adminOnly: false
  },
  {
    key: "permission.documents-company.create",
    category: "Chi ti?t quy?n",
    label: "documents-company create",
    adminOnly: false
  },
  {
    key: "permission.documents-personal.manage",
    category: "Chi ti?t quy?n",
    label: "documents-personal manage",
    adminOnly: false
  },
  {
    key: "permission.documents-personal.view",
    category: "Chi ti?t quy?n",
    label: "documents-personal view",
    adminOnly: false
  },
  {
    key: "permission.documents-personal.create",
    category: "Chi ti?t quy?n",
    label: "documents-personal create",
    adminOnly: false
  },
  {
    key: "permission.kpi-evaluation.manage",
    category: "Chi ti?t quy?n",
    label: "kpi-evaluation manage",
    adminOnly: false
  },
  {
    key: "permission.kpi-evaluation.view",
    category: "Chi ti?t quy?n",
    label: "kpi-evaluation view",
    adminOnly: false
  },
  {
    key: "permission.kpi-evaluation.create",
    category: "Chi ti?t quy?n",
    label: "kpi-evaluation create",
    adminOnly: false
  },
  {
    key: "permission.kpi-goals.manage",
    category: "Chi ti?t quy?n",
    label: "kpi-goals manage",
    adminOnly: false
  },
  {
    key: "permission.kpi-goals.view",
    category: "Chi ti?t quy?n",
    label: "kpi-goals view",
    adminOnly: false
  },
  {
    key: "permission.kpi-goals.create",
    category: "Chi ti?t quy?n",
    label: "kpi-goals create",
    adminOnly: false
  },
  {
    key: "permission.work-tasks.manage",
    category: "Chi ti?t quy?n",
    label: "work-tasks manage",
    adminOnly: false
  },
  {
    key: "permission.work-tasks.view",
    category: "Chi ti?t quy?n",
    label: "work-tasks view",
    adminOnly: false
  },
  {
    key: "permission.work-tasks.create",
    category: "Chi ti?t quy?n",
    label: "work-tasks create",
    adminOnly: false
  },
  {
    key: "permission.work-timesheet.manage",
    category: "Chi ti?t quy?n",
    label: "work-timesheet manage",
    adminOnly: false
  },
  {
    key: "permission.work-timesheet.view",
    category: "Chi ti?t quy?n",
    label: "work-timesheet view",
    adminOnly: false
  },
  {
    key: "permission.work-timesheet.create",
    category: "Chi ti?t quy?n",
    label: "work-timesheet create",
    adminOnly: false
  },
  {
    key: "permission.work-projects.manage",
    category: "Chi ti?t quy?n",
    label: "work-projects manage",
    adminOnly: false
  },
  {
    key: "permission.work-projects.view",
    category: "Chi ti?t quy?n",
    label: "work-projects view",
    adminOnly: false
  },
  {
    key: "permission.work-projects.create",
    category: "Chi ti?t quy?n",
    label: "work-projects create",
    adminOnly: false
  },
  {
    key: "permission.performance-reviews.manage",
    category: "Chi ti?t quy?n",
    label: "performance-reviews manage",
    adminOnly: false
  },
  {
    key: "permission.performance-reviews.view",
    category: "Chi ti?t quy?n",
    label: "performance-reviews view",
    adminOnly: false
  },
  {
    key: "permission.performance-reviews.create",
    category: "Chi ti?t quy?n",
    label: "performance-reviews create",
    adminOnly: false
  },
  {
    key: "permission.digital-signatures.manage",
    category: "Chi ti?t quy?n",
    label: "digital-signatures manage",
    adminOnly: false
  },
  {
    key: "permission.digital-signatures.view",
    category: "Chi ti?t quy?n",
    label: "digital-signatures view",
    adminOnly: false
  },
  {
    key: "permission.digital-signatures.create",
    category: "Chi ti?t quy?n",
    label: "digital-signatures create",
    adminOnly: false
  },
  {
    key: "permission.digital-signature-records.manage",
    category: "Chi ti?t quy?n",
    label: "digital-signature-records manage",
    adminOnly: false
  },
  {
    key: "permission.digital-signature-records.view",
    category: "Chi ti?t quy?n",
    label: "digital-signature-records view",
    adminOnly: false
  },
  {
    key: "permission.digital-signature-records.create",
    category: "Chi ti?t quy?n",
    label: "digital-signature-records create",
    adminOnly: false
  },
  {
    key: "permission.reports.manage",
    category: "Chi ti?t quy?n",
    label: "reports manage",
    adminOnly: false
  },
  {
    key: "permission.reports.view",
    category: "Chi ti?t quy?n",
    label: "reports view",
    adminOnly: false
  },
  {
    key: "permission.reports.create",
    category: "Chi ti?t quy?n",
    label: "reports create",
    adminOnly: false
  },
  {
    key: "permission.reports-dashboard.manage",
    category: "Chi ti?t quy?n",
    label: "reports-dashboard manage",
    adminOnly: false
  },
  {
    key: "permission.reports-dashboard.view",
    category: "Chi ti?t quy?n",
    label: "reports-dashboard view",
    adminOnly: false
  },
  {
    key: "permission.reports-dashboard.create",
    category: "Chi ti?t quy?n",
    label: "reports-dashboard create",
    adminOnly: false
  },
  {
    key: "permission.social-groups.manage",
    category: "Chi ti?t quy?n",
    label: "social-groups manage",
    adminOnly: false
  },
  {
    key: "permission.social-groups.view",
    category: "Chi ti?t quy?n",
    label: "social-groups view",
    adminOnly: false
  },
  {
    key: "permission.social-groups.create",
    category: "Chi ti?t quy?n",
    label: "social-groups create",
    adminOnly: false
  },
  {
    key: "permission.social-posts.manage",
    category: "Chi ti?t quy?n",
    label: "social-posts manage",
    adminOnly: false
  },
  {
    key: "permission.social-posts.view",
    category: "Chi ti?t quy?n",
    label: "social-posts view",
    adminOnly: false
  },
  {
    key: "permission.social-posts.create",
    category: "Chi ti?t quy?n",
    label: "social-posts create",
    adminOnly: false
  },
  {
    key: "permission.social-wall.manage",
    category: "Chi ti?t quy?n",
    label: "social-wall manage",
    adminOnly: false
  },
  {
    key: "permission.social-wall.view",
    category: "Chi ti?t quy?n",
    label: "social-wall view",
    adminOnly: false
  },
  {
    key: "permission.social-wall.create",
    category: "Chi ti?t quy?n",
    label: "social-wall create",
    adminOnly: false
  },
  {
    key: "permission.support-tickets.manage",
    category: "Chi ti?t quy?n",
    label: "support-tickets manage",
    adminOnly: false
  },
  {
    key: "permission.support-tickets.view",
    category: "Chi ti?t quy?n",
    label: "support-tickets view",
    adminOnly: false
  },
  {
    key: "permission.support-tickets.create",
    category: "Chi ti?t quy?n",
    label: "support-tickets create",
    adminOnly: false
  },
  {
    key: "permission.training.manage",
    category: "Chi ti?t quy?n",
    label: "training manage",
    adminOnly: false
  },
  {
    key: "permission.training.view",
    category: "Chi ti?t quy?n",
    label: "training view",
    adminOnly: false
  },
  {
    key: "permission.training.create",
    category: "Chi ti?t quy?n",
    label: "training create",
    adminOnly: false
  },
  {
    key: "permission.automation.manage",
    category: "Chi ti?t quy?n",
    label: "automation manage",
    adminOnly: false
  },
  {
    key: "permission.automation.view",
    category: "Chi ti?t quy?n",
    label: "automation view",
    adminOnly: false
  },
  {
    key: "permission.automation.create",
    category: "Chi ti?t quy?n",
    label: "automation create",
    adminOnly: false
  },
  {
    key: "permission.automation-alerts.manage",
    category: "Chi ti?t quy?n",
    label: "automation-alerts manage",
    adminOnly: false
  },
  {
    key: "permission.automation-alerts.view",
    category: "Chi ti?t quy?n",
    label: "automation-alerts view",
    adminOnly: false
  },
  {
    key: "permission.automation-alerts.create",
    category: "Chi ti?t quy?n",
    label: "automation-alerts create",
    adminOnly: false
  },
  {
    key: "permission.automation-approval-flow.manage",
    category: "Chi ti?t quy?n",
    label: "automation-approval-flow manage",
    adminOnly: false
  },
  {
    key: "permission.automation-approval-flow.view",
    category: "Chi ti?t quy?n",
    label: "automation-approval-flow view",
    adminOnly: false
  },
  {
    key: "permission.automation-approval-flow.create",
    category: "Chi ti?t quy?n",
    label: "automation-approval-flow create",
    adminOnly: false
  },
  {
    key: "permission.assistant-knowledge.manage",
    category: "Chi ti?t quy?n",
    label: "assistant-knowledge manage",
    adminOnly: false
  },
  {
    key: "permission.assistant-knowledge.view",
    category: "Chi ti?t quy?n",
    label: "assistant-knowledge view",
    adminOnly: false
  },
  {
    key: "permission.assistant-knowledge.create",
    category: "Chi ti?t quy?n",
    label: "assistant-knowledge create",
    adminOnly: false
  }
];

export const permissionGroups: PermissionGroup[] = [
  {
    id: "grp-directors",
    code: "ROLE_DIRECTOR",
    name: "Ban giám đốc",
    summary: "Xem báo cáo tổng thể và duyệt các đơn từ quan trọng.",
    role: "user",
    memberCount: 4,
    status: "active",
    memberSources: [
      { type: "title", label: "Giám đốc", count: 3 },
      { type: "person", label: "Chủ tịch HĐQT", count: 1 }
    ],
    dataScope: "company",
    visibleDepartments: ["Tất cả phòng ban"],
    visibleMenus: ["Báo cáo", "Phê duyệt", "Công việc", "CRM"],
    hiddenMenus: ["Tuyển dụng", "Đào tạo"],
    permissionRules: [
      { object: "Báo cáo tổng thể", module: "Báo cáo", actions: ["view", "manage"], scope: "company" },
      { object: "Đơn từ quan trọng", module: "Phê duyệt", actions: ["view", "edit", "manage"], scope: "company" },
      { object: "Hợp đồng", module: "CRM", actions: ["view", "manage"], scope: "company" }
    ],
    permissionKeys: ["reports.company.view", "approvals.critical.approve"]
  },
  {
    id: "grp-managers",
    code: "ROLE_DEPT_MANAGER",
    name: "Trưởng phòng",
    summary: "Quản lý nhân sự, công việc và phê duyệt trong bộ phận.",
    role: "user",
    memberCount: 18,
    status: "active",
    memberSources: [
      { type: "title", label: "Trưởng phòng", count: 14 },
      { type: "department", label: "Khối Kinh doanh", count: 4 }
    ],
    dataScope: "department",
    visibleDepartments: ["Phòng ban đang quản lý"],
    visibleMenus: ["Công việc", "Phê duyệt", "Nhân sự", "Báo cáo phòng ban"],
    hiddenMenus: ["Cài đặt hệ thống", "Open API"],
    permissionRules: [
      { object: "Nhân sự bộ phận", module: "Nhân sự", actions: ["view", "edit", "manage"], scope: "department" },
      { object: "Đơn từ", module: "Phê duyệt", actions: ["view", "edit", "manage"], scope: "department" },
      { object: "Công việc", module: "WORK", actions: ["view", "create", "edit", "manage"], scope: "department" },
      { object: "Báo cáo phòng ban", module: "Báo cáo", actions: ["view"], scope: "department" }
    ],
    permissionKeys: ["employees.department.manage", "approvals.critical.approve", "tasks.assigned.update"]
  },
  {
    id: "grp-project-managers",
    code: "ROLE_PROJECT_MANAGER",
    name: "Quản lý dự án",
    summary: "Quản lý dự án và công việc của nhân sự cấp dưới theo phạm vi phòng ban.",
    role: "user",
    memberCount: 12,
    status: "active",
    memberSources: [
      { type: "title", label: "Trưởng bộ phận", count: 8 },
      { type: "person", label: "Project Lead chỉ định", count: 4 }
    ],
    dataScope: "department",
    visibleDepartments: ["Marketing", "Sales", "Technology"],
    visibleMenus: ["Dự án", "Công việc", "Báo cáo phòng ban"],
    hiddenMenus: ["Tuyển dụng", "Đào tạo", "Open API"],
    permissionRules: [
      { object: "Dự án", module: "WORK", actions: ["view", "create", "edit", "manage"], scope: "department" },
      { object: "Công việc", module: "WORK", actions: ["view", "create", "edit", "manage"], scope: "department" },
      { object: "Báo cáo dự án", module: "Báo cáo", actions: ["view"], scope: "department" },
      { object: "Nhân sự tham gia", module: "Nhân sự", actions: ["view"], scope: "department" }
    ],
    permissionKeys: ["employees.department.manage", "tasks.assigned.update", "reports.company.view"]
  },
  {
    id: "grp-employees",
    code: "ROLE_EMPLOYEE",
    name: "Nhân viên",
    summary: "Tạo đơn từ cá nhân, xem công việc được giao và cập nhật báo cáo.",
    role: "user",
    memberCount: 176,
    status: "active",
    memberSources: [
      { type: "department", label: "Toàn bộ nhân sự văn phòng", count: 142 },
      { type: "person", label: "Nhân sự bổ sung", count: 34 }
    ],
    dataScope: "personal",
    visibleDepartments: ["Dữ liệu cá nhân"],
    visibleMenus: ["Hồ sơ", "Đơn từ", "Chấm công", "Công việc"],
    hiddenMenus: ["Báo cáo tổng thể", "Tuyển dụng", "Cài đặt hệ thống"],
    permissionRules: [
      { object: "Đơn từ cá nhân", module: "HRM", actions: ["view", "create", "edit"], scope: "personal" },
      { object: "Công việc được giao", module: "WORK", actions: ["view", "edit"], scope: "personal" },
      { object: "Báo cáo cá nhân", module: "Báo cáo", actions: ["view"], scope: "personal" }
    ],
    permissionKeys: ["requests.personal.create", "tasks.assigned.update", "reports.personal.view"]
  }
];

export const detailedPermissionObjects: DetailedPermissionObject[] = [
  {
    id: "perm-project-tasks",
    groupId: "grp-project-managers",
    module: "WORK",
    object: "Công việc",
    objectCode: "WORK_TASK",
    summary: "Quản lý công việc thuộc dự án của phòng ban.",
    actions: ["view", "add", "edit", "manage"],
    scope: "department",
    conditions: [
      "Được sửa khi công việc chưa đóng",
      "Được giao lại người phụ trách trong cùng phòng ban",
      "Không được xóa công việc đã có log nghiệm thu"
    ],
    fieldSecurity: [
      { field: "Ngân sách dự kiến", mode: "readonly", note: "Chỉ xem để theo dõi chi phí" },
      { field: "Đánh giá nội bộ", mode: "hidden", note: "Ẩn khỏi nhóm quản lý dự án" },
      { field: "Deadline", mode: "editable", note: "Được chỉnh trong phạm vi dự án" }
    ],
    toolbar: [
      { label: "In", enabled: true },
      { label: "Tải về", enabled: true },
      { label: "Chia sẻ", enabled: false },
      { label: "Import", enabled: false },
      { label: "Export", enabled: true }
    ],
    menuVisible: true
  },
  {
    id: "perm-project-records",
    groupId: "grp-project-managers",
    module: "WORK",
    object: "Dự án",
    objectCode: "WORK_PROJECT",
    summary: "Theo dõi dự án và chốt tiến độ cấp phòng ban.",
    actions: ["view", "add", "edit", "manage"],
    scope: "department",
    conditions: [
      "Được chốt mốc khi toàn bộ task con đã hoàn thành",
      "Không được thay đổi chủ đầu tư sau khi dự án đã duyệt",
      "Được hoàn duyệt khi chưa khóa kỳ báo cáo"
    ],
    fieldSecurity: [
      { field: "Lợi nhuận dự kiến", mode: "hidden", note: "Chỉ Ban giám đốc được xem" },
      { field: "Mốc nghiệm thu", mode: "editable", note: "Được cập nhật theo tiến độ" },
      { field: "Người phụ trách", mode: "editable", note: "Chọn trong nhân sự phòng ban" }
    ],
    toolbar: [
      { label: "In", enabled: true },
      { label: "Tải về", enabled: true },
      { label: "Chia sẻ", enabled: true },
      { label: "Import", enabled: false },
      { label: "Export", enabled: true }
    ],
    menuVisible: true
  },
  {
    id: "perm-customer",
    groupId: "grp-project-managers",
    module: "CRM",
    object: "Khách hàng",
    objectCode: "CRM_CUSTOMER",
    summary: "Chỉ xem khách hàng liên quan tới dự án đang phụ trách.",
    actions: ["view"],
    scope: "private",
    conditions: [
      "Chỉ thấy khách hàng gắn với dự án mình phụ trách",
      "Không được export danh sách khách hàng",
      "Không được sửa thông tin pháp lý"
    ],
    fieldSecurity: [
      { field: "Số điện thoại", mode: "readonly", note: "Không cho sửa dữ liệu liên hệ" },
      { field: "Mã số thuế", mode: "hidden", note: "Ẩn thông tin pháp lý" },
      { field: "Ghi chú chăm sóc", mode: "readonly", note: "Chỉ đọc lịch sử CSKH" }
    ],
    toolbar: [
      { label: "In", enabled: false },
      { label: "Tải về", enabled: false },
      { label: "Chia sẻ", enabled: false },
      { label: "Import", enabled: false },
      { label: "Export", enabled: false }
    ],
    menuVisible: false
  },
  {
    id: "perm-employee-profile",
    groupId: "grp-employees",
    module: "HRM",
    object: "Hồ sơ nhân sự",
    objectCode: "HRM_PROFILE",
    summary: "Nhân viên xem hồ sơ đồng nghiệp nhưng bị ẩn dữ liệu nhạy cảm.",
    actions: ["view"],
    scope: "department",
    conditions: [
      "Không xem hồ sơ nhân sự đã nghỉ việc",
      "Không export danh sách nhân sự",
      "Chỉ xem thông tin liên hệ công việc"
    ],
    fieldSecurity: [
      { field: "Mức lương", mode: "hidden", note: "Ẩn hoàn toàn với nhân viên" },
      { field: "Số CMND/CCCD", mode: "hidden", note: "Dữ liệu định danh cá nhân" },
      { field: "Email công việc", mode: "readonly", note: "Chỉ xem" }
    ],
    toolbar: [
      { label: "In", enabled: false },
      { label: "Tải về", enabled: false },
      { label: "Chia sẻ", enabled: true },
      { label: "Import", enabled: false },
      { label: "Export", enabled: false }
    ],
    menuVisible: true
  },
  {
    id: "perm-payroll",
    groupId: "grp-managers",
    module: "HRM",
    object: "Bảng lương",
    objectCode: "HRM_PAYROLL",
    summary: "Quyền cao cho Admin/HCNS khi kiểm soát bảng lương.",
    actions: ["view", "add", "edit", "delete", "manage"],
    scope: "public",
    conditions: [
      "Được khóa bảng lương sau khi chốt kỳ",
      "Được import biến động lương",
      "Được export phiếu lương theo tháng"
    ],
    fieldSecurity: [
      { field: "Lương cơ bản", mode: "editable", note: "Được chỉnh trước khi khóa kỳ" },
      { field: "Thuế TNCN", mode: "editable", note: "Được cập nhật theo công thức" },
      { field: "Ghi chú nội bộ", mode: "editable", note: "Chỉ Admin/HCNS thấy" }
    ],
    toolbar: [
      { label: "In", enabled: true },
      { label: "Tải về", enabled: true },
      { label: "Chia sẻ", enabled: false },
      { label: "Import", enabled: true },
      { label: "Export", enabled: true }
    ],
    menuVisible: true
  },
  {
    id: "perm-approval",
    groupId: "grp-managers",
    module: "HRM",
    object: "Đơn từ",
    objectCode: "HRM_REQUEST",
    summary: "Trưởng phòng duyệt/hoàn duyệt đơn từ của nhân sự cấp dưới.",
    actions: ["view", "edit", "manage"],
    scope: "parent_department",
    conditions: [
      "Được duyệt khi đơn ở trạng thái Chờ duyệt",
      "Được hoàn duyệt khi chưa chốt công tháng",
      "Không được sửa nội dung đơn đã duyệt"
    ],
    fieldSecurity: [
      { field: "Lý do nghỉ", mode: "readonly", note: "Không chỉnh nội dung nhân viên gửi" },
      { field: "Ý kiến duyệt", mode: "editable", note: "Bắt buộc nhập khi từ chối" },
      { field: "File đính kèm", mode: "readonly", note: "Chỉ xem minh chứng" }
    ],
    toolbar: [
      { label: "In", enabled: true },
      { label: "Tải về", enabled: false },
      { label: "Chia sẻ", enabled: false },
      { label: "Import", enabled: false },
      { label: "Export", enabled: false }
    ],
    menuVisible: true
  }
];

export const permissionMergeExamples: PermissionMergeExample[] = [
  {
    id: "merge-001",
    employee: "Hoàng Đức",
    groups: ["Trưởng phòng", "Quản lý dự án"],
    result: "Có quyền quản lý Công việc theo phòng ban và xem Báo cáo dự án."
  },
  {
    id: "merge-002",
    employee: "Ban điều hành",
    groups: ["Ban giám đốc", "Quản lý dự án"],
    result: "Kết hợp quyền điều hành công ty với quyền quản lý dự án theo nhóm người dùng."
  }
];

export const managedUserAccounts: ManagedUserAccount[] = [
  {
    id: "acc-001",
    employeeCode: "HL-001",
    name: "Đặng Đình Dũng",
    email: "dungdd@helios.vn",
    avatar: "DD",
    title: "Web Lead",
    department: "Helios",
    role: "system_admin",
    groupId: null,
    status: "active",
    customPermissionKeys: [],
    activatedAt: "26/02/2024"
  },
  {
    id: "acc-002",
    employeeCode: "HL-002",
    name: "Nguyễn Hải Anh",
    email: "haianh@helios.vn",
    avatar: "HA",
    title: "HR Executive",
    department: "People Operations",
    role: "user",
    groupId: "grp-managers",
    status: "active",
    customPermissionKeys: [],
    activatedAt: "01/09/2023"
  },
  {
    id: "acc-003",
    employeeCode: "HL-003",
    name: "Lê Minh Khang",
    email: "khanglm@helios.vn",
    avatar: "LK",
    title: "Sales Specialist",
    department: "Sales",
    role: "user",
    groupId: "grp-employees",
    status: "active",
    customPermissionKeys: [],
    activatedAt: "06/01/2025"
  },
  {
    id: "acc-004",
    employeeCode: "HL-019",
    name: "Mai Linh",
    email: "linhm@helios.vn",
    avatar: "ML",
    title: "Operations Coordinator",
    department: "Operations",
    role: "user",
    groupId: "grp-employees",
    status: "pending_activation",
    customPermissionKeys: []
  },
  {
    id: "acc-005",
    employeeCode: "HL-024",
    name: "Hoàng Đức",
    email: "duch@helios.vn",
    avatar: "HD",
    title: "Sales Manager",
    department: "Sales",
    role: "user",
    groupId: "grp-managers",
    status: "active",
    customPermissionKeys: ["reports.company.view"],
    customPermissionNote: "Xem báo cáo công ty trong thời gian thay quyền.",
    activatedAt: "12/04/2024"
  },
  {
    id: "acc-006",
    employeeCode: "HL-041",
    name: "Phạm Thanh Trúc",
    email: "tructp@helios.vn",
    avatar: "TT",
    title: "HR Executive",
    department: "People Operations",
    role: "user",
    groupId: "grp-employees",
    status: "closed",
    customPermissionKeys: [],
    activatedAt: "10/06/2024",
    closedAt: "30/06/2026"
  }
];

export const deviceAuthPolicy: DeviceAuthPolicy = {
  maxDevicesPerUser: 1,
  requireNotificationEnabled: true,
  requireGpsForAttendance: true,
  requireWifiForOffice: true,
  approvalRefreshHint: "Sau khi được xác thực, nhân viên nên đăng xuất và đăng nhập lại App hoặc tải lại trang GPS."
};

export const deviceAuthRequests: DeviceAuthRequest[] = [
  {
    id: "dev-001",
    employeeCode: "HL-002",
    employeeName: "Nguyễn Hải Anh",
    avatar: "HA",
    department: "People Operations",
    branch: "Hà Nội",
    deviceName: "iPhone 15 Pro Max",
    deviceId: "ios-A7F9-42B1-9C03-HA",
    submittedAt: "10:15 10/07/2026",
    status: "pending",
    note: "Thiết bị mới sau khi đổi máy."
  },
  {
    id: "dev-002",
    employeeCode: "HL-024",
    employeeName: "Hoàng Đức",
    avatar: "HD",
    department: "Sales",
    branch: "Hà Nội",
    deviceName: "Samsung Galaxy S24",
    deviceId: "and-8821-BC77-41AA-HD",
    submittedAt: "09:42 10/07/2026",
    status: "pending"
  },
  {
    id: "dev-003",
    employeeCode: "HL-003",
    employeeName: "Lê Minh Khang",
    avatar: "LK",
    department: "Sales",
    branch: "Hồ Chí Minh",
    deviceName: "OPPO Reno11",
    deviceId: "and-19EF-7742-93AC-LK",
    submittedAt: "17:30 09/07/2026",
    status: "approved",
    lastUsedAt: "08:02 10/07/2026"
  },
  {
    id: "dev-004",
    employeeCode: "HL-019",
    employeeName: "Mai Linh",
    avatar: "ML",
    department: "Operations",
    branch: "Kho trung tâm",
    deviceName: "Xiaomi 14T",
    deviceId: "and-A901-73DD-20FF-ML",
    submittedAt: "14:20 08/07/2026",
    status: "rejected",
    note: "Device ID trùng yêu cầu đã bị từ chối trước đó."
  },
  {
    id: "dev-005",
    employeeCode: "HL-001",
    employeeName: "Đặng Đình Dũng",
    avatar: "DD",
    department: "Helios",
    branch: "Hà Nội",
    deviceName: "iPhone 14 Pro",
    deviceId: "ios-F301-112A-770C-DD",
    submittedAt: "08:45 02/07/2026",
    status: "locked",
    lastUsedAt: "18:05 08/07/2026",
    note: "Khóa tạm thời theo yêu cầu bảo mật."
  }
];

export const intranetBrandAssets: IntranetBrandAsset[] = [
  {
    id: "brand-logo-web",
    label: "Logo công ty",
    target: "Header web và mẫu in ấn",
    value: "helios-logo-primary.svg",
    recommendation: "SVG/PNG nền trong suốt, ngang 160x40px",
    status: "enabled"
  },
  {
    id: "brand-logo-mobile",
    label: "Logo Mobile",
    target: "App điện thoại",
    value: "helios-app-mark.png",
    recommendation: "PNG 512x512px",
    status: "enabled"
  },
  {
    id: "brand-favicon",
    label: "Favicon",
    target: "Tab trình duyệt",
    value: "favicon.ico",
    recommendation: "ICO/PNG 32x32px",
    status: "enabled"
  },
  {
    id: "brand-color",
    label: "Màu chủ đạo",
    target: "Button, tab, trạng thái nổi bật",
    value: "#2563EB",
    recommendation: "Đảm bảo tương phản với nền trắng",
    status: "review"
  }
];

export const intranetNewsfeedPolicies: IntranetPolicyItem[] = [
  {
    id: "post-permission",
    label: "Quyền đăng bài",
    value: "Ban giám đốc, Internal Comms, HR",
    detail: "Nhân viên thường chỉ được đăng vào nhóm phòng ban.",
    status: "review"
  },
  {
    id: "post-approval",
    label: "Phê duyệt bài viết",
    value: "Bật kiểm duyệt",
    detail: "Bài đăng công khai cần Admin duyệt trước khi hiển thị.",
    status: "enabled"
  },
  {
    id: "interactions",
    label: "Tương tác",
    value: "Like, Comment, Chia sẻ",
    detail: "Cho phép tương tác nhưng tắt chia sẻ ra ngoài hệ thống.",
    status: "enabled"
  },
  {
    id: "pin-post",
    label: "Ghim bài viết",
    value: "Chỉ Admin",
    detail: "Thông báo chính sách mới được đẩy lên đầu bảng tin.",
    status: "enabled"
  }
];

export const intranetPrivacySettings: IntranetPolicyItem[] = [
  {
    id: "birthday-display",
    label: "Hiển thị sinh nhật",
    value: "Chỉ ngày/tháng",
    detail: "Không hiển thị năm sinh để bảo mật tuổi.",
    status: "enabled"
  },
  {
    id: "phone-visible",
    label: "Số điện thoại",
    value: "Ẩn với nhân viên thường",
    detail: "Quản lý và HR vẫn thấy thông tin liên hệ.",
    status: "review"
  },
  {
    id: "email-visible",
    label: "Email công việc",
    value: "Hiển thị nội bộ",
    detail: "Dùng cho cây thư mục nhân sự và tìm kiếm đồng nghiệp.",
    status: "enabled"
  },
  {
    id: "skype-visible",
    label: "Skype/Chat ID",
    value: "Theo phòng ban",
    detail: "Chỉ hiện khi nhân sự cùng đơn vị hoặc cùng dự án.",
    status: "enabled"
  }
];

export const intranetRecognitionTemplates: IntranetTemplateItem[] = [
  {
    id: "template-employee-award",
    name: "Nhân viên xuất sắc",
    target: "Bảng tin và widget vinh danh",
    status: "enabled"
  },
  {
    id: "template-birthday",
    name: "Chúc mừng sinh nhật",
    target: "Newsfeed tự động",
    status: "enabled"
  },
  {
    id: "template-newcomer",
    name: "Chào mừng nhân sự mới",
    target: "Bảng tin HR",
    status: "enabled"
  },
  {
    id: "event-calendar",
    name: "Lịch sự kiện công ty",
    target: "Widget bên phải màn hình",
    status: "review"
  }
];

export const intranetTags: IntranetTagItem[] = [
  { id: "tag-policy", label: "#chinhsach", usage: 18, status: "enabled" },
  { id: "tag-culture", label: "#vanhoa", usage: 32, status: "enabled" },
  { id: "tag-event", label: "#sukien", usage: 21, status: "enabled" },
  { id: "tag-urgent", label: "#khancap", usage: 5, status: "review" }
];

export const intranetReactions: IntranetPolicyItem[] = [
  {
    id: "reaction-like",
    label: "Like",
    value: "Bật",
    detail: "Cảm xúc mặc định cho bài viết.",
    status: "enabled"
  },
  {
    id: "reaction-love",
    label: "Love",
    value: "Bật",
    detail: "Dùng cho vinh danh, sinh nhật, chào mừng.",
    status: "enabled"
  },
  {
    id: "reaction-wow",
    label: "Wow",
    value: "Bật",
    detail: "Dùng cho cập nhật thành tích nổi bật.",
    status: "enabled"
  }
];

export const intranetCommunicationSettings: IntranetPolicyItem[] = [
  {
    id: "push-new-post",
    label: "Push bài đăng mới",
    value: "Chỉ bài ghim hoặc bài quan trọng",
    detail: "Giảm nhiễu thông báo trên điện thoại.",
    status: "enabled"
  },
  {
    id: "push-mention",
    label: "Nhắc tên",
    value: "Luôn gửi push",
    detail: "Thông báo khi nhân viên được @mention.",
    status: "enabled"
  },
  {
    id: "chat-group-public",
    label: "Tạo nhóm chat công khai",
    value: "Quản lý trở lên",
    detail: "Nhân viên thường chỉ tạo nhóm riêng tư.",
    status: "review"
  },
  {
    id: "chat-group-private",
    label: "Tạo nhóm chat riêng tư",
    value: "Tất cả nhân viên",
    detail: "Cho phép trao đổi nhóm nhỏ theo công việc.",
    status: "enabled"
  }
];

export const companyIdentityInfo: CompanyInfoItem[] = [
  {
    id: "company-name",
    label: "Tên doanh nghiệp",
    value: "Công ty Cổ phần Helios Office",
    detail: "Tên đầy đủ theo giấy phép kinh doanh, dùng trên hợp đồng và hóa đơn.",
    status: "complete"
  },
  {
    id: "company-short-name",
    label: "Tên viết tắt",
    value: "Helios Office",
    detail: "Tên ngắn dùng trong thông báo nội bộ và tiêu đề nhanh.",
    status: "complete"
  },
  {
    id: "tax-code",
    label: "Mã số thuế",
    value: "0109998887",
    detail: "Dùng cho hóa đơn, kế toán và tích hợp E-invoice.",
    status: "complete"
  },
  {
    id: "website",
    label: "Website",
    value: "https://helios.vn",
    detail: "Trang web chính thức hiển thị trên mẫu in và footer.",
    status: "complete"
  }
];

export const companyContactInfo: CompanyInfoItem[] = [
  {
    id: "hotline",
    label: "Hotline",
    value: "024 7300 6868",
    detail: "Số tổng đài chính thức trên chứng từ và footer.",
    status: "complete"
  },
  {
    id: "email",
    label: "Email liên hệ",
    value: "info@helios.vn",
    detail: "Email chung cho khách hàng và đối tác.",
    status: "complete"
  },
  {
    id: "head-office",
    label: "Địa chỉ trụ sở",
    value: "Tầng 8, tòa Helios, Hà Nội",
    detail: "Địa chỉ đăng ký kinh doanh chính thức.",
    status: "review"
  }
];

export const companyOffices: CompanyOffice[] = [
  {
    id: "office-hq",
    name: "Trụ sở Hà Nội",
    type: "headquarters",
    address: "Tầng 8, tòa Helios, Hà Nội",
    note: "Địa chỉ pháp lý và nhận thư chính thức."
  },
  {
    id: "office-hcm",
    name: "Văn phòng Hồ Chí Minh",
    type: "office",
    address: "Quận 1, TP.HCM",
    note: "Địa chỉ giao dịch và làm việc miền Nam."
  },
  {
    id: "office-warehouse",
    name: "Kho trung tâm",
    type: "office",
    address: "Khu công nghiệp Thăng Long, Hà Nội",
    note: "Dùng cho mẫu điều chuyển, kho vận và đơn nội bộ."
  }
];

export const companyLegalRepresentative: CompanyInfoItem[] = [
  {
    id: "representative-name",
    label: "Người đại diện",
    value: "Nguyễn Minh Hoàng",
    detail: "Tự động điền vào hợp đồng lao động và hợp đồng kinh tế.",
    status: "complete"
  },
  {
    id: "representative-title",
    label: "Chức vụ",
    value: "Tổng giám đốc",
    detail: "Chức danh pháp lý của người đại diện.",
    status: "complete"
  },
  {
    id: "representative-id",
    label: "CCCD/Hộ chiếu",
    value: "Đã lưu bảo mật",
    detail: "Chỉ dùng cho ký số hoặc thủ tục hành chính.",
    status: "review"
  }
];

export const companyBankAccounts: CompanyBankAccount[] = [
  {
    id: "bank-vcb",
    accountNumber: "1028886688",
    bankName: "Vietcombank",
    branch: "Sở giao dịch Hà Nội",
    owner: "Công ty Cổ phần Helios Office",
    isDefault: true
  },
  {
    id: "bank-tcb",
    accountNumber: "190388866666",
    bankName: "Techcombank",
    branch: "Chi nhánh Ba Đình",
    owner: "Công ty Cổ phần Helios Office",
    isDefault: false
  }
];

export const companyGeneralConfig: CompanyInfoItem[] = [
  {
    id: "fiscal-year",
    label: "Ngày bắt đầu tài khóa",
    value: "01/01",
    detail: "Tháng bắt đầu năm tài chính của doanh nghiệp.",
    status: "complete"
  },
  {
    id: "industry",
    label: "Lĩnh vực hoạt động",
    value: "Phần mềm quản trị doanh nghiệp",
    detail: "Dùng để tối ưu mẫu báo cáo và mẫu chứng từ.",
    status: "complete"
  },
  {
    id: "template-sync",
    label: "Đồng bộ mẫu in",
    value: "Tự động",
    detail: "Báo giá, hợp đồng và hóa đơn dùng biến dữ liệu mới nhất.",
    status: "complete"
  }
];

export const companyLegalAssets: CompanyLegalAsset[] = [
  {
    id: "company-seal",
    name: "Con dấu công ty",
    fileName: "helios-company-seal.png",
    usage: "Đóng dấu hợp đồng điện tử và văn bản phê duyệt.",
    status: "complete"
  },
  {
    id: "representative-signature",
    name: "Chữ ký người đại diện",
    fileName: "nguyen-minh-hoang-signature.png",
    usage: "Chèn vào hợp đồng, quyết định và mẫu duyệt tự động.",
    status: "review"
  }
];

export const smtpServerSettings: SmtpConfigItem[] = [
  {
    id: "smtp-provider",
    label: "Nhà cung cấp",
    value: "Microsoft Office 365",
    detail: "Tài khoản SMTP doanh nghiệp dùng cho thông báo hệ thống.",
    status: "active"
  },
  {
    id: "smtp-host",
    label: "SMTP Server",
    value: "smtp.office365.com",
    detail: "Host do nhà cung cấp email cấp.",
    status: "active"
  },
  {
    id: "smtp-port",
    label: "Cổng",
    value: "587",
    detail: "Dùng TLS. Với SSL thường là 465.",
    status: "active"
  },
  {
    id: "smtp-security",
    label: "Giao thức bảo mật",
    value: "TLS",
    detail: "Mã hóa kết nối khi hệ thống gửi thư.",
    status: "active"
  }
];

export const smtpAuthSettings: SmtpConfigItem[] = [
  {
    id: "smtp-login",
    label: "Email đăng nhập",
    value: "no-reply@helios.vn",
    detail: "Tài khoản được dùng để xác thực SMTP.",
    status: "active"
  },
  {
    id: "smtp-app-password",
    label: "Mật khẩu App",
    value: "•••• •••• •••• 6F2A",
    detail: "Không dùng mật khẩu đăng nhập thông thường.",
    status: "review"
  },
  {
    id: "smtp-auth-method",
    label: "Phương thức xác thực",
    value: "SMTP AUTH",
    detail: "Cần bật trong quản trị Microsoft 365/Gmail Workspace.",
    status: "active"
  }
];

export const smtpSenderIdentity: SmtpConfigItem[] = [
  {
    id: "sender-name",
    label: "Tên người gửi",
    value: "Helios Office",
    detail: "Tên hiển thị trong hộp thư người nhận.",
    status: "active"
  },
  {
    id: "reply-to",
    label: "Reply-to Email",
    value: "support@helios.vn",
    detail: "Email nhận phản hồi khi người dùng bấm Reply.",
    status: "active"
  },
  {
    id: "bounce-email",
    label: "Email nhận lỗi trả về",
    value: "mail-bounce@helios.vn",
    detail: "Theo dõi email bị trả lại hoặc bị từ chối.",
    status: "review"
  }
];

export const smtpDeliverySettings: SmtpConfigItem[] = [
  {
    id: "smtp-enabled",
    label: "Trạng thái SMTP",
    value: "Đang bật",
    detail: "Hệ thống dùng tài khoản này để gửi email tự động.",
    status: "active"
  },
  {
    id: "daily-limit",
    label: "Giới hạn gửi/ngày",
    value: "1.500 email",
    detail: "Phụ thuộc chính sách của nhà cung cấp email.",
    status: "review"
  },
  {
    id: "dns-spf",
    label: "SPF",
    value: "Đã cấu hình",
    detail: "Giúp email không bị đánh dấu giả mạo tên miền.",
    status: "active"
  },
  {
    id: "dns-dkim",
    label: "DKIM",
    value: "Cần kiểm tra",
    detail: "Nên bật ký DKIM để giảm nguy cơ vào spam.",
    status: "review"
  }
];

export const smtpEmailLogs: SmtpEmailLog[] = [
  {
    id: "smtp-log-001",
    time: "10:20 10/07/2026",
    recipient: "haianh@helios.vn",
    template: "Thông báo duyệt đơn nghỉ phép",
    status: "sent",
    detail: "Gửi thành công qua smtp.office365.com"
  },
  {
    id: "smtp-log-002",
    time: "09:55 10/07/2026",
    recipient: "duch@helios.vn",
    template: "Phiếu lương tháng 06/2026",
    status: "queued",
    detail: "Đang chờ hàng đợi gửi theo giới hạn tốc độ"
  },
  {
    id: "smtp-log-003",
    time: "18:12 09/07/2026",
    recipient: "customer@example.com",
    template: "Báo giá tự động",
    status: "failed",
    detail: "Mailbox unavailable hoặc bị chặn bởi máy chủ nhận"
  }
];

export const systemSettingItems: AdminSettingItem[] = [
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
    href: "/admin/settings/job-positions",
    controls: ["Vị trí", "Chức vụ", "Cấp bậc", "Hồ sơ"]
  },
  {
    id: "employee-directory",
    tier: "system",
    category: "Quản trị Tổ chức & Nhân sự",
    title: "Hồ sơ nhân sự",
    summary: "Quản lý hồ sơ nhân viên, phòng ban, quản lý trực tiếp và liên kết tài khoản đăng nhập.",
    owner: "HR Admin",
    status: "configured",
    href: "/admin/hr/employees",
    controls: ["Hồ sơ", "Phòng ban", "Quản lý", "Tài khoản"]
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

export const moduleSettingGroups: AdminModuleSettingGroup[] = [
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

export const operationSettingItems: AdminSettingItem[] = [
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

export const adminOperationEvents: AdminOperationEvent[] = [
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

export const organizationTree: OrgUnitNode = {
  id: "unit-company",
  name: "Helios Office",
  code: "HEL",
  type: "company",
  status: "active",
  head: "Đặng Đình Dũng",
  headTitle: "Web Lead",
  headcount: 200,
  tags: ["Công ty", "Head office"],
  location: "Hà Nội",
  gps: "21.0285, 105.8542",
  ipRange: "10.10.0.0/16",
  signatureProfile: "Con dấu công ty",
  children: [
    {
      id: "unit-hn",
      name: "Chi nhánh Hà Nội",
      code: "HN",
      type: "branch",
      status: "active",
      head: "Nguyễn Hải Anh",
      headTitle: "HR Executive",
      headcount: 92,
      tags: ["Chi nhánh", "Miền Bắc"],
      location: "Tầng 8, Hà Nội",
      gps: "21.0278, 105.8342",
      ipRange: "10.10.10.0/24",
      signatureProfile: "Mẫu ký số HN",
      children: [
        {
          id: "unit-sales-north",
          name: "Phòng Sales Miền Bắc",
          code: "SALE-N",
          type: "department",
          status: "active",
          head: "Hoàng Đức",
          headTitle: "Sales Manager",
          headcount: 42,
          tags: ["Kinh doanh", "Doanh thu"],
          location: "Tầng 8, Hà Nội",
          gps: "21.0278, 105.8342",
          ipRange: "10.10.12.0/24",
          signatureProfile: "Không áp dụng"
        },
        {
          id: "unit-marketing",
          name: "Phòng Marketing",
          code: "MKT",
          type: "department",
          status: "active",
          head: "Đặng Đình Dũng",
          headTitle: "Web Lead",
          headcount: 24,
          tags: ["Marketing", "Content"],
          location: "Tầng 7, Hà Nội",
          gps: "21.0278, 105.8342",
          ipRange: "10.10.14.0/24",
          signatureProfile: "Mẫu ký số MKT"
        }
      ]
    },
    {
      id: "unit-hcm",
      name: "Chi nhánh Hồ Chí Minh",
      code: "HCM",
      type: "branch",
      status: "active",
      head: "Lê Minh Khang",
      headTitle: "Sales Specialist",
      headcount: 76,
      tags: ["Chi nhánh", "Miền Nam"],
      location: "Quận 1, TP.HCM",
      gps: "10.7769, 106.7009",
      ipRange: "10.20.0.0/16",
      signatureProfile: "Mẫu ký số HCM",
      children: [
        {
          id: "unit-sales-south",
          name: "Phòng Sales Miền Nam",
          code: "SALE-S",
          type: "department",
          status: "active",
          head: "Lê Minh Khang",
          headTitle: "Sales Specialist",
          headcount: 58,
          tags: ["Kinh doanh", "Doanh thu"],
          location: "Quận 1, TP.HCM",
          gps: "10.7769, 106.7009",
          ipRange: "10.20.12.0/24",
          signatureProfile: "Không áp dụng"
        }
      ]
    },
    {
      id: "unit-ops",
      name: "Khối Vận hành",
      code: "OPS",
      type: "department",
      status: "paused",
      head: "Mai Linh",
      headTitle: "Operations Coordinator",
      headcount: 32,
      tags: ["Vận hành", "Tạm rà soát"],
      location: "Kho trung tâm",
      gps: "21.0132, 105.5251",
      ipRange: "10.30.0.0/16",
      signatureProfile: "Mẫu ký số OPS"
    }
  ]
};

export const organizationCatalog: OrganizationCatalogItem[] = [
  {
    id: "pos-dev",
    code: "POS-DEV",
    name: "Lập trình viên",
    type: "position",
    group: "Technology",
    summary: "Phát triển, bảo trì và tối ưu sản phẩm phần mềm nội bộ.",
    jobDescription: "Xây dựng tính năng, review code, phối hợp QA và vận hành triển khai.",
    competencies: ["React/NestJS", "Thiết kế API", "Code review"],
    workdays: 22,
    salaryGrade: "TECH-03",
    approvalWeight: 20,
    allowance: "Không áp dụng",
    payrollCode: "DEV",
    permissionCode: "tech.employee",
    tags: ["Khối văn phòng", "Công nghệ"],
    status: "active"
  },
  {
    id: "pos-accountant",
    code: "POS-ACC",
    name: "Kế toán",
    type: "position",
    group: "Finance",
    summary: "Theo dõi chứng từ, hạch toán và đối soát dữ liệu tài chính.",
    jobDescription: "Kiểm tra chứng từ, lập báo cáo định kỳ và phối hợp thanh toán nội bộ.",
    competencies: ["Kế toán tổng hợp", "Excel", "Tuân thủ chứng từ"],
    workdays: 22,
    salaryGrade: "FIN-02",
    approvalWeight: 25,
    allowance: "Không áp dụng",
    payrollCode: "ACC",
    permissionCode: "finance.employee",
    tags: ["Khối văn phòng", "Tài chính"],
    status: "active"
  },
  {
    id: "pos-content",
    code: "POS-CONT",
    name: "Chuyên viên Content",
    type: "position",
    group: "Marketing",
    summary: "Sản xuất nội dung truyền thông, chiến dịch và tài liệu bán hàng.",
    jobDescription: "Lên ý tưởng, viết nội dung, phối hợp thiết kế và đo lường hiệu quả chiến dịch.",
    competencies: ["Content planning", "SEO", "Brand voice"],
    workdays: 22,
    salaryGrade: "MKT-02",
    approvalWeight: 18,
    allowance: "Không áp dụng",
    payrollCode: "MKT-CONT",
    permissionCode: "marketing.employee",
    tags: ["Khối văn phòng", "Marketing"],
    status: "active"
  },
  {
    id: "pos-sales",
    code: "NV_SALES",
    name: "Nhân viên Sales",
    type: "position",
    group: "Sales",
    summary: "Tìm kiếm, chăm sóc khách hàng và chuyển đổi cơ hội bán hàng.",
    jobDescription: "Quản lý pipeline, cập nhật CRM, báo giá và phối hợp xử lý hợp đồng.",
    competencies: ["Tư vấn bán hàng", "CRM", "Đàm phán"],
    workdays: 22,
    salaryGrade: "SAL-02",
    approvalWeight: 18,
    allowance: "Theo doanh số",
    payrollCode: "SALE",
    permissionCode: "sales.employee",
    tags: ["Khối kinh doanh", "Doanh thu"],
    status: "active"
  },
  {
    id: "title-director",
    code: "TTL-DIR",
    name: "Giám đốc",
    type: "title",
    group: "Management",
    summary: "Cấp quản trị cao nhất trong luồng phê duyệt nghiệp vụ.",
    jobDescription: "Phê duyệt chính sách, ngân sách, nhân sự cấp quản lý và các giao dịch trọng yếu.",
    competencies: ["Chiến lược", "Quản trị rủi ro", "Ra quyết định"],
    workdays: 22,
    salaryGrade: "MGT-05",
    approvalWeight: 100,
    allowance: "5.000.000 đ/tháng",
    payrollCode: "MGT-DIR",
    permissionCode: "company.director",
    tags: ["Cấp quản lý", "Duyệt cuối"],
    status: "active"
  },
  {
    id: "title-manager",
    code: "TTL-MGR",
    name: "Trưởng phòng",
    type: "title",
    group: "Management",
    summary: "Quản lý phòng ban và là cấp duyệt trực tiếp cho nhân sự thuộc bộ phận.",
    jobDescription: "Phân công công việc, duyệt đơn từ, đánh giá hiệu suất và kiểm soát ngân sách phòng ban.",
    competencies: ["Quản lý đội nhóm", "Phê duyệt", "KPI/OKR"],
    workdays: 22,
    salaryGrade: "MGT-03",
    approvalWeight: 70,
    allowance: "2.000.000 đ/tháng",
    payrollCode: "MGT-MGR",
    permissionCode: "department.manager",
    tags: ["Cấp quản lý", "Duyệt phòng ban"],
    status: "active"
  },
  {
    id: "title-staff",
    code: "TTL-STF",
    name: "Nhân viên",
    type: "title",
    group: "General",
    summary: "Cấp bậc nhân sự thông thường, tạo đơn và cập nhật dữ liệu cá nhân.",
    jobDescription: "Thực hiện công việc chuyên môn, tạo đơn từ và cập nhật báo cáo theo phân công.",
    competencies: ["Chuyên môn vị trí", "Tuân thủ quy trình", "Báo cáo"],
    workdays: 22,
    salaryGrade: "GEN-01",
    approvalWeight: 10,
    allowance: "Không áp dụng",
    payrollCode: "STAFF",
    permissionCode: "employee.basic",
    tags: ["Nhân sự phổ thông", "Tự phục vụ"],
    status: "active"
  },
  {
    id: "title-team-lead",
    code: "TTL-LEAD",
    name: "Trưởng nhóm",
    type: "title",
    group: "Management",
    summary: "Cấp điều phối nhóm nhỏ, có thể là bước duyệt trung gian.",
    jobDescription: "Điều phối công việc nhóm, kiểm tra tiến độ và đề xuất phê duyệt lên trưởng phòng.",
    competencies: ["Điều phối", "Mentoring", "Báo cáo tiến độ"],
    workdays: 22,
    salaryGrade: "MGT-02",
    approvalWeight: 45,
    allowance: "1.000.000 đ/tháng",
    payrollCode: "MGT-LEAD",
    permissionCode: "team.lead",
    tags: ["Cấp quản lý", "Duyệt trung gian"],
    status: "paused"
  }
];

export const organizationChangeLogs: OrganizationChangeLog[] = [
  {
    id: "org-log-001",
    time: "10:30 10/07/2026",
    actor: "Đặng Đình Dũng",
    action: "Cập nhật GPS chấm công",
    target: "Phòng Marketing"
  },
  {
    id: "org-log-002",
    time: "16:45 09/07/2026",
    actor: "Nguyễn Hải Anh",
    action: "Thêm phòng ban con",
    target: "Phòng Sales Miền Bắc"
  },
  {
    id: "org-log-003",
    time: "09:10 08/07/2026",
    actor: "System Admin",
    action: "Tạm ngưng hoạt động",
    target: "Khối Vận hành"
  }
];
