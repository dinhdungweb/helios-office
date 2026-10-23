import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import type { StoredFile } from "@prisma/client";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import type { FileAccessPolicy, FileOwner } from "../../common/files/file-access-policy";
import { FilesService } from "../../common/files/files.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { RAW_LOG_PERMISSIONS } from "./attendance-logs.service";

// Check-in photos (AT-14), owned by the employee who checks in:
// - upload: only for yourself, just before the punch;
// - read: yourself, or anyone who may see raw punches with the employee in scope;
// - delete: nobody, the photo is evidence of the punch.
@Injectable()
export class CheckinPhotoFilePolicy implements FileAccessPolicy, OnModuleInit {
  readonly purpose = "checkin_photo" as const;

  constructor(
    private readonly files: FilesService,
    private readonly dataScope: DataScopeService
  ) {}

  onModuleInit() {
    this.files.registerPolicy(this);
  }

  async canUpload(user: AuthenticatedUser, owner: FileOwner) {
    return Boolean(user.account?.employeeId) && owner.ownerId === user.account?.employeeId;
  }

  async canRead(user: AuthenticatedUser, file: StoredFile) {
    if (!file.ownerId) return false;
    if (file.ownerId === user.account?.employeeId) return true;
    const account = user.account;
    if (!account || !(account.adminRole === "system_admin" || RAW_LOG_PERMISSIONS.some((key) => account.effectivePermissionKeys.includes(key)))) return false;
    try {
      await this.dataScope.assertEmployeeInScope(await this.dataScope.resolve(user, RAW_LOG_PERMISSIONS), file.ownerId);
      return true;
    } catch (error) {
      if (error instanceof NotFoundException) return false;
      throw error;
    }
  }

  async canDelete() {
    return false;
  }
}
