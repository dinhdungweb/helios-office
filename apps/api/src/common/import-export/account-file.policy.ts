import type { StoredFile } from "@prisma/client";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import type { FileAccessPolicy, FileOwner } from "../files/file-access-policy";
import type { FilePurpose } from "../files/file-purposes";

// Import uploads and generated exports belong to one account: only that account may upload,
// download or delete them. What may be imported/exported is checked by the job's handler.
export class AccountFilePolicy implements FileAccessPolicy {
  constructor(readonly purpose: FilePurpose) {}

  async canUpload(user: AuthenticatedUser, owner: FileOwner) {
    return Boolean(user.account) && owner.ownerId === user.account!.id;
  }

  async canRead(user: AuthenticatedUser, file: StoredFile) {
    return Boolean(user.account) && file.ownerId === user.account!.id;
  }

  async canDelete(user: AuthenticatedUser, file: StoredFile) {
    return this.canRead(user, file);
  }
}
