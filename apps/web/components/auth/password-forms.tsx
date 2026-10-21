"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  changeTemporaryPasswordAction,
  forgotPasswordAction,
  type PasswordFormState
} from "@/lib/password-actions";
import { Lock, User } from "@/lib/icons";

const initialState: PasswordFormState = { ok: false };

function PasswordField({ autoComplete, label, name }: { autoComplete: string; label: string; name: string }) {
  return (
    <label className="login-field">
      <Lock size={18} weight="duotone" aria-hidden="true" />
      <span className="login-field-label">{label}</span>
      <input name={name} type="password" placeholder=" " autoComplete={autoComplete} required />
    </label>
  );
}

// AU-14: always shows the same answer, whether or not the login exists.
export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState);

  return (
    <form className="login-card" action={formAction}>
      <div className="login-card-header">
        <h2>Quên mật khẩu</h2>
      </div>

      {state.ok ? (
        <p className="login-notice" role="status">{state.message}</p>
      ) : (
        <>
          <p className="login-card-intro">
            Nhập tên đăng nhập hoặc email công ty. Hệ thống sẽ gửi email có đường dẫn để bạn đặt mật khẩu mới.
          </p>
          {state.error ? <p className="login-error" role="alert">{state.error}</p> : null}
          <label className="login-field">
            <User size={18} weight="duotone" aria-hidden="true" />
            <span className="login-field-label">Tên đăng nhập hoặc email*</span>
            <input name="login" type="text" placeholder=" " autoComplete="username" required />
          </label>
          <button className="login-submit" disabled={isPending} type="submit">
            {isPending ? "ĐANG GỬI..." : "GỬI EMAIL ĐẶT LẠI"}
          </button>
        </>
      )}

      <a className="login-back-link" href="/login">Quay lại đăng nhập</a>
    </form>
  );
}

// First sign-in with a temporary password: Keycloak refuses the session until it is replaced.
export function TemporaryPasswordForm({ username }: { username: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(changeTemporaryPasswordAction, initialState);

  useEffect(() => {
    if (state.ok) router.replace("/login?notice=password_changed");
  }, [router, state.ok]);

  return (
    <form className="login-card" action={formAction}>
      <div className="login-card-header">
        <h2>Đổi mật khẩu</h2>
      </div>
      <p className="login-card-intro">
        Tài khoản đang dùng mật khẩu tạm do quản trị viên cấp. Đặt mật khẩu mới (ít nhất 8 ký tự) để tiếp tục.
      </p>
      {state.error ? <p className="login-error" role="alert">{state.error}</p> : null}

      <label className="login-field">
        <User size={18} weight="duotone" aria-hidden="true" />
        <span className="login-field-label">Tên đăng nhập*</span>
        <input name="username" type="text" placeholder=" " autoComplete="username" defaultValue={username} required />
      </label>
      <PasswordField autoComplete="current-password" label="Mật khẩu tạm*" name="currentPassword" />
      <PasswordField autoComplete="new-password" label="Mật khẩu mới*" name="newPassword" />
      <PasswordField autoComplete="new-password" label="Nhập lại mật khẩu mới*" name="confirmPassword" />

      <button className="login-submit" disabled={isPending || state.ok} type="submit">
        {isPending ? "ĐANG LƯU..." : "ĐỔI MẬT KHẨU"}
      </button>
      <a className="login-back-link" href="/login">Quay lại đăng nhập</a>
    </form>
  );
}
