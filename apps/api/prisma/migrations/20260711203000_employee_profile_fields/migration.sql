ALTER TABLE "Employee"
ADD COLUMN "officialStartDate" TIMESTAMP(3),
ADD COLUMN "employeeType" TEXT,
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "attendanceCode" TEXT,
ADD COLUMN "attendanceMode" TEXT,
ADD COLUMN "payrollTemplate" TEXT,
ADD COLUMN "standardWorkdays" INTEGER;

UPDATE "Employee"
SET
  "employeeType" = COALESCE("employeeType", 'official'),
  "attendanceCode" = COALESCE("attendanceCode", "code"),
  "attendanceMode" = COALESCE("attendanceMode", 'app_and_device'),
  "payrollTemplate" = COALESCE("payrollTemplate", 'office-standard'),
  "standardWorkdays" = COALESCE("standardWorkdays", 26);

CREATE UNIQUE INDEX "Employee_attendanceCode_key" ON "Employee"("attendanceCode");
