import {
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  ClipboardText,
  Clock,
  Minus,
  WarningCircle
} from "@phosphor-icons/react/dist/ssr";
import { AbsenceRequestCreateBoard } from "@/components/user/absence-request-create-board";
import { AttendanceBoard } from "@/components/user/attendance-board";
import { CheckinOutRequestCreateBoard } from "@/components/user/checkin-out-request-create-board";
import { LeaveRequestCreateBoard } from "@/components/user/leave-request-create-board";
import { OvertimeRequestCreateBoard } from "@/components/user/overtime-request-create-board";
import { ProfileBoard, type ProfileTabKey } from "@/components/user/profile-board";
import { ResignationRequestCreateBoard } from "@/components/user/resignation-request-create-board";
import { RequestsBoard } from "@/components/user/requests-board";
import { SalaryBoard } from "@/components/user/salary-board";
import { ShiftChangeRequestCreateBoard } from "@/components/user/shift-change-request-create-board";
import { UserFrame } from "@/components/user/user-frame";
import { announcements } from "@/lib/mock-data";

type UserPageProps = {
  searchParams?: Promise<{
    customMenu?: string;
    create?: string;
    profileTab?: string;
    tab?: string;
  }>;
};

type EmptyPanel = {
  id: string;
  title: string;
  message: string;
  filter: string;
};

const emptyPanels: EmptyPanel[] = [
  {
    id: "pending-work",
    title: "Việc cần thực hiện",
    message: "Tuyệt vời. Bạn đã xử lý hết công việc!",
    filter: "Tất cả"
  },
  {
    id: "my-requests",
    title: "Đề xuất của bạn",
    message: "Đề xuất của bạn đã được xử lý hết.",
    filter: "Đơn vắng mặt"
  },
  {
    id: "followed-work",
    title: "Việc bạn giao, theo dõi",
    message: "Công việc bạn theo dõi đã được xử lý hết.",
    filter: "Tất cả"
  }
];

const trainingEvent = {
  date: "25/06",
  year: "2024",
  title: "[ƯU ĐÃI LÊN TỚI 70%] KHÓA ĐÀO TẠO “QUẢN TRỊ HIỆU SUẤT BẰNG KPIs, OKRs”",
  time: "19:00 - 21:30",
  status: "Hết hạn"
};

function EmptyWorkPanel({ panel }: { panel: EmptyPanel }) {
  return (
    <section className="user-panel" aria-labelledby={`${panel.id}-title`}>
      <header className="user-panel-header">
        <h2 id={`${panel.id}-title`}>{panel.title}</h2>
        <div className="user-panel-tools">
          <button className="secondary-button" type="button" aria-label={`Lọc ${panel.title}`}>
            {panel.filter}
            <CaretDown size={14} weight="duotone" aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label={`Thu gọn ${panel.title}`}>
            <Minus size={16} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="user-empty-state">
        <ClipboardText size={36} weight="duotone" aria-hidden="true" />
        <p>{panel.message}</p>
      </div>
    </section>
  );
}

function AttendancePanel() {
  return (
    <section className="user-panel user-attendance-panel" aria-labelledby="attendance-title">
      <header className="user-panel-header">
        <h2 id="attendance-title">Thứ 5, 09/07/2026</h2>
        <div className="user-panel-tools">
          <button className="icon-button" type="button" aria-label="Ngày trước">
            <CaretLeft size={17} weight="duotone" aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Ngày sau">
            <CaretRight size={17} weight="duotone" aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Chọn ngày">
            <CalendarBlank size={17} weight="duotone" aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Thu gọn chấm công">
            <Minus size={16} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="attendance-grid">
        <article className="attendance-card attendance-card--danger">
          <div>
            <span>Giờ vào</span>
            <strong>--</strong>
            <small>
              <Clock size={13} weight="duotone" aria-hidden="true" />
              Chưa check in
            </small>
          </div>
          <WarningCircle size={19} weight="duotone" aria-hidden="true" />
        </article>

        <article className="attendance-card attendance-card--warning">
          <div>
            <span>Giờ ra</span>
            <strong>--</strong>
            <small>
              <Clock size={13} weight="duotone" aria-hidden="true" />
              Chưa đến giờ
            </small>
          </div>
          <Clock size={19} weight="duotone" aria-hidden="true" />
        </article>

        <article className="attendance-total">
          <span>Công</span>
          <strong>0</strong>
          <small>00:00p</small>
        </article>
      </div>

      <p className="attendance-note">
        <Clock size={14} weight="duotone" aria-hidden="true" />
        Chưa có dữ liệu chấm công
      </p>
    </section>
  );
}

function TrainingPanel() {
  return (
    <section className="user-panel" aria-labelledby="training-title">
      <header className="user-panel-header">
        <h2 id="training-title">Lịch đào tạo phần mềm 1Office</h2>
        <button className="icon-button" type="button" aria-label="Thu gọn lịch đào tạo">
          <Minus size={16} weight="duotone" aria-hidden="true" />
        </button>
      </header>

      <article className="training-row">
        <time dateTime="2024-06-25">
          <strong>{trainingEvent.date}</strong>
          <span>{trainingEvent.year}</span>
        </time>
        <div className="training-marker" aria-hidden="true" />
        <div>
          <h3>{trainingEvent.title}</h3>
          <p>{trainingEvent.time}</p>
        </div>
        <span className="training-status">{trainingEvent.status}</span>
      </article>
    </section>
  );
}

function CompanyNoticesPanel() {
  return (
    <section className="user-panel" aria-labelledby="user-notice-title">
      <header className="user-panel-header">
        <h2 id="user-notice-title">Thông báo công ty</h2>
        <button className="icon-button" type="button" aria-label="Thu gọn thông báo công ty">
          <Minus size={16} weight="duotone" aria-hidden="true" />
        </button>
      </header>

      <div className="user-notice-list">
        {announcements.map((announcement) => (
          <article className="user-notice-card" key={announcement.id}>
            <header>
              <span className="avatar avatar--accent">AD</span>
              <div>
                <strong>Admin</strong>
                <p>
                  <Clock size={13} weight="duotone" aria-hidden="true" />
                  {announcement.time}
                </p>
              </div>
            </header>
            <h3>{announcement.title}</h3>
            <footer>
              <span className="reaction-dot">1</span>
              <span>0 Thảo luận</span>
              <span className="avatar">{announcement.audience.slice(0, 1)}</span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function UserHome() {
  return (
    <UserFrame activeModule="home">
      <main className="user-dashboard" aria-label="Trang chủ cá nhân">
        <section className="user-dashboard-column" aria-label="Công việc cá nhân">
          {emptyPanels.map((panel) => (
            <EmptyWorkPanel key={panel.title} panel={panel} />
          ))}
        </section>

        <section className="user-dashboard-column" aria-label="Lịch và thông báo">
          <AttendancePanel />
          <TrainingPanel />
          <CompanyNoticesPanel />
        </section>
      </main>
    </UserFrame>
  );
}

function UserAttendance() {
  return (
    <UserFrame activeModule="attendance">
      <AttendanceBoard />
    </UserFrame>
  );
}

function UserPayroll() {
  return (
    <UserFrame activeModule="payroll">
      <SalaryBoard />
    </UserFrame>
  );
}

function UserRequests() {
  return (
    <UserFrame activeModule="requests" showSearch title="Danh sách đơn từ năm 2026">
      <RequestsBoard />
    </UserFrame>
  );
}

function UserLeaveCreate() {
  return (
    <UserFrame activeModule="requests" showSearch title="Tạo mới đơn xin nghỉ">
      <LeaveRequestCreateBoard />
    </UserFrame>
  );
}

function UserAbsenceCreate() {
  return (
    <UserFrame activeModule="requests" showSearch title="Tạo mới đơn vắng mặt">
      <AbsenceRequestCreateBoard />
    </UserFrame>
  );
}

function UserOvertimeCreate() {
  return (
    <UserFrame activeModule="requests" showSearch title="Tạo mới đơn làm thêm">
      <OvertimeRequestCreateBoard />
    </UserFrame>
  );
}

function UserCheckinOutCreate() {
  return (
    <UserFrame activeModule="requests" showSearch title="Tạo mới đơn checkin/out">
      <CheckinOutRequestCreateBoard />
    </UserFrame>
  );
}

function UserShiftChangeCreate() {
  return (
    <UserFrame activeModule="requests" showSearch title="Tạo mới đơn đổi ca">
      <ShiftChangeRequestCreateBoard />
    </UserFrame>
  );
}

function UserResignationCreate() {
  return (
    <UserFrame activeModule="requests" showSearch title="Tạo mới đơn xin thôi việc">
      <ResignationRequestCreateBoard />
    </UserFrame>
  );
}

function UserProfile({ activeTab = "overview" }: { activeTab?: ProfileTabKey }) {
  return (
    <UserFrame activeModule="profile">
      <ProfileBoard activeTab={activeTab} />
    </UserFrame>
  );
}

function resolveProfileTab(params?: { customMenu?: string; profileTab?: string; tab?: string }): ProfileTabKey {
  if (
    params?.customMenu === "user-board-profile-resume" ||
    params?.profileTab === "resume" ||
    params?.tab === "resume"
  ) {
    return "resume";
  }

  if (
    params?.customMenu === "user-board-profile-work" ||
    params?.profileTab === "work" ||
    params?.tab === "work"
  ) {
    return "work";
  }

  if (
    params?.customMenu === "user-board-profile-benefit" ||
    params?.profileTab === "benefit" ||
    params?.tab === "benefit"
  ) {
    return "benefit";
  }

  if (
    params?.customMenu === "user-board-profile-allowance" ||
    params?.customMenu === "user-board-profile-salary" ||
    params?.profileTab === "allowance" ||
    params?.profileTab === "salary" ||
    params?.tab === "allowance" ||
    params?.tab === "salary"
  ) {
    return "allowance";
  }

  if (
    params?.customMenu === "user-board-profile-furlough" ||
    params?.customMenu === "user-board-profile-leave" ||
    params?.profileTab === "furlough" ||
    params?.profileTab === "leave" ||
    params?.tab === "furlough" ||
    params?.tab === "leave"
  ) {
    return "furlough";
  }

  return "overview";
}

export default async function UserPage({ searchParams }: UserPageProps) {
  const params = searchParams ? await searchParams : undefined;

  if (params?.customMenu === "user-board-attendance") {
    return <UserAttendance />;
  }

  if (
    params?.customMenu === "user-board-payroll" ||
    params?.customMenu === "user-board-salary"
  ) {
    return <UserPayroll />;
  }

  if (
    params?.customMenu === "user-board-requests" ||
    params?.customMenu === "user-board-request"
  ) {
    if (params?.create === "leave") {
      return <UserLeaveCreate />;
    }

    if (params?.create === "absence") {
      return <UserAbsenceCreate />;
    }

    if (params?.create === "overtime") {
      return <UserOvertimeCreate />;
    }

    if (params?.create === "checkin-out") {
      return <UserCheckinOutCreate />;
    }

    if (params?.create === "shift-change") {
      return <UserShiftChangeCreate />;
    }

    if (params?.create === "resignation") {
      return <UserResignationCreate />;
    }

    return <UserRequests />;
  }

  if (
    params?.customMenu === "user-board-profile" ||
    params?.customMenu === "user-board-profile-resume" ||
    params?.customMenu === "user-board-profile-work" ||
    params?.customMenu === "user-board-profile-benefit" ||
    params?.customMenu === "user-board-profile-allowance" ||
    params?.customMenu === "user-board-profile-salary" ||
    params?.customMenu === "user-board-profile-furlough" ||
    params?.customMenu === "user-board-profile-leave" ||
    params?.customMenu === "user-profile" ||
    params?.customMenu === "employee-profile"
  ) {
    return <UserProfile activeTab={resolveProfileTab(params)} />;
  }

  return <UserHome />;
}
