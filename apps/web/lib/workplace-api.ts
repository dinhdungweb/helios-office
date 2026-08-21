import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type WorkplaceStatus = "active" | "archived";

export type WorkplaceRecord = {
  id: string;
  name: string;
  addressLine: string | null;
  administrativeArea: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  description: string | null;
  status: WorkplaceStatus;
  createdAt?: string | null;
};

export type WorkplaceDepartment = {
  id: string;
  name: string;
};

export type WorkplaceData = {
  workplaces: WorkplaceRecord[];
  departments: WorkplaceDepartment[];
  source: "api" | "unavailable";
  error?: string;
};

async function requestJson<T>(path: string) {
  const headers = new Headers();
  const accessToken = await getSessionAccessToken();

  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers,
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getWorkplaceData(): Promise<WorkplaceData> {
  try {
    const [workplaces, departments] = await Promise.all([
      requestJson<WorkplaceRecord[]>("/workplaces?includeArchived=true"),
      requestJson<Array<WorkplaceDepartment & { status?: string }>>("/departments")
    ]);

    return {
      workplaces,
      departments: departments
        .filter((department) => !department.status || department.status === "active")
        .map(({ id, name }) => ({ id, name })),
      source: "api"
    };
  } catch (error) {
    return {
      workplaces: [],
      departments: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach workplace API"
    };
  }
}
