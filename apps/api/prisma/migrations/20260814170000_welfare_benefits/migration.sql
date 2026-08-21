CREATE TABLE "WelfareBenefit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "status" "JobCatalogStatus" NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelfareBenefit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WelfareBenefit_createdById_idx" ON "WelfareBenefit"("createdById");
CREATE INDEX "WelfareBenefit_status_idx" ON "WelfareBenefit"("status");

ALTER TABLE "WelfareBenefit"
ADD CONSTRAINT "WelfareBenefit_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "Employee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
