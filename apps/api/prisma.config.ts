import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

for (const envPath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  loadEnv({ path: envPath, quiet: true });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://helios:helios@localhost:5432/helios_office?schema=public"
  }
});
