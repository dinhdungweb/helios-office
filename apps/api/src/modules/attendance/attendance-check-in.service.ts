import { timingSafeEqual } from "node:crypto";
import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { DeviceAuthStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import type { CheckInDto } from "./attendance-check-in.dto";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { AttendancePeriodService } from "./attendance-period.service";
import { matchLocations, normalizeIp } from "./engine/location-check";
import { addDays, localDate, zonedInstant } from "./engine/zoned-time";

// Check-in and check-out on the web or the app (AT-13), with the device and place rules of the
// device policy (DV-06). A punch that breaks a rule is refused with the reason; nothing is kept
// "for review". A punch is an ordinary raw log, so the engine treats it like a machine's.

export type CheckInSource = "web" | "app";
export type CheckInContext = { source: CheckInSource; ip: string | null; userAgent: string | null };

// Two taps within a minute are one punch.
const DOUBLE_TAP_MS = 60_000;

const POLICY_DEFAULTS = { requireApprovedDevice: true, requireGpsForAttendance: true, requireWifiForOffice: true };

// The reason travels with the message so the screen can offer the right fix.
function refuse(reason: string, message: string): never {
  throw new UnprocessableEntityException({ statusCode: 422, error: "Unprocessable Entity", reason, message });
}

@Injectable()
export class AttendanceCheckInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: AttendanceCalculationService,
    private readonly periods: AttendancePeriodService
  ) {}

  async punch(user: AuthenticatedUser, direction: "in" | "out", dto: CheckInDto, context: CheckInContext) {
    const employeeId = user.account?.employeeId;
    if (!employeeId) throw new NotFoundException("Tài khoản của bạn chưa gắn với hồ sơ nhân sự.");
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, code: true, attendanceCode: true, status: true } });
    if (!employee || employee.status === "resigned") throw new ForbiddenException("Hồ sơ nhân sự của bạn không còn hoạt động.");

    const timeZone = await this.calculation.timezone();
    const now = new Date();
    const today = localDate(now.getTime(), timeZone);
    await this.periods.assertOpen([today]);

    const policy = (await this.prisma.deviceAuthPolicy.findUnique({ where: { id: "default" } })) ?? POLICY_DEFAULTS;
    const device = policy.requireApprovedDevice ? await this.approvedDevice(employeeId, dto.deviceId) : null;
    const place = await this.checkPlace(policy, dto, context);

    const last = await this.prisma.attendanceRawLog.findFirst({
      where: { employeeId, source: { in: ["web", "app"] }, punchTime: { gte: new Date(now.getTime() - DOUBLE_TAP_MS) } },
      orderBy: { punchTime: "desc" }
    });
    if (last) return { duplicate: true, punch: this.view(last), punches: await this.myPunches(employeeId, today, timeZone) };

    const log = await this.prisma.attendanceRawLog.create({
      data: {
        employeeId,
        employeeCode: employee.attendanceCode ?? employee.code,
        punchTime: now,
        verifyType: place?.kind ?? "none",
        source: context.source,
        direction,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        accuracyMeters: dto.accuracy ?? null,
        ssid: dto.ssid?.trim() || null,
        bssid: dto.bssid?.trim().toLowerCase() || null,
        ipAddress: context.ip,
        clientDeviceId: device?.deviceId ?? dto.deviceId ?? null,
        clientDeviceName: device?.deviceName ?? null,
        locationId: place?.id ?? null,
        locationName: place?.name ?? null,
        rawPayload: { userAgent: context.userAgent, distanceMeters: place?.distance ?? null } as Prisma.InputJsonValue
      }
    });
    if (device) await this.prisma.deviceAuthRequest.update({ where: { id: device.id }, data: { lastUsedAt: now } });
    await this.calculation.recalculateForPunches([{ employeeId, punchTime: now }], "punch_sync");
    return { duplicate: false, punch: this.view(log), punches: await this.myPunches(employeeId, today, timeZone) };
  }

  // My punches of one day from every source, for the check-in card.
  async today(user: AuthenticatedUser) {
    const employeeId = user.account?.employeeId;
    if (!employeeId) throw new NotFoundException("Tài khoản của bạn chưa gắn với hồ sơ nhân sự.");
    const timeZone = await this.calculation.timezone();
    const today = localDate(Date.now(), timeZone);
    return { date: today, punches: await this.myPunches(employeeId, today, timeZone) };
  }

  private async approvedDevice(employeeId: string, deviceId: string | undefined) {
    if (!deviceId) refuse("device_unregistered", "Thiết bị này chưa được đăng ký. Đăng ký ở mục Thiết bị chấm công rồi chờ HR duyệt.");
    const device = await this.prisma.deviceAuthRequest.findUnique({ where: { deviceId } });
    if (!device) refuse("device_unregistered", "Thiết bị này chưa được đăng ký. Đăng ký ở mục Thiết bị chấm công rồi chờ HR duyệt.");
    if (device.employeeId !== employeeId) refuse("device_not_yours", "Thiết bị này đã đăng ký cho người khác, không chấm công được.");
    if (device.status === DeviceAuthStatus.pending) refuse("device_pending", "Thiết bị đang chờ HR duyệt, chưa chấm công được.");
    if (device.status === DeviceAuthStatus.rejected) refuse("device_rejected", "HR đã từ chối thiết bị này. Gửi lại yêu cầu hoặc dùng thiết bị khác.");
    if (device.status === DeviceAuthStatus.locked) refuse("device_locked", "Thiết bị đã bị khoá quyền chấm công. Liên hệ HR.");
    return device;
  }

  // Each method the policy turns on is a way in: GPS within a place's radius, or the office
  // network (wifi for the app, IP ranges for the browser). With both off, anywhere is fine.
  private async checkPlace(policy: { requireGpsForAttendance: boolean; requireWifiForOffice: boolean }, dto: CheckInDto, context: CheckInContext) {
    if (!policy.requireGpsForAttendance && !policy.requireWifiForOffice) return null;
    const locations = await this.prisma.attendanceLocation.findMany({ where: { status: "active" } });
    const usable = locations.filter((location) => (location.type === "gps" ? policy.requireGpsForAttendance : policy.requireWifiForOffice));
    if (usable.length === 0) refuse("no_places", "Chưa có điểm chấm công nào được cài đặt. Liên hệ HR.");

    const match = matchLocations(usable, { ...dto, ip: context.ip });
    if (policy.requireGpsForAttendance && match.gps) return { id: match.gps.location.id, name: match.gps.location.name, kind: "gps", distance: Math.round(match.gps.distance) };
    if (policy.requireWifiForOffice && match.wifi) return { id: match.wifi.id, name: match.wifi.name, kind: "wifi", distance: null };
    if (policy.requireWifiForOffice && match.network) return { id: match.network.id, name: match.network.name, kind: "ip", distance: null };

    const reasons: string[] = [];
    if (policy.requireGpsForAttendance) {
      if (typeof dto.latitude !== "number" || typeof dto.longitude !== "number") reasons.push("không lấy được vị trí GPS (hãy cho phép trình duyệt truy cập vị trí)");
      else if (match.nearest) reasons.push(`bạn đang cách ${match.nearest.location.name} khoảng ${Math.round(match.nearest.distance)} m, cho phép ${match.nearest.location.radiusMeters} m`);
      else reasons.push("chưa có điểm GPS nào");
    }
    if (policy.requireWifiForOffice) reasons.push(context.source === "web" ? "không ở trong mạng văn phòng" : "không kết nối wifi văn phòng");
    const noGps = policy.requireGpsForAttendance && (typeof dto.latitude !== "number" || typeof dto.longitude !== "number");
    refuse(noGps ? "no_position" : "outside_places", `Không ở trong điểm chấm công hợp lệ: ${reasons.join("; ")}.`);
  }

  private async myPunches(employeeId: string, date: string, timeZone: string) {
    const logs = await this.prisma.attendanceRawLog.findMany({
      where: { employeeId, punchTime: { gte: new Date(zonedInstant(date, 0, timeZone)), lt: new Date(zonedInstant(addDays(date, 1), 0, timeZone)) } },
      include: { device: { select: { deviceName: true } } },
      orderBy: { punchTime: "asc" }
    });
    return logs.map((log) => this.view(log));
  }

  private view(log: { id: string; punchTime: Date; source: string; direction: string | null; locationName: string | null; clientDeviceName: string | null; deviceId: string | null; device?: { deviceName: string | null } | null }) {
    return {
      id: log.id,
      punchTime: log.punchTime,
      source: log.source,
      direction: log.direction,
      place: log.locationName,
      device: log.source === "machine" ? (log.device?.deviceName ?? log.deviceId) : log.clientDeviceName
    };
  }
}

// The browser's address when the web server vouches for it with WEB_SERVICE_TOKEN; otherwise the
// caller's own address (the mobile app calls the API directly).
export function checkInContext(
  headers: Record<string, string | string[] | undefined>,
  socketIp: string | undefined,
  serviceToken: string | undefined
): CheckInContext {
  const header = (name: string) => {
    const value = headers[name];
    return (Array.isArray(value) ? value[0] : value)?.trim() || null;
  };
  const supplied = Buffer.from(header("x-helios-service-token") ?? "");
  const expected = Buffer.from(serviceToken ?? "");
  const vouched = expected.length > 0 && supplied.length === expected.length && timingSafeEqual(supplied, expected);
  const ip = vouched ? header("x-helios-client-ip") : socketIp ?? null;
  return { source: vouched ? "web" : "app", ip: ip ? normalizeIp(ip) : null, userAgent: (vouched ? header("x-helios-client-agent") : header("user-agent"))?.slice(0, 300) ?? null };
}
