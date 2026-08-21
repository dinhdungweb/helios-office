import { SettingsWorkspaceShell } from "@/components/admin/settings-workspace-shell";
import { TwoFactorSettingsBoard } from "@/components/admin/two-factor-settings-board";

export default function TwoFactorSettingsPage() {
  return (
    <SettingsWorkspaceShell activeItem="two-factor" mainLabel="Cài đặt bảo mật 2 lớp">
      <TwoFactorSettingsBoard />
    </SettingsWorkspaceShell>
  );
}
