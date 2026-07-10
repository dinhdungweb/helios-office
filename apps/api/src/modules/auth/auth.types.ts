import type { AccountAdminRole, AccountLifecycleStatus, LicensePlan } from "@prisma/client";
import type { JWTPayload } from "jose";

export type AuthenticatedUserAccount = {
  id: string;
  email: string;
  displayName: string;
  adminRole: AccountAdminRole;
  licensePlan: LicensePlan;
  accountStatus: AccountLifecycleStatus;
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
