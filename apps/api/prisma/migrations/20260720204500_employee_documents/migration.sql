CREATE TABLE "EmployeeDocument" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "content" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeDocument_employeeId_fieldName_idx" ON "EmployeeDocument"("employeeId", "fieldName");

ALTER TABLE "EmployeeDocument"
ADD CONSTRAINT "EmployeeDocument_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
