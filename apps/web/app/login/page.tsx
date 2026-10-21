import { LoginShell } from "@/components/auth/login-shell";
import { FormCheckbox } from "@/components/ui/form-controls";
import { Apple, CaretDown, Eye, Lock, PlayStore, User } from "@/lib/icons";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function sanitizeRedirectTo(value: string | string[] | undefined) {
  const redirectTo = Array.isArray(value) ? value[0] : value;

  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/user";
  }

  return redirectTo;
}

function getLoginErrorMessage(value: string | string[] | undefined) {
  const error = Array.isArray(value) ? value[0] : value;

  switch (error) {
    case "credentials":
      return "Sai tên đăng nhập hoặc mật khẩu.";
    case "missing_credentials":
      return "Nhập tên đăng nhập và mật khẩu để tiếp tục.";
    case "provider":
    case "auth_config":
    case "token":
      return "Không thể đăng nhập lúc này. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
    case "session_expired":
      return "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.";
    case "account_not_linked":
      return "Tài khoản này chưa được cấp quyền vào Helios Office. Liên hệ quản trị viên để được tạo hoặc liên kết tài khoản.";
    case "account_inactive":
      return "Tài khoản Helios Office của bạn đang bị khoá hoặc chưa kích hoạt. Liên hệ quản trị viên.";
    default:
      return null;
  }
}

function getLoginNotice(value: string | string[] | undefined) {
  const notice = Array.isArray(value) ? value[0] : value;
  return notice === "password_changed" ? "Đã đổi mật khẩu. Đăng nhập bằng mật khẩu mới." : null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectTo(params?.redirectTo);
  const errorMessage = getLoginErrorMessage(params?.error);
  const notice = errorMessage ? null : getLoginNotice(params?.notice);

  return (
    <LoginShell formLabel="Biểu mẫu đăng nhập">
      <form className="login-card" action="/api/auth/login" method="post">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="login-card-header">
          <h2>Đăng nhập</h2>
          <button className="login-language" type="button" aria-label="Chọn ngôn ngữ">
            <span className="login-flag" aria-hidden="true" />
            Tiếng Việt
            <CaretDown size={17} weight="duotone" aria-hidden="true" />
          </button>
        </div>

        {errorMessage ? (
          <p className="login-error" role="alert" aria-live="polite">
            {errorMessage}
          </p>
        ) : null}

        {notice ? (
          <p className="login-notice" role="status">
            {notice}
          </p>
        ) : null}

        <label className="login-field">
          <User size={18} weight="duotone" aria-hidden="true" />
          <span className="login-field-label">Tên đăng nhập*</span>
          <input name="username" type="text" placeholder=" " autoComplete="username" required />
        </label>

        <label className="login-field">
          <Lock size={18} weight="duotone" aria-hidden="true" />
          <span className="login-field-label">Mật khẩu*</span>
          <input name="password" type="password" placeholder=" " autoComplete="current-password" required />
          <Eye size={18} weight="duotone" aria-hidden="true" />
        </label>

        <div className="login-options">
          <FormCheckbox className="login-remember" defaultChecked label="Ghi nhớ đăng nhập" />
          <a href="/login/forgot-password">Quên mật khẩu đăng nhập?</a>
        </div>

        <button className="login-submit" type="submit">
          ĐĂNG NHẬP
        </button>

        <div className="login-install">
          <p>Cài đặt ứng dụng trên điện thoại</p>
          <div className="login-store-row" aria-label="Liên kết tải ứng dụng">
            <a className="login-store-badge" href="#google-play">
              <PlayStore size={28} weight="duotone" aria-hidden="true" />
              <span>
                GET IT ON
                <strong>Google Play</strong>
              </span>
            </a>
            <a className="login-store-badge" href="#app-store">
              <Apple size={29} weight="fill" aria-hidden="true" />
              <span>
                Download on the
                <strong>App Store</strong>
              </span>
            </a>
          </div>
        </div>
      </form>
    </LoginShell>
  );
}
