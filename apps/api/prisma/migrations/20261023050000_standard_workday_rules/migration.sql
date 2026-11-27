-- AT-25: standard work units per group of departments x positions.
-- CreateEnum
CREATE TYPE "StandardWorkdayMode" AS ENUM ('schedule', 'auto', 'fixed');

-- CreateTable
CREATE TABLE "StandardWorkdayRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "positionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mode" "StandardWorkdayMode" NOT NULL,
    "fixedUnits" DECIMAL(5,2),
    "adjustUnits" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "effectiveFrom" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandardWorkdayRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StandardWorkdayRule_effectiveFrom_idx" ON "StandardWorkdayRule"("effectiveFrom");
