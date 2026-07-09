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
