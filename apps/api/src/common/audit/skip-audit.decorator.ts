import { SetMetadata } from "@nestjs/common";

export const SKIP_AUDIT_KEY = "helios:skip_audit";

// Excludes a mutation route from the HTTP safety-net audit entry (AuditInterceptor). Use only for
// writes that are not business data (UI preferences) or that keep their own log (attendance sync).
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
