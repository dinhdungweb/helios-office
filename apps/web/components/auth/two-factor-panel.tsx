"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  confirmTotpAction,
  removeTotpAction,
  sendEmailCodeAction,
  startTotpSetupAction,
  verifyTwoFactorAction,
  type TotpSetup,
  type TwoFactorStatus
} from "@/lib/two-factor-actions";

type View = "code" | "email" | "setup";

function CodeForm({
  busy,
  digits,
  label,
  onSubmit,
  submitLabel
}: {
  busy: boolean;
  digits: number;
  label: string;
  onSubmit: (code: string) => void;
  submitLabel: string;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(String(new FormData(event.currentTarget).get("code") ?? ""));
  };

  return (
    <form className="two-factor-code-form" onSubmit={submit}>
      <label>
        <span>{label}</span>
        <input
          autoComplete="one-time-code"
          autoFocus
          inputMode="numeric"
          maxLength={8}
          minLength={4}
          name="code"
          pattern="[0-9]*"
          placeholder={"0".repeat(digits)}
          required
        />
      </label>
      <button className="login-submit" disabled={busy} type="submit">
        {busy ? "ĐANG KIỂM TRA..." : submitLabel}
      </button>
    </form>
  );
}

// AU-18. `login`: the session must pass 2FA before anything else works. `manage`: the security page,
// where the user sets up, replaces or removes the authenticator app.
export function TwoFactorPanel({
  mode,
  onDone,
  status
}: {
  mode: "login" | "manage";
  onDone: () => void;
  status: TwoFactorStatus;
}) {
  // With an app set up, ask for its code; without one, offer to set it up (email stays one click away).
  const [view, setView] = useState<View>(status.totp.enrolled ? "code" : "setup");
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (task: () => Promise<{ ok: boolean; error?: string } | void>) =>
    startTransition(async () => {
      setError(null);
      const result = await task();
      if (result && !result.ok) setError(result.error ?? "Không thực hiện được.");
    });

  const beginSetup = () =>
    run(async () => {
      const result = await startTotpSetupAction();
      if (result.ok) {
        setSetup(result.data);
        setView("setup");
      }
      return result;
    });

  const sendEmail = () =>
    run(async () => {
      const result = await sendEmailCodeAction();
      if (result.ok) {
        setNotice(`Đã gửi mã tới ${result.data.sentTo}. Mã hết hạn sau 5 phút.`);
        setView("email");
      }
      return result;
    });

  const verify = (method: "totp" | "email", code: string) =>
    run(async () => {
      const result = await verifyTwoFactorAction(method, code);
      if (result.ok) onDone();
      return result;
    });

  const confirm = (code: string) =>
    run(async () => {
      const result = await confirmTotpAction(code);
      if (result.ok) onDone();
      return result;
    });

  const remove = () =>
    run(async () => {
      const result = await removeTotpAction();
      if (result.ok) onDone();
      return result;
    });

  const alternatives = (
    <div className="two-factor-alternatives">
      {view !== "code" && status.totp.enrolled ? (
        <button type="button" onClick={() => setView("code")}>Dùng mã từ app xác thực</button>
      ) : null}
      {view !== "email" && status.email.available ? (
        <button disabled={isPending} type="button" onClick={sendEmail}>Gửi mã qua email ({status.email.maskedAddress})</button>
      ) : null}
      {view !== "setup" && !status.totp.enrolled ? (
        <button type="button" onClick={beginSetup}>Thiết lập app xác thực</button>
      ) : null}
    </div>
  );

  return (
    <div className="two-factor-panel">
      {error ? <p className="login-error" role="alert">{error}</p> : null}
      {notice && view === "email" ? <p className="login-notice" role="status">{notice}</p> : null}

      {view === "code" && status.totp.enrolled ? (
        mode === "manage" ? (
          <div className="two-factor-manage">
            <p>
              App xác thực đang bật{status.totp.confirmedAt ? ` từ ${new Date(status.totp.confirmedAt).toLocaleDateString("vi-VN")}` : ""}.
              Thay điện thoại thì thiết lập lại; mã cũ sẽ ngừng hoạt động.
            </p>
            <div className="two-factor-manage-actions">
              <button className="secondary-button" disabled={isPending} type="button" onClick={beginSetup}>Thiết lập lại</button>
              <button className="secondary-button" disabled={isPending} type="button" onClick={remove}>Gỡ app xác thực</button>
            </div>
            {!status.session.verified ? (
              <>
                <p className="two-factor-hint">Để đổi cài đặt, xác thực lại bằng mã hiện tại:</p>
                <CodeForm busy={isPending} digits={status.totp.digits} label="Mã từ app" submitLabel="XÁC THỰC" onSubmit={(code) => verify("totp", code)} />
              </>
            ) : null}
          </div>
        ) : (
          <CodeForm busy={isPending} digits={status.totp.digits} label="Mã 6 số trong app xác thực" submitLabel="XÁC THỰC" onSubmit={(code) => verify("totp", code)} />
        )
      ) : null}

      {view === "email" ? (
        <CodeForm busy={isPending} digits={status.policy.otpDigits} label="Mã trong email" submitLabel="XÁC THỰC" onSubmit={(code) => verify("email", code)} />
      ) : null}

      {view === "setup" ? (
        setup ? (
          <div className="two-factor-setup">
            <ol>
              <li>Mở Google Authenticator hoặc Microsoft Authenticator, chọn thêm tài khoản và quét mã QR.</li>
              <li>Nhập mã {setup.digits} số mà app hiển thị để hoàn tất.</li>
            </ol>
            <div className="two-factor-qr" dangerouslySetInnerHTML={{ __html: setup.qrSvg }} aria-label="Mã QR thiết lập app xác thực" role="img" />
            <p className="two-factor-secret">
              Không quét được? Nhập khoá thủ công: <code>{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
            </p>
            {setup.digits !== 6 || setup.periodSeconds !== 30 ? (
              <p className="two-factor-hint">Công ty dùng mã {setup.digits} số, đổi mỗi {setup.periodSeconds} giây; một số app chỉ hỗ trợ 6 số / 30 giây.</p>
            ) : null}
            <CodeForm busy={isPending} digits={setup.digits} label="Mã trong app" submitLabel="HOÀN TẤT THIẾT LẬP" onSubmit={confirm} />
          </div>
        ) : (
          <div className="two-factor-setup">
            <p>
              {mode === "login"
                ? "Công ty yêu cầu bảo mật 2 lớp. Thiết lập app xác thực trên điện thoại (một lần), sau đó mỗi lần đăng nhập nhập mã trong app."
                : "Chưa bật app xác thực. Thiết lập để đăng nhập an toàn hơn."}
            </p>
            <button className="login-submit" disabled={isPending} type="button" onClick={beginSetup}>
              {isPending ? "ĐANG TẠO MÃ..." : "THIẾT LẬP APP XÁC THỰC"}
            </button>
          </div>
        )
      ) : null}

      {alternatives}
    </div>
  );
}
