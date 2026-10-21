import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { KeycloakAdminService } from "./keycloak-admin.service";

// Company-wide sign-in policies, stored as AdminSetting rows: two-factor (AU-18) and sessions
// (AU-19). Read on every authenticated request, so values are cached briefly in memory; the API and
// worker are separate processes, which is why the cache expires instead of only being cleared.

export const TWO_FACTOR_SETTING_KEY = "security.two_factor";
export const SESSION_SETTING_KEY = "security.session";
const CACHE_TTL_MS = 30_000;
const KEYCLOAK_DEFAULT_IDLE_SECONDS = 1800;

export const OTP_DIGIT_OPTIONS = [4, 6, 8] as const;
export const OTP_PERIOD_OPTIONS = [30, 45, 60] as const;
export const VERIFICATION_MINUTE_OPTIONS = [10, 20, 30, 60] as const;

export type TwoFactorPolicy = {
  enforced: boolean;
  // How long a verification counts for features that ask again (payroll).
  verificationMinutes: number;
  payrollRequired: boolean;
  // Applied to new authenticator app enrollments and to email codes.
  otpDigits: number;
  otpPeriodSeconds: number;
};

export type SessionPolicy = {
  autoLogoutEnabled: boolean;
  idleMinutes: number;
  warningSeconds: number;
  // 0 = no limit; otherwise the oldest sessions are signed out at sign-in.
  maxConcurrentSessions: number;
};

export const DEFAULT_TWO_FACTOR_POLICY: TwoFactorPolicy = {
  enforced: false,
  verificationMinutes: 20,
  payrollRequired: false,
  otpDigits: 6,
  otpPeriodSeconds: 30
};

export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  autoLogoutEnabled: false,
  idleMinutes: 30,
  warningSeconds: 60,
  maxConcurrentSessions: 0
};

function pick<T extends number>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function integer(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

export function readTwoFactorPolicy(value: unknown): TwoFactorPolicy {
  const stored = value && typeof value === "object" ? (value as Partial<TwoFactorPolicy>) : {};
  const fallback = DEFAULT_TWO_FACTOR_POLICY;

  return {
    enforced: typeof stored.enforced === "boolean" ? stored.enforced : fallback.enforced,
    verificationMinutes: pick(stored.verificationMinutes, VERIFICATION_MINUTE_OPTIONS, 20),
    payrollRequired: typeof stored.payrollRequired === "boolean" ? stored.payrollRequired : fallback.payrollRequired,
    otpDigits: pick(stored.otpDigits, OTP_DIGIT_OPTIONS, 6),
    otpPeriodSeconds: pick(stored.otpPeriodSeconds, OTP_PERIOD_OPTIONS, 30)
  };
}

export function readSessionPolicy(value: unknown): SessionPolicy {
  const stored = value && typeof value === "object" ? (value as Partial<SessionPolicy>) : {};
  const idleMinutes = integer(stored.idleMinutes, 10, 1440, DEFAULT_SESSION_POLICY.idleMinutes);

  return {
    autoLogoutEnabled: typeof stored.autoLogoutEnabled === "boolean" ? stored.autoLogoutEnabled : false,
    idleMinutes,
    warningSeconds: integer(stored.warningSeconds, 60, idleMinutes * 60 - 60, Math.min(60, idleMinutes * 60 - 60)),
    maxConcurrentSessions: integer(stored.maxConcurrentSessions, 0, 20, 0)
  };
}

// Policy fields an admin may send; anything left out keeps its stored value.
export function mergeSessionPolicy(current: SessionPolicy, patch: Partial<SessionPolicy>): SessionPolicy {
  const next = { ...current, ...patch };

  if (next.warningSeconds > next.idleMinutes * 60 - 60) {
    throw new BadRequestException("Cảnh báo phải sớm hơn thời điểm đăng xuất ít nhất 60 giây.");
  }

  return readSessionPolicy(next);
}

const SETTING_ROWS: Record<string, { title: string; summary: string; controls: string[] }> = {
  [TWO_FACTOR_SETTING_KEY]: {
    title: "Bảo mật 2 lớp",
    summary: "Bắt buộc xác thực OTP (app xác thực hoặc email) khi đăng nhập và khi xem bảng lương.",
    controls: ["Bắt buộc 2FA", "Phiên xác thực", "Bảng lương", "Mã OTP"]
  },
  [SESSION_SETTING_KEY]: {
    title: "Phiên làm việc",
    summary: "Tự động đăng xuất khi không hoạt động và giới hạn số phiên đăng nhập cùng lúc.",
    controls: ["Tự động đăng xuất", "Cảnh báo", "Số phiên đồng thời"]
  }
};

@Injectable()
export class SecurityPolicyService {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly keycloakAdmin: KeycloakAdminService
  ) {}

  async getTwoFactorPolicy() {
    return readTwoFactorPolicy(await this.readPayload(TWO_FACTOR_SETTING_KEY));
  }

  async getSessionPolicy() {
    return readSessionPolicy(await this.readPayload(SESSION_SETTING_KEY));
  }

  async updateTwoFactorPolicy(patch: Partial<TwoFactorPolicy>, actorId?: string) {
    const before = await this.getTwoFactorPolicy();
    const next = readTwoFactorPolicy({ ...before, ...patch });
    await this.writePayload(TWO_FACTOR_SETTING_KEY, before, next, actorId);
    return next;
  }

  // Keycloak enforces the idle limit on the server side too (refresh fails after it), so an idle
  // tab that never runs the page's timer still loses its session. Disabled means Keycloak's own
  // default of 30 minutes, which is what the realm had before this setting existed.
  async updateSessionPolicy(patch: Partial<SessionPolicy>, actorId?: string) {
    const before = await this.getSessionPolicy();
    const next = mergeSessionPolicy(before, patch);
    await this.keycloakAdmin.updateRealmSessionIdle(next.autoLogoutEnabled ? next.idleMinutes * 60 : KEYCLOAK_DEFAULT_IDLE_SECONDS);
    await this.writePayload(SESSION_SETTING_KEY, before, next, actorId);
    return next;
  }

  private async readPayload(key: string) {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const row = await this.prisma.adminSetting.findUnique({ where: { key }, select: { payload: true } });
    this.cache.set(key, { value: row?.payload ?? null, expiresAt: Date.now() + CACHE_TTL_MS });
    return row?.payload ?? null;
  }

  private async writePayload(key: string, before: object, next: object, actorId?: string) {
    const meta = SETTING_ROWS[key];
    const payload = next as Prisma.InputJsonObject;

    await this.prisma.$transaction(async (tx) => {
      await tx.adminSetting.upsert({
        where: { key },
        create: {
          key,
          tier: "system",
          category: "Bảo mật",
          title: meta.title,
          summary: meta.summary,
          owner: "IT",
          status: "configured",
          controls: meta.controls,
          payload
        },
        update: { payload }
      });
      await tx.auditLog.create({
        data: {
          ...this.audit.contextFields(),
          actorId,
          action: `admin_setting.${key}.update`,
          entityType: "AdminSetting",
          entityId: key,
          beforeValue: before as Prisma.InputJsonObject,
          afterValue: payload
        }
      });
    });

    this.cache.delete(key);
  }
}
