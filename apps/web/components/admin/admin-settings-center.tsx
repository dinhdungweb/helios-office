import {
  Bell,
  Columns,
  EnvelopeSimple,
  FileText,
  FlowArrow,
  GearSix,
  GlobeHemisphereWest,
  MagicWand,
  SlidersHorizontal
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";

type SettingsCenterTile = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: Icon;
  tone: "blue" | "orange" | "red" | "purple" | "green";
};

const settingsTiles: SettingsCenterTile[] = [
  {
    key: "system",
    title: "Hệ thống",
    description: "Cài đặt phòng ban, người dùng...",
    href: "/admin/settings/accounts",
    icon: GearSix,
    tone: "blue"
  },
  {
    key: "integration",
    title: "Tích hợp",
    description: "Cài đặt hệ thống và ký số",
    href: "/admin/settings/smtp",
    icon: SlidersHorizontal,
    tone: "orange"
  },
  {
    key: "customize",
    title: "Tùy biến",
    description: "Tùy biến dữ liệu các module",
    href: "/admin/settings/accounts/permissions",
    icon: MagicWand,
    tone: "red"
  },
  {
    key: "interface",
    title: "Giao diện",
    description: "Tùy chỉnh giao diện",
    href: "/admin/settings/intranet",
    icon: Columns,
    tone: "purple"
  },
  {
    key: "notifications",
    title: "Thông báo",
    description: "Cài đặt quyền thông báo",
    href: "/admin/approvals-alerts",
    icon: Bell,
    tone: "red"
  },
  {
    key: "email-sms",
    title: "Email, SMS",
    description: "Cài đặt cổng kết nối, mẫu Email/S...",
    href: "/admin/settings/smtp",
    icon: EnvelopeSimple,
    tone: "orange"
  },
  {
    key: "automation",
    title: "Tự động",
    description: "Quy trình công việc và duyệt",
    href: "/admin/settings/accounts/permissions",
    icon: FlowArrow,
    tone: "red"
  },
  {
    key: "intranet",
    title: "Mạng nội bộ",
    description: "Cài đặt bài đăng, bình luận trên m...",
    href: "/admin/settings/intranet",
    icon: GlobeHemisphereWest,
    tone: "purple"
  },
  {
    key: "forms",
    title: "Biểu mẫu",
    description: "Biểu mẫu cho các module",
    href: "/admin/settings/accounts/permissions",
    icon: FileText,
    tone: "green"
  }
];

export function AdminSettingsCenter() {
  return (
    <main className="admin-settings-center-page" aria-labelledby="settings-center-title">
      <h2 className="sr-only" id="settings-center-title">
        Trung tâm cài đặt
      </h2>
      <div className="admin-settings-center-grid">
        {settingsTiles.map((tile) => {
          const Icon = tile.icon;

          return (
            <a className="admin-settings-center-tile" href={tile.href} key={tile.key}>
              <span className={`admin-settings-center-icon admin-settings-center-icon--${tile.tone}`}>
                <Icon size={34} weight="duotone" aria-hidden="true" />
              </span>
              <strong>{tile.title}</strong>
              <span>{tile.description}</span>
            </a>
          );
        })}
      </div>
    </main>
  );
}
