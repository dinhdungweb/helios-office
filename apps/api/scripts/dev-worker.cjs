// Dev runner for the worker: reuses the API's `nest start --watch` output instead of a second
// compiler (both would fight over dist/ with deleteOutDir).
//
// It polls dist/worker.js itself rather than using `node --watch`: the API watcher deletes dist/ on
// startup (deleteOutDir), and `node --watch` neither waits for that nor notices files that were
// deleted and written again, so the worker stayed dead after the first rebuild. Here the worker
// only starts from a build newer than this process, restarts after every rebuild once dist/ has
// been quiet for a moment, and after a crash simply waits for the next build.
const { spawn } = require("node:child_process");
const { statSync } = require("node:fs");
const { join } = require("node:path");

const dist = join(__dirname, "..", "dist");
const entry = join(dist, "worker.js");
const watched = [entry, join(dist, "main.js")];
const startedAt = Date.now();
const POLL_MS = 1_000;
// tsc writes files one by one; wait until nothing changed for this long before (re)starting.
const SETTLE_MS = 2_000;
const FIRST_BUILD_TIMEOUT_MS = 5 * 60_000;

let child = null;
let runningBuild = 0;
let stopping = false;

function latestBuild() {
  try {
    return Math.max(...watched.map((file) => statSync(file).mtimeMs));
  } catch {
    return 0; // dist/ is being rewritten
  }
}

function launch(build) {
  runningBuild = build;
  child = spawn(process.execPath, ["--enable-source-maps", entry], { stdio: "inherit" });
  child.on("exit", (code, signal) => {
    child = null;
    if (stopping) process.exit(code ?? 0);
    if (signal !== "SIGTERM") console.error(`[worker] exited (${signal ?? code}); waiting for the next build to restart`);
  });
}

function tick() {
  const build = latestBuild();
  const fresh = build >= startedAt;
  const settled = build > 0 && Date.now() - build >= SETTLE_MS;

  if (!fresh && runningBuild === 0 && Date.now() - startedAt > FIRST_BUILD_TIMEOUT_MS) {
    console.error(`[worker] no fresh build in ${entry}; is the API watcher (npm run dev:api) running?`);
    process.exit(1);
  }

  if (fresh && settled && build !== runningBuild) {
    if (child) {
      console.log("[worker] rebuilt, restarting");
      const previous = child;
      previous.once("exit", () => launch(build));
      previous.kill("SIGTERM");
      runningBuild = build;
    } else {
      launch(build);
    }
  }

  setTimeout(tick, POLL_MS);
}

function stop() {
  stopping = true;
  if (child) child.kill("SIGTERM");
  else process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
tick();
