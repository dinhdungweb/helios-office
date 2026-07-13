import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { UpdateUserPreferenceDto } from "./user-preferences.dto";

const scopePattern = /^[a-z0-9][a-z0-9._:-]{0,79}$/;

@Injectable()
export class UserPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async find(accountId: string, scope: string) {
    const normalizedScope = this.normalizeScope(scope);
    const preference = await this.prisma.userPreference.findUnique({
      where: {
        accountId_scope: {
          accountId,
          scope: normalizedScope
        }
      }
    });

    return {
      scope: normalizedScope,
      value: preference?.value ?? null,
      updatedAt: preference?.updatedAt ?? null
    };
  }

  async update(accountId: string, scope: string, dto: UpdateUserPreferenceDto) {
    const normalizedScope = this.normalizeScope(scope);
    const value = this.toJsonValue(dto.value);
    const preference = await this.prisma.userPreference.upsert({
      where: {
        accountId_scope: {
          accountId,
          scope: normalizedScope
        }
      },
      update: {
        value
      },
      create: {
        accountId,
        scope: normalizedScope,
        value
      }
    });

    return {
      scope: preference.scope,
      value: preference.value,
      updatedAt: preference.updatedAt
    };
  }

  async remove(accountId: string, scope: string) {
    const normalizedScope = this.normalizeScope(scope);

    await this.prisma.userPreference.deleteMany({
      where: {
        accountId,
        scope: normalizedScope
      }
    });

    return {
      ok: true,
      scope: normalizedScope
    };
  }

  private normalizeScope(scope: string) {
    const normalizedScope = scope.trim().toLowerCase();

    if (!scopePattern.test(normalizedScope)) {
      throw new BadRequestException("Preference scope must use letters, numbers, dot, colon, underscore, or dash.");
    }

    return normalizedScope;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === undefined) {
      throw new BadRequestException("Preference value is required.");
    }

    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
      throw new BadRequestException("Preference value must be JSON serializable.");
    }
  }
}
