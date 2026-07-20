import {
  ArrowSquareOut,
  BookOpenText,
  Briefcase,
  CalendarBlank,
  CaretDown,
  Certificate,
  Check,
  Clock,
  Columns,
  CurrencyDollar,
  EnvelopeSimple,
  FileText,
  FunnelSimple,
  GenderMale,
  Heart,
  HouseLine,
  ImageBroken,
  Medal,
  Money,
  Package,
  PencilSimple,
  Phone,
  SlidersHorizontal,
  Star,
  ThumbsDown,
  UploadSimple,
  UserCircle,
  UserStatus,
  Wallet
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import type { ReactNode } from "react";
import { CollapseButton } from "@/components/user/collapse-button";
import { Badge } from "@/components/ui/badge";
import type { EmployeeDirectoryRecord } from "@/lib/employee-directory-api";

type ProfileInfoRow = {
  label: string;
  value: string;
  icon: Icon;
  variant?: "phone";
};

type ChecklistItem = {
  label: string;
};

function ProfileStatusBadge({ children }: { children: ReactNode }) {
  return (
    <Badge className="profile-status-pill" tone="success">
      {children}
    </Badge>
  );
}

type AwarenessRow = {
  label: string;
  total: string;
  average: string;
};

type FinanceRow = {
  label: string;
  value?: string;
  icon: Icon;
  tone: "success" | "purple" | "info" | "danger";
};

type DisciplineItem = {
  title: string;
  meta: string;
  note?: string;
  status: "approved" | "warning";
};

export type ProfileTabKey = "overview" | "resume" | "work" | "benefit" | "allowance" | "furlough";

type ProfileTabItem = {
  key: ProfileTabKey | "compensatory";
  label: string;
};

const profileTabs: ProfileTabItem[] = [
  { key: "overview", label: "Thông tin chung" },
  { key: "resume", label: "Sơ yếu lý lịch" },
  { key: "work", label: "Công việc & Hợp đồng" },
  { key: "benefit", label: "Bảo hiểm & Phúc lợi" },
  { key: "allowance", label: "Lương & Phụ cấp" },
  { key: "furlough", label: "Thông tin phép" },
  { key: "compensatory", label: "Thông tin nghỉ bù" }
];

const profileRows: ProfileInfoRow[] = [
  { label: "Email", value: "Dungmaster7@gmail.com", icon: EnvelopeSimple },
  { label: "Điện thoại", value: "0904521145", icon: Phone, variant: "phone" },
  { label: "Ngày sinh", value: "10/10/1998", icon: Clock },
  { label: "Nguyên quán", value: "--", icon: HouseLine },
  { label: "Giới tính", value: "Nam", icon: GenderMale },
  { label: "Hôn nhân", value: "Độc thân", icon: Star },
  { label: "Tài khoản HOffice", value: "dungdd", icon: UserCircle }
];

function profileValue(employee: EmployeeDirectoryRecord | undefined, key: string) {
  const value = employee?.profileData?.[key];
  return typeof value === "string" && value.trim() ? value : "--";
}

function formatProfileDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN").format(date);
}

const genderLabels: Record<string, string> = { female: "Nữ", male: "Nam", other: "Khác" };
const maritalLabels: Record<string, string> = { single: "Độc thân", married: "Đã kết hôn" };

function profileStatusLabel(status?: EmployeeDirectoryRecord["status"]) {
  if (status === "resigned") {
    return "Nghỉ việc";
  }

  if (status === "offboarding") {
    return "Đang offboarding";
  }

  if (status === "onboarding") {
    return "Đang onboarding";
  }

  return "Đang làm việc";
}

function employeeProfileRows(employee?: EmployeeDirectoryRecord): ProfileInfoRow[] {
  if (!employee) {
    return profileRows;
  }

  const accountName = employee.accountDisplayName ?? employee.accountEmail?.split("@")[0] ?? "--";

  return [
    { label: "Email", value: profileValue(employee, "email") !== "--" ? profileValue(employee, "email") : employee.accountEmail ?? "--", icon: EnvelopeSimple },
    { label: "Điện thoại", value: profileValue(employee, "phone"), icon: Phone, variant: "phone" },
    { label: "Ngày sinh", value: formatProfileDate(profileValue(employee, "birthDate") === "--" ? null : profileValue(employee, "birthDate")), icon: Clock },
    { label: "Nguyên quán", value: profileValue(employee, "hometown"), icon: HouseLine },
    { label: "Giới tính", value: genderLabels[profileValue(employee, "gender")] ?? profileValue(employee, "gender"), icon: GenderMale },
    { label: "Hôn nhân", value: maritalLabels[profileValue(employee, "maritalStatus")] ?? profileValue(employee, "maritalStatus"), icon: Star },
    { label: "Tài khoản HOffice", value: accountName, icon: UserCircle }
  ];
}

function profileTabHref(tabKey: ProfileTabItem["key"], employee?: EmployeeDirectoryRecord) {
  if (tabKey === "compensatory") {
    return undefined;
  }

  const params = new URLSearchParams();

  if (employee) {
    params.set("customMenu", "employee-profile");
    params.set("employeeId", employee.id);
  } else {
    params.set("customMenu", "user-board-profile");
  }

  if (tabKey !== "overview") {
    params.set("tab", tabKey);
  }

  return `/user?${params.toString()}`;
}

const checklistItems: ChecklistItem[] = [
  { label: "Ảnh cá nhân" },
  { label: "Bản sao giấy khai sinh" },
  { label: "Bản sao sổ hộ khẩu" },
  { label: "Bằng cấp, trình độ chuyên môn" },
  { label: "Bảo hiểm xã hội" },
  { label: "Cam kết chính thức" },
  { label: "Cam kết làm việc" },
  { label: "Cam kết tài sản" },
  { label: "Cam kết thử việc" },
  { label: "CMT/Căn cước/HC" },
  { label: "Cơ cấu lương" },
  { label: "Đánh giá thử việc" },
  { label: "Hợp đồng lao động" },
  { label: "Information security agreement" },
  { label: "Quyết định bổ nhiệm" },
  { label: "Quyết định chấm dứt HĐLĐ" },
  { label: "Sơ yếu lý lịch" },
  { label: "Tạo tài khoản email" },
  { label: "Thư mời làm việc" }
];

const awarenessRows: AwarenessRow[] = [
  { label: "Ngày công", total: "676.01 công", average: "21.8" },
  { label: "Đi muộn", total: "128 lần", average: "4.1" },
  { label: "Về sớm", total: "3 lần", average: "0.1" },
  { label: "Xin nghỉ", total: "56 lần", average: "1.8" },
  { label: "Tăng ca", total: "6 giờ", average: "0.2" }
];

const financeRows: FinanceRow[] = [
  { label: "Số lương / ngày", value: "358,238 đ", icon: CurrencyDollar, tone: "success" },
  { label: "Số lương / tháng", value: "10,747,140 đ", icon: Wallet, tone: "purple" },
  { label: "Tổng doanh số", value: "0 đ", icon: Money, tone: "info" },
  { label: "Doanh số / lương (ROI)", icon: Clock, tone: "danger" }
];

const disciplineItems: DisciplineItem[] = [
  {
    title: "Quyết định điều chỉnh lương",
    meta: "Quyết định: 01/04/2024",
    status: "approved"
  },
  { title: "HĐQT phạt", meta: "Ngày tạo: 22/11/2024", status: "warning" },
  { title: "HĐQT phạt", meta: "Ngày tạo: 04/03/2025", status: "warning" },
  { title: "HĐQT phạt", meta: "Ngày tạo: 10/04/2025", status: "warning" },
  {
    title: "Mắc lỗi nghiêm trọng trong công việc",
    meta: "Ngày tạo: 06/11/2025",
    status: "warning"
  },
  {
    title: "Mắc lỗi nghiêm trọng trong công việc",
    meta: "Ngày tạo: 31/12/2025",
    note: "Ghi chú: sửa sai gio hàng Global",
    status: "warning"
  },
  { title: "Không đeo thẻ/đeo sai cách", meta: "Ngày tạo: 13/04/2026", status: "warning" }
];

const healthRows = [
  { label: "Huyết áp", value: "--", unit: "mmHg" },
  { label: "Nhịp tim", value: "--", unit: "Nhịp/phút" },
  { label: "Nhóm máu", value: "--", unit: "--" },
  { label: "Chiều cao", value: "--", unit: "cm" },
  { label: "Cân nặng", value: "--", unit: "kg" }
];

const resumeInfoFields = [
  { label: "Dân tộc", value: "Kinh" },
  { label: "Tôn giáo", value: "Không" },
  { label: "Nơi sinh", value: "--" },
  { label: "Nguyên quán", value: "--" },
  { label: "Chỗ ở hiện nay", value: "Thôn 4, Quảng Nhân, Quảng Xương, Thanh Hóa" },
  { label: "Thường trú", value: "Quảng Xương, Thanh Hóa" },
  { label: "Quốc tịch", value: "Việt Nam" },
  { label: "Mã số thuế cá nhân", value: "--" },
  { label: "Loại lao động", value: "--" },
  { label: "Ngân hàng", value: "DANG DINH DUNG, 19031961799019" },
  { label: "Vùng áp dụng lương tối thiểu", value: "--" },
  { label: "Trình độ phổ thông", value: "--" },
  { label: "Số năm kinh nghiệm trước đây", value: "--" },
  { label: "Số năm kinh nghiệm hiện tại", value: "3.3" },
  { label: "Chuyên ngành", value: "--" },
  { label: "Trình độ học vấn cao nhất", value: "--" },
  { label: "Tình trạng hôn nhân", value: "Độc thân" },
  { label: "Nghĩa vụ quân sự", value: "Không phải đi" },
  { label: "Ghi chú", value: "--" }
];

const identityFields = [
  { label: "Số CMT/CC/CCCD", value: "038098015468" },
  { label: "Ngày cấp, nơi cấp CMT/CC/CCCD", value: "12/08/2021" },
  { label: "Số hộ chiếu", value: "--" },
  { label: "Loại hộ chiếu", value: "--" },
  { label: "Ngày cấp, nơi cấp hộ chiếu", value: "--" },
  { label: "Ngày hết hạn", value: "--" }
];

const bankRows = [
  {
    accountNumber: "19031961799019",
    accountName: "DANG DINH DUNG",
    bankName: "--",
    branch: "--"
  }
];

const documentSections = [
  { id: "front", label: "Ảnh CC/CCCD/CMND mặt trước" },
  { id: "back", label: "Ảnh CC/CCCD/CMND mặt sau" },
  { id: "passport", label: "Ảnh hộ chiếu" }
];

const workInfoFields: Array<{ label: string; value: string; variant?: "status" }> = [
  { label: "Trạng thái", value: "Đang làm việc", variant: "status" },
  { label: "Tình trạng hồ sơ", value: "--" },
  { label: "Phòng ban", value: "Helios › Phòng MKT" },
  { label: "Vị trí", value: "Web" },
  { label: "Chức vụ", value: "Nhân viên Fulltime" },
  { label: "Ngày vào", value: "13/02/2023" },
  { label: "Ngày ký HĐLĐ chính thức", value: "01/01/2024" },
  { label: "Loại lao động", value: "--" },
  { label: "Tên hợp đồng", value: "Hợp đồng chính thức" },
  { label: "Nơi làm việc", value: "--" },
  { label: "Cấp bậc", value: "--" },
  { label: "Mã đồng bộ", value: "--" },
  { label: "Tài khoản HOffice", value: "dungdd (26/02/2024)" },
  { label: "Nhóm người dùng", value: "Nhóm Nhân viên Basic" }
];

const contractRows = [
  {
    id: "SRG-035-01",
    creator: "DD",
    name: "Hợp đồng chính thức",
    department: "Phòng MKT",
    status: "Đang hiệu lực",
    signedAt: "01/01/2024",
    effectiveFrom: "01/01/2024",
    effectiveTo: "--",
    createdAt: "05/03/2024"
  }
];

const insuranceSections: Array<{
  title: string;
  fields: Array<{
    label: string;
    value: string;
    help?: boolean;
  }>;
}> = [
  {
    title: "Thông tin bảo hiểm",
    fields: [
      { label: "Số sổ BHXH", value: "--" },
      { label: "Số thẻ BHYT", value: "--" },
      { label: "Mã tỉnh cấp", value: "--" },
      { label: "Đăng ký khám chữa bệnh", value: "--" },
      { label: "Trạng thái sổ", value: "--" },
      { label: "Pháp nhân", value: "--" }
    ]
  },
  {
    title: "Nghiệp vụ báo tăng",
    fields: [
      { label: "NV hoàn thiện HS", value: "--", help: true },
      { label: "NV hoàn thiện HS", value: "--", help: true },
      { label: "Ngày nhận thẻ BHYT", value: "--", help: true },
      { label: "Ngày trả thẻ BHYT", value: "--", help: true }
    ]
  },
  {
    title: "Nghiệp vụ báo giảm",
    fields: [
      { label: "Ngày nhận sổ BH từ NLĐ", value: "--", help: true },
      { label: "NS hoàn thiện HS", value: "--", help: true },
      { label: "Ngày nhận sổ BH đã chốt", value: "--", help: true },
      { label: "Ngày trả sổ cho NLĐ", value: "--", help: true }
    ]
  }
];

const insuranceContributionRows = [
  { label: "Công ty đóng", bhxh: "18%", accident: "--", bhyt: "3%", unemployment: "1%", total: "22%" },
  { label: "Người LĐ đóng", bhxh: "8%", accident: "--", bhyt: "1.5%", unemployment: "1%", total: "10.5%" },
  { label: "Tổng cộng", bhxh: "26%", accident: "--", bhyt: "4.5%", unemployment: "2%", total: "32.5%" }
];

const insuranceDeclarations = [
  {
    title: "DC1 - Điều chỉnh tăng lương",
    period: "01/2026",
    unit: "Đơn vị: SRG"
  },
  {
    title: "TC - Tăng do chuyển tỉnh",
    period: "07/2024",
    unit: "Đơn vị: SRG"
  },
  {
    title: "TM - Tăng mới",
    period: "03/2024",
    unit: "Đơn vị: SRG"
  }
];

const allowanceMonths = [
  { month: "Tháng 1", short: "Th.1", value: "11,737,500", trend: "up" },
  { month: "Tháng 2", short: "Th.2", value: "11,607,326.09", trend: "down" },
  { month: "Tháng 3", short: "Th.3", value: "11,003,423.08", trend: "down" },
  { month: "Tháng 4", short: "Th.4", value: "11,424,500", trend: "up" },
  { month: "Tháng 5", short: "Th.5", value: "10,818,500", trend: "down" },
  { month: "Tháng 6", short: "Th.6", value: "11,576,500", trend: "up" },
  { month: "Tháng 7", short: "Th.7" },
  { month: "Tháng 8", short: "Th.8" },
  { month: "Tháng 9", short: "Th.9" },
  { month: "Tháng 10", short: "Th.10" },
  { month: "Tháng 11", short: "Th.11" },
  { month: "Tháng 12", short: "Th.12" }
];

const allowanceHistory = [
  { month: "Tháng 6", value: "11,576,500", trend: "up" },
  { month: "Tháng 5", value: "10,818,500", trend: "down" },
  { month: "Tháng 4", value: "11,424,500", trend: "up" },
  { month: "Tháng 3", value: "11,003,423", trend: "down" },
  { month: "Tháng 2", value: "11,607,326", trend: "down" },
  { month: "Tháng 1", value: "11,737,500", trend: "up" }
];

const annualLeaveRows = [
  {
    year: "2026",
    period: "01/01 - 31/12",
    totalBalance: "7",
    general: ["8", "6", "0", "2"],
    advance: "5",
    accrued: ["0", "0", "0", "0"],
    seniority: ["1", "1", "0", "0"],
    annual: ["7", "5", "0", "2"]
  },
  {
    year: "2025",
    period: "01/01 - 31/12",
    totalBalance: "0",
    general: ["12", "12", "0", "0"],
    advance: "0",
    accrued: ["0", "0", "0", "0"],
    seniority: ["0", "0", "0", "0"],
    annual: ["12", "12", "0", "0"]
  },
  {
    year: "2024",
    period: "01/01 - 31/12",
    totalBalance: "0",
    general: ["18", "12", "6", "0"],
    advance: "0",
    accrued: ["0", "0", "0", "0"],
    seniority: ["0", "0", "0", "0"],
    annual: ["18", "12", "6", "0"]
  }
];

const monthlyLeaveRows = [
  {
    month: "7/2026",
    period: "01/07 - 31/07",
    totalBalance: "7",
    general: ["2", "0", "0", "2"],
    advance: "5",
    accrued: ["0", "0", "0", "0"],
    seniority: ["0", "0", "0", "0", "0"],
    annual: ["0", "0", "0", "0"]
  },
  {
    month: "6/2026",
    period: "01/06 - 30/06",
    totalBalance: "7",
    general: ["1", "0", "0", "1"],
    advance: "6",
    accrued: ["0", "0", "0", "0"],
    seniority: ["0", "0", "0", "0", "0"],
    annual: ["1", "1", "0", "0"]
  },
  {
    month: "5/2026",
    period: "01/05 - 31/05",
    totalBalance: "1",
    general: ["1", "1", "0", "0"],
    advance: "1",
    accrued: ["0", "0", "0", "0"],
    seniority: ["0", "0", "0", "0", "0"],
    annual: ["1", "1", "0", "0"]
  },
  {
    month: "4/2026",
    period: "01/04 - 30/04",
    totalBalance: "2",
    general: ["1", "1", "0", "0"],
    advance: "2",
    accrued: ["0", "0", "0", "0"],
    seniority: ["0", "0", "0", "0", "0"],
    annual: ["1", "1", "0", "0"]
  },
  {
    month: "3/2026",
    period: "01/03 - 31/03",
    totalBalance: "2",
    general: ["1", "2", "0", "-1"],
    advance: "3",
    accrued: ["0", "0", "0", "0"],
    seniority: ["0", "0", "0", "0", "0"],
    annual: ["1", "1", "0", "0"]
  },
  {
    month: "2/2026",
    period: "01/02 - 28/02",
    totalBalance: "3",
    general: ["2", "3", "0", "-1"],
    advance: "4",
    accrued: ["0", "0", "0", "0"],
    seniority: ["1", "0", "1", "0", "0"],
    annual: ["1", "1", "0", "0"]
  }
];

const leaveHistory = [
  { date: "01/07/2026", title: "Cộng phép năm", meta: "Hạn: 31/12/2026", value: "+1 Ngày", tone: "success" },
  { date: "01/06/2026", title: "Cộng phép năm", meta: "Hạn: 31/12/2026", value: "+1 Ngày", tone: "success" },
  { date: "02/05/2026", title: "Đơn xin nghỉ", meta: "Lý do: Nghỉ phép năm", value: "-1 Ngày", tone: "danger" },
  { date: "01/05/2026", title: "Cộng phép năm", meta: "Hạn: 31/12/2026", value: "+1 Ngày", tone: "success" },
  { date: "01/04/2026", title: "Cộng phép năm", meta: "Hạn: 31/12/2026", value: "+1 Ngày", tone: "success" },
  { date: "30/03/2026", title: "Đơn xin nghỉ", meta: "Lý do: Nghỉ phép năm", value: "-1 Ngày", tone: "danger" }
];

function ProfilePanel({
  children,
  title,
  action,
  id
}: {
  children: ReactNode;
  title: string;
  action?: ReactNode;
  id: string;
}) {
  return (
    <section className="employee-profile-panel" aria-labelledby={id}>
      <header className="employee-profile-panel-header">
        <h2 id={id}>{title}</h2>
        {action ?? (
          <CollapseButton label={title} />
        )}
      </header>
      {children}
    </section>
  );
}

function InfoCard({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const rows = employeeProfileRows(employee);
  const fullName = employee?.fullName ?? "Đặng Đình Dũng";
  const title = employee?.jobTitleName ?? employee?.title ?? "Nhân viên Fulltime";
  const position = employee?.positionName ?? employee?.title ?? "Web";
  const department = employee?.department ?? "Phòng MKT";
  const employeeCode = employee?.code ?? "SRG-035/VP.23";
  const status = profileStatusLabel(employee?.status);

  return (
    <section className="employee-profile-panel employee-profile-info-panel" aria-labelledby="employee-profile-info">
      <h2 className="sr-only" id="employee-profile-info">
        Thông tin nhân sự
      </h2>
      <div className="employee-profile-info">
        <div className="employee-profile-person">
          <div className="employee-profile-avatar" aria-hidden="true">
            <UserCircle size={78} weight="duotone" />
          </div>
          <div>
            <h2>{fullName}</h2>
            <p>{title}</p>
            <p>{position} • {department}</p>
          </div>
        </div>

        <div className="employee-profile-meta">
          <span>{employeeCode}</span>
          <ProfileStatusBadge>{status}</ProfileStatusBadge>
        </div>

        <dl className="employee-profile-detail-list">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>
                <row.icon size={17} weight="duotone" aria-hidden="true" />
                {row.label}
              </dt>
              <dd>
                <span className={row.variant === "phone" ? "profile-phone-pill" : undefined}>{row.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function WorkHistoryPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const contract = employee?.contracts?.[0];
  return (
    <ProfilePanel
      title="Quá trình làm việc"
      id="employee-work-history"
      action={
        <div className="employee-profile-panel-actions">
          <button className="icon-button" type="button" aria-label="Lọc quá trình làm việc">
            <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
          </button>
          <CollapseButton label="quá trình làm việc" />
        </div>
      }
    >
      <div className="profile-work-timeline">
        <div className="profile-work-node">
          <span className="profile-work-dot">
            <Clock size={15} weight="duotone" aria-hidden="true" />
          </span>
          <div className="profile-work-content">
            <header>
              <h3>{employee?.positionName ?? employee?.title ?? "--"}</h3>
              <ProfileStatusBadge>{profileStatusLabel(employee?.status)}</ProfileStatusBadge>
            </header>

            <article className="profile-work-card">
              <div>
                <h4>
                  {contract?.type ?? "Chưa có hợp đồng"}
                  <ArrowSquareOut size={15} weight="duotone" aria-hidden="true" />
                </h4>
                <time dateTime={contract?.startDate}>{formatProfileDate(contract?.startDate)}</time>
              </div>
              <p>{profileValue(employee, "contractCode")} • {contract?.type ?? "--"} • {employee?.jobTitleName ?? "--"}</p>
              <p className="profile-breadcrumb">Helios › {employee?.department ?? "--"}</p>
            </article>

            <article className="profile-work-card">
              <div>
                <h4>Ngày bắt đầu làm việc</h4>
                <time dateTime={employee?.startDate}>{formatProfileDate(employee?.startDate)}</time>
              </div>
              <p>{employee?.employeeType ?? "--"}</p>
              <p className="profile-breadcrumb">Helios › {employee?.department ?? "--"}</p>
            </article>
          </div>
        </div>
      </div>
    </ProfilePanel>
  );
}

function OnboardingPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  return (
    <ProfilePanel title="Tiến trình tiếp nhận hồ sơ" id="profile-onboarding">
      <div className="profile-checklist" role="list" aria-label="Hồ sơ đã tiếp nhận">
        {checklistItems.map((item, index) => {
          const completed = employee?.profileData?.[`onboardingItem${index + 1}`] === true;
          return (
          <div className="profile-check-row" role="listitem" key={item.label}>
            {completed ? <Check size={17} weight="regular" aria-hidden="true" /> : <span aria-hidden="true">—</span>}
            <span>{item.label}</span>
          </div>
          );
        })}
      </div>
    </ProfilePanel>
  );
}

function AwarenessPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const rows = employee ? awarenessRows.map((row) => ({ ...row, total: "--", average: "--" })) : awarenessRows;
  return (
    <ProfilePanel title="Ý thức làm việc" id="profile-awareness">
      <div className="profile-awareness-table" role="table" aria-label="Chỉ số ý thức làm việc">
        <div role="row" className="profile-awareness-head">
          <span role="columnheader">Chỉ số</span>
          <span role="columnheader">Tổng số</span>
          <span role="columnheader">TB Cá nhân / tháng</span>
        </div>
        {rows.map((row) => (
          <div role="row" className="profile-awareness-row" key={row.label}>
            <span role="cell">{row.label}</span>
            <span role="cell" className="profile-metric-pill">
              {row.total}
            </span>
            <span role="cell" className="profile-metric-pill">
              {row.average}
            </span>
          </div>
        ))}
      </div>
    </ProfilePanel>
  );
}

function WorkEffectPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  return (
    <ProfilePanel title="Hiệu quả công việc" id="profile-work-effect">
      <div className="profile-effect-body">
        <div className="profile-effect-banner">
          <div>
            <span>Tổng số công việc của bạn</span>
            <strong>VIỆC</strong>
          </div>
          <FileText size={56} weight="duotone" aria-hidden="true" />
        </div>

        <div className="profile-progress-list">
          {[
            { label: "Hoàn thành trước hạn", icon: Heart },
            { label: "Hoàn thành đúng hạn", icon: Check }
          ].map((item) => (
            <div className="profile-progress-row" key={item.label}>
              <span className="profile-progress-icon">
                <item.icon size={20} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <span>{item.label}</span>
                <div className="profile-progress-track" aria-hidden="true">
                  <span />
                </div>
              </div>
              <strong>{employee ? "--" : "0"}</strong>
            </div>
          ))}
        </div>
      </div>
    </ProfilePanel>
  );
}

function FinancePanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const compensation = profileValue(employee, "compensationAmount");
  return (
    <ProfilePanel title="Tài chính" id="profile-finance">
      <div className="profile-finance-body">
        <div className="profile-money-banner">
          <div>
            <span>Tổng lương đã nhận của bạn</span>
            <strong>{employee ? compensation : "300,919,924 đ"}</strong>
          </div>
          <Money size={58} weight="duotone" aria-hidden="true" />
        </div>

        <dl className="profile-finance-list">
          {(employee ? financeRows.map((row) => ({ ...row, value: "--" })) : financeRows).map((row) => (
            <div key={row.label}>
              <dt>
                <span className={`profile-finance-icon profile-finance-icon--${row.tone}`}>
                  <row.icon size={22} weight="duotone" aria-hidden="true" />
                </span>
                {row.label}
              </dt>
              <dd>{row.value ?? ""}</dd>
            </div>
          ))}
        </dl>
      </div>
    </ProfilePanel>
  );
}

function DebtPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  return (
    <ProfilePanel title="Công nợ" id="profile-debt">
      <div className="profile-debt-body">
        <div className="profile-debt-banner">
          <div>
            <span>Tổng công nợ</span>
            <strong>{employee ? "--" : "0 đ"}</strong>
          </div>
          <Wallet size={54} weight="duotone" aria-hidden="true" />
        </div>
        <dl className="profile-simple-list">
          <div>
            <dt>
              <span className="profile-finance-icon profile-finance-icon--danger">
                <CurrencyDollar size={22} weight="duotone" aria-hidden="true" />
              </span>
              Công ty nợ
            </dt>
            <dd>{employee ? "--" : "0 đ"}</dd>
          </div>
          <div>
            <dt>
              <span className="profile-finance-icon profile-finance-icon--info">
                <CurrencyDollar size={22} weight="duotone" aria-hidden="true" />
              </span>
              Bạn nợ
            </dt>
            <dd>{employee ? "--" : "0 đ"}</dd>
          </div>
        </dl>
      </div>
    </ProfilePanel>
  );
}

function DisciplinePanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const items = employee ? [] : disciplineItems;
  return (
    <ProfilePanel
      title="Khen thưởng, kỷ luật"
      id="profile-discipline"
      action={
        <div className="employee-profile-panel-actions">
          <button className="icon-button" type="button" aria-label="Mở chi tiết khen thưởng, kỷ luật">
            <ArrowSquareOut size={16} weight="duotone" aria-hidden="true" />
          </button>
          <CollapseButton label="khen thưởng, kỷ luật" />
        </div>
      }
    >
      <div className="profile-discipline-body">
        <div className="profile-discipline-stats">
          <article>
            <span className="profile-finance-icon profile-finance-icon--success">
              <Medal size={22} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <span>Quyết định</span>
              <strong>{employee ? "--" : "1 LẦN"}</strong>
            </div>
          </article>
          <article>
            <span className="profile-finance-icon profile-finance-icon--danger">
              <ThumbsDown size={22} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <span>Kỷ luật</span>
              <strong>{employee ? "--" : "6 LẦN"}</strong>
            </div>
          </article>
        </div>

        <div className="profile-discipline-list">
          {items.map((item) => (
            <article className={`profile-discipline-item profile-discipline-item--${item.status}`} key={`${item.title}-${item.meta}`}>
              <span className="profile-discipline-icon">
                {item.status === "approved" ? (
                  <FileText size={22} weight="duotone" aria-hidden="true" />
                ) : (
                  <PencilSimple size={22} weight="duotone" aria-hidden="true" />
                )}
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.meta}</p>
                {item.note ? <p>{item.note}</p> : null}
              </div>
              {item.status === "approved" ? <ProfileStatusBadge>Đã duyệt</ProfileStatusBadge> : null}
            </article>
          ))}
        </div>
      </div>
    </ProfilePanel>
  );
}

function HealthPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const rows = employee ? [
    { label: "Huyết áp", value: profileValue(employee, "bloodPressure"), unit: "mmHg" },
    { label: "Nhịp tim", value: profileValue(employee, "heartRate"), unit: "Nhịp/phút" },
    { label: "Nhóm máu", value: profileValue(employee, "bloodType"), unit: "--" },
    { label: "Chiều cao", value: profileValue(employee, "height"), unit: "cm" },
    { label: "Cân nặng", value: profileValue(employee, "weight"), unit: "kg" }
  ] : healthRows;
  return (
    <ProfilePanel title="Sức khỏe" id="profile-health">
      <div className="profile-health-table" role="table" aria-label="Thông tin sức khỏe">
        <div className="profile-health-head" role="row">
          <span role="columnheader">Thông tin</span>
          <span role="columnheader">Chỉ số</span>
          <span role="columnheader">Unit</span>
        </div>
        {rows.map((row) => (
          <div className="profile-health-row" role="row" key={row.label}>
            <span role="cell">{row.label}</span>
            <span role="cell" className="profile-health-placeholder">
              {row.value}
            </span>
            <span role="cell">{row.unit}</span>
          </div>
        ))}
      </div>
    </ProfilePanel>
  );
}

function AssetPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  return (
    <ProfilePanel title="Tài sản" id="profile-assets">
      <div className="profile-asset-card">
        <span>
          <Package size={22} weight="duotone" aria-hidden="true" />
          Tổng giá trị
        </span>
        <strong>{employee ? "--" : "0 đ"}</strong>
      </div>
    </ProfilePanel>
  );
}

function ProfileTabs({
  activeTab,
  employee,
  isAdminView
}: {
  activeTab: ProfileTabKey;
  employee?: EmployeeDirectoryRecord;
  isAdminView?: boolean;
}) {
  const visibleTabs = isAdminView
    ? profileTabs.filter((tab) => tab.key !== "furlough" && tab.key !== "compensatory")
    : profileTabs;

  return (
    <header className="employee-profile-tabs">
      <div className="employee-profile-tab-list" role="tablist" aria-label="Nhóm thông tin hồ sơ">
        {visibleTabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const href = profileTabHref(tab.key, employee);

          if (href) {
            return (
              <a
                aria-current={isActive ? "page" : undefined}
                aria-selected={isActive ? "true" : "false"}
                className={isActive ? "is-active" : undefined}
                href={href}
                key={tab.key}
                role="tab"
              >
                {tab.label}
              </a>
            );
          }

          return (
            <button aria-disabled="true" aria-selected="false" key={tab.key} role="tab" type="button">
              {tab.label}
            </button>
          );
        })}
      </div>

      {isAdminView ? (
        <div className="employee-profile-actions employee-profile-actions--admin">
          <button type="button">
            <UserStatus size={15} weight="duotone" aria-hidden="true" />
            Trạng thái
          </button>
          <button type="button">
            <CurrencyDollar size={15} weight="duotone" aria-hidden="true" />
            Lương
          </button>
          <button type="button">
            <Certificate size={15} weight="duotone" aria-hidden="true" />
            Ký số
          </button>
          <button type="button">
            <Briefcase size={15} weight="duotone" aria-hidden="true" />
            Công việc
          </button>
          <button type="button">
            <BookOpenText size={15} weight="duotone" aria-hidden="true" />
            Học vấn
          </button>
          <button className="employee-profile-more-action" type="button" aria-label="Mở thêm thao tác hồ sơ">
            <CaretDown size={15} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="employee-profile-actions">
          <button type="button" disabled>
            <PencilSimple size={15} weight="duotone" aria-hidden="true" />
            Cập nhật
          </button>
          <button type="button">
            <UploadSimple size={15} weight="duotone" aria-hidden="true" />
            Tải lên
          </button>
        </div>
      )}
    </header>
  );
}

function ResumeFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <dl className="profile-resume-fields">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ResumeInfoPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const fields = employee ? [
    { label: "Dân tộc", value: profileValue(employee, "ethnicity") },
    { label: "Tôn giáo", value: profileValue(employee, "religion") },
    { label: "Nơi sinh", value: profileValue(employee, "birthPlace") },
    { label: "Nguyên quán", value: profileValue(employee, "hometown") },
    { label: "Chỗ ở hiện nay", value: profileValue(employee, "currentAddress") },
    { label: "Thường trú", value: profileValue(employee, "permanentAddress") },
    { label: "Quốc tịch", value: profileValue(employee, "nationality") },
    { label: "Mã số thuế cá nhân", value: profileValue(employee, "taxCode") },
    { label: "Loại lao động", value: profileValue(employee, "laborType") },
    { label: "Vùng lương tối thiểu", value: profileValue(employee, "minimumWageRegion") },
    { label: "Trình độ phổ thông", value: profileValue(employee, "generalEducation") },
    { label: "Kinh nghiệm trước đây", value: profileValue(employee, "previousExperienceYears") },
    { label: "Chuyên ngành", value: profileValue(employee, "major") },
    { label: "Học vấn cao nhất", value: profileValue(employee, "highestEducation") },
    { label: "Tình trạng hôn nhân", value: maritalLabels[profileValue(employee, "maritalStatus")] ?? profileValue(employee, "maritalStatus") },
    { label: "Nghĩa vụ quân sự", value: profileValue(employee, "militaryStatus") },
    { label: "Ghi chú", value: profileValue(employee, "note") }
  ] : resumeInfoFields;
  return (
    <ProfilePanel title="Thông tin" id="profile-resume-info">
      <ResumeFieldGrid fields={fields} />
    </ProfilePanel>
  );
}

function IdentityPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const fields = employee ? [
    { label: "Số CMT/CC/CCCD", value: profileValue(employee, "identityNumber") },
    { label: "Ngày cấp", value: formatProfileDate(profileValue(employee, "identityIssuedDate") === "--" ? null : profileValue(employee, "identityIssuedDate")) },
    { label: "Nơi cấp", value: profileValue(employee, "identityIssuedPlace") },
    { label: "Số hộ chiếu", value: profileValue(employee, "passportNumber") },
    { label: "Loại hộ chiếu", value: profileValue(employee, "passportType") },
    { label: "Ngày cấp hộ chiếu", value: formatProfileDate(profileValue(employee, "passportIssuedDate") === "--" ? null : profileValue(employee, "passportIssuedDate")) },
    { label: "Ngày hết hạn", value: formatProfileDate(profileValue(employee, "passportExpiredDate") === "--" ? null : profileValue(employee, "passportExpiredDate")) }
  ] : identityFields;
  return (
    <ProfilePanel title="Thông tin CMT/CC/CCCD/Hộ chiếu" id="profile-resume-identity">
      <ResumeFieldGrid fields={fields} />
    </ProfilePanel>
  );
}

function BankPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const rows = employee ? [{
    accountNumber: profileValue(employee, "bankAccountNumber"),
    accountName: profileValue(employee, "bankAccountName"),
    bankName: profileValue(employee, "bankName"),
    branch: profileValue(employee, "bankBranch")
  }] : bankRows;
  return (
    <ProfilePanel title="Ngân hàng" id="profile-resume-bank">
      <div className="profile-bank-table-shell">
        <table className="profile-bank-table">
          <thead>
            <tr>
              <th scope="col">Số tài khoản</th>
              <th scope="col">Tên tài khoản</th>
              <th scope="col">Ngân hàng</th>
              <th scope="col">Chi nhánh</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.accountNumber}>
                <td>{row.accountNumber}</td>
                <td>{row.accountName}</td>
                <td>{row.bankName}</td>
                <td>{row.branch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProfilePanel>
  );
}

function DocumentImagesPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const fieldNames: Record<string, string> = { front: "identityFrontImage", back: "identityBackImage", passport: "passportImage" };
  return (
    <ProfilePanel title="Ảnh CCCD" id="profile-resume-documents">
      <div className="profile-document-list">
        {documentSections.map((section) => {
          const document = employee?.documents?.find((item) => item.fieldName === fieldNames[section.id]);
          return (
          <section className="profile-document-section" aria-labelledby={`document-${section.id}`} key={section.id}>
            <h3 id={`document-${section.id}`}>{section.label}</h3>
            <div className="profile-document-placeholder" role="img" aria-label={document ? document.fileName : `${section.label} chưa có ảnh`}>
              <div>
                {document ? <FileText size={44} weight="duotone" aria-hidden="true" /> : <ImageBroken size={44} weight="duotone" aria-hidden="true" />}
                <span>{document?.fileName ?? "Chưa có ảnh"}</span>
              </div>
            </div>
          </section>
          );
        })}
      </div>
    </ProfilePanel>
  );
}

function WorkInfoPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const contract = employee?.contracts?.[0];
  const fields = employee ? [
    { label: "Trạng thái", value: profileStatusLabel(employee.status), variant: "status" as const },
    { label: "Phòng ban", value: employee.department },
    { label: "Vị trí", value: employee.positionName ?? "--" },
    { label: "Chức danh", value: employee.jobTitleName ?? employee.title ?? "--" },
    { label: "Ngày vào", value: formatProfileDate(employee.startDate) },
    { label: "Ngày chính thức", value: formatProfileDate(employee.officialStartDate) },
    { label: "Loại lao động", value: employee.employeeType ?? profileValue(employee, "laborType") },
    { label: "Tên hợp đồng", value: contract?.type ?? "--" },
    { label: "Nơi làm việc", value: profileValue(employee, "workplace") },
    { label: "Cấp bậc", value: profileValue(employee, "contractRankId") },
    { label: "Mã đồng bộ", value: profileValue(employee, "syncCode") },
    { label: "Mã chấm công", value: employee.attendanceCode ?? "--" },
    { label: "Tài khoản HOffice", value: employee.accountEmail ?? "--" }
  ] : workInfoFields;
  return (
    <ProfilePanel title="Công việc" id="profile-work-info">
      <dl className="profile-work-info-fields">
        {fields.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>
              {field.variant === "status" ? <ProfileStatusBadge>{field.value}</ProfileStatusBadge> : field.value}
            </dd>
          </div>
        ))}
      </dl>
    </ProfilePanel>
  );
}

function ContractListPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const rows = employee ? (employee.contracts ?? []).map((contract) => ({
    id: profileValue(employee, "contractCode") !== "--" ? profileValue(employee, "contractCode") : contract.id,
    creator: "--",
    name: contract.type,
    department: employee.department,
    status: contract.status === "active" ? "Đang hiệu lực" : contract.status,
    signedAt: formatProfileDate(profileValue(employee, "contractSignedDate") === "--" ? null : profileValue(employee, "contractSignedDate")),
    effectiveFrom: formatProfileDate(contract.startDate),
    effectiveTo: formatProfileDate(contract.endDate),
    createdAt: formatProfileDate(contract.createdAt)
  })) : contractRows;
  return (
    <ProfilePanel title="Danh sách hợp đồng" id="profile-contract-list">
      <div className="profile-contract-toolbar" aria-label="Công cụ danh sách hợp đồng">
        <button className="icon-button" type="button" aria-label="Bộ lọc danh sách hợp đồng">
          <SlidersHorizontal size={17} weight="duotone" aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" aria-label="Tùy chọn cột hợp đồng">
          <Columns size={17} weight="duotone" aria-hidden="true" />
        </button>
      </div>

      <div className="profile-contract-table-shell">
        <table className="profile-contract-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="request-checkbox" aria-hidden="true" />
                <span className="sr-only">Chọn tất cả hợp đồng</span>
              </th>
              <th scope="col">Người tạo</th>
              <th scope="col">Mã HĐ</th>
              <th scope="col">Tên hợp đồng</th>
              <th scope="col">Phòng ban</th>
              <th scope="col">Tình trạng</th>
              <th scope="col">Ngày ký</th>
              <th scope="col">Hiệu lực từ ngày</th>
              <th scope="col">Đến ngày</th>
              <th scope="col">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="request-checkbox" aria-hidden="true" />
                </td>
                <td>
                  <span className="request-avatar">{row.creator}</span>
                </td>
                <td>{row.id}</td>
                <td>{row.name}</td>
                <td>{row.department}</td>
                <td>
                  <ProfileStatusBadge>{row.status}</ProfileStatusBadge>
                </td>
                <td>{row.signedAt}</td>
                <td>{row.effectiveFrom}</td>
                <td>{row.effectiveTo}</td>
                <td>{row.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProfilePanel>
  );
}

function WorkTimelineTabsPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const contract = employee?.contracts?.[0];
  return (
    <section className="employee-profile-panel" aria-labelledby="profile-work-timeline-title">
      <header className="employee-profile-panel-header profile-work-history-header">
        <div className="profile-work-history-tabs" role="tablist" aria-label="Lịch sử công việc">
          <button className="is-active" id="profile-work-timeline-title" type="button" role="tab" aria-selected="true">
            Quá trình làm việc
          </button>
          <button type="button" role="tab" aria-selected="false">
            Lịch sử lương thỏa thuận
          </button>
        </div>

        <div className="employee-profile-panel-actions">
          <button className="icon-button" type="button" aria-label="Lọc quá trình làm việc">
            <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
          </button>
          <CollapseButton label="quá trình làm việc" />
        </div>
      </header>

      <div className="profile-work-timeline">
        <div className="profile-work-node">
          <span className="profile-work-dot">
            <Clock size={15} weight="duotone" aria-hidden="true" />
          </span>
          <div className="profile-work-content">
            <header>
              <h3>{employee?.positionName ?? employee?.title ?? "--"}</h3>
              <ProfileStatusBadge>{profileStatusLabel(employee?.status)}</ProfileStatusBadge>
            </header>

            <article className="profile-work-card">
              <div>
                <h4>
                  {contract?.type ?? "Chưa có hợp đồng"}
                  <ArrowSquareOut size={15} weight="duotone" aria-hidden="true" />
                </h4>
                <time dateTime={contract?.startDate}>{formatProfileDate(contract?.startDate)}</time>
              </div>
              <p>{profileValue(employee, "contractCode")} • {contract?.type ?? "--"} • {employee?.jobTitleName ?? "--"}</p>
              <p className="profile-breadcrumb">Helios › {employee?.department ?? "--"}</p>
            </article>

            <article className="profile-work-card">
              <div>
                <h4>Ngày bắt đầu làm việc</h4>
                <time dateTime={employee?.startDate}>{formatProfileDate(employee?.startDate)}</time>
              </div>
              <p>{employee?.employeeType ?? "--"}</p>
              <p className="profile-breadcrumb">Helios › {employee?.department ?? "--"}</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

function InsuranceInfoPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const sections = employee
    ? insuranceSections.map((section) => ({ ...section, fields: section.fields.map((field) => ({ ...field, value: "--" })) }))
    : insuranceSections;
  return (
    <section className="employee-profile-panel" aria-labelledby="profile-insurance-info">
      <header className="employee-profile-panel-header">
        <h2 id="profile-insurance-info">Thông tin bảo hiểm</h2>
        <CollapseButton label="thông tin bảo hiểm" />
      </header>

      <div className="profile-insurance-sections">
        {sections.map((section, index) => (
          <section className="profile-insurance-section" aria-labelledby={`insurance-section-${index}`} key={section.title}>
            {index > 0 ? <h3 id={`insurance-section-${index}`}>{section.title}</h3> : null}
            <dl className="profile-insurance-fields">
              {section.fields.map((field) => (
                <div key={`${section.title}-${field.label}`}>
                  <dt>
                    {field.label}
                    {field.help ? <span aria-label="Có ghi chú">?</span> : null}
                  </dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}

function InsuranceContributionPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const rows = employee
    ? insuranceContributionRows.map((row) => ({ ...row, bhxh: "--", accident: "--", bhyt: "--", unemployment: "--", total: "--" }))
    : insuranceContributionRows;
  return (
    <ProfilePanel title="Mức đóng BHXH" id="profile-insurance-contribution">
      <div className="profile-contract-toolbar" aria-label="Công cụ mức đóng BHXH">
        <button className="icon-button" type="button" aria-label="Tùy chọn cột mức đóng BHXH">
          <Columns size={17} weight="duotone" aria-hidden="true" />
        </button>
      </div>

      <div className="profile-insurance-table-shell">
        <table className="profile-insurance-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Đối tượng đóng</span>
              </th>
              <th scope="col">BHXH</th>
              <th scope="col">Bảo hiểm TNLĐ-BNN</th>
              <th scope="col">BHYT</th>
              <th scope="col">Bảo hiểm thất nghiệp</th>
              <th scope="col">Tổng cộng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.bhxh}</td>
                <td>{row.accident}</td>
                <td>{row.bhyt}</td>
                <td>{row.unemployment}</td>
                <td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProfilePanel>
  );
}

function InsuranceDeclarationHistoryPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const declarations = employee ? [] : insuranceDeclarations;
  return (
    <ProfilePanel title="Lịch sử khai báo" id="profile-insurance-history">
      <div className="profile-insurance-history" role="list" aria-label="Lịch sử khai báo bảo hiểm">
        {declarations.map((item) => (
          <article className="profile-insurance-history-item" role="listitem" key={item.title}>
            <span className="profile-insurance-history-dot" aria-hidden="true" />
            <div>
              <h3>
                {item.title}
                <ArrowSquareOut size={16} weight="duotone" aria-hidden="true" />
              </h3>
              <p>{item.period}</p>
              <p>{item.unit}</p>
              <ProfileStatusBadge>Đã duyệt</ProfileStatusBadge>
            </div>
          </article>
        ))}
      </div>
    </ProfilePanel>
  );
}

function ProfilePanelCalendarActions({ label }: { label: string }) {
  return (
    <div className="employee-profile-panel-actions">
      <button className="icon-button" type="button" aria-label={`Chọn kỳ ${label}`}>
        <CalendarBlank size={16} weight="duotone" aria-hidden="true" />
      </button>
      <CollapseButton label={label} />
    </div>
  );
}

function AllowanceOverviewPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const chartPoints = [
    { x: 96, y: 54 },
    { x: 185, y: 57 },
    { x: 275, y: 66 },
    { x: 364, y: 60 },
    { x: 454, y: 70 },
    { x: 543, y: 57 },
    { x: 633, y: 258 },
    { x: 722, y: 258 },
    { x: 812, y: 258 },
    { x: 901, y: 258 },
    { x: 991, y: 258 },
    { x: 1080, y: 258 }
  ];

  return (
    <ProfilePanel
      title="Tổng quan lương 2026"
      id="profile-allowance-overview"
      action={<ProfilePanelCalendarActions label="tổng quan lương" />}
    >
      <div className="profile-allowance-chart" role="img" aria-label="Biểu đồ tổng quan lương thực nhận năm 2026">
        <svg viewBox="0 0 1120 320" aria-hidden="true" focusable="false">
          {chartPoints.map(({ x }) => (
            <line className="profile-allowance-chart-grid" x1={x} x2={x} y1="40" y2="268" key={x} />
          ))}

          {[
            { label: "12.5M", y: 42 },
            { label: "10M", y: 84 },
            { label: "7.5M", y: 126 },
            { label: "5M", y: 170 },
            { label: "2.5M", y: 214 },
            { label: "0", y: 258 }
          ].map((tick) => (
            <text className="profile-allowance-chart-label" x="12" y={tick.y + 4} key={tick.label}>
              {tick.label}
            </text>
          ))}

          {!employee ? <><path
            className="profile-allowance-chart-area"
            d="M96 54 C145 54 158 56 185 57 C222 58 240 66 275 66 C313 66 330 60 364 60 C402 60 421 70 454 70 C490 70 508 57 543 57 C576 58 587 160 633 258 L1080 258 L1080 286 L96 286 Z"
          />
          <path
            className="profile-allowance-chart-line"
            d="M96 54 C145 54 158 56 185 57 C222 58 240 66 275 66 C313 66 330 60 364 60 C402 60 421 70 454 70 C490 70 508 57 543 57 C576 58 587 160 633 258 L1080 258"
          /></> : null}

          {!employee ? chartPoints.map((point, index) => (
            <circle className="profile-allowance-chart-dot" cx={point.x} cy={point.y} r="3.5" key={`${point.x}-${index}`} />
          )) : null}

          {allowanceMonths.map((month, index) => (
            <text className="profile-allowance-chart-month" x={chartPoints[index]?.x ?? 96} y="294" key={month.short}>
              {month.short}
            </text>
          ))}
        </svg>
      </div>
    </ProfilePanel>
  );
}

function AllowanceMonthGridPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const months = employee ? allowanceMonths.map((month) => ({ ...month, value: undefined })) : allowanceMonths;
  return (
    <ProfilePanel
      title="Lương thực nhận 2026"
      id="profile-allowance-months"
      action={<ProfilePanelCalendarActions label="lương thực nhận" />}
    >
      <div className="profile-allowance-month-grid">
        {months.map((month) => (
          <article className="profile-allowance-month-cell" key={month.month}>
            <h3>{month.month}</h3>
            {month.value ? <strong>{month.value}</strong> : null}
          </article>
        ))}
      </div>
    </ProfilePanel>
  );
}

function AllowanceMetricPanel({
  id,
  icon: MetricIcon,
  title,
  tone,
  value
}: {
  id: string;
  icon: Icon;
  title: string;
  tone: "info" | "success" | "danger";
  value: string;
}) {
  return (
    <ProfilePanel title={title} id={id} action={<ProfilePanelCalendarActions label={title} />}>
      <div className="profile-allowance-metric">
        <span className={`profile-finance-icon profile-finance-icon--${tone}`}>
          <MetricIcon size={22} weight="duotone" aria-hidden="true" />
        </span>
        <strong>{value}</strong>
      </div>
    </ProfilePanel>
  );
}

function AllowanceHistoryPanel({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const history = employee ? [] : allowanceHistory;
  return (
    <ProfilePanel title="Lịch sử lương thực nhận" id="profile-allowance-history">
      <div className="profile-allowance-history">
        <article className="profile-allowance-history-year is-open">
          <button type="button" aria-expanded="true">
            <span>Năm 2026</span>
            <CaretDown size={16} weight="bold" style={{ transform: "rotate(180deg)" }} aria-hidden="true" />
          </button>

          <div className="profile-allowance-history-list">
            {history.map((item) => (
              <div className="profile-allowance-history-row" key={item.month}>
                <span>{item.month}</span>
                <strong className={`profile-allowance-trend profile-allowance-trend--${item.trend}`}>
                  <span aria-hidden="true">{item.trend === "up" ? "↗" : "↘"}</span>
                  {item.value}
                </strong>
              </div>
            ))}
          </div>
        </article>

        {["Năm 2025", "Năm 2024"].map((year) => (
          <article className="profile-allowance-history-year" key={year}>
            <button type="button" aria-expanded="false">
              <span>{year}</span>
              <CaretDown size={16} weight="bold" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </ProfilePanel>
  );
}

function LeaveHelpIcon() {
  return (
    <span className="profile-leave-help" aria-label="Có ghi chú">
      ?
    </span>
  );
}

function LeaveValue({ tone, value }: { tone?: "success" | "danger" | "purple" | "annual" | "seniority"; value: string }) {
  const resolvedTone = tone ?? (value.startsWith("-") ? "danger" : undefined);
  return <span className={resolvedTone ? `profile-leave-value profile-leave-value--${resolvedTone}` : "profile-leave-value"}>{value}</span>;
}

function AnnualLeaveTablePanel() {
  return (
    <ProfilePanel title="Thông tin phép năm" id="profile-furlough-year">
      <div className="profile-leave-table-shell" tabIndex={0} aria-label="Bảng thông tin phép năm có thể cuộn ngang">
        <table className="profile-leave-table profile-leave-table--year">
          <thead>
            <tr>
              <th rowSpan={2} scope="col">Năm</th>
              <th rowSpan={2} scope="col">Tổng tồn <LeaveHelpIcon /></th>
              <th colSpan={4} scope="colgroup">Tổng phép <LeaveHelpIcon /></th>
              <th rowSpan={2} scope="col">Phép ứng</th>
              <th colSpan={4} scope="colgroup">Phép lũy kế <LeaveHelpIcon /></th>
              <th colSpan={4} scope="colgroup">Phép thâm niên <LeaveHelpIcon /></th>
              <th colSpan={4} scope="colgroup">Phép năm</th>
            </tr>
            <tr>
              {["Tổng", "Sử dụng", "Hết hạn", "Tồn cuối"].map((label) => <th scope="col" key={`year-general-${label}`}>{label}</th>)}
              {["Tổng", "Sử dụng", "Hết hạn", "Tồn cuối"].map((label) => <th scope="col" key={`year-accrued-${label}`}>{label}</th>)}
              {["Hiện tại", "Sử dụng", "Hết hạn", "Tồn cuối"].map((label) => <th scope="col" key={`year-seniority-${label}`}>{label}</th>)}
              {["Tổng", "Sử dụng", "Hết hạn", "Tồn cuối"].map((label) => <th scope="col" key={`year-annual-${label}`}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {annualLeaveRows.map((row) => (
              <tr key={row.year}>
                <th scope="row">
                  <strong>{row.year}</strong>
                  <span>{row.period}</span>
                </th>
                <td><LeaveValue tone="success" value={row.totalBalance} /></td>
                {row.general.map((value, index) => <td key={`${row.year}-general-${index}`}><LeaveValue tone={index === 1 ? "danger" : undefined} value={value} /></td>)}
                <td><LeaveValue value={row.advance} /></td>
                {row.accrued.map((value, index) => <td key={`${row.year}-accrued-${index}`}><LeaveValue tone="purple" value={value} /></td>)}
                {row.seniority.map((value, index) => <td key={`${row.year}-seniority-${index}`}><LeaveValue tone={index <= 1 ? "seniority" : undefined} value={value} /></td>)}
                {row.annual.map((value, index) => <td key={`${row.year}-annual-${index}`}><LeaveValue tone={index === 1 ? "danger" : "annual"} value={value} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProfilePanel>
  );
}

function MonthlyLeaveTablePanel() {
  return (
    <ProfilePanel title="Thông tin phép tháng" id="profile-furlough-month">
      <div className="profile-leave-table-shell" tabIndex={0} aria-label="Bảng thông tin phép tháng có thể cuộn ngang">
        <table className="profile-leave-table profile-leave-table--month">
          <thead>
            <tr>
              <th rowSpan={2} scope="col">Tháng</th>
              <th rowSpan={2} scope="col">Tổng tồn <LeaveHelpIcon /></th>
              <th colSpan={4} scope="colgroup">Tổng phép <LeaveHelpIcon /></th>
              <th rowSpan={2} scope="col">Phép ứng</th>
              <th colSpan={4} scope="colgroup">Phép lũy kế <LeaveHelpIcon /></th>
              <th colSpan={5} scope="colgroup">Phép thâm niên</th>
              <th colSpan={4} scope="colgroup">Phép năm</th>
            </tr>
            <tr>
              {["Hiện tại", "Sử dụng", "Hết hạn", "Tồn cuối"].map((label) => <th scope="col" key={`month-general-${label}`}>{label}</th>)}
              {["Hiện tại", "Sử dụng", "Hết hạn", "Tồn cuối"].map((label) => <th scope="col" key={`month-accrued-${label}`}>{label}</th>)}
              {["Hiện tại", "Lũy kế", "Sử dụng", "Hết hạn", "Tồn cuối"].map((label) => <th scope="col" key={`month-seniority-${label}`}>{label}</th>)}
              {["Hiện tại", "Sử dụng", "Hết hạn", "Tồn cuối"].map((label) => <th scope="col" key={`month-annual-${label}`}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {monthlyLeaveRows.map((row) => (
              <tr key={row.month}>
                <th scope="row">
                  <strong>{row.month}</strong>
                  <span>{row.period}</span>
                </th>
                <td><LeaveValue tone="success" value={row.totalBalance} /></td>
                {row.general.map((value, index) => <td key={`${row.month}-general-${index}`}><LeaveValue tone={index === 1 ? "danger" : undefined} value={value} /></td>)}
                <td><LeaveValue value={row.advance} /></td>
                {row.accrued.map((value, index) => <td key={`${row.month}-accrued-${index}`}><LeaveValue tone="purple" value={value} /></td>)}
                {row.seniority.map((value, index) => <td key={`${row.month}-seniority-${index}`}><LeaveValue tone={index <= 2 ? "seniority" : undefined} value={value} /></td>)}
                {row.annual.map((value, index) => <td key={`${row.month}-annual-${index}`}><LeaveValue tone={index === 1 ? "danger" : "annual"} value={value} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProfilePanel>
  );
}

function LeaveUsageHistoryPanel() {
  return (
    <ProfilePanel title="Lịch sử sử dụng" id="profile-furlough-history">
      <div className="profile-leave-history" role="list" aria-label="Lịch sử sử dụng phép">
        {leaveHistory.map((item) => (
          <article className={`profile-leave-history-item profile-leave-history-item--${item.tone}`} role="listitem" key={`${item.date}-${item.title}`}>
            <span className="profile-leave-history-marker" aria-hidden="true">
              {item.tone === "success" ? "↗" : "↘"}
            </span>
            <div>
              <time dateTime={item.date.split("/").reverse().join("-")}>{item.date}</time>
              <section className="profile-leave-history-card" aria-label={`${item.title} ${item.date}`}>
                <div>
                  <h3>
                    {item.title}
                    {item.title === "Đơn xin nghỉ" ? <ArrowSquareOut size={15} weight="duotone" aria-hidden="true" /> : null}
                  </h3>
                  <strong>{item.value}</strong>
                </div>
                <p>{item.meta}</p>
              </section>
            </div>
          </article>
        ))}
      </div>
    </ProfilePanel>
  );
}

function ProfileOverviewContent({ employee }: { employee?: EmployeeDirectoryRecord }) {
  return (
    <section className="employee-profile-grid" aria-label="Tổng quan hồ sơ nhân sự">
      <div className="employee-profile-column">
        <InfoCard employee={employee} />
        <WorkHistoryPanel employee={employee} />
      </div>

      <div className="employee-profile-column">
        <OnboardingPanel employee={employee} />
        <DebtPanel employee={employee} />
        <HealthPanel employee={employee} />
      </div>

      <div className="employee-profile-column">
        <AwarenessPanel employee={employee} />
        <WorkEffectPanel employee={employee} />
        <FinancePanel employee={employee} />
        <DisciplinePanel employee={employee} />
        <AssetPanel employee={employee} />
      </div>
    </section>
  );
}

function ProfileResumeContent({ employee }: { employee?: EmployeeDirectoryRecord }) {
  return (
    <section className="employee-profile-resume-grid" aria-label="Sơ yếu lý lịch">
      <div className="employee-profile-column">
        <ResumeInfoPanel employee={employee} />
        <IdentityPanel employee={employee} />
        <BankPanel employee={employee} />
      </div>

      <aside className="employee-profile-column" aria-label="Hồ sơ và ảnh giấy tờ">
        <InfoCard employee={employee} />
        <DocumentImagesPanel employee={employee} />
      </aside>
    </section>
  );
}

function ProfileWorkContent({ employee }: { employee?: EmployeeDirectoryRecord }) {
  return (
    <section className="employee-profile-work-grid" aria-label="Công việc và hợp đồng">
      <div className="employee-profile-column">
        <WorkInfoPanel employee={employee} />
        <ContractListPanel employee={employee} />
      </div>

      <aside className="employee-profile-column" aria-label="Lịch sử công việc và hợp đồng">
        <WorkTimelineTabsPanel employee={employee} />
      </aside>
    </section>
  );
}

function ProfileBenefitContent({ employee }: { employee?: EmployeeDirectoryRecord }) {
  return (
    <section className="employee-profile-benefit-grid" aria-label="Bảo hiểm và phúc lợi">
      <div className="employee-profile-column">
        <InsuranceInfoPanel employee={employee} />
        <InsuranceContributionPanel employee={employee} />
      </div>

      <aside className="employee-profile-column" aria-label="Lịch sử khai báo bảo hiểm">
        <InsuranceDeclarationHistoryPanel employee={employee} />
      </aside>
    </section>
  );
}

function ProfileAllowanceContent({ employee }: { employee?: EmployeeDirectoryRecord }) {
  const emptyValue = employee ? "--" : undefined;
  return (
    <section className="employee-profile-allowance-grid" aria-label="Lương và phụ cấp">
      <div className="employee-profile-column">
        <AllowanceOverviewPanel employee={employee} />
        <AllowanceMonthGridPanel employee={employee} />
      </div>

      <aside className="employee-profile-column" aria-label="Tổng hợp và lịch sử lương">
        <AllowanceMetricPanel id="profile-allowance-total" icon={CurrencyDollar} title="Tổng lương thực nhận 2026" tone="info" value={emptyValue ?? "68,167,749.17"} />
        <AllowanceMetricPanel id="profile-allowance-bonus" icon={ArrowSquareOut} title="Tổng tiền thưởng đã nhận 2026" tone="success" value={emptyValue ?? "0"} />
        <AllowanceMetricPanel id="profile-allowance-penalty" icon={ArrowSquareOut} title="Tổng tiền đã bị phạt 2026" tone="danger" value={emptyValue ?? "100,000"} />
        <AllowanceHistoryPanel employee={employee} />
      </aside>
    </section>
  );
}

function ProfileFurloughContent() {
  return (
    <section className="employee-profile-furlough-grid" aria-label="Thông tin phép">
      <div className="employee-profile-column">
        <AnnualLeaveTablePanel />
        <MonthlyLeaveTablePanel />
      </div>

      <aside className="employee-profile-column" aria-label="Lịch sử sử dụng phép">
        <LeaveUsageHistoryPanel />
      </aside>
    </section>
  );
}

export function ProfileBoard({
  activeTab = "overview",
  employee,
  isAdminView
}: {
  activeTab?: ProfileTabKey;
  employee?: EmployeeDirectoryRecord;
  isAdminView?: boolean;
}) {
  const resolvedActiveTab = isAdminView && activeTab === "furlough" ? "overview" : activeTab;

  return (
    <main className="employee-profile-page" aria-label="Hồ sơ cá nhân">
      <ProfileTabs activeTab={resolvedActiveTab} employee={employee} isAdminView={isAdminView} />
      {resolvedActiveTab === "resume" ? <ProfileResumeContent employee={employee} /> : null}
      {resolvedActiveTab === "work" ? <ProfileWorkContent employee={employee} /> : null}
      {resolvedActiveTab === "benefit" ? <ProfileBenefitContent employee={employee} /> : null}
      {resolvedActiveTab === "allowance" ? <ProfileAllowanceContent employee={employee} /> : null}
      {resolvedActiveTab === "furlough" ? <ProfileFurloughContent /> : null}
      {resolvedActiveTab === "overview" ? <ProfileOverviewContent employee={employee} /> : null}
    </main>
  );
}
