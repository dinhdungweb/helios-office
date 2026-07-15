import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>("API_PORT", 4000);

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Helios Office API")
    .setDescription("Versioned API for Helios Office HRM and intranet workflows.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
}

void bootstrap();
