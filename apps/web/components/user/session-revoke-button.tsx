"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeSessionAction } from "@/lib/login-activity-actions";
import { Logout } from "@/lib/icons";

export function SessionRevokeButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const revoke = () =>
    startTransition(async () => {
      setError(null);
      const result = await revokeSessionAction(sessionId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  return (
    <span className="login-activity-action">
      <button className="secondary-button" disabled={isPending} type="button" onClick={revoke}>
        <Logout size={15} weight="duotone" aria-hidden="true" />
        {isPending ? "Đang đăng xuất" : "Đăng xuất"}
      </button>
      {error ? <small role="alert">{error}</small> : null}
    </span>
  );
}
