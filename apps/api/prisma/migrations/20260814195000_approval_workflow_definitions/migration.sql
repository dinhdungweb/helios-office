CREATE TYPE "ApprovalWorkflowStatus" AS ENUM ('draft', 'active', 'archived');

CREATE TABLE "ApprovalWorkflowDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "status" "ApprovalWorkflowStatus" NOT NULL DEFAULT 'active',
    "objectType" TEXT NOT NULL,
    "subObject" TEXT NOT NULL DEFAULT 'all',
    "versionMode" BOOLEAN NOT NULL DEFAULT true,
    "approvalType" TEXT NOT NULL DEFAULT 'workflow',
    "followerId" TEXT,
    "showFlowInObject" BOOLEAN NOT NULL DEFAULT false,
    "allowAttachmentsAfterApproved" BOOLEAN NOT NULL DEFAULT false,
    "allowDocumentChangesAfterApproved" BOOLEAN NOT NULL DEFAULT false,
    "allowDiscussionAfterApproved" BOOLEAN NOT NULL DEFAULT true,
    "overdueAction" TEXT NOT NULL DEFAULT 'none',
    "flowDefinition" JSONB NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalWorkflowDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApprovalWorkflowDefinition_code_key" ON "ApprovalWorkflowDefinition"("code");
CREATE INDEX "ApprovalWorkflowDefinition_status_idx" ON "ApprovalWorkflowDefinition"("status");
CREATE INDEX "ApprovalWorkflowDefinition_objectType_idx" ON "ApprovalWorkflowDefinition"("objectType");
CREATE INDEX "ApprovalWorkflowDefinition_followerId_idx" ON "ApprovalWorkflowDefinition"("followerId");
CREATE INDEX "ApprovalWorkflowDefinition_createdById_idx" ON "ApprovalWorkflowDefinition"("createdById");
CREATE INDEX "ApprovalWorkflowDefinition_updatedById_idx" ON "ApprovalWorkflowDefinition"("updatedById");

ALTER TABLE "ApprovalWorkflowDefinition" ADD CONSTRAINT "ApprovalWorkflowDefinition_followerId_fkey"
FOREIGN KEY ("followerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalWorkflowDefinition" ADD CONSTRAINT "ApprovalWorkflowDefinition_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalWorkflowDefinition" ADD CONSTRAINT "ApprovalWorkflowDefinition_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
