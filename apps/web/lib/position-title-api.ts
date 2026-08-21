import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type JobCatalogStatus = "active" | "archived";

export type JobPositionRecord = {
  id: string;
  code: string;
  name: string;
  family: string | null;
  description: string | null;
  status: JobCatalogStatus;
  archivedAt?: string | null;
  employeeCount: number;
};

export type JobTitleRecord = {
  id: string;
  code: string;
  name: string;
  rank: number;
  levelId?: string | null;
  level?: JobLevelRecord | null;
  description: string | null;
  status: JobCatalogStatus;
  archivedAt?: string | null;
  createdAt?: string | null;
  employeeCount: number;
};

export type JobLevelRecord = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: JobCatalogStatus;
  archivedAt?: string | null;
  createdAt?: string | null;
};

export type PositionTitleData = {
  positions: JobPositionRecord[];
  titles: JobTitleRecord[];
  levels: JobLevelRecord[];
  source: "api" | "unavailable";
  error?: string;
};

async function requestJson<T>(path: string) {
  const headers = new Headers();
  const accessToken = await getSessionAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizePosition(position: Partial<JobPositionRecord> & { id: string; code: string; name: string }): JobPositionRecord {
  return {
    id: position.id,
    code: position.code,
    name: position.name,
    family: position.family ?? null,
    description: position.description ?? null,
    status: position.status ?? "active",
    archivedAt: position.archivedAt ?? null,
    employeeCount: position.employeeCount ?? 0
  };
}

function normalizeTitle(title: Partial<JobTitleRecord> & { id: string; code: string; name: string }): JobTitleRecord {
  return {
    id: title.id,
    code: title.code,
    name: title.name,
    rank: title.rank ?? 0,
    levelId: title.levelId ?? null,
    level: title.level ?? null,
    description: title.description ?? null,
    status: title.status ?? "active",
    archivedAt: title.archivedAt ?? null,
    createdAt: title.createdAt ?? null,
    employeeCount: title.employeeCount ?? 0
  };
}

function normalizeLevel(level: Partial<JobLevelRecord> & { id: string; name: string }): JobLevelRecord {
  return {
    id: level.id,
    name: level.name,
    description: level.description ?? null,
    sortOrder: level.sortOrder ?? 0,
    status: level.status ?? "active",
    archivedAt: level.archivedAt ?? null,
    createdAt: level.createdAt ?? null
  };
}

export async function getPositionTitleData(): Promise<PositionTitleData> {
  try {
    const [positions, titles, levels] = await Promise.all([
      requestJson<Array<Partial<JobPositionRecord> & { id: string; code: string; name: string }>>("/job-positions?includeArchived=true"),
      requestJson<Array<Partial<JobTitleRecord> & { id: string; code: string; name: string }>>("/job-titles?includeArchived=true"),
      requestJson<Array<Partial<JobLevelRecord> & { id: string; name: string }>>("/job-levels?includeArchived=true")
    ]);

    return {
      positions: positions.map(normalizePosition),
      titles: titles.map(normalizeTitle),
      levels: levels.map(normalizeLevel),
      source: "api"
    };
  } catch (error) {
    return {
      positions: [],
      titles: [],
      levels: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach position/title API"
    };
  }
}
