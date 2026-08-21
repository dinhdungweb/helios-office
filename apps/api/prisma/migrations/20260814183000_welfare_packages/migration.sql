CREATE TABLE "WelfarePackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "positionId" TEXT,
    "jobTitleId" TEXT,
    "jobLevelId" TEXT,
    "description" TEXT,
    "status" "JobCatalogStatus" NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelfarePackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WelfarePackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "benefitId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelfarePackageItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WelfarePackage_positionId_idx" ON "WelfarePackage"("positionId");
CREATE INDEX "WelfarePackage_jobTitleId_idx" ON "WelfarePackage"("jobTitleId");
CREATE INDEX "WelfarePackage_jobLevelId_idx" ON "WelfarePackage"("jobLevelId");
CREATE INDEX "WelfarePackage_createdById_idx" ON "WelfarePackage"("createdById");
CREATE INDEX "WelfarePackage_status_idx" ON "WelfarePackage"("status");
CREATE INDEX "WelfarePackageItem_packageId_idx" ON "WelfarePackageItem"("packageId");
CREATE INDEX "WelfarePackageItem_benefitId_idx" ON "WelfarePackageItem"("benefitId");

ALTER TABLE "WelfarePackage" ADD CONSTRAINT "WelfarePackage_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "JobPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WelfarePackage" ADD CONSTRAINT "WelfarePackage_jobTitleId_fkey"
FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WelfarePackage" ADD CONSTRAINT "WelfarePackage_jobLevelId_fkey"
FOREIGN KEY ("jobLevelId") REFERENCES "JobLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WelfarePackage" ADD CONSTRAINT "WelfarePackage_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WelfarePackageItem" ADD CONSTRAINT "WelfarePackageItem_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "WelfarePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WelfarePackageItem" ADD CONSTRAINT "WelfarePackageItem_benefitId_fkey"
FOREIGN KEY ("benefitId") REFERENCES "WelfareBenefit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
