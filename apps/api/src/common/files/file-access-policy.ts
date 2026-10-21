import type { StoredFile } from "@prisma/client";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import type { FilePurpose } from "./file-purposes";

export type FileOwner = { ownerType: string; ownerId: string };

// Decides who may upload, download and delete files of one purpose. Each module registers the
// policy for its purposes with FilesService.registerPolicy; a purpose without a policy is denied.
export interface FileAccessPolicy {
  readonly purpose: FilePurpose;
  canUpload(user: AuthenticatedUser, owner: FileOwner): Promise<boolean>;
  canRead(user: AuthenticatedUser, file: StoredFile): Promise<boolean>;
  canDelete(user: AuthenticatedUser, file: StoredFile): Promise<boolean>;
}
