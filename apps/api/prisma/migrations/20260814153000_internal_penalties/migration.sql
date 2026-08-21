CREATE TABLE "InternalPenalty" (
    "id" TEXT NOT NULL,
    "violation" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "status" "JobCatalogStatus" NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalPenalty_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalPenalty_createdById_idx" ON "InternalPenalty"("createdById");
CREATE INDEX "InternalPenalty_status_idx" ON "InternalPenalty"("status");

ALTER TABLE "InternalPenalty"
ADD CONSTRAINT "InternalPenalty_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "Employee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
