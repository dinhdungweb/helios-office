import { renderNotificationEmail } from "./notification-email";

describe("renderNotificationEmail", () => {
  const base = { recipientName: "Hải Anh", title: "Đơn được duyệt", webOrigin: "https://office.helios.vn/" };

  it("builds subject, text and a link to the record", () => {
    const email = renderNotificationEmail({ ...base, body: "Nghỉ phép 22–23/10", link: "/user/requests/detail?id=1" });
    expect(email.subject).toBe("[Helios Office] Đơn được duyệt");
    expect(email.text).toContain("Xem chi tiết: https://office.helios.vn/user/requests/detail?id=1");
    expect(email.html).toContain('href="https://office.helios.vn/user/requests/detail?id=1"');
  });

  it("escapes HTML in names, titles and bodies", () => {
    const email = renderNotificationEmail({ ...base, recipientName: "<b>x</b>", title: "a & b", body: '<script>alert("x")</script>' });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("a &amp; b");
    expect(email.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it.each(["https://evil.example/phish", "//evil.example", "javascript:alert(1)"])("drops non-app link %s", (link) => {
    const email = renderNotificationEmail({ ...base, link });
    expect(email.html).not.toContain("href=");
    expect(email.text).not.toContain("Xem chi tiết");
  });
});
