import { Injectable, NotFoundException } from "@nestjs/common";
import { DeviceAuthStatus, type DeviceAuthRequest, type Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { UpdateDeviceAuthPolicyDto, UpdateDeviceAuthStatusDto } from "./device-auth.dto";

const defaultPolicy = {
  id: "default",
  maxDevicesPerUser: 1,
  requireNotificationEnabled: true,
  requireGpsForAttendance: true,
  requireWifiForOffice: true,
  approvalRefreshHint: "Sau khi được xác thực, nhân viên nên đăng xuất và đăng nhập lại App hoặc tải lại trang GPS."
};

@Injectable()
export class DeviceAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async findRequests() {
    const requests = await this.prisma.deviceAuthRequest.findMany({
      orderBy: [{ status: "asc" }, { submittedAt: "desc" }]
    });

    return requests.map((request) => this.resolveRequest(request));
  }

  async findPolicy() {
    return this.prisma.deviceAuthPolicy.upsert({
      where: { id: defaultPolicy.id },
      update: {},
      create: defaultPolicy
    });
  }

  async updatePolicy(dto: UpdateDeviceAuthPolicyDto) {
    const before = await this.findPolicy();
    const updated = await this.prisma.deviceAuthPolicy.update({
      where: { id: defaultPolicy.id },
      data: dto
    });

    await this.writeAudit("device_auth.policy_update", "DeviceAuthPolicy", updated.id, before, updated);

    return updated;
  }

  async updateStatus(id: string, dto: UpdateDeviceAuthStatusDto) {
    const before = await this.prisma.deviceAuthRequest.findUnique({
      where: { id }
    });

    if (!before) {
      throw new NotFoundException(`Device auth request ${id} was not found`);
    }

    const updated = await this.prisma.deviceAuthRequest.update({
      where: { id },
      data: {
        status: dto.status,
        lastUsedAt: dto.status === DeviceAuthStatus.approved ? before.lastUsedAt ?? new Date() : before.lastUsedAt,
        note: dto.note ?? this.statusNote(dto.status) ?? before.note
      }
    });

    await this.writeAudit("device_auth.status_update", "DeviceAuthRequest", updated.id, before, updated);

    return this.resolveRequest(updated);
  }

  async deleteRequest(id: string) {
    const before = await this.prisma.deviceAuthRequest.findUnique({
      where: { id }
    });

    if (!before) {
      throw new NotFoundException(`Device auth request ${id} was not found`);
    }

    await this.prisma.deviceAuthRequest.delete({
      where: { id }
    });

    await this.writeAudit("device_auth.delete", "DeviceAuthRequest", id, before, null);

    return { ok: true };
  }

  private resolveRequest(request: DeviceAuthRequest) {
    return {
      ...request,
      submittedAt: this.formatDateTime(request.submittedAt),
      lastUsedAt: this.formatDateTime(request.lastUsedAt)
    };
  }

  private formatDateTime(value: Date | null) {
    if (!value) {
      return null;
    }

    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh"
    }).format(value).replace(",", "");
  }

  private statusNote(status: DeviceAuthStatus) {
    if (status === DeviceAuthStatus.approved) {
      return "Admin đã xác thực thiết bị.";
    }

    if (status === DeviceAuthStatus.rejected) {
      return "Admin đã từ chối yêu cầu xác thực.";
    }

    if (status === DeviceAuthStatus.locked) {
      return "Thiết bị đã bị khóa quyền chấm công.";
    }

    return undefined;
  }

  private async writeAudit(
    action: string,
    entityType: string,
    entityId: string,
    beforeValue: unknown,
    afterValue: unknown
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        beforeValue: beforeValue === null ? undefined : this.toAuditJson(beforeValue),
        afterValue: afterValue === null ? undefined : this.toAuditJson(afterValue)
      }
    });
  }

  private toAuditJson(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
