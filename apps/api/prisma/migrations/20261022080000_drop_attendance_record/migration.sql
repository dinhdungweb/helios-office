-- DropForeignKey
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_employeeId_fkey";

-- DropTable
DROP TABLE "AttendanceRecord";

-- DropEnum
DROP TYPE "AttendanceStatus";
