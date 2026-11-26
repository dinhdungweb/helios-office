import { timingSafeEqual } from "node:crypto";
import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { DeviceAuthStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import type { CheckInDto } from "./attendance-check-in.dto";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { AttendancePeriodService } from "./attendance-period.service";
import { resolveDayShift } from "../shifts/shift-resolver";
import { requiredMinutesFor } from "../shifts/shift-rules";
import { scheduleFor } from "./engine/attendance-engine";
import { matchLocations, normalizeIp, type LocationRule } from "./engine/location-check";
import { addDays, localDate, zonedInstant } from "./engine/zoned-time";

// Check-in and check-out on the web or the app (AT-13), with the device and place rules of the
// device policy (DV-06). A punch that breaks a rule is refused with the reason; nothing is kept
// "for review". A punch is an ordinary raw log, so the engine treats it like a machine's.

export type CheckInSource = "web" | "app";
export type CheckInContext = { source: CheckInSource; ip: string | null; userAgent: string | null };

// Two taps within a minute are one punch.
const DOUBLE_TAP_MS = 60_000;

// Like 1Office's Timekeeping settings: GPS and Wifi are turned on separately and each has its own
// rules. With both off there is no web/app check-in (machines only).
type MethodRules = { allowWithoutShift: boolean; requireApprovedDevice: boolean; requirePhoto: boolean; checkEntities: boolean };
type CheckInPolicy = {
  requireGpsForAttendance: boolean;
  requireWifiForOffice: boolean;
  gpsAllowWithoutShift: boolean;
  gpsRequireApprovedDevice: boolean;
  gpsRequirePhoto: boolean;
  gpsCheckEntities: boolean;
  wifiAllowWithoutShift: boolean;
  wifiRequireApprovedDevice: boolean;
  wifiRequirePhoto: boolean;
  wifiCheckEntities: boolean;
};

const POLICY_DEFAULTS: CheckInPolicy = {
  requireGpsForAttendance: true,
  requireWifiForOffice: true,
  gpsAllowWithoutShift: false,
  gpsRequireApprovedDevice: false,
  gpsRequirePhoto: false,
  gpsCheckEntities: false,
  wifiAllowWithoutShift: false,
  wifiRequireApprovedDevice: false,
  wifiRequirePhoto: false,
  wifiCheckEntities: false
};

export function rulesFor(policy: CheckInPolicy, method: "gps" | "wifi"): MethodRules {
  return method === "gps"
    ? { allowWithoutShift: policy.gpsAllowWithoutShift, requireApprovedDevice: policy.gpsRequireApprovedDevice, requirePhoto: policy.gpsRequirePhoto, checkEntities: policy.gpsCheckEntities }
    : { allowWithoutShift: policy.wifiAllowWithoutShift, requireApprovedDevice: policy.wifiRequireApprovedDevice, requirePhoto: policy.wifiRequirePhoto, checkEntities: policy.wifiCheckEntities };
}

type CurrentShift = { id: string; name: string; locationIds: string[]; appliesToMe: boolean } | null;

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
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, code: true, attendanceCode: true, status: true, departmentId: true, positionId: true, department: { select: { defaultShiftId: true } } }
    });
    if (!employee || employee.status === "resigned") throw new ForbiddenException("Hồ sơ nhân sự của bạn không còn hoạt động.");

    const timeZone = await this.calculation.timezone();
    const now = new Date();
    const today = localDate(now.getTime(), timeZone);
    await this.periods.assertOpen([today]);

    const policy: CheckInPolicy = (await this.prisma.deviceAuthPolicy.findUnique({ where: { id: "default" } })) ?? POLICY_DEFAULTS;
    if (!policy.requireGpsForAttendance && !policy.requireWifiForOffice) {
      refuse("not_enabled", "Công ty không dùng chấm công GPS / Wifi; hãy chấm công bằng máy chấm công.");
    }
    const shift = await this.currentShift(employee, now.getTime(), timeZone);
    const place = await this.checkPlace(policy, dto, context, shift);
    const rules = rulesFor(policy, place.method);
    if (!rules.allowWithoutShift && !shift) {
      refuse("no_shift", `Hôm nay bạn chưa được xếp ca, không chấm công ${place.method === "gps" ? "GPS" : "Wifi"} được. Liên hệ HR nếu cần chấm.`);
    }
    const device = rules.requireApprovedDevice ? await this.approvedDevice(employeeId, dto.deviceId) : null;
    const photoFileId = await this.checkPhoto(employeeId, rules.requirePhoto, dto.photoFileId);

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
        verifyType: place.kind,
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
        locationId: place.id,
        locationName: place.name,
        photoFileId,
        rawPayload: { userAgent: context.userAgent, distanceMeters: place.distance, shift: shift?.name ?? null } as Prisma.InputJsonValue
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

  // The photo must be mine, uploaded completely, and not already used for another punch.
  private async checkPhoto(employeeId: string, required: boolean, photoFileId: string | undefined) {
    if (!photoFileId) {
      if (required) refuse("photo_required", "Cần chụp ảnh khi chấm công.");
      return null;
    }
    const file = await this.prisma.storedFile.findUnique({ where: { id: photoFileId } });
    if (!file || file.purpose !== "checkin_photo" || file.ownerId !== employeeId || file.status !== "ready") refuse("photo_invalid", "Ảnh chấm công không hợp lệ, hãy chụp lại.");
    if (await this.prisma.attendanceRawLog.findFirst({ where: { photoFileId }, select: { id: true } })) refuse("photo_invalid", "Ảnh này đã dùng cho lần chấm khác, hãy chụp lại.");
    return photoFileId;
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

  // GPS first, then Wifi / the office network (wifi for the app, IP ranges for the browser), each
  // only when turned on. With "check applicable entities", only places of the current shift count,
  // and only when that shift applies to the person.
  private async checkPlace(policy: CheckInPolicy, dto: CheckInDto, context: CheckInContext, shift: CurrentShift) {
    const locations = (await this.prisma.attendanceLocation.findMany({ where: { status: "active" } })) as LocationRule[];
    const methods: Array<"gps" | "wifi"> = [...(policy.requireGpsForAttendance ? ["gps" as const] : []), ...(policy.requireWifiForOffice ? ["wifi" as const] : [])];
    const reasons: string[] = [];
    let anyPlace = false;
    let noPosition = false;

    for (const method of methods) {
      const rules = rulesFor(policy, method);
      let candidates = locations.filter((location) => (method === "gps" ? location.type === "gps" : location.type !== "gps"));
      if (candidates.length > 0) anyPlace = true;
      if (rules.checkEntities) {
        if (!shift || !shift.appliesToMe) {
          reasons.push(`chấm ${method === "gps" ? "GPS" : "Wifi"} chỉ được tại điểm của ca được xếp, hôm nay bạn không có ca áp dụng`);
          continue;
        }
        candidates = candidates.filter((location) => shift.locationIds.includes(location.id));
      }
      const match = matchLocations(candidates, { ...dto, ip: context.ip });
      if (method === "gps") {
        if (match.gps) return { method, id: match.gps.location.id, name: match.gps.location.name, kind: "gps", distance: Math.round(match.gps.distance) };
        if (typeof dto.latitude !== "number" || typeof dto.longitude !== "number") {
          noPosition = true;
          reasons.push("không lấy được vị trí GPS (hãy cho phép trình duyệt truy cập vị trí)");
        } else if (match.nearest) {
          reasons.push(`bạn đang cách ${match.nearest.location.name} khoảng ${Math.round(match.nearest.distance)} m, cho phép ${match.nearest.location.radiusMeters} m`);
        } else {
          reasons.push(rules.checkEntities ? `ca ${shift?.name} chưa có điểm GPS` : "chưa có điểm GPS nào");
        }
      } else {
        if (match.wifi) return { method, id: match.wifi.id, name: match.wifi.name, kind: "wifi", distance: null };
        if (match.network) return { method, id: match.network.id, name: match.network.name, kind: "ip", distance: null };
        reasons.push(context.source === "web" ? "không ở trong mạng văn phòng" : "không kết nối wifi văn phòng");
      }
    }
    if (!anyPlace) refuse("no_places", "Chưa có điểm chấm công nào được cài đặt. Liên hệ HR.");
    refuse(noPosition ? "no_position" : "outside_places", `Không ở trong điểm chấm công hợp lệ: ${reasons.join("; ")}.`);
  }

  // The shift the person is on now: today's, or yesterday's night shift still running. Detected
  // shifts (AT-29) that apply to the person count, since punches may pick one.
  private async currentShift(
    employee: { id: string; departmentId: string; positionId: string | null; department: { defaultShiftId: string | null } },
    now: number,
    timeZone: string
  ): Promise<CurrentShift> {
    const today = localDate(now, timeZone);
    const yesterday = addDays(today, -1);
    const [policy, assignments, holidays, shifts] = await Promise.all([
      this.calculation.getPolicy(),
      this.prisma.shiftAssignment.findMany({ where: { employeeId: employee.id, date: { in: [new Date(`${yesterday}T00:00:00.000Z`), new Date(`${today}T00:00:00.000Z`)] } } }),
      this.prisma.holiday.findMany({ where: { date: { in: [new Date(`${yesterday}T00:00:00.000Z`), new Date(`${today}T00:00:00.000Z`)] } } }),
      this.prisma.shift.findMany({ where: { status: "active" } })
    ]);
    const byId = new Map(shifts.map((item) => [item.id, item]));
    const applies = (item: { applyDepartmentIds: string[]; applyPositionIds: string[] }) =>
      (item.applyDepartmentIds.length === 0 || item.applyDepartmentIds.includes(employee.departmentId)) &&
      (item.applyPositionIds.length === 0 || (employee.positionId !== null && item.applyPositionIds.includes(employee.positionId)));
    const resolve = (date: string) => {
      const assignment = assignments.find((row) => row.date.toISOString().slice(0, 10) === date);
      const holiday = holidays.find((row) => row.date.toISOString().slice(0, 10) === date) ?? null;
      const resolved = resolveDayShift({
        date,
        assignment: assignment ? { shiftId: assignment.shiftId } : undefined,
        departmentDefaultShiftId: employee.department.defaultShiftId,
        companyDefaultShiftId: policy.defaultShiftId,
        workWeekdays: policy.workWeekdays,
        holiday
      });
      return resolved.shiftId ? byId.get(resolved.shiftId) ?? null : null;
    };
    const view = (item: (typeof shifts)[number]) => ({ id: item.id, name: item.name, locationIds: item.locationIds, appliesToMe: applies(item) });

    const night = resolve(yesterday);
    if (night && night.endMinute <= night.startMinute) {
      const schedule = scheduleFor(yesterday, { ...night, requiredMinutes: requiredMinutesFor(night), workUnits: Number(night.workUnits) }, { timezone: timeZone, overnightAttribution: "shift_start" });
      if (now <= schedule.end + (night.punchWindowAfterMinutes ?? policy.punchWindowAfterMinutes) * 60_000) return view(night);
    }
    const current = resolve(today);
    if (current) return view(current);
    const detected = shifts.find((item) => item.autoDetect && applies(item));
    return detected ? view(detected) : null;
  }

  private async myPunches(employeeId: string, date: string, timeZone: string) {
    const logs = await this.prisma.attendanceRawLog.findMany({
      where: { employeeId, punchTime: { gte: new Date(zonedInstant(date, 0, timeZone)), lt: new Date(zonedInstant(addDays(date, 1), 0, timeZone)) } },
      include: { device: { select: { deviceName: true } } },
      orderBy: { punchTime: "asc" }
    });
    return logs.map((log) => this.view(log));
  }

  private view(log: { id: string; punchTime: Date; source: string; direction: string | null; locationName: string | null; clientDeviceName: string | null; deviceId: string | null; photoFileId?: string | null; device?: { deviceName: string | null } | null }) {
    return {
      id: log.id,
      punchTime: log.punchTime,
      source: log.source,
      direction: log.direction,
      place: log.locationName,
      device: log.source === "machine" ? (log.device?.deviceName ?? log.deviceId) : log.clientDeviceName,
      photoFileId: log.photoFileId ?? null
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
