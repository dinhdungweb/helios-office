"use client";

import { TwoFactorPanel } from "@/components/auth/two-factor-panel";
import type { TwoFactorStatus } from "@/lib/two-factor-actions";

export function TwoFactorLogin({ status }: { status: TwoFactorStatus }) {
  return (
    <div className="login-card">
      <div className="login-card-header">
        <h2>Bảo mật 2 lớp</h2>
      </div>
      <p className="login-card-intro">Mật khẩu đã đúng. Xác thực thêm một bước để vào Helios Office.</p>
      {/* A full load, so the page frame fetches /auth/me again with the session now verified. */}
      <TwoFactorPanel mode="login" status={status} onDone={() => window.location.assign("/user")} />
      <a className="login-back-link" href="/api/auth/logout">Đăng xuất / dùng tài khoản khác</a>
    </div>
  );
}
