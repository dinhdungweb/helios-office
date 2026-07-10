import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let envCache: Record<string, string> | null = null;

function parseEnvFile(path: string) {
  if (!existsSync(path)) {
    return {};
  }

  const values: Record<string, string> = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    values[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return values;
}

function readProcessEnv() {
  const values: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }

  return values;
}

function loadEnvCache() {
  if (envCache) {
    return envCache;
  }

  envCache = {
    ...parseEnvFile(resolve(process.cwd(), ".env")),
    ...parseEnvFile(resolve(process.cwd(), "../../.env")),
    ...readProcessEnv()
  };

  return envCache;
}

export function getServerEnv(key: string, fallback?: string) {
  return loadEnvCache()[key] ?? fallback;
}
