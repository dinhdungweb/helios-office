"use server";

import { revalidatePath } from "next/cache";
import {
  activateAccount,
  archivePermissionGroup,
  closeAccount,
  createAccount,
  createPermissionGroup,
  resendAccountInvite,
  restorePermissionGroup,
  updateAccount,
  updatePermissionGroup,
  type AccountLifecycleStatus,
  type AccountMutationPayload,
  type AccountRole,
  type PermissionGroupMutationPayload
} from "@/lib/account-access-api";

export type AccountFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

export type GroupFormState = {
  ok: boolean;
  error?: string;
};

const accountFormInitialError = "Không lưu được tài khoản. Hãy kiểm tra đăng nhập admin rồi thử lại.";
const groupFormInitialError = "Không lưu được nhóm quyền. Hãy kiểm tra đăng nhập admin rồi thử lại.";

function readAccountId(formData: FormData) {
  const accountId = formData.get("accountId");

  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new Error("Missing account id");
  }

  return accountId;
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== "none" ? trimmed : undefined;
}

function readNullableString(formData: FormData, key: string) {
  return readOptionalString(formData, key) ?? null;
}

function readRequiredString(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);

  if (!value) {
    throw new Error(`Missing ${key}`);
  }

  return value;
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readCustomPermissionKeys(formData: FormData) {
  return formData
    .getAll("customPermissionKeys")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function readPermissionKeys(formData: FormData) {
  return formData
    .getAll("permissionKeys")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function readAccountPayload(
  formData: FormData,
  options: { includeProvisionPolicy?: boolean } = {}
): Required<Pick<AccountMutationPayload, "email" | "displayName">> & AccountMutationPayload {
  const customPermissionKeys = readCustomPermissionKeys(formData);

  return {
    username: readOptionalString(formData, "username"),
    initialPassword: readOptionalString(formData, "initialPassword"),
    requirePasswordChange: options.includeProvisionPolicy ? readBoolean(formData, "requirePasswordChange") : undefined,
    sendInviteEmail: options.includeProvisionPolicy ? readBoolean(formData, "sendInviteEmail") : undefined,
    email: readRequiredString(formData, "email"),
    displayName: readRequiredString(formData, "displayName"),
    adminRole: readRequiredString(formData, "adminRole") as AccountRole,
    accountStatus: readRequiredString(formData, "accountStatus") as AccountLifecycleStatus,
    permissionGroupId: readOptionalString(formData, "permissionGroupId"),
    employeeId: readOptionalString(formData, "employeeId"),
    customPermissionKeys,
    customPermissionNote: readNullableString(formData, "customPermissionNote")
  };
}

function readGroupPayload(formData: FormData): PermissionGroupMutationPayload {
  return {
    name: readRequiredString(formData, "name"),
    description: readRequiredString(formData, "description"),
    roleScope: readRequiredString(formData, "roleScope") as AccountRole,
    permissionKeys: readPermissionKeys(formData)
  };
}

export async function activateAccountAction(formData: FormData) {
  await activateAccount(readAccountId(formData));
  revalidatePath("/admin/settings/accounts");
}

export async function closeAccountAction(formData: FormData) {
  await closeAccount(readAccountId(formData));
  revalidatePath("/admin/settings/accounts");
}

export async function resendAccountInviteAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  try {
    await resendAccountInvite(readAccountId(formData));
    revalidatePath("/admin/settings/accounts");

    return {
      ok: true,
      message: "Đã gửi yêu cầu invite/reset password."
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : accountFormInitialError
    };
  }
}

export async function createAccountAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  try {
    await createAccount(readAccountPayload(formData, { includeProvisionPolicy: true }));
    revalidatePath("/admin/settings/accounts");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : accountFormInitialError
    };
  }
}

export async function updateAccountAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  try {
    const accountId = readAccountId(formData);
    const payload = readAccountPayload(formData);

    await updateAccount(accountId, {
      ...payload,
      permissionGroupId: readNullableString(formData, "permissionGroupId")
    });
    revalidatePath("/admin/settings/accounts");
    revalidatePath(`/admin/settings/accounts/${accountId}`);

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : accountFormInitialError
    };
  }
}

export async function createPermissionGroupAction(_state: GroupFormState, formData: FormData): Promise<GroupFormState> {
  try {
    await createPermissionGroup(readGroupPayload(formData));
    revalidatePath("/admin/settings/accounts");
    revalidatePath("/admin/settings/accounts/groups");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : groupFormInitialError
    };
  }
}

export async function updatePermissionGroupAction(_state: GroupFormState, formData: FormData): Promise<GroupFormState> {
  try {
    const groupId = readRequiredString(formData, "groupId");

    await updatePermissionGroup(groupId, readGroupPayload(formData));
    revalidatePath("/admin/settings/accounts");
    revalidatePath("/admin/settings/accounts/groups");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : groupFormInitialError
    };
  }
}

export async function archivePermissionGroupAction(formData: FormData) {
  const groupId = readRequiredString(formData, "groupId");

  await archivePermissionGroup(groupId);
  revalidatePath("/admin/settings/accounts");
  revalidatePath("/admin/settings/accounts/groups");
}

export async function restorePermissionGroupAction(formData: FormData) {
  const groupId = readRequiredString(formData, "groupId");

  await restorePermissionGroup(groupId);
  revalidatePath("/admin/settings/accounts");
  revalidatePath("/admin/settings/accounts/groups");
}
