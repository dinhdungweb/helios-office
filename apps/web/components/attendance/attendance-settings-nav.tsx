import { CaretDown, CaretRight, GearSix, Package } from "@/lib/icons";

// Settings of the "Công" module, laid out like 1Office's Timekeeping → Settings: general settings
// (shifts, GPS/Wifi places, holidays, approval) and object settings (timekeeping; leave later).

export type AttendanceSettingsItem = "shifts" | "locations" | "holidays" | "approval" | "timekeeping";

export const ATTENDANCE_SETTINGS_BACK = "/user/attendance/timesheet";

const generalItems: Array<{ key: AttendanceSettingsItem; href: string; label: string }> = [
  { key: "shifts", href: "/user/attendance/settings/shifts", label: "Ca làm việc" },
  { key: "locations", href: "/user/attendance/settings/locations", label: "Chấm công GPS/Wifi" },
  { key: "holidays", href: "/user/attendance/settings/holidays", label: "Ngày nghỉ lễ" },
  { key: "approval", href: "/admin/settings/approval-workflows", label: "Quy trình duyệt" }
];

const objectItems: Array<{ key: AttendanceSettingsItem | "leave" | "compensatory"; href?: string; label: string }> = [
  { key: "timekeeping", href: "/user/attendance/settings/timekeeping", label: "Chấm công" },
  { key: "leave", label: "Nghỉ phép" },
  { key: "compensatory", label: "Nghỉ bù" }
];

export function AttendanceSettingsNav({ activeItem, idPrefix, label }: { activeItem: AttendanceSettingsItem; idPrefix: string; label: string }) {
  return (
    <nav className="personnel-settings-nav" aria-label={label}>
      <section aria-labelledby={`${idPrefix}-general`}>
        <h2 id={`${idPrefix}-general`}>
          <GearSix size={18} weight="duotone" aria-hidden="true" />
          <span>Cài đặt chung</span>
          <CaretDown size={16} weight="duotone" aria-hidden="true" />
        </h2>
        <div>
          {generalItems.map((item) => (
            <a aria-current={item.key === activeItem ? "page" : undefined} className={item.key === activeItem ? "is-current" : undefined} href={item.href} key={item.key}>
              {item.label}
            </a>
          ))}
        </div>
      </section>

      <section aria-labelledby={`${idPrefix}-object`}>
        <h2 id={`${idPrefix}-object`}>
          <Package size={18} weight="duotone" aria-hidden="true" />
          <span>Cài đặt đối tượng</span>
          <CaretDown size={16} weight="duotone" aria-hidden="true" />
        </h2>
        <div>
          {objectItems.map((item) =>
            item.href ? (
              <a aria-current={item.key === activeItem ? "page" : undefined} className={item.key === activeItem ? "is-current" : undefined} href={item.href} key={item.key}>
                {item.label}
              </a>
            ) : (
              // Leave and compensatory leave come with Phase 3.
              <span aria-disabled="true" className="is-disabled has-caret" key={item.key} title="Làm ở Phase 3 (đơn nghỉ)">
                {item.label}
                <CaretRight size={15} weight="duotone" aria-hidden="true" />
              </span>
            )
          )}
        </div>
      </section>
    </nav>
  );
}
