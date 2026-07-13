-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_accountId_scope_key" ON "UserPreference"("accountId", "scope");

-- CreateIndex
CREATE INDEX "UserPreference_scope_idx" ON "UserPreference"("scope");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
