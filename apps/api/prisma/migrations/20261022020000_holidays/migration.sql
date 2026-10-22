-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('holiday', 'compensatory_workday', 'company_off');

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HolidayType" NOT NULL DEFAULT 'holiday',
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- Seed the fixed solar public holidays (Labour Code 2019, Article 112) for 2026 and 2027. Lunar
-- holidays (Tết Nguyên đán, Giỗ Tổ) and the day next to National Day are set by the government each
-- year, so HR enters them (docs/design/attendance-engine.md §10).
INSERT INTO "Holiday" ("id", "date", "name", "type", "paid", "updatedAt") VALUES
  ('holiday-2026-01-01', '2026-01-01', 'Tết Dương lịch', 'holiday', true, CURRENT_TIMESTAMP),
  ('holiday-2026-04-30', '2026-04-30', 'Ngày Chiến thắng', 'holiday', true, CURRENT_TIMESTAMP),
  ('holiday-2026-05-01', '2026-05-01', 'Quốc tế Lao động', 'holiday', true, CURRENT_TIMESTAMP),
  ('holiday-2026-09-02', '2026-09-02', 'Quốc khánh', 'holiday', true, CURRENT_TIMESTAMP),
  ('holiday-2027-01-01', '2027-01-01', 'Tết Dương lịch', 'holiday', true, CURRENT_TIMESTAMP),
  ('holiday-2027-04-30', '2027-04-30', 'Ngày Chiến thắng', 'holiday', true, CURRENT_TIMESTAMP),
  ('holiday-2027-05-01', '2027-05-01', 'Quốc tế Lao động', 'holiday', true, CURRENT_TIMESTAMP),
  ('holiday-2027-09-02', '2027-09-02', 'Quốc khánh', 'holiday', true, CURRENT_TIMESTAMP)
ON CONFLICT ("date") DO NOTHING;
