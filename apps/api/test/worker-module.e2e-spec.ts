import { Test } from "@nestjs/testing";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { EMAIL_QUEUE, EXPORTS_QUEUE, IMPORTS_QUEUE, NOTIFICATIONS_QUEUE } from "../src/common/queue/queue.constants";
import { RealtimeEmitter } from "../src/worker/realtime-emitter.service";
import { WorkerRuntime } from "../src/worker/worker-runtime.service";
import { WorkerModule } from "../src/worker/worker.module";

// Boots the worker's whole dependency graph (without Redis) so a missing provider fails CI instead
// of crashing the worker process at startup.
describe("WorkerModule (e2e)", () => {
  it("resolves every provider and registers every queue it consumes", async () => {
    const registered: string[] = [];
    const moduleRef = await Test.createTestingModule({ imports: [WorkerModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: async () => undefined, $disconnect: async () => undefined })
      .overrideProvider(WorkerRuntime)
      .useValue({ register: (queueName: string) => registered.push(queueName) })
      .overrideProvider(RealtimeEmitter)
      .useValue({ toAccount: () => undefined })
      .compile();

    const app = moduleRef.createNestApplication({ logger: false });
    await app.init();
    expect(registered.sort()).toEqual([EMAIL_QUEUE, EXPORTS_QUEUE, IMPORTS_QUEUE, NOTIFICATIONS_QUEUE].sort());
    await app.close();
  });
});
