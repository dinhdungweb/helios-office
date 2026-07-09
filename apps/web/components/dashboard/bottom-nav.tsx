import { Bell, House, MagnifyingGlass, Plus, UserCircle } from "@/lib/icons";

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Điều hướng mobile">
      <a href="#feed-title" aria-label="Trang chủ">
        <House size={18} weight="duotone" aria-hidden="true" />
        <span>Trang chủ</span>
      </a>
      <a href="#feed-title" aria-label="Bảng tin">
        <Bell size={18} weight="duotone" aria-hidden="true" />
        <span>Bảng tin</span>
      </a>
      <button type="button" aria-label="Tạo mới">
        <Plus size={19} weight="duotone" aria-hidden="true" />
      </button>
      <a href="#workflow-title" aria-label="Tìm workflow">
        <MagnifyingGlass size={18} weight="duotone" aria-hidden="true" />
        <span>Tìm</span>
      </a>
      <a href="#profile-title" aria-label="Hồ sơ">
        <UserCircle size={18} weight="duotone" aria-hidden="true" />
        <span>Hồ sơ</span>
      </a>
    </nav>
  );
}
