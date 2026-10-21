import { LoginShell } from "@/components/auth/login-shell";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export default function ForgotPasswordPage() {
  return (
    <LoginShell formLabel="Quên mật khẩu">
      <ForgotPasswordForm />
    </LoginShell>
  );
}
