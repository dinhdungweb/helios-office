import { AdminSettingsService } from "./admin-settings.service";

// Covers the branches of sendEmail; SMTP parsing/decryption helpers are stubbed because they are
// shared with the settings screens and tested through them.
describe("AdminSettingsService.sendEmail", () => {
  function serviceWith(payload: Record<string, unknown>, missing: string[] = []) {
    const service = Object.create(AdminSettingsService.prototype) as AdminSettingsService;
    const sent: unknown[] = [];
    const internals = service as unknown as Record<string, unknown>;
    internals.ensureSmtpSetting = async () => ({ payload });
    internals.readSmtpPayload = (value: unknown) => value;
    internals.getMissingRequiredSmtpFields = () => missing;
    internals.createSmtpTransport = () => ({
      sendMail: async (message: unknown) => {
        sent.push(message);
        return { messageId: "<id-1@helios>" };
      }
    });
    return { service, sent };
  }

  const message = { to: "a@helios.vn", subject: "S", text: "T", html: "<p>T</p>" };

  it("does not send (and does not throw) when SMTP is switched off", async () => {
    const { service, sent } = serviceWith({ enabled: false });
    await expect(service.sendEmail(message)).resolves.toEqual({ sent: false, reason: "smtp_disabled" });
    expect(sent).toHaveLength(0);
  });

  it("reports incomplete settings instead of retrying", async () => {
    const { service, sent } = serviceWith({ enabled: true }, ["host", "fromEmail"]);
    await expect(service.sendEmail(message)).resolves.toEqual({ sent: false, reason: "smtp_incomplete: host, fromEmail" });
    expect(sent).toHaveLength(0);
  });

  it("sends with the configured sender", async () => {
    const { service, sent } = serviceWith({ enabled: true, fromName: "Helios", fromEmail: "no-reply@helios.vn", replyTo: "" });
    await expect(service.sendEmail(message)).resolves.toEqual({ sent: true, messageId: "<id-1@helios>" });
    expect(sent[0]).toMatchObject({ from: { name: "Helios", address: "no-reply@helios.vn" }, to: "a@helios.vn", subject: "S" });
  });
});
