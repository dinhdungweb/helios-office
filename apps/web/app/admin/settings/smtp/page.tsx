import { SmtpSettingsBoard } from "@/components/admin/smtp-settings-board";
import { getSmtpSettingsData } from "@/lib/smtp-settings-api";
import { UserFrame } from "@/components/user/user-frame";

export default async function SmtpSettingsPage() {
  const data = await getSmtpSettingsData();

  return (
    <UserFrame activeModule="admin" showSearch title="Cấu hình SMTP">
      <SmtpSettingsBoard data={data} />
    </UserFrame>
  );
}
