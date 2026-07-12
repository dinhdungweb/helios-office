CREATE TYPE "JobCatalogStatus" AS ENUM ('active', 'archived');

CREATE TABLE "JobPosition" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "family" TEXT,
  "description" TEXT,
  "status" "JobCatalogStatus" NOT NULL DEFAULT 'active',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobPosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobTitle" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rank" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "status" "JobCatalogStatus" NOT NULL DEFAULT 'active',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobTitle_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Employee"
ADD COLUMN "positionId" TEXT,
ADD COLUMN "jobTitleId" TEXT;

CREATE UNIQUE INDEX "JobPosition_code_key" ON "JobPosition"("code");
CREATE UNIQUE INDEX "JobPosition_name_key" ON "JobPosition"("name");
CREATE UNIQUE INDEX "JobTitle_code_key" ON "JobTitle"("code");
CREATE UNIQUE INDEX "JobTitle_name_key" ON "JobTitle"("name");
CREATE INDEX "Employee_positionId_idx" ON "Employee"("positionId");
CREATE INDEX "Employee_jobTitleId_idx" ON "Employee"("jobTitleId");

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "JobPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
