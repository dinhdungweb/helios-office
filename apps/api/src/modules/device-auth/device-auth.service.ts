import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DeviceAuthStatus, type DeviceAuthRequest, type Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { SubmitMyDeviceDto, UpdateDeviceAuthPolicyDto, UpdateDeviceAuthStatusDto } from "./device-auth.dto";

const defaultPolicy = {
  id: "default",
  maxDevicesPerUser: 1,
  requireNotificationEnabled: true,
  requireGpsForAttendance: true,
  requireWifiForOffice: true,
  approvalRefreshHint: "Sau khi được xác thực, nhân viên nên đăng xuất và đăng nhập lại App hoặc tải lại trang GPS."
};

// What the check-in card needs to know (AT-13): GPS and Wifi each have their own rules like
// 1Office. A device or photo is asked for up front when every method turned on needs it; when only
// some do, the server says so on the punch (device_unregistered, photo_required).
export function checkInRules(policy: {
  requireGpsForAttendance: boolean;
  requireWifiForOffice: boolean;
  gpsRequireApprovedDevice: boolean;
  wifiRequireApprovedDevice: boolean;
  gpsRequirePhoto: boolean;
  wifiRequirePhoto: boolean;
}) {
  const methods = [
    ...(policy.requireGpsForAttendance ? [{ device: policy.gpsRequireApprovedDevice, photo: policy.gpsRequirePhoto }] : []),
    ...(policy.requireWifiForOffice ? [{ device: policy.wifiRequireApprovedDevice, photo: policy.wifiRequirePhoto }] : [])
  ];
  return {
    enabled: methods.length > 0,
    requireApprovedDevice: methods.length > 0 && methods.every((method) => method.device),
    deviceMayBeRequired: methods.some((method) => method.device),
    requireGps: policy.requireGpsForAttendance,
    requireOfficeNetwork: policy.requireWifiForOffice,
    requirePhoto: methods.length > 0 && methods.every((method) => method.photo),
    photoMayBeRequired: methods.some((method) => method.photo)
  };
}

@Injectable()
export class DeviceAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

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

  async updatePolicy(dto: UpdateDeviceAuthPolicyDto, actorId?: string) {
    const before = await this.findPolicy();
    const updated = await this.prisma.deviceAuthPolicy.update({
      where: { id: defaultPolicy.id },
      data: dto
    });

    await this.writeAudit("device_auth.policy_update", "DeviceAuthPolicy", updated.id, before, updated, actorId);

    return updated;
  }

  async updateStatus(id: string, dto: UpdateDeviceAuthStatusDto, actorId?: string) {
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

    await this.writeAudit("device_auth.status_update", "DeviceAuthRequest", updated.id, before, updated, actorId);

    return this.resolveRequest(updated);
  }

  async deleteRequest(id: string, actorId?: string) {
    const before = await this.prisma.deviceAuthRequest.findUnique({
      where: { id }
    });

    if (!before) {
      throw new NotFoundException(`Device auth request ${id} was not found`);
    }

    await this.prisma.deviceAuthRequest.delete({
      where: { id }
    });

    await this.writeAudit("device_auth.delete", "DeviceAuthRequest", id, before, null, actorId);

    return { ok: true };
  }

  // DV-05: my devices, newest first; `currentDeviceId` marks the one I am using now.
  async myDevices(user: AuthenticatedUser, currentDeviceId?: string) {
    const employeeId = this.myEmployeeId(user);
    const [requests, policy] = await Promise.all([
      this.prisma.deviceAuthRequest.findMany({ where: { employeeId }, orderBy: { submittedAt: "desc" } }),
      this.findPolicy()
    ]);
    return {
      maxDevices: policy.maxDevicesPerUser,
      // What check-in needs (DV-06), so the screen asks for location only when it counts.
      rules: checkInRules(policy),
      devices: requests.map((request) => ({
        id: request.id,
        deviceId: request.deviceId,
        deviceName: request.deviceName,
        status: request.status,
        submittedAt: request.submittedAt,
        lastUsedAt: request.lastUsedAt,
        note: request.note,
        current: Boolean(currentDeviceId) && request.deviceId === currentDeviceId
      }))
    };
  }

  // A device belongs to one person. A rejected request may be sent again; a locked one may not.
  async submitMine(user: AuthenticatedUser, dto: SubmitMyDeviceDto) {
    const employeeId = this.myEmployeeId(user);
    const deviceName = dto.deviceName.trim();
    const existing = await this.prisma.deviceAuthRequest.findUnique({ where: { deviceId: dto.deviceId } });
    if (existing && existing.employeeId !== employeeId) throw new ConflictException("Thiết bị này đã được đăng ký cho người khác. Liên hệ HR nếu đây là thiết bị của bạn.");
    if (existing?.status === DeviceAuthStatus.locked) throw new ConflictException("Thiết bị này đã bị khoá quyền chấm công. Liên hệ HR.");
    if (existing?.status === DeviceAuthStatus.pending || existing?.status === DeviceAuthStatus.approved) {
      if (existing.deviceName === deviceName) return this.resolveRequest(existing);
      const renamed = await this.prisma.deviceAuthRequest.update({ where: { id: existing.id }, data: { deviceName } });
      return this.resolveRequest(renamed);
    }

    const [policy, inUse] = await Promise.all([
      this.findPolicy(),
      this.prisma.deviceAuthRequest.count({
        where: { employeeId, status: { in: [DeviceAuthStatus.pending, DeviceAuthStatus.approved] }, ...(existing ? { id: { not: existing.id } } : {}) }
      })
    ]);
    if (inUse >= policy.maxDevicesPerUser) {
      throw new ConflictException(`Mỗi người được dùng tối đa ${policy.maxDevicesPerUser} thiết bị. Rút yêu cầu cũ hoặc nhờ HR gỡ thiết bị không dùng nữa.`);
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { code: true, fullName: true, avatarUrl: true, department: { select: { name: true, parent: { select: { name: true } } } } }
    });
    if (!employee) throw new NotFoundException("Tài khoản của bạn chưa gắn với hồ sơ nhân sự.");
    const snapshot = {
      employeeCode: employee.code,
      employeeName: employee.fullName,
      avatar: employee.avatarUrl ?? "",
      department: employee.department.name,
      branch: employee.department.parent?.name ?? employee.department.name,
      deviceName,
      submittedAt: new Date(),
      status: DeviceAuthStatus.pending,
      note: "Nhân viên tự gửi yêu cầu."
    };
    const request = existing
      ? await this.prisma.deviceAuthRequest.update({ where: { id: existing.id }, data: snapshot })
      : await this.prisma.deviceAuthRequest.create({ data: { ...snapshot, employeeId, deviceId: dto.deviceId } });
    await this.writeAudit(existing ? "device_auth.resubmit" : "device_auth.submit", "DeviceAuthRequest", request.id, existing, request, employeeId);
    return this.resolveRequest(request);
  }

  // Only a request not yet approved can be withdrawn by its owner; HR removes approved devices.
  async withdrawMine(user: AuthenticatedUser, id: string) {
    const employeeId = this.myEmployeeId(user);
    const request = await this.prisma.deviceAuthRequest.findUnique({ where: { id } });
    if (!request || request.employeeId !== employeeId) throw new NotFoundException("Không tìm thấy yêu cầu thiết bị.");
    if (request.status !== DeviceAuthStatus.pending && request.status !== DeviceAuthStatus.rejected) {
      throw new ConflictException("Thiết bị đã được duyệt hoặc đã bị khoá; nhờ HR gỡ thiết bị.");
    }
    await this.prisma.deviceAuthRequest.delete({ where: { id } });
    await this.writeAudit("device_auth.withdraw", "DeviceAuthRequest", id, request, null, employeeId);
    return { ok: true };
  }

  private myEmployeeId(user: AuthenticatedUser) {
    const employeeId = user.account?.employeeId;
    if (!employeeId) throw new NotFoundException("Tài khoản của bạn chưa gắn với hồ sơ nhân sự.");
    return employeeId;
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
    afterValue: unknown,
    actorId?: string
  ) {
    await this.prisma.auditLog.create({
      data: {
        ...this.audit.contextFields(),
        actorId,
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
