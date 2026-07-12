import type { ReactNode } from "react";

type ClassValue = string | false | null | undefined;

function cn(...classNames: ClassValue[]) {
  return classNames.filter(Boolean).join(" ");
}

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

type BadgeProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  tone?: BadgeTone;
};

export function Badge({ children, className, icon, tone = "neutral" }: BadgeProps) {
  return (
    <span className={cn("ui-badge", `ui-badge--${tone}`, className)}>
      {icon}
      {children}
    </span>
  );
}
