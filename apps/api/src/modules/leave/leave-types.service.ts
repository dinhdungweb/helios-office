import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateLeaveTypeDto, UpdateLeaveTypeDto } from "./leave.dto";

// LV-09. Types seeded from the Labour Code by migration 20261126010000_approval_engine; HR edits them.
@Injectable()
export class LeaveTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  findAll(includeArchived = false) {
    return this.prisma.leaveType.findMany({
      where: includeArchived ? undefined : { status: "active" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }

  async create(dto: CreateLeaveTypeDto, actorId?: string) {
    const created = await this.prisma.leaveType
      .create({ data: { ...this.data(dto), code: dto.code.trim(), name: dto.name.trim() } })
      .catch((error: unknown) => {
        throw this.duplicate(error);
      });
    await this.writeAudit("leave_type.create", created.id, null, created, actorId);
    return created;
  }

  async update(id: string, dto: UpdateLeaveTypeDto, actorId?: string) {
    const before = await this.find(id);
    const updated = await this.prisma.leaveType.update({
      where: { id },
      data: { ...this.data(dto), ...(dto.name !== undefined ? { name: dto.name.trim() } : {}), ...(dto.status !== undefined ? { status: dto.status } : {}) }
    });
    await this.writeAudit("leave_type.update", id, before, updated, actorId);
    return updated;
  }

  // A type that requests or balances use can only be archived, so history keeps its name.
  async remove(id: string, actorId?: string) {
    const leaveType = await this.find(id);
    const [balances, requests] = await Promise.all([
      this.prisma.leaveBalance.count({ where: { leaveTypeId: id } }),
      this.prisma.request.count({ where: { type: "leave", subType: leaveType.code } })
    ]);
    if (balances + requests > 0) throw new ConflictException("Loại nghỉ đã được dùng nên không xoá được. Hãy ngừng sử dụng loại nghỉ này.");
    await this.prisma.leaveType.delete({ where: { id } });
    await this.writeAudit("leave_type.delete", id, leaveType, null, actorId);
    return { id, deleted: true };
  }

  private data(dto: UpdateLeaveTypeDto) {
    return {
      ...(dto.paid !== undefined ? { paid: dto.paid } : {}),
      ...(dto.deductsBalance !== undefined ? { deductsBalance: dto.deductsBalance } : {}),
      ...(dto.minUnit !== undefined ? { minUnit: dto.minUnit } : {}),
      ...(dto.maxDaysPerRequest !== undefined ? { maxDaysPerRequest: dto.maxDaysPerRequest } : {}),
      ...(dto.requiresDocument !== undefined ? { requiresDocument: dto.requiresDocument } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.allowDuringProbation !== undefined ? { allowDuringProbation: dto.allowDuringProbation } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {})
    };
  }

  private async find(id: string) {
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!leaveType) throw new NotFoundException("Không tìm thấy loại nghỉ.");
    return leaveType;
  }

  private duplicate(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? new ConflictException("Mã loại nghỉ đã tồn tại.") : error;
  }

  private async writeAudit(action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    const json = (value: unknown) => (value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue));
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), actorId, action, entityType: "LeaveType", entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
