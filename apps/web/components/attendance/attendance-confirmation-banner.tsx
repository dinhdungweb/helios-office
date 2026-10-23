"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { answerMyMonthAction } from "@/lib/attendance-actions";
import type { MyMonthConfirmation } from "@/lib/attendance-api";
import { CheckCircle } from "@/lib/icons";

// "09:33 23/10" in Vietnam time.
function vnDateTime(value: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value])
  );
  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}`;
}

// AT-24: the employee's answer on their month, shown above the personal timesheet once HR opens
// confirmation (or once they have answered).
export function AttendanceConfirmationBanner({ data }: { data: MyMonthConfirmation | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "feedback">("idle");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!data || (!data.confirmationOpen && !data.confirmation)) return null;
  const label = `${Number(data.month.slice(5, 7))}/${data.month.slice(0, 4)}`;
  const answer = data.confirmation;
  const canAnswer = data.confirmationOpen && !data.locked;

  const submit = async (action: "confirm" | "feedback") => {
    setError(null);
    setIsSaving(true);
    const result = await answerMyMonthAction(data.month, action, action === "feedback" ? feedback : undefined);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMode("idle");
    setEditing(false);
    setFeedback("");
    router.refresh();
  };

  const showForm = canAnswer && (!answer || editing);

  return (
    <section className={answer?.status === "confirmed" && !showForm ? "attendance-confirm is-done" : "attendance-confirm"} aria-label="Xác nhận công">
      {showForm ? (
        <>
          <div className="attendance-confirm-text">
            <strong>Xác nhận công tháng {label}</strong>
            <span>HR đã mở xác nhận công. Kiểm tra bảng công bên dưới rồi xác nhận, hoặc gửi phản hồi nếu có ngày chưa đúng.</span>
          </div>
          {mode === "feedback" ? (
            <div className="attendance-confirm-feedback">
              <textarea
                aria-label="Nội dung phản hồi"
                maxLength={1000}
                placeholder="Ví dụ: ngày 16/10 tôi có đi làm nhưng quên chấm giờ ra."
                rows={2}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
              />
              <div className="attendance-confirm-actions">
                <button className="secondary-button" disabled={isSaving} type="button" onClick={() => setMode("idle")}>
                  Huỷ
                </button>
                <button className="primary-button" disabled={isSaving || feedback.trim().length < 3} type="button" onClick={() => submit("feedback")}>
                  {isSaving ? "Đang gửi..." : "Gửi phản hồi"}
                </button>
              </div>
            </div>
          ) : (
            <div className="attendance-confirm-actions">
              <button className="secondary-button" disabled={isSaving} type="button" onClick={() => setMode("feedback")}>
                Phản hồi
              </button>
              <button className="primary-button" disabled={isSaving} type="button" onClick={() => submit("confirm")}>
                {isSaving ? "Đang lưu..." : "Xác nhận công"}
              </button>
            </div>
          )}
        </>
      ) : answer?.status === "confirmed" ? (
        <>
          <div className="attendance-confirm-text">
            <strong>
              <CheckCircle size={18} weight="duotone" aria-hidden="true" /> Bạn đã xác nhận công tháng {label}
            </strong>
            <span>Lúc {vnDateTime(answer.respondedAt)}{data.locked ? " · kỳ công đã chốt" : ""}.</span>
          </div>
          {canAnswer ? (
            <button className="secondary-button" type="button" onClick={() => setEditing(true)}>
              Đổi câu trả lời
            </button>
          ) : null}
        </>
      ) : answer ? (
        <>
          <div className="attendance-confirm-text">
            <strong>Bạn đã gửi phản hồi công tháng {label}</strong>
            <span>
              “{answer.feedback}” · {vnDateTime(answer.respondedAt)}
            </span>
            {answer.resolvedAt ? (
              <span className="attendance-confirm-resolution">
                HR{answer.resolvedBy ? ` (${answer.resolvedBy})` : ""} đã xử lý lúc {vnDateTime(answer.resolvedAt)}: {answer.resolution}
              </span>
            ) : (
              <span className="attendance-confirm-pending">HR đang xem phản hồi của bạn.</span>
            )}
          </div>
          {canAnswer ? (
            <button className="secondary-button" type="button" onClick={() => setEditing(true)}>
              {answer.resolvedAt ? "Xác nhận lại" : "Sửa câu trả lời"}
            </button>
          ) : null}
        </>
      ) : null}
      {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
    </section>
  );
}
