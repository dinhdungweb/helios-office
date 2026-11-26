// Notification event catalog (docs/design/notification.md §9). Seeded into NotificationEventType
// by migrations 20261020080348_notifications, 20261126010000_approval_engine and prisma/seed.ts — keep the three in sync.
export const NOTIFICATION_EVENT_TYPES = [
  { key: "approval.assigned", module: "approvals", label: "Có đơn cần duyệt", defaultEmail: true, mandatory: false },
  { key: "request.approved", module: "requests", label: "Đơn được duyệt", defaultEmail: true, mandatory: false },
  { key: "request.rejected", module: "requests", label: "Đơn bị từ chối", defaultEmail: true, mandatory: false },
  { key: "request.returned", module: "requests", label: "Đơn bị trả lại để bổ sung", defaultEmail: true, mandatory: false },
  { key: "request.cancelled", module: "requests", label: "Đơn đã bị huỷ", defaultEmail: true, mandatory: false },
  { key: "approval.workflow_notice", module: "approvals", label: "Thông báo từ quy trình duyệt", defaultEmail: false, mandatory: false },
  { key: "payslip.published", module: "payroll", label: "Phiếu lương đã công bố", defaultEmail: true, mandatory: true },
  { key: "contract.expiring", module: "contracts", label: "Hợp đồng sắp hết hạn", defaultEmail: true, mandatory: false },
  { key: "attendance.missing_punch", module: "attendance", label: "Nhắc quên chấm công", defaultEmail: false, mandatory: false },
  { key: "system.test", module: "system", label: "Thông báo thử", defaultEmail: false, mandatory: false }
] as const;

export type NotificationEventKey = (typeof NOTIFICATION_EVENT_TYPES)[number]["key"];
