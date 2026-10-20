// Dev runner for the worker: reuses the API's `nest start --watch` output instead of a second
// compiler (both would fight over dist/ with deleteOutDir). Waits for dist/worker.js, then runs it
// under `node --watch`, which restarts whenever the API watcher rewrites the compiled files.
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const entry = join(__dirname, "..", "dist", "worker.js");
const startedAt = Date.now();

function start() {
  if (!existsSync(entry)) {
    if (Date.now() - startedAt > 5 * 60_000) {
      console.error(`[worker] ${entry} did not appear; is the API watcher (npm run dev:api) running?`);
      process.exit(1);
    }
    setTimeout(start, 1_000);
    return;
  }

  const child = spawn(process.execPath, ["--enable-source-maps", "--watch", entry], { stdio: "inherit" });
  const stop = () => child.kill("SIGTERM");
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code) => process.exit(code ?? 0));
}

start();
