-- CreateEnum
CREATE TYPE "TwoFactorMethod" AS ENUM ('totp', 'email');

-- CreateTable
CREATE TABLE "TwoFactorCredential" (
    "accountId" TEXT NOT NULL,
    "secret" JSONB,
    "digits" INTEGER NOT NULL DEFAULT 6,
    "periodSeconds" INTEGER NOT NULL DEFAULT 30,
    "confirmedAt" TIMESTAMP(3),
    "pendingSecret" JSONB,
    "pendingDigits" INTEGER,
    "pendingPeriod" INTEGER,
    "pendingCreatedAt" TIMESTAMP(3),
    "lastUsedStep" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorCredential_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "TwoFactorSession" (
    "sessionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "method" "TwoFactorMethod" NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorSession_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "TwoFactorEmailCode" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorEmailCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwoFactorSession_accountId_idx" ON "TwoFactorSession"("accountId");

-- CreateIndex
CREATE INDEX "TwoFactorEmailCode_accountId_createdAt_idx" ON "TwoFactorEmailCode"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "TwoFactorCredential" ADD CONSTRAINT "TwoFactorCredential_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorSession" ADD CONSTRAINT "TwoFactorSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorEmailCode" ADD CONSTRAINT "TwoFactorEmailCode_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
