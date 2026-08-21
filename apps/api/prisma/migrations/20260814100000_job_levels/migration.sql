CREATE TABLE "JobLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "JobCatalogStatus" NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobLevel_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JobTitle" ADD COLUMN "levelId" TEXT;

CREATE UNIQUE INDEX "JobLevel_name_key" ON "JobLevel"("name");
CREATE INDEX "JobTitle_levelId_idx" ON "JobTitle"("levelId");

ALTER TABLE "JobTitle"
ADD CONSTRAINT "JobTitle_levelId_fkey"
FOREIGN KEY ("levelId") REFERENCES "JobLevel"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
