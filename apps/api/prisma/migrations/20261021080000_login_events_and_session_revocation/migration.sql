-- CreateEnum
CREATE TYPE "LoginOutcome" AS ENUM ('success', 'invalid_credentials', 'password_update_required', 'account_not_linked', 'account_inactive');

-- AlterTable
ALTER TABLE "UserAccount" ADD COLUMN     "sessionsRevokedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "keycloakUserId" TEXT,
    "username" TEXT NOT NULL,
    "outcome" "LoginOutcome" NOT NULL,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginEvent_accountId_createdAt_idx" ON "LoginEvent"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_sessionId_idx" ON "LoginEvent"("sessionId");

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
