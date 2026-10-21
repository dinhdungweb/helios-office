import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import type { ExportHandler, ImportHandler } from "./import-export.types";

// Import/export types by name. Feature modules register their handlers in onModuleInit; the module
// that provides them is loaded by both the API and the worker process.
@Injectable()
export class ImportExportRegistry {
  private readonly imports = new Map<string, ImportHandler>();
  private readonly exports = new Map<string, ExportHandler>();

  registerImport<T>(handler: ImportHandler<T>) {
    this.imports.set(handler.type, handler as ImportHandler<unknown>);
  }

  registerExport<P>(handler: ExportHandler<P>) {
    this.exports.set(handler.type, handler as unknown as ExportHandler);
  }

  importHandler(type: string) {
    const handler = this.imports.get(type);
    if (!handler) throw new BadRequestException(`Unknown import type "${type}"`);
    return handler;
  }

  exportHandler(type: string) {
    const handler = this.exports.get(type);
    if (!handler) throw new BadRequestException(`Unknown export type "${type}"`);
    return handler;
  }

  // Types the caller may use, for building the UI.
  available(user: AuthenticatedUser) {
    const describe = (handler: ImportHandler | ExportHandler) => ({
      type: handler.type,
      title: handler.title,
      columns: handler.columns.map(({ key, header, required }) => ({ key, header, required: Boolean(required) }))
    });
    return {
      imports: [...this.imports.values()].filter((handler) => holdsAny(user, handler.permissionKeys)).map(describe),
      exports: [...this.exports.values()].filter((handler) => holdsAny(user, handler.permissionKeys)).map(describe)
    };
  }

  assertAllowed(user: AuthenticatedUser, handler: { permissionKeys: readonly string[] }) {
    if (!holdsAny(user, handler.permissionKeys)) {
      throw new ForbiddenException("Required permission is missing");
    }
  }
}

export function holdsAny(user: AuthenticatedUser, keys: readonly string[]) {
  const account = user.account;
  return Boolean(account) && (account!.adminRole === "system_admin" || keys.some((key) => account!.effectivePermissionKeys.includes(key)));
}
