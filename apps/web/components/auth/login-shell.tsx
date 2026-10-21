import type { ReactNode } from "react";

// Brand panel + form panel shared by the sign-in, forgot-password and change-password pages.
export function LoginShell({ children, formLabel }: { children: ReactNode; formLabel: string }) {
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

      <section className="login-form-panel" aria-label={formLabel}>
        {children}
      </section>
    </main>
  );
}
