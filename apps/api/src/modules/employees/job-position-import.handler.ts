import { Injectable, OnModuleInit } from "@nestjs/common";
import { ImportExportRegistry } from "../../common/import-export/import-export.registry";
import type { ImportHandler, RowValidation, SheetRow, TransferContext } from "../../common/import-export/import-export.types";
import { textCell } from "../../common/import-export/spreadsheet";
import { PrismaService } from "../../common/prisma/prisma.service";

type JobPositionRow = { code: string; name: string; family: string | null; description: string | null };

// Job position catalog import: rows are matched by code — a new code creates a position, an
// existing one updates its name, family and description.
@Injectable()
export class JobPositionImportHandler implements ImportHandler<JobPositionRow>, OnModuleInit {
  readonly type = "job_positions";
  readonly title = "Vị trí công việc";
  // Same keys as the job catalog routes (JobCatalogController).
  readonly permissionKeys = ["employees.department.manage", "system.accounts.manage"];
  readonly columns = [
    { key: "code", header: "Mã vị trí", required: true, aliases: ["code"], example: "POS-HR" },
    { key: "name", header: "Tên vị trí", required: true, aliases: ["name"], width: 30, example: "Chuyên viên nhân sự" },
    { key: "family", header: "Nhóm vị trí", aliases: ["family"], width: 24, example: "Nhân sự" },
    { key: "description", header: "Mô tả", aliases: ["description"], width: 40, example: "Quản lý hồ sơ và nghiệp vụ nhân sự" }
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ImportExportRegistry
  ) {}

  onModuleInit() {
    this.registry.registerImport(this);
  }

  async validate(rows: SheetRow[]): Promise<RowValidation<JobPositionRow>[]> {
    const existing = await this.prisma.jobPosition.findMany({ select: { code: true, name: true } });
    const codeByName = new Map(existing.map((position) => [position.name.toLowerCase(), position.code]));
    const seenCodes = new Map<string, number>();
    const seenNames = new Map<string, number>();

    return rows.map(({ row, values }) => {
      const errors: Array<{ column?: string; message: string }> = [];
      const code = textCell(values.code);
      const name = textCell(values.name);

      if (!code || code.length < 2) errors.push({ column: "code", message: "Mã vị trí bắt buộc, tối thiểu 2 ký tự" });
      if (!name || name.length < 2) errors.push({ column: "name", message: "Tên vị trí bắt buộc, tối thiểu 2 ký tự" });

      if (code) {
        const firstRow = seenCodes.get(code.toLowerCase());
        if (firstRow) errors.push({ column: "code", message: `Mã trùng với dòng ${firstRow}` });
        else seenCodes.set(code.toLowerCase(), row);
      }
      if (name) {
        const firstRow = seenNames.get(name.toLowerCase());
        if (firstRow) errors.push({ column: "name", message: `Tên trùng với dòng ${firstRow}` });
        else seenNames.set(name.toLowerCase(), row);

        const owner = codeByName.get(name.toLowerCase());
        if (owner && owner !== code) errors.push({ column: "name", message: `Tên đã dùng cho vị trí ${owner}` });
      }

      return errors.length
        ? { row, errors }
        : { row, data: { code: code!, name: name!, family: textCell(values.family), description: textCell(values.description) } };
    });
  }

  async commit(rows: Array<{ row: number; data: JobPositionRow }>, context: TransferContext) {
    return this.prisma.$transaction(async (tx) => {
      const existingCodes = new Set(
        (await tx.jobPosition.findMany({ where: { code: { in: rows.map((row) => row.data.code) } }, select: { code: true } })).map(
          (position) => position.code
        )
      );
      let created = 0;
      let updated = 0;

      for (const { data } of rows) {
        const position = await tx.jobPosition.upsert({
          where: { code: data.code },
          create: data,
          update: { name: data.name, family: data.family, description: data.description }
        });
        const isNew = !existingCodes.has(data.code);
        if (isNew) created += 1;
        else updated += 1;

        await tx.auditLog.create({
          data: {
            actorAccountId: context.accountId,
            action: isNew ? "job_position.create" : "job_position.update",
            entityType: "JobPosition",
            entityId: position.id,
            afterValue: { ...data, source: "import" }
          }
        });
      }

      return { created, updated };
    }, { timeout: 60_000 });
  }
}
