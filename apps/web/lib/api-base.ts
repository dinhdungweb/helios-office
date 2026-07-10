import { getServerEnv } from "@/lib/server-env";

export function getApiBaseUrl() {
  return getServerEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
}
