import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export const MAX_PAGE_SIZE = 200;
export const DEFAULT_PAGE_SIZE = 50;

// Standard query for list endpoints: ?page=1&limit=50&sort=createdAt&order=desc&q=text
export class ListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({ description: "Field to sort by; each endpoint whitelists its own fields." })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9]*$/)
  sort?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  order?: "asc" | "desc";

  @ApiPropertyOptional({ description: "Free-text search." })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export function pageArgs(query: Pick<ListQueryDto, "page" | "limit">) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

// Returns a Prisma orderBy for `sort` only when it is in the endpoint's whitelist.
export function sortArgs<Field extends string>(
  query: Pick<ListQueryDto, "sort" | "order">,
  allowed: readonly Field[],
  fallback: Field
): Record<Field, "asc" | "desc"> {
  const field = allowed.includes(query.sort as Field) ? (query.sort as Field) : fallback;

  return { [field]: query.order ?? "desc" } as Record<Field, "asc" | "desc">;
}

export function paginated<T>(items: T[], total: number, query: Pick<ListQueryDto, "page" | "limit">): Paginated<T> {
  const { page, limit } = pageArgs(query);

  return { items, total, page, limit, pageCount: Math.max(1, Math.ceil(total / limit)) };
}
