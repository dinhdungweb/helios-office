export type CsvCellValue = string | number | boolean | null | undefined;

export type CsvColumn<Row> = {
  header: string;
  value: (row: Row) => CsvCellValue;
};

type ExportCsvOptions<Row> = {
  columns: CsvColumn<Row>[];
  filename: string;
  rows: Row[];
};

function spreadsheetSafeValue(value: CsvCellValue) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return String(value);
  }

  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function escapeCsvCell(value: CsvCellValue) {
  return `"${spreadsheetSafeValue(value).replaceAll("\"", "\"\"")}"`;
}

function normalizeFilename(filename: string) {
  const trimmed = filename.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");
  const safeFilename = trimmed || "export";

  return safeFilename.toLowerCase().endsWith(".csv") ? safeFilename : `${safeFilename}.csv`;
}

export function datedCsvFilename(baseName: string, date = new Date()) {
  return `${baseName}-${date.toISOString().slice(0, 10)}.csv`;
}

export function exportCsv<Row>({ columns, filename, rows }: ExportCsvOptions<Row>) {
  if (typeof document === "undefined") {
    throw new Error("CSV export is only available in the browser.");
  }

  const csvRows = [
    columns.map((column) => column.header),
    ...rows.map((row) => columns.map((column) => column.value(row)))
  ];
  const content = csvRows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = normalizeFilename(filename);
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
