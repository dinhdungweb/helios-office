import { SessionSettingsBoard } from "@/components/admin/session-settings-board";
import { SettingsWorkspaceShell } from "@/components/admin/settings-workspace-shell";

export default function SessionSettingsPage() {
  return (
    <SettingsWorkspaceShell activeItem="session" mainLabel="Cài đặt phiên làm việc">
      <SessionSettingsBoard />
    </SettingsWorkspaceShell>
  );
}
