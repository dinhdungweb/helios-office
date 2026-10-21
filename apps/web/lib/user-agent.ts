// Short "Trình duyệt · Hệ điều hành" label for session and login history rows. Good enough to
// recognise one's own devices; not a full user agent parser.

const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/CocCoc/, "Cốc Cốc"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"]
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"]
];

export function describeUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return "Không rõ thiết bị";

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];

  if (!browser && !system) return userAgent.slice(0, 60);
  return [browser ?? "Trình duyệt khác", system].filter(Boolean).join(" · ");
}
