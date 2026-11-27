"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, PaperPlaneTilt } from "@/lib/icons";
import { requestOptionsAction, saveRequestAction } from "@/lib/request-actions";
import type { RequestDetail, RequestOptions } from "@/lib/request-format";

// Shared by the absence, overtime, check-in/out, shift change and resignation forms (LV-17 → LV-21).

export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

// Saves as a draft or sends for approval, then opens the request. The API's reason is shown when it refuses.
export function useRequestSave(type: string, request: RequestDetail | null | undefined, loadError?: string) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(loadError ?? null);
  const [saving, startSaving] = useTransition();

  const save = (payload: object, submit: boolean) => {
    setError(null);
    startSaving(async () => {
      const result = await saveRequestAction({
        type,
        requestId: request?.id,
        version: request?.version,
        payload,
        followerIds: request?.followers.map((person) => person.id) ?? [],
        submit
      });
      if (!result.ok) return setError(result.error);
      router.push(`/user/requests/detail?id=${result.data.id}` as Route);
    });
  };

  return { save, saving, error, setError };
}

// The signed-in person's shift, holiday and recorded punches on a date (GET /attendance-requests/options).
export function useDayOptions(date: string) {
  const [options, setOptions] = useState<RequestOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await requestOptionsAction(date);
      if (cancelled) return;
      if (result.ok) {
        setOptions(result.data);
        setError(null);
      } else {
        setOptions(null);
        setError(result.error);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [date]);

  return { options, error };
}

export function RequestFormFooter({ saving, disabled, onDraft, request, error }: { saving: boolean; disabled?: boolean; onDraft: () => void; request?: RequestDetail | null; error: string | null }) {
  return (
    <>
      {error ? (
        <p className="leave-save-error" role="alert">
          {error}
        </p>
      ) : null}
      <footer className="leave-create-actionbar">
        <button className="primary-button" type="submit" disabled={saving || disabled}>
          <PaperPlaneTilt size={15} weight="duotone" aria-hidden="true" />
          {saving ? "Đang gửi…" : "Gửi duyệt"}
        </button>
        <button className="secondary-button" type="button" disabled={saving} onClick={onDraft}>
          <Check size={15} weight="duotone" aria-hidden="true" />
          Lưu nháp
        </button>
        <Link className="secondary-button" href={(request ? `/user/requests/detail?id=${request.id}` : "/user/requests") as Route}>
          Huỷ bỏ
        </Link>
      </footer>
    </>
  );
}
