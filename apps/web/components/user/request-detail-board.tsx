"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { CollapseButton } from "@/components/user/collapse-button";
import { StatusBadge } from "@/components/user/requests-board";
import { CheckCircle, Clock, FileText, FlowArrow, PaperPlaneTilt, PencilSimple, Trash, WarningCircle, X } from "@/lib/icons";
import { cancelRequestAction, commentRequestAction, decideRequestAction, recallRequestAction, submitRequestAction, type ActionResult } from "@/lib/request-actions";
import {
  ACTION_LABEL,
  formatDate,
  formatDateTime,
  formatDays,
  initials,
  requestRange,
  type RequestDetail,
  type RequestStep,
  type TimelineEntry
} from "@/lib/request-format";

const STEP_STATUS_LABEL: Record<RequestStep["status"], string> = {
  active: "Đang chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Không duyệt",
  returned: "Trả lại",
  skipped: "Bỏ qua",
  cancelled: "Đã huỷ"
};

const ASSIGNEE_STATUS_LABEL: Record<string, string> = {
  pending: "chờ duyệt",
  approved: "đã duyệt",
  rejected: "đã từ chối",
  returned: "đã trả lại",
  forwarded: "đã chuyển tiếp",
  superseded: "không cần duyệt nữa",
  cancelled: "đã huỷ"
};

const RESOLVED_FROM_LABEL: Record<string, string> = {
  direct_manager: "quản lý trực tiếp",
  supervisor: "cấp trên của quản lý",
  department_head: "trưởng phòng",
  position: "theo vị trí",
  title: "theo chức vụ",
  delegation: "được uỷ quyền",
  substitute: "người duyệt thay",
  fallback_admin: "quản trị quy trình (không tìm được người duyệt)",
  escalation: "cấp trên (bước cuối trùng người tạo)",
  forward: "được chuyển tiếp"
};

type PendingAction = "reject" | "return" | "cancel" | null;

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
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

function Avatar({ name, tone = "photo" }: { name: string | null | undefined; tone?: "photo" | "blue" }) {
  return <span className={`request-detail-avatar request-detail-avatar--${tone}`}>{initials(name)}</span>;
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "comment") {
    return (
      <li className="request-activity-item request-activity-item--comment">
        <span className="request-activity-marker">
          <FileText size={16} weight="duotone" aria-hidden="true" />
        </span>
        <article>
          <div>
            <strong>{entry.author?.fullName ?? "Ai đó"}</strong> <span>đã thảo luận</span>
          </div>
          <p className="request-comment-body">{entry.body}</p>
          <p>
            <Clock size={13} weight="duotone" aria-hidden="true" />
            {formatDateTime(entry.at)}
          </p>
        </article>
        <Avatar name={entry.author?.fullName} tone="blue" />
      </li>
    );
  }
  const label = ACTION_LABEL[entry.action] ?? entry.action;
  const negative = entry.action === "reject" || entry.action === "cancel" || entry.action === "error";
  return (
    <li className="request-activity-item">
      <span className={`request-activity-marker${negative ? " is-negative" : ""}`}>
        {negative ? <WarningCircle size={16} weight="fill" aria-hidden="true" /> : <CheckCircle size={16} weight="fill" aria-hidden="true" />}
      </span>
      <article>
        <div>
          {entry.actor ? <strong>{entry.actor.fullName}</strong> : <strong>Hệ thống</strong>} <span>{label}</span>
        </div>
        <p>
          <Clock size={13} weight="duotone" aria-hidden="true" />
          {formatDateTime(entry.at)}
        </p>
        {entry.step ? <small>Bước: {entry.step.name}{entry.step.round > 1 ? ` (lần gửi ${entry.step.round})` : ""}</small> : null}
        {entry.reason ? <small className="request-activity-reason">Lý do: {entry.reason}</small> : null}
      </article>
      <Avatar name={entry.actor?.fullName ?? "Hệ thống"} tone={entry.actor ? "photo" : "blue"} />
    </li>
  );
}

function StepList({ steps }: { steps: RequestStep[] }) {
  if (steps.length === 0) return <p className="request-steps-empty">Đơn chưa được gửi duyệt.</p>;
  const rounds = [...new Set(steps.map((step) => step.round))].sort((a, b) => b - a);
  return (
    <div className="request-steps">
      {rounds.map((round) => (
        <div key={round} className="request-steps-round">
          {rounds.length > 1 ? <h3>Lần gửi {round}</h3> : null}
          <ol>
            {steps
              .filter((step) => step.round === round)
              .map((step) => (
                <li key={step.id} className={`request-step-item is-${step.status}`}>
                  <div className="request-step-head">
                    <strong>{step.name}</strong>
                    <span className="request-step-status">{STEP_STATUS_LABEL[step.status]}</span>
                    {step.mode === "all" && step.assignees.length > 1 ? <span className="request-step-mode">Tất cả cùng duyệt</span> : null}
                    {step.dueAt && step.status === "active" ? <span className="request-step-due">Hạn: {formatDateTime(step.dueAt)}</span> : null}
                  </div>
                  <ul>
                    {step.assignees.map((assignee) => (
                      <li key={assignee.id}>
                        <Avatar name={assignee.fullName} />
                        <span>
                          {assignee.fullName} · {ASSIGNEE_STATUS_LABEL[assignee.status] ?? assignee.status}
                          {RESOLVED_FROM_LABEL[assignee.resolvedFrom] ? <small> ({RESOLVED_FROM_LABEL[assignee.resolvedFrom]})</small> : null}
                          {assignee.actedAt ? <small> · {formatDateTime(assignee.actedAt)}</small> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

// LV-04 + AP-15 / AP-16 / AP-19: one request with its steps, history, discussion and the actions
// the viewer may take.
export function RequestDetailBoard({ request, timeline }: { request: RequestDetail; timeline: TimelineEntry[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"detail" | "workflow">("detail");
  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, startWorking] = useTransition();
  const { permissions } = request;
  const payload = request.payload;

  const run = (work: () => Promise<ActionResult>) => {
    setError(null);
    startWorking(async () => {
      const result = await work();
      if (!result.ok) return setError(result.error);
      setPending(null);
      setReason("");
      setComment("");
      router.refresh();
    });
  };

  const confirmPending = () => {
    const text = reason.trim();
    if (!text) return setError(pending === "cancel" ? "Hãy nhập lý do huỷ đơn." : "Hãy nhập lý do.");
    if (pending === "cancel") return run(() => cancelRequestAction(request.id, text));
    run(() => decideRequestAction({ stepId: permissions.myStepId!, action: pending!, reason: text, version: request.version, requestId: request.id }));
  };

  const canAct = permissions.myStepId || permissions.canEdit || permissions.canRecall || permissions.canCancel;

  return (
    <main className="request-detail-page" aria-label={`Chi tiết ${request.title} ${request.code}`}>
      <header className="request-detail-tabs">
        <nav role="tablist" aria-label="Nội dung đơn">
          <button className={tab === "detail" ? "is-active" : undefined} type="button" role="tab" aria-selected={tab === "detail"} onClick={() => setTab("detail")}>
            Chi tiết
          </button>
          <button className={tab === "workflow" ? "is-active" : undefined} type="button" role="tab" aria-selected={tab === "workflow"} onClick={() => setTab("workflow")}>
            Quy trình duyệt
          </button>
        </nav>

        {canAct ? (
          <div className="request-detail-actions" aria-label="Thao tác với đơn">
            {permissions.myStepId ? (
              <>
                <button
                  className="request-action-approve"
                  type="button"
                  disabled={working}
                  onClick={() => run(() => decideRequestAction({ stepId: permissions.myStepId!, action: "approve", version: request.version, requestId: request.id }))}
                >
                  <CheckCircle size={15} weight="duotone" aria-hidden="true" />
                  Duyệt
                </button>
                <button type="button" disabled={working} onClick={() => setPending("reject")}>
                  <WarningCircle size={15} weight="duotone" aria-hidden="true" />
                  Từ chối
                </button>
                {permissions.canReturn ? (
                  <button type="button" disabled={working} onClick={() => setPending("return")}>
                    <FlowArrow size={15} weight="duotone" aria-hidden="true" />
                    Trả lại
                  </button>
                ) : null}
              </>
            ) : null}
            {permissions.canEdit ? (
              <Link href={`/user/requests/new?type=${request.type}&id=${request.id}` as Route}>
                <PencilSimple size={15} weight="duotone" aria-hidden="true" />
                Sửa
              </Link>
            ) : null}
            {permissions.canSubmit ? (
              <button type="button" disabled={working} onClick={() => run(() => submitRequestAction(request.id))}>
                <PaperPlaneTilt size={15} weight="duotone" aria-hidden="true" />
                Gửi duyệt
              </button>
            ) : null}
            {permissions.canRecall ? (
              <button type="button" disabled={working} onClick={() => run(() => recallRequestAction(request.id))}>
                <FlowArrow size={15} weight="duotone" aria-hidden="true" />
                Rút đơn
              </button>
            ) : null}
            {permissions.canCancel ? (
              <button type="button" disabled={working} onClick={() => setPending("cancel")}>
                <Trash size={15} weight="duotone" aria-hidden="true" />
                Huỷ đơn
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {pending ? (
        <div className="request-reason-box" role="group" aria-label="Nhập lý do">
          <label>
            <span>{pending === "reject" ? "Lý do từ chối" : pending === "return" ? "Cần bổ sung gì? (lý do trả lại)" : "Lý do huỷ đơn"}</span>
            <textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} />
          </label>
          <div>
            <button className="primary-button" type="button" disabled={working} onClick={confirmPending}>
              Xác nhận
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setPending(null);
                setReason("");
                setError(null);
              }}
            >
              <X size={14} aria-hidden="true" />
              Đóng
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="request-action-error" role="alert">
          {error}
        </p>
      ) : null}

      {tab === "workflow" ? (
        <div className="request-detail-layout">
          <div className="request-detail-main">
            <Panel title="Các bước duyệt">
              {request.workflow ? (
                <p className="request-workflow-name">
                  Quy trình: {request.workflow.name} (phiên bản {request.workflow.version})
                </p>
              ) : request.usedDefaultWorkflow ? (
                <p className="request-workflow-name">Chưa có quy trình riêng cho loại đơn này: quản lý trực tiếp duyệt.</p>
              ) : null}
              <StepList steps={request.steps} />
            </Panel>
          </div>
        </div>
      ) : (
        <div className="request-detail-layout">
          <div className="request-detail-main">
            <Panel title="Thông tin chung">
              <dl className="request-general-grid">
                <div className="request-field-column">
                  <div className="request-field">
                    <dt>Họ và tên</dt>
                    <dd>
                      <span className="request-detail-name-chip">{request.requester.fullName}</span>
                    </dd>
                  </div>
                  <div className="request-field">
                    <dt>Phòng ban</dt>
                    <dd>{request.requester.department?.name ?? ""}</dd>
                  </div>
                  <div className="request-field">
                    <dt>Loại đơn</dt>
                    <dd>{request.title}</dd>
                  </div>
                  <div className="request-field">
                    <dt>Tính công</dt>
                    <dd>{payload.paid === undefined ? "" : payload.paid ? "Có lương" : "Không lương"}</dd>
                  </div>
                </div>
                <div className="request-field-column">
                  <div className="request-field">
                    <dt>Mã đơn</dt>
                    <dd>{request.code}</dd>
                  </div>
                  <div className="request-field">
                    <dt>Trạng thái</dt>
                    <dd>
                      <StatusBadge status={request.status} />
                    </dd>
                  </div>
                  <div className="request-field">
                    <dt>Thời gian</dt>
                    <dd>{requestRange(request)}</dd>
                  </div>
                  <div className="request-field">
                    <dt>Số ngày</dt>
                    <dd>{formatDays(request.quantity)}</dd>
                  </div>
                </div>
                <div className="request-field request-field--full">
                  <dt>Lý do</dt>
                  <dd>{payload.reason || "—"}</dd>
                </div>
                {request.cancelReason ? (
                  <div className="request-field request-field--full">
                    <dt>Lý do huỷ</dt>
                    <dd>{request.cancelReason}</dd>
                  </div>
                ) : null}
              </dl>
            </Panel>

            <Panel title="Chi tiết">
              <div className="request-detail-table" role="table" aria-label="Các ngày nghỉ">
                <div role="rowgroup">
                  <div role="row">
                    <span role="columnheader">Ngày</span>
                    <span role="columnheader">Thời gian nghỉ</span>
                    <span role="columnheader">Công</span>
                  </div>
                  {(payload.days ?? []).map((day) => (
                    <div role="row" key={day.date}>
                      <strong role="cell">{formatDate(day.date)}</strong>
                      <strong role="cell">
                        {Math.floor(day.minutes / 60)} giờ{day.minutes % 60 ? ` ${day.minutes % 60} phút` : ""}
                      </strong>
                      <strong role="cell">{day.units}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <aside className="request-detail-side" aria-label="Lịch sử và thảo luận">
            <Panel title="Lịch sử hoạt động">
              <ol className="request-activity-list">
                {[...timeline].reverse().map((entry) => (
                  <TimelineItem entry={entry} key={`${entry.kind}-${entry.id}`} />
                ))}
              </ol>
            </Panel>

            {permissions.canComment ? (
              <Panel title="Thảo luận">
                <form
                  className="request-comment-box"
                  aria-label="Viết thảo luận"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (comment.trim()) run(() => commentRequestAction(request.id, comment.trim()));
                  }}
                >
                  <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Viết thảo luận..." maxLength={5000} aria-label="Nội dung thảo luận" />
                  <button type="submit" aria-label="Gửi thảo luận" disabled={working || !comment.trim()}>
                    <PaperPlaneTilt size={18} weight="duotone" aria-hidden="true" />
                  </button>
                </form>
              </Panel>
            ) : null}
          </aside>
        </div>
      )}
    </main>
  );
}
