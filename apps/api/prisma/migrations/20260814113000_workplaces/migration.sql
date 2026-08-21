CREATE TABLE "Workplace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine" TEXT,
    "administrativeArea" TEXT,
    "departmentId" TEXT,
    "description" TEXT,
    "status" "JobCatalogStatus" NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workplace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workplace_name_key" ON "Workplace"("name");
CREATE INDEX "Workplace_departmentId_idx" ON "Workplace"("departmentId");

ALTER TABLE "Workplace"
ADD CONSTRAINT "Workplace_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
