import { SettingsWorkspaceShell } from "@/components/admin/settings-workspace-shell";
import { TwoFactorSettingsBoard } from "@/components/admin/two-factor-settings-board";
import { getTwoFactorPolicy } from "@/lib/security-policy-actions";

export default async function TwoFactorSettingsPage() {
  const policy = await getTwoFactorPolicy();

  return (
    <SettingsWorkspaceShell activeItem="two-factor" mainLabel="Cài đặt bảo mật 2 lớp">
      <TwoFactorSettingsBoard initialPolicy={policy.ok ? policy.data : null} loadError={policy.ok ? null : policy.error} />
    </SettingsWorkspaceShell>
  );
}
