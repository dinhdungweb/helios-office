import {
  ArrowSquareOut,
  Briefcase,
  CalendarBlank,
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
  Minus,
  Money,
  Package,
  PencilSimple,
  Phone,
  SlidersHorizontal,
  Star,
  ThumbsDown,
  UploadSimple,
  UserCircle,
  Wallet
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import type { ReactNode } from "react";

type ProfileInfoRow = {
  label: string;
  value: string;
  icon: Icon;
  variant?: "phone";
};

type ChecklistItem = {
  label: string;
};

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
  href?: string;
};

const profileTabs: ProfileTabItem[] = [
  { key: "overview", label: "Thông tin chung", href: "/user/profile" },
  { key: "resume", label: "Sơ yếu lý lịch", href: "/user/profile?tab=resume" },
  { key: "work", label: "Công việc & Hợp đồng", href: "/user/profile?tab=work" },
  { key: "benefit", label: "Bảo hiểm & Phúc lợi", href: "/user/profile?tab=benefit" },
  { key: "allowance", label: "Lương & Phụ cấp", href: "/user/profile?tab=allowance" },
  { key: "furlough", label: "Thông tin phép", href: "/user/profile?tab=furlough" },
  { key: "compensatory", label: "Thông tin nghỉ bù" }
];

const profileRows: ProfileInfoRow[] = [
  { label: "Email", value: "Dungmaster7@gmail.com", icon: EnvelopeSimple },
  { label: "Điện thoại", value: "0904521145", icon: Phone, variant: "phone" },
  { label: "Ngày sinh", value: "10/10/1998", icon: Clock },
  { label: "Nguyên quán", value: "--", icon: HouseLine },
  { label: "Giới tính", value: "Nam", icon: GenderMale },
  { label: "Hôn nhân", value: "Độc thân", icon: Star },
  { label: "Tài khoản 1Office", value: "dungdd", icon: UserCircle }
];

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
  { label: "Tài khoản 1Office", value: "dungdd (26/02/2024)" },
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
          <button className="icon-button" type="button" aria-label={`Thu gọn ${title}`}>
            <Minus size={16} weight="duotone" aria-hidden="true" />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function InfoCard() {
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
            <h2>Đặng Đình Dũng</h2>
            <p>Nhân viên Fulltime</p>
            <p>Web • Phòng MKT</p>
          </div>
        </div>

        <div className="employee-profile-meta">
          <span>SRG-035/VP.23</span>
          <span className="profile-status-pill">Đang làm việc</span>
        </div>

        <dl className="employee-profile-detail-list">
          {profileRows.map((row) => (
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

function WorkHistoryPanel() {
  return (
    <ProfilePanel
      title="Quá trình làm việc"
      id="employee-work-history"
      action={
        <div className="employee-profile-panel-actions">
          <button className="icon-button" type="button" aria-label="Lọc quá trình làm việc">
            <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Thu gọn quá trình làm việc">
            <Minus size={16} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      }
    >
      <div className="profile-work-timeline">
        <div className="profile-work-node">
          <span className="profile-work-dot">
            <Briefcase size={15} weight="duotone" aria-hidden="true" />
          </span>
          <div className="profile-work-content">
            <header>
              <h3>Web</h3>
              <span className="profile-status-pill">Đang làm việc</span>
            </header>

            <article className="profile-work-card">
              <div>
                <h4>
                  Hợp đồng chính thức
                  <ArrowSquareOut size={15} weight="duotone" aria-hidden="true" />
                </h4>
                <time dateTime="2024-01-01">01/01/2024</time>
              </div>
              <p>SRG-035-01 • Hợp đồng chính thức • Nhân viên Fulltime</p>
              <p className="profile-breadcrumb">SRG › Helios › Phòng MKT</p>
            </article>

            <article className="profile-work-card">
              <div>
                <h4>Ngày bắt đầu làm việc</h4>
                <time dateTime="2023-02-13">13/02/2023</time>
              </div>
              <p>Nhân viên Fulltime</p>
              <p className="profile-breadcrumb">SRG › Helios › Phòng MKT</p>
            </article>
          </div>
        </div>
      </div>
    </ProfilePanel>
  );
}

function OnboardingPanel() {
  return (
    <ProfilePanel title="Tiến trình tiếp nhận hồ sơ" id="profile-onboarding">
      <div className="profile-checklist" role="list" aria-label="Hồ sơ đã tiếp nhận">
        {checklistItems.map((item) => (
          <div className="profile-check-row" role="listitem" key={item.label}>
            <Check size={17} weight="regular" aria-hidden="true" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </ProfilePanel>
  );
}

function AwarenessPanel() {
  return (
    <ProfilePanel title="Ý thức làm việc" id="profile-awareness">
      <div className="profile-awareness-table" role="table" aria-label="Chỉ số ý thức làm việc">
        <div role="row" className="profile-awareness-head">
          <span role="columnheader">Chỉ số</span>
          <span role="columnheader">Tổng số</span>
          <span role="columnheader">TB Cá nhân / tháng</span>
        </div>
        {awarenessRows.map((row) => (
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

function WorkEffectPanel() {
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
              <strong>0</strong>
            </div>
          ))}
        </div>
      </div>
    </ProfilePanel>
  );
}

function FinancePanel() {
  return (
    <ProfilePanel title="Tài chính" id="profile-finance">
      <div className="profile-finance-body">
        <div className="profile-money-banner">
          <div>
            <span>Tổng lương đã nhận của bạn</span>
            <strong>300,919,924 đ</strong>
          </div>
          <Money size={58} weight="duotone" aria-hidden="true" />
        </div>

        <dl className="profile-finance-list">
          {financeRows.map((row) => (
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

function DebtPanel() {
  return (
    <ProfilePanel title="Công nợ" id="profile-debt">
      <div className="profile-debt-body">
        <div className="profile-debt-banner">
          <span>Tổng công nợ</span>
          <strong>0 đ</strong>
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
            <dd>0 đ</dd>
          </div>
          <div>
            <dt>
              <span className="profile-finance-icon profile-finance-icon--info">
                <CurrencyDollar size={22} weight="duotone" aria-hidden="true" />
              </span>
              Bạn nợ
            </dt>
            <dd>0 đ</dd>
          </div>
        </dl>
      </div>
    </ProfilePanel>
  );
}

function DisciplinePanel() {
  return (
    <ProfilePanel
      title="Khen thưởng, kỷ luật"
      id="profile-discipline"
      action={
        <div className="employee-profile-panel-actions">
          <button className="icon-button" type="button" aria-label="Mở chi tiết khen thưởng, kỷ luật">
            <ArrowSquareOut size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Thu gọn khen thưởng, kỷ luật">
            <Minus size={16} weight="duotone" aria-hidden="true" />
          </button>
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
              <strong>1 LẦN</strong>
            </div>
          </article>
          <article>
            <span className="profile-finance-icon profile-finance-icon--danger">
              <ThumbsDown size={22} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <span>Kỷ luật</span>
              <strong>6 LẦN</strong>
            </div>
          </article>
        </div>

        <div className="profile-discipline-list">
          {disciplineItems.map((item) => (
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
              {item.status === "approved" ? <span className="profile-status-pill">Đã duyệt</span> : null}
            </article>
          ))}
        </div>
      </div>
    </ProfilePanel>
  );
}

function HealthPanel() {
  return (
    <ProfilePanel title="Sức khỏe" id="profile-health">
      <div className="profile-health-table" role="table" aria-label="Thông tin sức khỏe">
        <div className="profile-health-head" role="row">
          <span role="columnheader">Thông tin</span>
          <span role="columnheader">Chỉ số</span>
          <span role="columnheader">Unit</span>
        </div>
        {healthRows.map((row) => (
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

function AssetPanel() {
  return (
    <ProfilePanel title="Tài sản" id="profile-assets">
      <div className="profile-asset-card">
        <span>
          <Package size={22} weight="duotone" aria-hidden="true" />
          Tổng giá trị
        </span>
        <strong>0 đ</strong>
      </div>
    </ProfilePanel>
  );
}

function ProfileTabs({ activeTab }: { activeTab: ProfileTabKey }) {
  return (
    <header className="employee-profile-tabs">
      <div className="employee-profile-tab-list" role="tablist" aria-label="Nhóm thông tin hồ sơ">
        {profileTabs.map((tab) => {
          const isActive = tab.key === activeTab;

          if (tab.href) {
            return (
              <a
                aria-current={isActive ? "page" : undefined}
                aria-selected={isActive ? "true" : "false"}
                className={isActive ? "is-active" : undefined}
                href={tab.href}
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

function ResumeInfoPanel() {
  return (
    <ProfilePanel title="Thông tin" id="profile-resume-info">
      <ResumeFieldGrid fields={resumeInfoFields} />
    </ProfilePanel>
  );
}

function IdentityPanel() {
  return (
    <ProfilePanel title="Thông tin CMT/CC/CCCD/Hộ chiếu" id="profile-resume-identity">
      <ResumeFieldGrid fields={identityFields} />
    </ProfilePanel>
  );
}

function BankPanel() {
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
            {bankRows.map((row) => (
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

function DocumentImagesPanel() {
  return (
    <ProfilePanel title="Ảnh CCCD" id="profile-resume-documents">
      <div className="profile-document-list">
        {documentSections.map((section) => (
          <section className="profile-document-section" aria-labelledby={`document-${section.id}`} key={section.id}>
            <h3 id={`document-${section.id}`}>{section.label}</h3>
            <div className="profile-document-placeholder" role="img" aria-label={`${section.label} chưa có ảnh`}>
              <div>
                <ImageBroken size={44} weight="duotone" aria-hidden="true" />
                <span>No Image Found</span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </ProfilePanel>
  );
}

function WorkInfoPanel() {
  return (
    <ProfilePanel title="Công việc" id="profile-work-info">
      <dl className="profile-work-info-fields">
        {workInfoFields.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>
              {field.variant === "status" ? <span className="profile-status-pill">{field.value}</span> : field.value}
            </dd>
          </div>
        ))}
      </dl>
    </ProfilePanel>
  );
}

function ContractListPanel() {
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
            {contractRows.map((row) => (
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
                  <span className="profile-status-pill">{row.status}</span>
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

function WorkTimelineTabsPanel() {
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
          <button className="icon-button" type="button" aria-label="Thu gọn quá trình làm việc">
            <Minus size={16} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="profile-work-timeline">
        <div className="profile-work-node">
          <span className="profile-work-dot">
            <Briefcase size={15} weight="duotone" aria-hidden="true" />
          </span>
          <div className="profile-work-content">
            <header>
              <h3>Web</h3>
              <span className="profile-status-pill">Đang làm việc</span>
            </header>

            <article className="profile-work-card">
              <div>
                <h4>
                  Hợp đồng chính thức
                  <ArrowSquareOut size={15} weight="duotone" aria-hidden="true" />
                </h4>
                <time dateTime="2024-01-01">01/01/2024</time>
              </div>
              <p>SRG-035-01 • Hợp đồng chính thức • Nhân viên Fulltime</p>
              <p className="profile-breadcrumb">SRG › Helios › Phòng MKT</p>
            </article>

            <article className="profile-work-card">
              <div>
                <h4>Ngày bắt đầu làm việc</h4>
                <time dateTime="2023-02-13">13/02/2023</time>
              </div>
              <p>Nhân viên Fulltime</p>
              <p className="profile-breadcrumb">SRG › Helios › Phòng MKT</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

function InsuranceInfoPanel() {
  return (
    <section className="employee-profile-panel" aria-labelledby="profile-insurance-info">
      <header className="employee-profile-panel-header">
        <h2 id="profile-insurance-info">Thông tin bảo hiểm</h2>
        <button className="icon-button" type="button" aria-label="Thu gọn thông tin bảo hiểm">
          <Minus size={16} weight="duotone" aria-hidden="true" />
        </button>
      </header>

      <div className="profile-insurance-sections">
        {insuranceSections.map((section, index) => (
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

function InsuranceContributionPanel() {
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
            {insuranceContributionRows.map((row) => (
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

function InsuranceDeclarationHistoryPanel() {
  return (
    <ProfilePanel title="Lịch sử khai báo" id="profile-insurance-history">
      <div className="profile-insurance-history" role="list" aria-label="Lịch sử khai báo bảo hiểm">
        {insuranceDeclarations.map((item) => (
          <article className="profile-insurance-history-item" role="listitem" key={item.title}>
            <span className="profile-insurance-history-dot" aria-hidden="true" />
            <div>
              <h3>
                {item.title}
                <ArrowSquareOut size={16} weight="duotone" aria-hidden="true" />
              </h3>
              <p>{item.period}</p>
              <p>{item.unit}</p>
              <span className="profile-status-pill">Đã duyệt</span>
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
      <button className="icon-button" type="button" aria-label={`Thu gọn ${label}`}>
        <Minus size={16} weight="duotone" aria-hidden="true" />
      </button>
    </div>
  );
}

function AllowanceOverviewPanel() {
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

          <path
            className="profile-allowance-chart-area"
            d="M96 54 C145 54 158 56 185 57 C222 58 240 66 275 66 C313 66 330 60 364 60 C402 60 421 70 454 70 C490 70 508 57 543 57 C576 58 587 160 633 258 L1080 258 L1080 286 L96 286 Z"
          />
          <path
            className="profile-allowance-chart-line"
            d="M96 54 C145 54 158 56 185 57 C222 58 240 66 275 66 C313 66 330 60 364 60 C402 60 421 70 454 70 C490 70 508 57 543 57 C576 58 587 160 633 258 L1080 258"
          />

          {chartPoints.map((point, index) => (
            <circle className="profile-allowance-chart-dot" cx={point.x} cy={point.y} r="3.5" key={`${point.x}-${index}`} />
          ))}

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

function AllowanceMonthGridPanel() {
  return (
    <ProfilePanel
      title="Lương thực nhận 2026"
      id="profile-allowance-months"
      action={<ProfilePanelCalendarActions label="lương thực nhận" />}
    >
      <div className="profile-allowance-month-grid">
        {allowanceMonths.map((month) => (
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

function AllowanceHistoryPanel() {
  return (
    <ProfilePanel title="Lịch sử lương thực nhận" id="profile-allowance-history">
      <div className="profile-allowance-history">
        <article className="profile-allowance-history-year is-open">
          <button type="button" aria-expanded="true">
            <span>Năm 2026</span>
            <span aria-hidden="true">⌃</span>
          </button>

          <div className="profile-allowance-history-list">
            {allowanceHistory.map((item) => (
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
              <span aria-hidden="true">⌄</span>
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

function ProfileOverviewContent() {
  return (
    <section className="employee-profile-grid" aria-label="Tổng quan hồ sơ nhân sự">
      <div className="employee-profile-column">
        <InfoCard />
        <WorkHistoryPanel />
      </div>

      <div className="employee-profile-column">
        <OnboardingPanel />
        <DebtPanel />
        <HealthPanel />
      </div>

      <div className="employee-profile-column">
        <AwarenessPanel />
        <WorkEffectPanel />
        <FinancePanel />
        <DisciplinePanel />
        <AssetPanel />
      </div>
    </section>
  );
}

function ProfileResumeContent() {
  return (
    <section className="employee-profile-resume-grid" aria-label="Sơ yếu lý lịch">
      <div className="employee-profile-column">
        <ResumeInfoPanel />
        <IdentityPanel />
        <BankPanel />
      </div>

      <aside className="employee-profile-column" aria-label="Hồ sơ và ảnh giấy tờ">
        <InfoCard />
        <DocumentImagesPanel />
      </aside>
    </section>
  );
}

function ProfileWorkContent() {
  return (
    <section className="employee-profile-work-grid" aria-label="Công việc và hợp đồng">
      <div className="employee-profile-column">
        <WorkInfoPanel />
        <ContractListPanel />
      </div>

      <aside className="employee-profile-column" aria-label="Lịch sử công việc và hợp đồng">
        <WorkTimelineTabsPanel />
      </aside>
    </section>
  );
}

function ProfileBenefitContent() {
  return (
    <section className="employee-profile-benefit-grid" aria-label="Bảo hiểm và phúc lợi">
      <div className="employee-profile-column">
        <InsuranceInfoPanel />
        <InsuranceContributionPanel />
      </div>

      <aside className="employee-profile-column" aria-label="Lịch sử khai báo bảo hiểm">
        <InsuranceDeclarationHistoryPanel />
      </aside>
    </section>
  );
}

function ProfileAllowanceContent() {
  return (
    <section className="employee-profile-allowance-grid" aria-label="Lương và phụ cấp">
      <div className="employee-profile-column">
        <AllowanceOverviewPanel />
        <AllowanceMonthGridPanel />
      </div>

      <aside className="employee-profile-column" aria-label="Tổng hợp và lịch sử lương">
        <AllowanceMetricPanel id="profile-allowance-total" icon={CurrencyDollar} title="Tổng lương thực nhận 2026" tone="info" value="68,167,749.17" />
        <AllowanceMetricPanel id="profile-allowance-bonus" icon={ArrowSquareOut} title="Tổng tiền thưởng đã nhận 2026" tone="success" value="0" />
        <AllowanceMetricPanel id="profile-allowance-penalty" icon={ArrowSquareOut} title="Tổng tiền đã bị phạt 2026" tone="danger" value="100,000" />
        <AllowanceHistoryPanel />
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

export function ProfileBoard({ activeTab = "overview" }: { activeTab?: ProfileTabKey }) {
  return (
    <main className="employee-profile-page" aria-label="Hồ sơ cá nhân">
      <ProfileTabs activeTab={activeTab} />
      {activeTab === "resume" ? <ProfileResumeContent /> : null}
      {activeTab === "work" ? <ProfileWorkContent /> : null}
      {activeTab === "benefit" ? <ProfileBenefitContent /> : null}
      {activeTab === "allowance" ? <ProfileAllowanceContent /> : null}
      {activeTab === "furlough" ? <ProfileFurloughContent /> : null}
      {activeTab === "overview" ? <ProfileOverviewContent /> : null}
    </main>
  );
}
