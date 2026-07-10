"use server";

import { revalidatePath } from "next/cache";
import {
  activateAccount,
  closeAccount,
  createAccount,
  updateAccount,
  type AccountLifecycleStatus,
  type AccountLicensePlan,
  type AccountMutationPayload,
  type AccountRole
} from "@/lib/account-access-api";

export type AccountFormState = {
  ok: boolean;
  error?: string;
};

const accountFormInitialError = "Không lưu được tài khoản. Hãy kiểm tra đăng nhập admin rồi thử lại.";

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

function readCustomPermissionKeys(formData: FormData) {
  return formData
    .getAll("customPermissionKeys")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function readAccountPayload(formData: FormData): Required<Pick<AccountMutationPayload, "email" | "displayName">> & AccountMutationPayload {
  const customPermissionKeys = readCustomPermissionKeys(formData);

  return {
    email: readRequiredString(formData, "email"),
    displayName: readRequiredString(formData, "displayName"),
    adminRole: readRequiredString(formData, "adminRole") as AccountRole,
    licensePlan: readRequiredString(formData, "licensePlan") as AccountLicensePlan,
    accountStatus: readRequiredString(formData, "accountStatus") as AccountLifecycleStatus,
    permissionGroupId: readOptionalString(formData, "permissionGroupId"),
    customPermissionKeys,
    customPermissionNote: readNullableString(formData, "customPermissionNote")
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

export async function createAccountAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  try {
    await createAccount(readAccountPayload(formData));
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

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : accountFormInitialError
    };
  }
}
