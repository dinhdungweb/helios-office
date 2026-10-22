"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { StateBlock } from "@/components/ui/primitives";
import { recalculateAttendanceAction } from "@/lib/shift-actions";
import type { RecalcData, RecalcJob } from "@/lib/shift-format";

const REASON_LABELS: Record<RecalcJob["reason"], string> = {
  manual: "Tính lại thủ công",
  schedule: "Đổi lịch ca",
  holiday: "Đổi ngày lễ",
  policy: "Đổi chính sách chấm công",
  shift: "Sửa ca làm việc",
  department_default: "Đổi ca mặc định phòng ban"
};

const STATUS_LABELS: Record<RecalcJob["status"], string> = {
  queued: "Đang chờ",
  running: "Đang tính",
  done: "Hoàn tất",
  failed: "Lỗi"
};

function todayInVietnam() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

function monthStart(date: string, offset = 0) {
  const [year, month] = date.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1 + offset, 1));
  return start.toISOString().slice(0, 10);
}

function monthEnd(date: string, offset = 0) {
  const next = new Date(`${monthStart(date, offset + 1)}T00:00:00Z`);
  return new Date(next.getTime() - 86_400_000).toISOString().slice(0, 10);
}

function displayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

// "22/10 16:43" in Vietnam time.
function displayTime(value: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value])
  );
  return `${parts.day}/${parts.month} ${parts.hour}:${parts.minute}`;
}

function JobResult({ job }: { job: RecalcJob }) {
  if (job.status === "failed") return <span className="recalc-error">{job.error ?? "Không rõ lỗi"}</span>;
  if (!job.result) return <span className="recalc-muted">--</span>;
  return (
    <span>
      {job.result.days} ngày công · <strong>{job.result.changed}</strong> thay đổi
      {job.result.removed ? ` · ${job.result.removed} gỡ bỏ` : ""}
    </span>
  );
}

// AT-12: manual recalculation and the history of every recalculation, automatic ones included.
export function AttendanceRecalcBoard({ data }: { data: RecalcData }) {
  const router = useRouter();
  const today = todayInVietnam();
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const pending = data.source === "api" && data.jobs.some((job) => job.status === "queued" || job.status === "running");

  // Follow queued jobs until they finish.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => router.refresh(), 3000);
    return () => window.clearTimeout(timer);
  }, [pending, router, data]);

  if (data.source === "unavailable") {
    return <StateBlock tone="error" title="Chưa tải được dữ liệu tính lại công">{data.error}</StateBlock>;
  }

  const preset = (offset: number) => {
    setFrom(monthStart(today, offset));
    setTo(offset === 0 ? today : monthEnd(today, offset));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      setFeedback(null);
      const result = await recalculateAttendanceAction({ from, to, departmentIds });
      if (!result.ok) {
        setFeedback({ text: result.error, error: true });
        return;
      }
      const job = result.data;
      setFeedback({
        text:
          job.status === "done"
            ? `Đã tính lại xong: ${job.result?.days ?? 0} ngày công, ${job.result?.changed ?? 0} thay đổi.`
            : job.status === "failed"
              ? `Tính lại bị lỗi: ${job.error ?? "không rõ lỗi"}`
              : "Đã gửi yêu cầu. Việc tính lại chạy nền, trạng thái cập nhật ở bảng bên dưới.",
        error: job.status === "failed"
      });
      router.refresh();
    });
  };

  return (
    <section className="personnel-catalog-panel shift-catalog-panel" aria-labelledby="recalc-title">
      <header className="personnel-catalog-header">
        <h2 id="recalc-title">Tính lại công</h2>
      </header>
      <p className="shift-catalog-hint">
        Công được tính lại tự động khi đồng bộ máy chấm công, đổi lịch ca, ngày lễ, chính sách chấm công hoặc sửa ca đang dùng. Dùng mục này khi cần tính lại thủ
        công, ví dụ sau khi nhập bù log cũ. Ngày chưa tới không được tính.
      </p>

      <form className="recalc-form" onSubmit={submit}>
        <div className="recalc-range">
          <label className="account-dialog-field">
            <span>Từ ngày</span>
            <input max={today} required type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="account-dialog-field">
            <span>Đến ngày</span>
            <input max={today} min={from} required type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <div className="recalc-presets" role="group" aria-label="Chọn nhanh">
            <button type="button" onClick={() => preset(0)}>Tháng này</button>
            <button type="button" onClick={() => preset(-1)}>Tháng trước</button>
          </div>
        </div>

        <fieldset className="recalc-departments">
          <legend>
            Phòng ban <small>(bỏ trống = mọi người trong phạm vi của bạn)</small>
          </legend>
          <div>
            {data.departments.map((department) => (
              <label key={department.id} className={departmentIds.includes(department.id) ? "is-checked" : undefined}>
                <input
                  checked={departmentIds.includes(department.id)}
                  type="checkbox"
                  onChange={() =>
                    setDepartmentIds((current) => (current.includes(department.id) ? current.filter((id) => id !== department.id) : [...current, department.id]))
                  }
                />
                {department.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="recalc-actions">
          <button className="primary-button" disabled={isPending || !from || !to} type="submit">
            {isPending ? "Đang gửi..." : "Tính lại công"}
          </button>
          {feedback ? (
            <span className={feedback.error ? "system-settings-feedback is-error" : "system-settings-feedback"} role="status">
              {feedback.text}
            </span>
          ) : null}
        </div>
      </form>

      <h3 className="recalc-history-title">Lịch sử tính lại</h3>
      <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Lịch sử tính lại có thể cuộn ngang">
        <table className="personnel-catalog-table shift-catalog-table recalc-table">
          <colgroup>
            <col className="recalc-col-time" />
            <col className="recalc-col-reason" />
            <col className="recalc-col-range" />
            <col className="recalc-col-scope" />
            <col className="recalc-col-status" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Thời gian</th>
              <th scope="col">Lý do</th>
              <th scope="col">Khoảng ngày</th>
              <th scope="col">Phạm vi</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((job) => (
              <tr key={job.id}>
                <td>{displayTime(job.createdAt)}</td>
                <td>{REASON_LABELS[job.reason] ?? job.reason}</td>
                <td>{job.from === job.to ? displayDate(job.from) : `${displayDate(job.from)} – ${displayDate(job.to)}`}</td>
                <td>{job.employees === null ? "Toàn công ty" : `${job.employees} người`}</td>
                <td>
                  <span className={`recalc-status is-${job.status}`}>{STATUS_LABELS[job.status]}</span>
                </td>
                <td>
                  <JobResult job={job} />
                </td>
              </tr>
            ))}
            {data.jobs.length === 0 ? (
              <tr>
                <td colSpan={6}>Chưa có lần tính lại nào.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
