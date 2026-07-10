import { SmtpSettingsBoard } from "@/components/admin/smtp-settings-board";
import { UserFrame } from "@/components/user/user-frame";

export default function SmtpSettingsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Cấu hình SMTP">
      <SmtpSettingsBoard />
    </UserFrame>
  );
}
