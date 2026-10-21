// Default email template for notifications (NT-06). Message templates editable by admins come with ST-11.

export type NotificationEmailJob = {
  accountId: string;
  event: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

// Only same-app paths become links, so a notification cannot point the email at another site.
function absoluteLink(webOrigin: string, link: string | null | undefined) {
  if (!link || !link.startsWith("/") || link.startsWith("//")) return null;
  return `${webOrigin.replace(/\/+$/, "")}${link}`;
}

export function renderNotificationEmail(input: {
  recipientName: string;
  title: string;
  body?: string | null;
  link?: string | null;
  webOrigin: string;
}) {
  const url = absoluteLink(input.webOrigin, input.link);
  const lines = [`Xin chào ${input.recipientName},`, "", input.title, ...(input.body ? [input.body] : []), ...(url ? ["", `Xem chi tiết: ${url}`] : [])];

  const html = [
    `<p>Xin chào ${escapeHtml(input.recipientName)},</p>`,
    `<p><strong>${escapeHtml(input.title)}</strong></p>`,
    input.body ? `<p>${escapeHtml(input.body)}</p>` : "",
    url ? `<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 16px;background:#30363d;color:#ffffff;border-radius:6px;text-decoration:none">Xem chi tiết</a></p>` : "",
    `<p style="color:#6b7280;font-size:12px">Email tự động từ Helios Office. Bạn có thể tắt loại thông báo này trong cài đặt cá nhân.</p>`
  ].join("");

  return { subject: `[Helios Office] ${input.title}`, text: lines.join("\n"), html };
}
