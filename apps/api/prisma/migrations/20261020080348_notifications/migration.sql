/*
  Warnings:

  - You are about to drop the column `userId` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `accountId` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "userId",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "actorAccountId" TEXT,
ADD COLUMN     "data" JSONB,
ADD COLUMN     "link" TEXT;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "accountId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "push" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("accountId","event")
);

-- CreateTable
CREATE TABLE "NotificationEventType" (
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "defaultEmail" BOOLEAN NOT NULL DEFAULT false,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationEventType_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Notification_accountId_readAt_createdAt_idx" ON "Notification"("accountId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: event catalog. Keep in sync with src/modules/notifications/notification-events.ts.
-- (The dropped "userId" column held no data: the table was empty before this migration.)
INSERT INTO "NotificationEventType" ("key", "module", "label", "defaultEmail", "mandatory") VALUES
  ('approval.assigned', 'approvals', 'Có đơn cần duyệt', true, false),
  ('request.approved', 'requests', 'Đơn được duyệt', true, false),
  ('request.rejected', 'requests', 'Đơn bị từ chối', true, false),
  ('payslip.published', 'payroll', 'Phiếu lương đã công bố', true, true),
  ('contract.expiring', 'contracts', 'Hợp đồng sắp hết hạn', true, false),
  ('system.test', 'system', 'Thông báo thử', false, false)
ON CONFLICT ("key") DO NOTHING;
