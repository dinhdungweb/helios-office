import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import type { StoredFile } from "@prisma/client";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import type { FileAccessPolicy, FileOwner } from "../../common/files/file-access-policy";
import { FilesService } from "../../common/files/files.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { EMPLOYEE_DIRECTORY_KEYS, EMPLOYEE_MANAGE_KEYS } from "./employee-permissions";

// Employee profile documents (CCCD, degrees, contracts on file...):
// - read: the employee themself, or anyone who may view profiles and has the employee in scope;
// - upload/delete: profile managers with the employee in scope.
@Injectable()
export class EmployeeDocumentFilePolicy implements FileAccessPolicy, OnModuleInit {
  readonly purpose = "employee_document" as const;

  constructor(
    private readonly files: FilesService,
    private readonly dataScope: DataScopeService
  ) {}

  onModuleInit() {
    this.files.registerPolicy(this);
  }

  async canUpload(user: AuthenticatedUser, owner: FileOwner) {
    return this.holdsAny(user, EMPLOYEE_MANAGE_KEYS) && this.inScope(user, EMPLOYEE_MANAGE_KEYS, owner.ownerId);
  }

  async canRead(user: AuthenticatedUser, file: StoredFile) {
    if (file.ownerId && file.ownerId === user.account?.employeeId) {
      return true;
    }
    return Boolean(file.ownerId) && this.holdsAny(user, EMPLOYEE_DIRECTORY_KEYS) && this.inScope(user, EMPLOYEE_DIRECTORY_KEYS, file.ownerId!);
  }

  async canDelete(user: AuthenticatedUser, file: StoredFile) {
    return Boolean(file.ownerId) && this.canUpload(user, { ownerType: "Employee", ownerId: file.ownerId! });
  }

  private holdsAny(user: AuthenticatedUser, keys: string[]) {
    const account = user.account;
    return Boolean(account) && (account!.adminRole === "system_admin" || keys.some((key) => account!.effectivePermissionKeys.includes(key)));
  }

  private async inScope(user: AuthenticatedUser, keys: string[], employeeId: string) {
    try {
      await this.dataScope.assertEmployeeInScope(await this.dataScope.resolve(user, keys), employeeId);
      return true;
    } catch (error) {
      if (error instanceof NotFoundException) return false;
      throw error;
    }
  }
}
