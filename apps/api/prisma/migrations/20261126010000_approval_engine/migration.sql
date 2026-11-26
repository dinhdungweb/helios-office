-- Phase 3 approval engine and requests (docs/design/approval-engine.md §11).
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('draft', 'pending', 'returned', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ApprovalStepStatus" AS ENUM ('active', 'approved', 'rejected', 'returned', 'skipped', 'cancelled');

-- CreateEnum
CREATE TYPE "ApprovalAssigneeStatus" AS ENUM ('pending', 'approved', 'rejected', 'returned', 'forwarded', 'superseded', 'cancelled');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttendanceAdjustmentType" ADD VALUE 'leave';
ALTER TYPE "AttendanceAdjustmentType" ADD VALUE 'absence';
ALTER TYPE "AttendanceAdjustmentType" ADD VALUE 'overtime';
ALTER TYPE "AttendanceAdjustmentType" ADD VALUE 'explanation';
ALTER TYPE "AttendanceAdjustmentType" ADD VALUE 'shift_swap';
ALTER TYPE "AttendanceAdjustmentType" ADD VALUE 'business_trip';


-- AlterTable
ALTER TABLE "AttendanceAdjustment" ADD COLUMN     "sourceRequestId" TEXT;

-- AlterTable
ALTER TABLE "ApprovalWorkflowDefinition" ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 1;



-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subType" TEXT,
    "requesterId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fromDate" DATE,
    "toDate" DATE,
    "quantity" DECIMAL(8,2),
    "unit" TEXT,
    "workflowVersionId" TEXT,
    "usedDefaultWorkflow" BOOLEAN NOT NULL DEFAULT false,
    "needsAttention" BOOLEAN NOT NULL DEFAULT false,
    "round" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalWorkflowVersion" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "flowDefinition" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalWorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'any',
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'active',
    "round" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAssignee" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "resolvedFrom" TEXT NOT NULL,
    "onBehalfOfId" TEXT,
    "status" "ApprovalAssigneeStatus" NOT NULL DEFAULT 'pending',
    "actedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAction" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stepId" TEXT,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'user',
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestFollower" (
    "requestId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestFollower_pkey" PRIMARY KEY ("requestId","employeeId")
);

-- CreateTable
CREATE TABLE "RequestComment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDelegation" (
    "id" TEXT NOT NULL,
    "delegatorId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "requestTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "deductsBalance" BOOLEAN NOT NULL DEFAULT false,
    "minUnit" TEXT NOT NULL DEFAULT 'half_day',
    "maxDaysPerRequest" DECIMAL(6,2),
    "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
    "gender" TEXT NOT NULL DEFAULT 'all',
    "allowDuringProbation" BOOLEAN NOT NULL DEFAULT true,
    "status" "JobCatalogStatus" NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "entitled" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "carriedOver" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "adjusted" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "used" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "pending" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "expired" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "carryOverExpiresAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalanceTransaction" (
    "id" TEXT NOT NULL,
    "balanceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "amount" DECIMAL(6,2) NOT NULL,
    "reason" TEXT,
    "requestId" TEXT,
    "sourceKey" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveBalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Request_code_key" ON "Request"("code");

-- CreateIndex
CREATE INDEX "Request_requesterId_status_idx" ON "Request"("requesterId", "status");

-- CreateIndex
CREATE INDEX "Request_type_status_idx" ON "Request"("type", "status");

-- CreateIndex
CREATE INDEX "Request_fromDate_toDate_idx" ON "Request"("fromDate", "toDate");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflowVersion_workflowId_version_key" ON "ApprovalWorkflowVersion"("workflowId", "version");

-- CreateIndex
CREATE INDEX "ApprovalStep_requestId_idx" ON "ApprovalStep"("requestId");

-- CreateIndex
CREATE INDEX "ApprovalStep_status_dueAt_idx" ON "ApprovalStep"("status", "dueAt");

-- CreateIndex
CREATE INDEX "ApprovalAssignee_employeeId_status_idx" ON "ApprovalAssignee"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalAssignee_stepId_employeeId_key" ON "ApprovalAssignee"("stepId", "employeeId");

-- CreateIndex
CREATE INDEX "ApprovalAction_requestId_createdAt_idx" ON "ApprovalAction"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestFollower_employeeId_idx" ON "RequestFollower"("employeeId");

-- CreateIndex
CREATE INDEX "RequestComment_requestId_createdAt_idx" ON "RequestComment"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_delegatorId_fromDate_toDate_idx" ON "ApprovalDelegation"("delegatorId", "fromDate", "toDate");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_code_key" ON "LeaveType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_leaveTypeId_year_key" ON "LeaveBalance"("employeeId", "leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "LeaveBalanceTransaction_requestId_idx" ON "LeaveBalanceTransaction"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalanceTransaction_balanceId_sourceKey_key" ON "LeaveBalanceTransaction"("balanceId", "sourceKey");

-- CreateIndex
CREATE INDEX "AttendanceAdjustment_sourceRequestId_idx" ON "AttendanceAdjustment"("sourceRequestId");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "ApprovalWorkflowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalWorkflowVersion" ADD CONSTRAINT "ApprovalWorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAssignee" ADD CONSTRAINT "ApprovalAssignee_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ApprovalStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAssignee" ADD CONSTRAINT "ApprovalAssignee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ApprovalStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestFollower" ADD CONSTRAINT "RequestFollower_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestComment" ADD CONSTRAINT "RequestComment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "LeaveBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data (docs/design/approval-engine.md §11) ------------------------------------------------------

-- Request codes: <prefix>-<year>-<6 digits>, numbered from one sequence.
CREATE SEQUENCE "request_code_seq";

-- Leave types from the Labour Code 2019 (Art. 113, 115) and social insurance; HR edits them (LV-09).
INSERT INTO "LeaveType" ("id", "code", "name", "paid", "deductsBalance", "minUnit", "maxDaysPerRequest", "requiresDocument", "gender", "allowDuringProbation", "sortOrder", "updatedAt") VALUES
  (gen_random_uuid()::text, 'annual',         'Nghỉ phép năm',               true,  true,  'half_day', NULL, false, 'all',    false, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'sick',           'Nghỉ ốm (BHXH)',              false, false, 'half_day', NULL, true,  'all',    true,  2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'unpaid',         'Nghỉ không lương',            false, false, 'half_day', NULL, false, 'all',    true,  3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'marriage',       'Nghỉ kết hôn',                true,  false, 'day',      3,    true,  'all',    true,  4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'child_marriage', 'Nghỉ con kết hôn',            true,  false, 'day',      1,    true,  'all',    true,  5, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'bereavement',    'Nghỉ tang (bố mẹ, vợ/chồng, con)', true, false, 'day',  3,    true,  'all',    true,  6, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'maternity',      'Nghỉ thai sản (BHXH)',        false, false, 'day',      NULL, true,  'female', true,  7, CURRENT_TIMESTAMP);

-- Old leave requests become requests. Their balances are not touched: opening balances are imported (§11).
INSERT INTO "Request" ("id", "code", "type", "subType", "requesterId", "status", "title", "payload", "fromDate", "toDate", "quantity", "unit", "round", "submittedAt", "decidedAt", "createdAt", "updatedAt")
SELECT
  lr."id",
  CASE WHEN lr."type" = 'business_trip' THEN 'CT' ELSE 'NP' END || '-' || to_char(lr."createdAt", 'YYYY') || '-' || lpad(nextval('request_code_seq')::text, 6, '0'),
  CASE WHEN lr."type" = 'business_trip' THEN 'business_trip' ELSE 'leave' END,
  CASE WHEN lr."type" = 'business_trip' THEN NULL WHEN lr."type" = 'annual_leave' THEN 'annual' ELSE lr."type" END,
  lr."employeeId",
  lr."status"::text::"RequestStatus",
  CASE WHEN lr."type" = 'business_trip' THEN 'Đơn công tác' ELSE 'Đơn xin nghỉ' END,
  jsonb_build_object(
    'migratedFrom', 'LeaveRequest',
    'leaveTypeCode', CASE WHEN lr."type" = 'annual_leave' THEN 'annual' ELSE lr."type" END,
    'ranges', jsonb_build_array(jsonb_build_object('fromDate', to_char(lr."fromDate", 'YYYY-MM-DD'), 'toDate', to_char(lr."toDate", 'YYYY-MM-DD'))),
    'reason', lr."reason"
  ),
  lr."fromDate"::date,
  lr."toDate"::date,
  lr."totalDays",
  'day',
  CASE WHEN lr."status" = 'draft' THEN 0 ELSE 1 END,
  CASE WHEN lr."status" = 'draft' THEN NULL ELSE lr."createdAt" END,
  CASE WHEN lr."status" IN ('approved', 'rejected') THEN lr."updatedAt" ELSE NULL END,
  lr."createdAt",
  lr."updatedAt"
FROM "LeaveRequest" lr;

-- Every existing workflow gets version 1 from its current diagram.
INSERT INTO "ApprovalWorkflowVersion" ("id", "workflowId", "version", "flowDefinition", "settings", "createdById", "createdAt")
SELECT
  gen_random_uuid()::text,
  w."id",
  1,
  w."flowDefinition",
  jsonb_build_object(
    'overdueAction', w."overdueAction",
    'followerId', w."followerId",
    'approvalType', w."approvalType",
    'allowAttachmentsAfterApproved', w."allowAttachmentsAfterApproved",
    'allowDocumentChangesAfterApproved', w."allowDocumentChangesAfterApproved",
    'allowDiscussionAfterApproved', w."allowDiscussionAfterApproved"
  ),
  w."updatedById",
  CURRENT_TIMESTAMP
FROM "ApprovalWorkflowDefinition" w;

-- Request attachments were owned by the unused ApprovalRequest table.
UPDATE "StoredFile" SET "ownerType" = 'Request' WHERE "ownerType" = 'ApprovalRequest';

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_employeeId_fkey";
-- DropTable
DROP TABLE "ApprovalRequest";
-- DropTable
DROP TABLE "LeaveRequest";

-- DropEnum
DROP TYPE "ApprovalStatus";
