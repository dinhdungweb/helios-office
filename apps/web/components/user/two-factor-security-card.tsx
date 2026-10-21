"use client";

import { useRouter } from "next/navigation";
import { TwoFactorPanel } from "@/components/auth/two-factor-panel";
import type { TwoFactorStatus } from "@/lib/two-factor-actions";

// AU-18 on the user's security page: set up, replace or remove the authenticator app.
export function TwoFactorSecurityCard({ status }: { status: TwoFactorStatus | null }) {
  const router = useRouter();

  return (
    <section className="security-card" aria-labelledby="security-two-factor-title">
      <header>
        <h2 id="security-two-factor-title">Bảo mật 2 lớp</h2>
        <p>
          {status?.policy.enforced
            ? "Công ty bắt buộc bảo mật 2 lớp: mỗi lần đăng nhập cần thêm mã từ app xác thực hoặc email."
            : "Không bắt buộc, nhưng nên bật: kẻ gian có mật khẩu của bạn vẫn không đăng nhập được."}
        </p>
      </header>
      <div className="security-card-body">
        {status ? (
          <TwoFactorPanel key={`${status.totp.enrolled}-${status.totp.confirmedAt}`} mode="manage" status={status} onDone={() => router.refresh()} />
        ) : (
          <p className="login-activity-empty">Không tải được trạng thái bảo mật 2 lớp.</p>
        )}
      </div>
    </section>
  );
}
