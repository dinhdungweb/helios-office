import {
  Bell,
  BookmarkSimple,
  Buildings,
  ChatCircle,
  GearSix,
  House,
  MagnifyingGlass
} from "@/lib/icons";
import { AppLauncher } from "@/components/dashboard/app-launcher";
import type { UserProfile } from "@/lib/mock-data";

type TopNavProps = {
  user: UserProfile;
};

export function TopNav({ user }: TopNavProps) {
  return (
    <header className="top-nav">
      <div className="brand-cluster">
        <AppLauncher />
        <div className="brand-mark" aria-label="Helios Office">
          <span>H</span>
          <strong>Office</strong>
        </div>
      </div>

      <form className="global-search" role="search" aria-label="Tìm kiếm trong Helios Office">
        <MagnifyingGlass size={18} weight="duotone" aria-hidden="true" />
        <label className="sr-only" htmlFor="global-search">
          Tìm kiếm
        </label>
        <input
          id="global-search"
          name="q"
          type="search"
          placeholder="Tìm kiếm trong bài viết, người dùng..."
          autoComplete="off"
        />
      </form>

      <nav className="nav-actions" aria-label="Truy cập nhanh">
        <button className="icon-button nav-accent" type="button" aria-label="Trung tâm vận hành">
          <Buildings size={19} weight="duotone" aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" aria-label="Bài đã lưu">
          <BookmarkSimple size={18} weight="duotone" aria-hidden="true" />
        </button>
        <button className="icon-button is-active" type="button" aria-label="Trang chủ">
          <House size={18} weight="duotone" aria-hidden="true" />
        </button>
        <button className="icon-button has-badge" type="button" aria-label="Tin nhắn, 1 chưa đọc">
          <ChatCircle size={18} weight="duotone" aria-hidden="true" />
          <span aria-hidden="true">1</span>
        </button>
        <button className="icon-button" type="button" aria-label="Thông báo">
          <Bell size={18} weight="duotone" aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" aria-label="Cài đặt">
          <GearSix size={18} weight="duotone" aria-hidden="true" />
        </button>
        <a className="avatar-button" href="/user" aria-label={`Mở hồ sơ ${user.name}`}>
          <span>{user.avatar}</span>
        </a>
      </nav>
    </header>
  );
}
