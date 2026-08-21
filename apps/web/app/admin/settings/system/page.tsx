import { SettingsWorkspaceShell } from "@/components/admin/settings-workspace-shell";
import { SystemSettingsBoard } from "@/components/admin/system-settings-board";

export default function SystemSettingsPage() {
  return (
    <SettingsWorkspaceShell activeItem="system" mainLabel="Cài đặt hệ thống">
      <SystemSettingsBoard />
    </SettingsWorkspaceShell>
  );
}
