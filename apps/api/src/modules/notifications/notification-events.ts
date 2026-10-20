// Notification event catalog (docs/design/notification.md §9). Seeded into NotificationEventType
// by migration 20261020080348_notifications and prisma/seed.ts — keep the three in sync.
export const NOTIFICATION_EVENT_TYPES = [
  { key: "approval.assigned", module: "approvals", label: "Có đơn cần duyệt", defaultEmail: true, mandatory: false },
  { key: "request.approved", module: "requests", label: "Đơn được duyệt", defaultEmail: true, mandatory: false },
  { key: "request.rejected", module: "requests", label: "Đơn bị từ chối", defaultEmail: true, mandatory: false },
  { key: "payslip.published", module: "payroll", label: "Phiếu lương đã công bố", defaultEmail: true, mandatory: true },
  { key: "contract.expiring", module: "contracts", label: "Hợp đồng sắp hết hạn", defaultEmail: true, mandatory: false },
  { key: "system.test", module: "system", label: "Thông báo thử", defaultEmail: false, mandatory: false }
] as const;

export type NotificationEventKey = (typeof NOTIFICATION_EVENT_TYPES)[number]["key"];
