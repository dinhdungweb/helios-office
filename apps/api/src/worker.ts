import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker/worker.module";

// Background worker process: `npm run start:worker` (built) or `start:worker:dev` (watch).
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
}

void bootstrap();
