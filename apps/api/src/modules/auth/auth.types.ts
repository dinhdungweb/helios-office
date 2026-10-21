import type { AccountAdminRole, AccountLifecycleStatus } from "@prisma/client";
import type { JWTPayload } from "jose";

export type AuthenticatedUserAccount = {
  id: string;
  email: string;
  displayName: string;
  employeeId: string | null;
  adminRole: AccountAdminRole;
  accountStatus: AccountLifecycleStatus;
  effectivePermissionKeys: string[];
};

export type AuthenticatedUser = {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
  account: AuthenticatedUserAccount | null;
  claims: JWTPayload;
};

export type RequestWithUser = {
  headers: {
    authorization?: string | string[];
  };
  user?: AuthenticatedUser;
};

// Machine-readable reasons in 401 bodies; the web maps them to login page messages.
export const AUTH_ERROR_CODES = {
  accountNotLinked: "account_not_linked",
  accountInactive: "account_inactive",
  sessionRevoked: "session_revoked",
  twoFactorRequired: "two_factor_required",
  twoFactorStepUpRequired: "two_factor_step_up_required"
} as const;
