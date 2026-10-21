-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorAccountId" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'domain',
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorAccountId_idx" ON "AuditLog"("actorAccountId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorAccountId_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data: existing entries only know the actor's employee; derive the account through Employee.userAccountId.
UPDATE "AuditLog" AS a
SET "actorAccountId" = e."userAccountId"
FROM "Employee" AS e
WHERE a."actorId" = e."id"
  AND a."actorAccountId" IS NULL
  AND e."userAccountId" IS NOT NULL;
