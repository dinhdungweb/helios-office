-- AlterTable
ALTER TABLE "EmployeeDocument" ADD COLUMN     "fileId" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocument_fileId_key" ON "EmployeeDocument"("fileId");

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

