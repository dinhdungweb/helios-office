import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";

type StatusPillTone = "ready" | "review" | "planned" | "danger";

type StatusPillProps = {
  children: ReactNode;
  tone?: StatusPillTone;
};

const statusPillToneMap: Record<StatusPillTone, BadgeTone> = {
  danger: "danger",
  planned: "info",
  ready: "success",
  review: "warning"
};

export function StatusPill({ children, tone = "ready" }: StatusPillProps) {
  return (
    <Badge className={`status-pill status-pill--${tone}`} tone={statusPillToneMap[tone]}>
      {children}
    </Badge>
  );
}
