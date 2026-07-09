import { Cake, CaretRight, Megaphone, UsersThree } from "@/lib/icons";
import type { Announcement } from "@/lib/mock-data";

type RightSidebarProps = {
  announcements: Announcement[];
  birthdays: Array<{ name: string; initials: string; date: string }>;
  groups: Array<{ name: string; members: number; initials: string }>;
};

export function RightSidebar({
  announcements,
  birthdays,
  groups
}: RightSidebarProps) {
  return (
    <aside className="right-sidebar" aria-label="Widget nhanh">
      <section className="widget-card" aria-labelledby="birthday-title">
        <div className="widget-title">
          <Cake size={19} weight="duotone" aria-hidden="true" />
          <h2 id="birthday-title">Sinh nhật</h2>
        </div>
        <p className="muted">Hôm nay có {birthdays.filter((item) => item.date === "Hôm nay").length} sinh nhật.</p>
        <div className="widget-divider" />
        <strong className="widget-subtitle">Sinh nhật sắp tới</strong>
        <div className="avatar-stack" aria-label="Sinh nhật sắp tới">
          {birthdays.map((birthday) => (
            <span key={birthday.name} title={`${birthday.name} - ${birthday.date}`}>
              {birthday.initials}
            </span>
          ))}
          <button className="icon-button" type="button" aria-label="Xem sinh nhật sắp tới">
            <CaretRight size={16} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="widget-card" aria-labelledby="notice-title">
        <div className="widget-title">
          <Megaphone size={19} weight="duotone" aria-hidden="true" />
          <h2 id="notice-title">Thông báo công ty</h2>
        </div>
        <div className="compact-list">
          {announcements.map((notice) => (
            <article key={notice.id}>
              <strong>{notice.title}</strong>
              <p>{notice.time}</p>
              <small>{notice.audience} · {notice.readRate}% đã đọc</small>
            </article>
          ))}
        </div>
      </section>

      <section className="widget-card" aria-labelledby="group-title">
        <div className="widget-title">
          <UsersThree size={19} weight="duotone" aria-hidden="true" />
          <h2 id="group-title">Nhóm của bạn</h2>
        </div>
        <div className="group-list">
          {groups.map((group) => (
            <a href={`#${group.name}`} key={group.name}>
              <span>{group.initials}</span>
              <strong>{group.name}</strong>
              <small>{group.members} thành viên</small>
            </a>
          ))}
        </div>
      </section>
    </aside>
  );
}
