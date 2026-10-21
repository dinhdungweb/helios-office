import { AsyncLocalStorage } from "node:async_hooks";

// Per-request facts every audit entry should carry. Set by AuditInterceptor for each HTTP request.
export type AuditContext = {
  requestId: string;
  actorAccountId: string | null;
  actorEmployeeId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  // Becomes true once a service writes a domain audit entry during the request.
  recorded: boolean;
};

export const auditContextStorage = new AsyncLocalStorage<AuditContext>();
