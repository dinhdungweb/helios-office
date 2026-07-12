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
  description: string | null;
  status: JobCatalogStatus;
  archivedAt?: string | null;
  employeeCount: number;
};

export type PositionTitleData = {
  positions: JobPositionRecord[];
  titles: JobTitleRecord[];
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
    description: title.description ?? null,
    status: title.status ?? "active",
    archivedAt: title.archivedAt ?? null,
    employeeCount: title.employeeCount ?? 0
  };
}

export async function getPositionTitleData(): Promise<PositionTitleData> {
  try {
    const [positions, titles] = await Promise.all([
      requestJson<Array<Partial<JobPositionRecord> & { id: string; code: string; name: string }>>("/job-positions?includeArchived=true"),
      requestJson<Array<Partial<JobTitleRecord> & { id: string; code: string; name: string }>>("/job-titles?includeArchived=true")
    ]);

    return {
      positions: positions.map(normalizePosition),
      titles: titles.map(normalizeTitle),
      source: "api"
    };
  } catch (error) {
    return {
      positions: [],
      titles: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach position/title API"
    };
  }
}
