"use client";

import { CollapseButton } from "@/components/user/collapse-button";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  Clock,
  Export,
  FileText,
  FunnelSimple,
  LinkSimple,
  MagnifyingGlass,
  Minus,
  PaperPlaneTilt,
  Paperclip,
  PencilSimple,
  Plus,
  SealCheck,
  Smiley,
  SquaresFour,
  UploadSimple
} from "@/lib/icons";
import { useState, type ReactNode } from "react";

const approvers = [
  { name: "Nguyễn Đức Trung", avatar: "NT" },
  { name: "Nguyễn Đức Trung", avatar: "NT" }
];

type Approver = (typeof approvers)[number];

type DetailField = {
  label: string;
  value: string | Approver[];
  badge?: "approved";
  highlight?: boolean;
  type?: "approvers";
};

const leftDetailFields: DetailField[] = [
  { label: "Họ và tên", value: "Đặng Đình Dũng", highlight: true },
  { label: "Phòng ban", value: "Phòng MKT" },
  { label: "Chức vụ", value: "Nhân viên Fulltime" },
  { label: "Tính công", value: "Có" },
  { label: "Người duyệt", value: approvers, type: "approvers" }
];

const rightDetailFields: DetailField[] = [
  { label: "Mã nhân viên", value: "SRG-035" },
  { label: "Vị trí", value: "Web" },
  { label: "Lý do", value: "Xin làm online" },
  { label: "Trạng thái", value: "Đã duyệt", badge: "approved" },
  { label: "Bước duyệt", value: "BGĐ ✓", badge: "approved" },
];

const descriptionField = {
  label: "Mô tả",
  value: "bộ phận được xin phép làm online"
};

const renderDetailValue = (field: DetailField) => {
  if (field.type === "approvers" && Array.isArray(field.value)) {
    return (
      <span className="request-detail-approver-list">
        {field.value.map((approver) => (
          <RequestApprover approver={approver} key={approver.name} />
        ))}
      </span>
    );
  }

  if (field.badge === "approved") {
    return <span className="request-detail-status">{String(field.value)}</span>;
  }

  if (field.highlight) {
    return <span className="request-detail-name-chip">{String(field.value)}</span>;
  }

  return String(field.value);
};

const activityItems = [
  {
    name: "Nguyễn Đức Trung",
    action: "đã duyệt đơn",
    time: "09:58 ng 29/06/2026",
    meta: "Bước: BGĐ (#4)",
    avatar: "NT",
    type: "approved"
  },
  {
    name: "Nguyễn Đức Trung",
    action: "đã duyệt đơn",
    time: "09:56 ng 29/06/2026",
    meta: "Bước: Quản lý (#3)",
    avatar: "NT",
    type: "approved"
  },
  {
    name: "Đặng Đình Dũng",
    action: "đã tạo mới đơn",
    time: "06:58 ng 26/06/2026",
    meta: "ID: 10741",
    avatar: "DD",
    type: "created"
  }
];

function RequestPanel({
  children,
  title,
  action
}: {
  children: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  const panelId = `request-detail-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section className="request-detail-panel" aria-labelledby={panelId}>
      <header className="request-detail-panel-header">
        <h2 id={panelId}>{title}</h2>
        {action ?? <CollapseButton label={title} />}
      </header>
      {children}
    </section>
  );
}

function RequestApprover({ approver }: { approver: (typeof approvers)[number] }) {
  return (
    <span className="request-detail-approver">
      <span className="request-detail-avatar request-detail-avatar--photo">{approver.avatar}</span>
      <CheckCircle size={14} weight="fill" aria-hidden="true" />
      <span>{approver.name}</span>
    </span>
  );
}

function RequestActivityItem({ item }: { item: (typeof activityItems)[number] }) {
  return (
    <li className="request-activity-item">
      <span className="request-activity-marker">
        <CheckCircle size={16} weight="fill" aria-hidden="true" />
      </span>
      <article>
        <div>
          <strong>{item.name}</strong> <span>{item.action}</span>
        </div>
        <p>
          <Clock size={13} weight="duotone" aria-hidden="true" />
          {item.time}
        </p>
        <small>{item.meta}</small>
      </article>
      <span className={item.type === "created" ? "request-detail-avatar request-detail-avatar--blue" : "request-detail-avatar request-detail-avatar--photo"}>{item.avatar}</span>
    </li>
  );
}

function ApprovalWorkflowBoard() {
  return (
    <section className="request-workflow" aria-label="Quy trình duyệt đơn">
      <header className="request-workflow-toolbar">
        <div className="request-workflow-toolbar-left">
          <button type="button" disabled aria-label="Hoàn tác">
            <CaretLeft size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" disabled aria-label="Làm lại">
            <CaretRight size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" disabled aria-label="Thêm nhóm">
            <SquaresFour size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" disabled aria-label="Sơ đồ">
            <NetworkIconFallback />
          </button>
        </div>

        <div className="request-workflow-toolbar-right">
          <button type="button">Xem rút gọn</button>
          <button type="button" aria-label="Lưu">
            <FileText size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Đảo chiều">
            <CaretRight size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Toàn màn hình">
            <Export size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Phóng to">
            <MagnifyingGlass size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Thu nhỏ">
            <Minus size={16} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" aria-label="In">
            <FileText size={16} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="request-workflow-canvas">
        <div className="workflow-node workflow-start">
          <span className="workflow-play" aria-hidden="true" />
          <strong>Bắt đầu</strong>
          <span className="workflow-port workflow-port--right" />
        </div>

        <div className="workflow-node workflow-condition">
          <header>
            <span className="workflow-expand">↗</span>
            <div>
              <strong>Điều kiện</strong>
              <small>#2</small>
            </div>
          </header>
          <div className="workflow-condition-row">
            <span>Nhân viên</span>
            <span>×</span>
          </div>
          <button type="button" aria-label="Thêm điều kiện">
            <Plus size={16} weight="duotone" aria-hidden="true" />
          </button>
          <span className="workflow-port workflow-port--left" />
          <span className="workflow-port workflow-port--right" />
          <span className="workflow-port workflow-port--bottom" />
        </div>

        <div className="workflow-node workflow-approval workflow-manager">
          <span className="workflow-check">
            <Check size={14} weight="duotone" aria-hidden="true" />
          </span>
          <strong>#3 Quản lý</strong>
          <p>
            <span className="request-detail-avatar request-detail-avatar--photo">NT</span>
            <Check size={13} weight="duotone" aria-hidden="true" />
            Đã duyệt
          </p>
          <small>
            <Clock size={13} weight="duotone" aria-hidden="true" />
            2026-06-19 12:54:48
          </small>
          <span className="workflow-port workflow-port--left" />
          <span className="workflow-port workflow-port--right" />
        </div>

        <div className="workflow-node workflow-approval workflow-board">
          <span className="workflow-check">
            <Check size={14} weight="duotone" aria-hidden="true" />
          </span>
          <strong>#4 BGĐ</strong>
          <p>
            <span className="request-detail-avatar request-detail-avatar--photo">NT</span>
            <Check size={13} weight="duotone" aria-hidden="true" />
            Đã duyệt
          </p>
          <small>
            <Clock size={13} weight="duotone" aria-hidden="true" />
            2026-06-19 12:55:42
          </small>
          <span className="workflow-port workflow-port--left" />
          <span className="workflow-port workflow-port--right" />
        </div>

        <div className="workflow-node workflow-approval workflow-waiting">
          <strong>#6 BGĐ</strong>
          <p>
            <Plus size={13} weight="duotone" aria-hidden="true" />
            <Clock size={13} weight="duotone" aria-hidden="true" />
            Chờ duyệt
          </p>
          <span className="workflow-port workflow-port--left" />
          <span className="workflow-port workflow-port--right" />
        </div>

        <div className="workflow-end">
          <Check size={42} weight="duotone" aria-hidden="true" />
          <span>Đã duyệt</span>
        </div>

        <span className="workflow-line workflow-line-start" />
        <span className="workflow-line workflow-line-condition" />
        <span className="workflow-line workflow-line-manager" />
        <span className="workflow-line workflow-line-board-a" />
        <span className="workflow-line workflow-line-board-b" />
        <span className="workflow-line workflow-line-board-c" />
        <span className="workflow-line workflow-line-waiting-a" />
        <span className="workflow-line workflow-line-waiting-b" />
        <span className="workflow-label workflow-label-ok">Thỏa mãn</span>
        <span className="workflow-label workflow-label-fail">Không thỏa mãn</span>
      </div>
    </section>
  );
}

function NetworkIconFallback() {
  return (
    <span className="workflow-mini-network" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function RequestDetailBoard() {
  const [activeTab, setActiveTab] = useState<"detail" | "workflow">("detail");

  return (
    <main className="request-detail-page" aria-label="Chi tiết đơn xin nghỉ">
      <header className="request-detail-tabs">
        <nav role="tablist" aria-label="Nội dung đơn">
          <button
            className={activeTab === "detail" ? "is-active" : undefined}
            type="button"
            role="tab"
            aria-selected={activeTab === "detail"}
            onClick={() => setActiveTab("detail")}
          >
            Chi tiết
          </button>
          <button
            className={activeTab === "workflow" ? "is-active" : undefined}
            type="button"
            role="tab"
            aria-selected={activeTab === "workflow"}
            onClick={() => setActiveTab("workflow")}
          >
            Quy trình duyệt
          </button>
        </nav>

        <div className="request-detail-actions" aria-label="Công cụ đơn">
          <button type="button">
            <LinkSimple size={15} weight="duotone" aria-hidden="true" />
            Liên kết
          </button>
          <button type="button">
            <SealCheck size={15} weight="duotone" aria-hidden="true" />
            Ký số
          </button>
          <button type="button">
            <FileText size={15} weight="duotone" aria-hidden="true" />
            Biểu mẫu
            <CaretDown size={13} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" disabled>
            <UploadSimple size={15} weight="duotone" aria-hidden="true" />
            Tải lên
          </button>
          <button type="button" disabled>
            <PencilSimple size={15} weight="duotone" aria-hidden="true" />
            Sửa
          </button>
          <button className="icon-button" type="button" aria-label="Thêm thao tác">
            <CaretDown size={15} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </header>

      {activeTab === "workflow" ? <ApprovalWorkflowBoard /> : <div className="request-detail-layout">
        <div className="request-detail-main">
          <RequestPanel title="Thông tin chung">
            <dl className="request-general-grid">
              <div className="request-field-column">
                {leftDetailFields.map((field) => (
                  <div className="request-field" key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>{renderDetailValue(field)}</dd>
                  </div>
                ))}
              </div>

              <div className="request-field-column">
                {rightDetailFields.map((field) => (
                  <div className="request-field" key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>{renderDetailValue(field)}</dd>
                  </div>
                ))}
              </div>

              <div className="request-field request-field--full">
                <dt>{descriptionField.label}</dt>
                <dd>{descriptionField.value}</dd>
              </div>
            </dl>
          </RequestPanel>

          <RequestPanel title="Chi tiết">
            <div className="request-detail-table" role="table" aria-label="Chi tiết thời gian đơn">
              <div role="rowgroup">
                <div role="row">
                  <span role="columnheader">Bắt đầu</span>
                  <span role="columnheader">Kết thúc</span>
                  <span role="columnheader">Thời lượng</span>
                  <span role="columnheader">Thời gian theo ca</span>
                </div>
                <div role="row">
                  <strong role="cell">08:00 26/06/2026</strong>
                  <strong role="cell">18:30 26/06/2026</strong>
                  <strong role="cell">10 giờ 30 phút</strong>
                  <strong role="cell">1 (Ngày)</strong>
                </div>
              </div>
            </div>
          </RequestPanel>
        </div>

        <aside className="request-detail-side" aria-label="Lịch sử và thảo luận">
          <RequestPanel
            title="Lịch sử hoạt động"
            action={
              <div className="request-detail-panel-actions">
                <button className="icon-button" type="button" aria-label="Lọc lịch sử">
                  <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
                </button>
                <CollapseButton label="lịch sử hoạt động" />
              </div>
            }
          >
            <ol className="request-activity-list">
              {activityItems.map((item) => (
                <RequestActivityItem item={item} key={`${item.name}-${item.time}`} />
              ))}
            </ol>
          </RequestPanel>

          <RequestPanel title="Thảo luận">
            <div className="request-discussion-empty">
              <FileText size={34} weight="duotone" aria-hidden="true" />
              <span>Không có thảo luận nào</span>
            </div>
            <form className="request-comment-box" aria-label="Viết thảo luận">
              <button type="button" aria-label="Tải lên">
                <UploadSimple size={16} weight="duotone" aria-hidden="true" />
              </button>
              <input placeholder="Viết thảo luận..." />
              <button type="button" aria-label="Đính kèm">
                <Paperclip size={17} weight="duotone" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Biểu cảm">
                <Smiley size={17} weight="duotone" aria-hidden="true" />
              </button>
              <button type="submit" aria-label="Gửi thảo luận">
                <PaperPlaneTilt size={18} weight="duotone" aria-hidden="true" />
              </button>
            </form>
          </RequestPanel>
        </aside>
      </div>}
    </main>
  );
}
