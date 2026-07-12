ALTER TABLE "UserAccount"
ADD COLUMN "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "temporaryPasswordIssuedAt" TIMESTAMP(3),
ADD COLUMN "inviteEmailRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "inviteSentAt" TIMESTAMP(3);
