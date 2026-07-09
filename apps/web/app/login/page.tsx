import { Apple, CaretDown, Check, Eye, Lock, PlayStore, User } from "@/lib/icons";

export default function LoginPage() {
  return (
    <main className="login-page" aria-label="Login">
      <section className="login-brand-panel" aria-label="H Office">
        <div className="login-wave-field" aria-hidden="true" />

        <div className="login-brand-copy">
          <div className="login-brand-logo" aria-label="H Office">
            <span>H</span>
            <strong>Office</strong>
          </div>
          <h1>
            Not just a <span>MANAGEMENT SOLUTION</span>
          </h1>
          <p>Work anytime, anywhere</p>
        </div>

        <div className="login-illustration" aria-hidden="true">
          <div className="login-books">
            <span />
            <span />
            <span />
          </div>
          <div className="login-laptop">
            <div className="login-laptop-screen">
              <div className="login-dashboard-preview">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="login-laptop-base" />
          </div>
          <div className="login-plant">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="login-note" />
        </div>
      </section>

      <section className="login-form-panel" aria-label="Biểu mẫu đăng nhập">
        <form className="login-card">
          <div className="login-card-header">
            <h2>Đăng nhập</h2>
            <button className="login-language" type="button" aria-label="Chọn ngôn ngữ">
              <span className="login-flag" aria-hidden="true" />
              Tiếng Việt
              <CaretDown size={17} weight="duotone" aria-hidden="true" />
            </button>
          </div>

          <label className="login-field">
            <User size={18} weight="duotone" aria-hidden="true" />
            <span className="login-field-label">Tên đăng nhập*</span>
            <input name="username" type="text" placeholder=" " autoComplete="username" />
          </label>

          <label className="login-field">
            <Lock size={18} weight="duotone" aria-hidden="true" />
            <span className="login-field-label">Mật khẩu*</span>
            <input name="password" type="password" placeholder=" " autoComplete="current-password" />
            <Eye size={18} weight="duotone" aria-hidden="true" />
          </label>

          <div className="login-options">
            <label>
              <input type="checkbox" defaultChecked />
              <span>
                <Check size={15} weight="duotone" aria-hidden="true" />
              </span>
              Ghi nhớ đăng nhập
            </label>
            <a href="#forgot-password">Quên mật khẩu đăng nhập?</a>
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
      </section>
    </main>
  );
}
