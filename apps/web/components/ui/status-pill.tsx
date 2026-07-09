type StatusPillProps = {
  children: React.ReactNode;
  tone?: "ready" | "review" | "planned" | "danger";
};

export function StatusPill({ children, tone = "ready" }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
