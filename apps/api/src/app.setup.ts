import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { json, urlencoded } from "express";
import helmet from "helmet";

function splitOrigins(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function resolveWebOrigins(config: ConfigService) {
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const configuredOrigins = [
    ...splitOrigins(config.get<string>("WEB_ORIGIN")),
    ...splitOrigins(config.get<string>("WEB_ORIGINS"))
  ];

  return Array.from(new Set([...defaults, ...configuredOrigins]));
}

// Shared by main.ts and the e2e tests so tests exercise the same HTTP pipeline as production.
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);

  app.use(
    helmet({
      // The API serves JSON; CSP would only affect Swagger UI at /docs, which needs inline scripts.
      contentSecurityPolicy: false,
      // The web app on another port/subdomain of the same site may embed API files (documents, avatars).
      crossOriginResourcePolicy: { policy: "same-site" }
    })
  );
  // Files no longer travel in JSON bodies (they go straight to object storage via /files), so the
  // limit drops from 25mb. 2mb still fits the largest attendance sync batch (5,000 punches).
  app.use(json({ limit: "2mb" }));
  app.use(urlencoded({ extended: true, limit: "2mb" }));

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: resolveWebOrigins(config),
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true
    })
  );
}
