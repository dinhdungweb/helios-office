import type { ResolvedScope } from "../data-scope/data-scope.types";

export type CellValue = string | number | boolean | Date | null;

export type SheetColumn = {
  key: string;
  // Header text in the template; imports match it case- and accent-insensitively.
  header: string;
  required?: boolean;
  // Other header texts accepted on import (older templates, English headers...).
  aliases?: string[];
  width?: number;
  // Shown in the template's second row as guidance.
  example?: string;
};

// One data row of an uploaded sheet: `row` is the 1-based Excel row number shown to users.
export type SheetRow = { row: number; values: Record<string, CellValue> };

export type RowIssue = { row: number; column?: string; message: string };

// Who runs the job and what they may touch; built when the job is created and reused by the worker.
export type TransferContext = { accountId: string; employeeId: string | null; scope: ResolvedScope };

export type RowValidation<T> = { row: number; data?: T; errors?: Array<{ column?: string; message: string }> };

// A spreadsheet import for one kind of record. `validate` sees every row at once so it can preload
// lookups and catch duplicates inside the file; `commit` must write all rows in one transaction.
export interface ImportHandler<T = unknown> {
  readonly type: string;
  readonly title: string;
  // The caller needs at least one; the data scope is the widest among those held.
  readonly permissionKeys: readonly string[];
  readonly columns: readonly SheetColumn[];
  validate(rows: SheetRow[], context: TransferContext): Promise<RowValidation<T>[]>;
  commit(rows: Array<{ row: number; data: T }>, context: TransferContext): Promise<Record<string, number>>;
}

export interface ExportHandler<P = Record<string, unknown>> {
  readonly type: string;
  readonly title: string;
  readonly permissionKeys: readonly string[];
  readonly columns: readonly SheetColumn[];
  // Validates and normalises request params; throw BadRequestException on bad input.
  parseParams(params: unknown): P;
  rows(params: P, context: TransferContext): Promise<Array<Record<string, CellValue>>>;
  fileName(params: P): string;
}
