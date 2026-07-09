import { Bell, GearSix } from "@phosphor-icons/react/dist/ssr";
import type { SocialNavItem, SystemNotice, UserProfile } from "@/lib/mock-data";

type LeftSidebarProps = {
  user: UserProfile;
  navigation: SocialNavItem[];
  systemNotices: SystemNotice[];
};

export function LeftSidebar({ user, navigation, systemNotices }: LeftSidebarProps) {
  return (
    <aside className="left-sidebar" aria-label="Thông tin cá nhân và mạng nội bộ">
      <section className="profile-card" aria-labelledby="profile-title">
        <div className="cover-strip" aria-hidden="true" />
        <div className="profile-body">
          <div className="large-avatar">{user.avatar}</div>
          <h2 id="profile-title">{user.name}</h2>
          <p>{user.title}</p>
          <small>{user.department}</small>
        </div>
      </section>

      <section className="module-card social-menu-card" aria-labelledby="module-title">
        <h2 className="sr-only" id="module-title">Mạng nội bộ</h2>
        <nav className="module-list social-menu" aria-label="Mạng nội bộ">
          {navigation.map((item) => (
            <a
              className={item.active ? "module-link social-menu-link is-current" : "module-link social-menu-link"}
              href={`#${item.label}`}
              key={item.label}
            >
              <item.icon size={17} weight="duotone" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </section>

      <section className="system-card" aria-labelledby="system-title">
        <header className="system-card-header">
          <GearSix size={18} weight="duotone" aria-hidden="true" />
          <h2 id="system-title">Thông báo hệ thống</h2>
        </header>
        <div className="system-notice-list">
          {systemNotices.map((notice) => (
            <article key={notice.id}>
              <Bell size={16} weight="duotone" aria-hidden="true" />
              <div>
                <strong>{notice.title}</strong>
                <p>
                  {notice.time} · {notice.type}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}
