"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getExportAction, startExportAction } from "@/lib/import-export-actions";

type ExportState = { status: "idle" } | { status: "running" } | { status: "done"; message: string } | { status: "error"; message: string };

const POLL_INTERVAL_MS = 1_000;
const POLL_LIMIT = 120;

// Server-side Excel export (CORE-19): the worker builds the file within the user's data scope;
// this hook starts it, waits for it and then downloads it.
export function useServerExport() {
  const [state, setState] = useState<ExportState>({ status: "idle" });
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const run = useCallback(async (type: string, params: Record<string, string> = {}) => {
    setState({ status: "running" });
    const started = await startExportAction(type, params);
    if (!started.ok) {
      setState({ status: "error", message: started.error });
      return;
    }

    for (let attempt = 0; attempt < POLL_LIMIT && !cancelled.current; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const result = await getExportAction(started.data.id);
      if (!result.ok) {
        setState({ status: "error", message: result.error });
        return;
      }
      if (result.data.status === "failed") {
        setState({ status: "error", message: "Không tạo được file Excel, hãy thử lại." });
        return;
      }
      if (result.data.status === "ready" && result.data.downloadUrl) {
        window.location.assign(result.data.downloadUrl);
        setState({ status: "done", message: `Đã xuất ${result.data.rowCount ?? 0} dòng ra ${result.data.fileName ?? "file Excel"}.` });
        return;
      }
    }
    if (!cancelled.current) setState({ status: "error", message: "Xuất file lâu hơn dự kiến, hãy thử lại sau." });
  }, []);

  const dismiss = useCallback(() => setState({ status: "idle" }), []);

  return { state, run, dismiss, running: state.status === "running" };
}

export function ExportStatus({ state, onDismiss }: { state: ExportState; onDismiss: () => void }) {
  if (state.status === "idle") return null;

  return (
    <p className={state.status === "error" ? "export-status is-error" : "export-status"} role={state.status === "error" ? "alert" : "status"}>
      <span>{state.status === "running" ? "Đang tạo file Excel..." : state.message}</span>
      {state.status !== "running" ? (
        <button type="button" onClick={onDismiss}>Đóng</button>
      ) : null}
    </p>
  );
}
