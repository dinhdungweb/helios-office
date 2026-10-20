import * as ExcelJS from "exceljs";
import type { SheetColumn } from "./import-export.types";
import { dateCell, normalizeHeader, readSheet, writeSheet } from "./spreadsheet";

const columns: SheetColumn[] = [
  { key: "code", header: "Mã vị trí", required: true, example: "POS-HR" },
  { key: "name", header: "Tên vị trí", required: true, aliases: ["Position name"], example: "Chuyên viên nhân sự" },
  { key: "startDate", header: "Ngày bắt đầu" }
];

// Builds a workbook the way a user would type it in Excel.
async function workbook(rows: unknown[][]) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Data");
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await book.xlsx.writeBuffer());
}

describe("spreadsheet helpers", () => {
  it("normalises headers regardless of case, accents, spacing and the required marker", () => {
    expect(normalizeHeader("  Mã   vị trí * ")).toBe("ma vi tri");
    expect(normalizeHeader("ĐƠN VỊ")).toBe("don vi");
  });

  it("maps columns by header text in any order, including aliases", async () => {
    const buffer = await workbook([
      ["position name", "MA VI TRI", "Ghi chú lạ"],
      ["Kế toán", "POS-ACC", "bỏ qua"]
    ]);

    const sheet = await readSheet(buffer, columns);

    expect(sheet.missingColumns).toEqual([]);
    expect(sheet.rows).toEqual([{ row: 2, values: { name: "Kế toán", code: "POS-ACC" } }]);
  });

  it("reports required columns that are missing", async () => {
    const sheet = await readSheet(await workbook([["Mã vị trí"], ["POS-1"]]), columns);
    expect(sheet.missingColumns.map((column) => column.key)).toEqual(["name"]);
  });

  it("skips blank rows and keeps real Excel row numbers", async () => {
    const buffer = await workbook([["Mã vị trí", "Tên vị trí"], ["A1", "Một"], [], [null, "  "], ["A2", "Hai"]]);
    const sheet = await readSheet(buffer, columns);
    expect(sheet.rows.map((row) => row.row)).toEqual([2, 5]);
  });

  it("reads back its own template, skipping the guidance row", async () => {
    const template = await writeSheet("Vị trí", columns, [], { withExamples: true });
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(template as unknown as ArrayBuffer);
    book.worksheets[0].addRow(["POS-NEW", "Mới", new Date(Date.UTC(2026, 9, 1))]);
    const filled = Buffer.from(await book.xlsx.writeBuffer());

    const sheet = await readSheet(filled, columns);

    expect(book.worksheets[0].getRow(1).getCell(1).value).toBe("Mã vị trí *");
    expect(sheet.rows).toHaveLength(1);
    expect(sheet.rows[0].values.code).toBe("POS-NEW");
    expect(sheet.rows[0].values.startDate).toEqual(new Date(Date.UTC(2026, 9, 1)));
  });

  it("flattens rich text and formula results", async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("Data");
    sheet.addRow(["Mã vị trí", "Tên vị trí"]);
    sheet.addRow([{ richText: [{ text: "POS-" }, { text: "RT", font: { bold: true } }] }, { formula: "\"Tên\"&\"A\"", result: "TênA" }]);

    const parsed = await readSheet(Buffer.from(await book.xlsx.writeBuffer()), columns);

    expect(parsed.rows[0].values).toEqual({ code: "POS-RT", name: "TênA" });
  });

  it("parses dd/mm/yyyy and ISO dates, rejecting impossible ones", () => {
    expect(dateCell("05/10/2026")).toEqual(new Date(Date.UTC(2026, 9, 5)));
    expect(dateCell("2026-10-05")).toEqual(new Date(Date.UTC(2026, 9, 5)));
    expect(dateCell("31/02/2026")).toBe("invalid");
    expect(dateCell("hôm qua")).toBe("invalid");
    expect(dateCell(null)).toBeNull();
  });
});
