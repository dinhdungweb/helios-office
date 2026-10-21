import { LoginShell } from "@/components/auth/login-shell";
import { TemporaryPasswordForm } from "@/components/auth/password-forms";

type ChangePasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChangePasswordPage({ searchParams }: ChangePasswordPageProps) {
  const params = await searchParams;
  const username = Array.isArray(params?.username) ? params.username[0] : params?.username;

  return (
    <LoginShell formLabel="Đổi mật khẩu tạm">
      <TemporaryPasswordForm username={username?.slice(0, 254) ?? ""} />
    </LoginShell>
  );
}
