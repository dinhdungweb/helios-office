import * as ExcelJS from "exceljs";
import type { CellValue, SheetColumn, SheetRow } from "./import-export.types";

export const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// "Mã vị trí *" and "ma vi tri" match: case, accents, spacing and the required-marker are ignored.
export function normalizeHeader(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cellValue(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "object") {
    if ("richText" in value) return cellValue(value.richText.map((part) => part.text).join(""));
    if ("text" in value && typeof value.text === "string") return cellValue(value.text);
    if ("result" in value) return cellValue(value.result as ExcelJS.CellValue);
    if ("error" in value) return null;
  }
  return null;
}

export type ParsedSheet = { rows: SheetRow[]; missingColumns: SheetColumn[] };

// Reads the first worksheet: row 1 holds headers, data starts at row 2. Blank rows are skipped,
// and so is the template's guidance row (every cell equal to the column's example).
export async function readSheet(buffer: Buffer, columns: readonly SheetColumn[]): Promise<ParsedSheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return { rows: [], missingColumns: columns.filter((column) => column.required) };
  }

  const byHeader = new Map<string, SheetColumn>();
  for (const column of columns) {
    for (const text of [column.header, column.key, ...(column.aliases ?? [])]) {
      byHeader.set(normalizeHeader(text), column);
    }
  }

  const columnAt = new Map<number, SheetColumn>();
  sheet.getRow(1).eachCell((cell, index) => {
    const column = byHeader.get(normalizeHeader(String(cellValue(cell.value) ?? "")));
    if (column && ![...columnAt.values()].includes(column)) columnAt.set(index, column);
  });

  const found = new Set(columnAt.values());
  const missingColumns = columns.filter((column) => column.required && !found.has(column));
  const rows: SheetRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
    if (rowNumber === 1) return;
    const values: Record<string, CellValue> = {};
    for (const [index, column] of columnAt) {
      values[column.key] = cellValue(excelRow.getCell(index).value);
    }

    const filled = Object.entries(values).filter(([, value]) => value !== null);
    if (filled.length === 0) return;
    const isGuidance = filled.every(([key, value]) => {
      const example = columns.find((column) => column.key === key)?.example;
      return example !== undefined && String(value) === example;
    });
    if (isGuidance) return;

    rows.push({ row: rowNumber, values });
  });

  return { rows, missingColumns };
}

// Header row (bold, frozen), then one row per record. `withExamples` adds the guidance row used by
// import templates.
export async function writeSheet(
  title: string,
  columns: readonly SheetColumn[],
  rows: Array<Record<string, CellValue>>,
  options: { withExamples?: boolean } = {}
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Helios Office";
  const sheet = workbook.addWorksheet(title.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });

  sheet.columns = columns.map((column) => ({
    header: column.required ? `${column.header} *` : column.header,
    key: column.key,
    width: column.width ?? Math.max(14, column.header.length + 4)
  }));
  sheet.getRow(1).font = { bold: true };

  if (options.withExamples) {
    const guidance = sheet.addRow(Object.fromEntries(columns.map((column) => [column.key, column.example ?? null])));
    guidance.font = { italic: true, color: { argb: "FF808080" } };
  }
  for (const row of rows) {
    sheet.addRow(row);
  }
  for (const column of columns) {
    if (rows.some((row) => row[column.key] instanceof Date)) {
      sheet.getColumn(column.key).numFmt = "dd/mm/yyyy";
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Cell helpers for handlers' validate().
export function textCell(value: CellValue) {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim() || null;
}

export function dateCell(value: CellValue): Date | null | "invalid" {
  if (value === null) return null;
  if (value instanceof Date) return value;
  const text = String(value).trim();
  const vn = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const [year, month, day] = vn ? [vn[3], vn[2], vn[1]] : iso ? [iso[1], iso[2], iso[3]] : [];
  if (!year) return "invalid";
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCMonth() === Number(month) - 1 ? date : "invalid";
}
