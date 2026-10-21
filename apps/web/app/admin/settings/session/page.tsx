import { SessionSettingsBoard } from "@/components/admin/session-settings-board";
import { SettingsWorkspaceShell } from "@/components/admin/settings-workspace-shell";
import { getSessionPolicy } from "@/lib/security-policy-actions";

export default async function SessionSettingsPage() {
  const policy = await getSessionPolicy();

  return (
    <SettingsWorkspaceShell activeItem="session" mainLabel="Cài đặt phiên làm việc">
      <SessionSettingsBoard initialPolicy={policy.ok ? policy.data : null} loadError={policy.ok ? null : policy.error} />
    </SettingsWorkspaceShell>
  );
}
