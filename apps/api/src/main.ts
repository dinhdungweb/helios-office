import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { DEFAULT_REDIS_URL } from "./common/queue/queue.constants";
import { RedisIoAdapter } from "./common/realtime/redis-io.adapter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const port = config.get<number>("API_PORT", 4000);

  configureApp(app);

  const ioAdapter = new RedisIoAdapter(app);
  await ioAdapter.connectToRedis(config.get<string>("REDIS_URL") || DEFAULT_REDIS_URL);
  app.useWebSocketAdapter(ioAdapter);

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
