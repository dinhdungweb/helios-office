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
