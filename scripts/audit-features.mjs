#!/usr/bin/env node
// Đối chiếu docs/backlog.yaml với code thật.
//
// Usage:
//   npm run audit:features                 # báo cáo tổng quan
//   npm run audit:features -- --module LV  # chỉ một module
//   npm run audit:features -- --phase 3    # chỉ một phase
//   npm run audit:features -- --routes     # in toàn bộ route đang có trong API
//   npm run audit:features -- --write      # ghi thêm docs/feature-audit.md
//   npm run audit:features -- --strict     # exit 1 nếu có lỗi (dùng cho CI)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backlogPath = path.join(root, "docs", "backlog.yaml");
const reportPath = path.join(root, "docs", "feature-audit.md");
const apiSrc = path.join(root, "apps", "api", "src");
const webRoots = ["app", "components", "lib"].map((dir) => path.join(root, "apps", "web", dir));

const STATUSES = ["todo", "doing", "partial", "done", "skipped"];
const HTTP_METHODS = ["Get", "Post", "Put", "Patch", "Delete"];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

const rel = (file) => path.relative(root, file).replace(/\\/g, "/");

function normalizeRoute(method, routePath) {
  const clean = `/${routePath}`
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
    .replace(/:[A-Za-z0-9_]+/g, ":p");
  return `${method.toUpperCase()} ${clean || "/"}`;
}

// ---------- Quét controller của API ----------

// True when JwtAuthGuard is registered as APP_GUARD: every route then requires a session
// unless it carries @Public().
function hasGlobalAuthGuard() {
  return walk(apiSrc, (file) => file.endsWith(".module.ts")).some((file) =>
    /provide:\s*APP_GUARD,\s*use(?:Existing|Class):\s*JwtAuthGuard/.test(fs.readFileSync(file, "utf8"))
  );
}

function scanControllers() {
  const routes = [];
  const globalAuth = hasGlobalAuthGuard();
  const files = walk(apiSrc, (file) => file.endsWith(".controller.ts"));

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/);
    const classLine = lines.findIndex((line) => /^export class \w+/.test(line));
    if (classLine < 0) continue;

    const header = lines.slice(0, classLine).join("\n");
    const prefix = header.match(/@Controller\(\s*(?:["'`]([^"'`]*)["'`])?\s*\)/)?.[1] ?? "";
    const classGuarded = /@UseGuards\(/.test(header);
    const classPermission = /@Require(?:Any)?Permissions?\(/.test(header);
    const classPublic = /@Public\(\)/.test(header);

    for (let i = classLine + 1; i < lines.length; i += 1) {
      const match = lines[i].match(new RegExp(`^\\s*@(${HTTP_METHODS.join("|")})\\(\\s*(?:["'\`]([^"'\`]*)["'\`])?\\s*\\)`));
      if (!match) continue;

      // Nhóm decorator của method: từ sau method trước đó tới dòng khai báo method.
      let start = i;
      while (start - 1 > classLine && !/^\s{2}}\s*$/.test(lines[start - 1]) && !/^export class/.test(lines[start - 1])) {
        start -= 1;
      }
      let end = i;
      while (end + 1 < lines.length && !/^\s{2}(?:async\s+)?\w+\s*\(/.test(lines[end])) end += 1;
      const block = lines.slice(start, end + 1).join("\n");
      const handler = lines[end].match(/^\s{2}(?:async\s+)?(\w+)\s*\(/)?.[1] ?? "?";

      const fullPath = [prefix, match[2] ?? ""].filter(Boolean).join("/");
      const isPublic = classPublic || /@Public\(\)/.test(block);
      const ownGuard = classGuarded || /@UseGuards\(/.test(block);
      const permission = classPermission || /@Require(?:Any)?Permissions?\(/.test(block);
      routes.push({
        key: normalizeRoute(match[1], fullPath),
        display: `${match[1].toUpperCase()} /${fullPath}`.replace(/\/+/g, "/").replace(/(.)\/$/, "$1"),
        file: rel(file),
        line: i + 1,
        handler,
        public: isPublic,
        // A @Public route is still guarded when it brings its own guard (e.g. AttendanceSyncGuard).
        guarded: ownGuard || (globalAuth && !isPublic),
        permission,
        access: isPublic ? (ownGuard ? "public+guard" : "public") : permission ? "permission" : "login"
      });
    }
  }
  return routes;
}

// ---------- Quét import mock-data ----------

function scanMockImports() {
  const files = [
    ...walk(apiSrc, (file) => /\.tsx?$/.test(file)),
    ...webRoots.flatMap((dir) => walk(dir, (file) => /\.tsx?$/.test(file)))
  ];
  return files
    .filter((file) => !/mock-data\.ts$/.test(file) && !/\.spec\.ts$/.test(file))
    .filter((file) => /from\s+["'][^"']*mock-data["']/.test(fs.readFileSync(file, "utf8")))
    .map(rel)
    .sort();
}

// ---------- Đọc và kiểm tra backlog ----------

function loadBacklog() {
  const doc = yaml.load(fs.readFileSync(backlogPath, "utf8"));
  const errors = [];
  const items = [];
  const seen = new Set();

  for (const mod of doc.modules ?? []) {
    if (!mod.code || !mod.name) errors.push(`Module thiếu code/name: ${JSON.stringify(mod).slice(0, 80)}`);
    for (const item of mod.items ?? []) {
      const entry = {
        ...item,
        module: mod.code,
        moduleName: mod.name,
        phase: item.phase ?? mod.phase,
        api: item.api ? [].concat(item.api) : [],
        depends: item.depends ? [].concat(item.depends) : []
      };
      if (!entry.id) errors.push(`Item thiếu id trong module ${mod.code}: ${entry.title}`);
      else if (seen.has(entry.id)) errors.push(`Trùng id: ${entry.id}`);
      else if (!entry.id.startsWith(`${mod.code}-`)) errors.push(`${entry.id} không bắt đầu bằng mã module ${mod.code}-`);
      seen.add(entry.id);
      if (!entry.title) errors.push(`${entry.id}: thiếu title`);
      if (!STATUSES.includes(entry.status)) errors.push(`${entry.id}: status "${entry.status}" không hợp lệ (${STATUSES.join("|")})`);
      if (entry.status === "skipped" && !entry.note) errors.push(`${entry.id}: status skipped phải có note giải thích`);
      for (const api of entry.api) {
        if (!/^(GET|POST|PUT|PATCH|DELETE) \/\S*$/.test(api)) errors.push(`${entry.id}: api "${api}" sai định dạng "METHOD /path"`);
      }
      items.push(entry);
    }
  }

  for (const item of items) {
    for (const dep of item.depends) {
      if (!seen.has(dep)) errors.push(`${item.id}: depends tới id không tồn tại ${dep}`);
    }
  }
  return { doc, items, errors };
}

// ---------- Đối chiếu ----------

function audit() {
  const routes = scanControllers();
  const routeMap = new Map(routes.map((route) => [route.key, route]));
  const mockImports = scanMockImports();
  const { doc, items, errors } = loadBacklog();
  const warnings = [];
  const tracked = new Set();

  for (const item of items) {
    const missing = [];
    for (const api of item.api) {
      const [method, ...rest] = api.split(" ");
      const key = normalizeRoute(method, rest.join(" "));
      tracked.add(key);
      if (!routeMap.has(key)) missing.push(api);
    }
    item.missingApi = missing;
    item.presentApi = item.api.length - missing.length;

    if (item.status === "done" && missing.length) {
      errors.push(`${item.id} đánh done nhưng chưa có route: ${missing.join(", ")}`);
    }
    if ((item.status === "todo") && item.api.length && missing.length === 0) {
      warnings.push(`${item.id} vẫn todo nhưng mọi route đã tồn tại → kiểm tra lại, có thể là partial/done`);
    }
    if (item.status === "done") {
      for (const api of item.api) {
        const [method, ...rest] = api.split(" ");
        const route = routeMap.get(normalizeRoute(method, rest.join(" ")));
        if (route && !route.guarded && !item.public) {
          errors.push(`${item.id} đánh done nhưng route không có guard: ${route.display} (${route.file}:${route.line})`);
        }
      }
    }
  }

  // Routes reachable with no authentication at all must be declared `public: true` in the backlog.
  const declaredPublic = new Set(
    items.filter((item) => item.public).flatMap((item) => item.api.map((api) => {
      const [method, ...rest] = api.split(" ");
      return normalizeRoute(method, rest.join(" "));
    }))
  );
  for (const route of routes.filter((route) => route.access === "public" && !declaredPublic.has(route.key))) {
    warnings.push(`Route ${route.display} là @Public nhưng item trong backlog chưa có "public: true" (${route.file}:${route.line})`);
  }

  const untracked = routes.filter((route) => !tracked.has(route.key));
  const unguarded = routes.filter((route) => !route.guarded);
  const publicRoutes = routes.filter((route) => route.public);
  const loginOnly = routes.filter((route) => route.access === "login");

  return { doc, items, routes, untracked, unguarded, publicRoutes, loginOnly, mockImports, errors, warnings };
}

// ---------- Báo cáo ----------

function pct(done, total) {
  return total ? `${Math.round((done / total) * 100)}%` : "-";
}

function bar(done, partial, total, width = 20) {
  if (!total) return "".padEnd(width, "·");
  const full = Math.round((done / total) * width);
  const half = Math.round(((done + partial) / total) * width) - full;
  return "█".repeat(full) + "▒".repeat(half) + "·".repeat(width - full - half);
}

function summarize(items) {
  const count = (status) => items.filter((item) => item.status === status).length;
  const skipped = count("skipped");
  return {
    total: items.length - skipped,
    done: count("done"),
    partial: count("partial") + count("doing"),
    todo: count("todo"),
    skipped
  };
}

function render(result) {
  const moduleFilter = option("module");
  const phaseFilter = option("phase");
  const items = result.items.filter(
    (item) => (!moduleFilter || item.module === moduleFilter) && (!phaseFilter || String(item.phase) === phaseFilter)
  );
  const out = [];
  const total = summarize(items);

  out.push("# Feature audit", "");
  out.push(`Sinh lúc: ${new Date().toISOString()}  ·  Nguồn: docs/backlog.yaml`, "");
  if (moduleFilter || phaseFilter) out.push(`Bộ lọc: ${moduleFilter ? `module=${moduleFilter} ` : ""}${phaseFilter ? `phase=${phaseFilter}` : ""}`, "");
  out.push(
    `Tổng: **${total.done}/${total.total} done (${pct(total.done, total.total)})**, ${total.partial} partial/doing, ${total.todo} todo, ${total.skipped} skipped.`,
    ""
  );

  out.push("## Theo module", "", "| Module | Phase | Tiến độ | Done | Partial | Todo | % |", "|---|---|---|---|---|---|---|");
  const modules = [...new Set(items.map((item) => item.module))];
  for (const code of modules) {
    const group = items.filter((item) => item.module === code);
    const s = summarize(group);
    out.push(
      `| ${code} · ${group[0].moduleName} | ${[...new Set(group.map((item) => item.phase))].join(",")} | \`${bar(s.done, s.partial, s.total)}\` | ${s.done} | ${s.partial} | ${s.todo} | ${pct(s.done, s.total)} |`
    );
  }
  out.push("");

  const phases = result.doc.phases ?? {};
  out.push("## Theo phase", "", "| Phase | Mục tiêu | Done | Còn lại | % |", "|---|---|---|---|---|");
  for (const phase of [...new Set(items.map((item) => item.phase))].sort((a, b) => a - b)) {
    const s = summarize(items.filter((item) => item.phase === phase));
    out.push(`| ${phase} | ${phases[phase] ?? ""} | ${s.done} | ${s.total - s.done} | ${pct(s.done, s.total)} |`);
  }
  out.push("");

  out.push(`## Lỗi (${result.errors.length})`, "");
  out.push(...(result.errors.length ? result.errors.map((line) => `- ❌ ${line}`) : ["- Không có"]), "");

  out.push(`## Cảnh báo (${result.warnings.length})`, "");
  out.push(...(result.warnings.length ? result.warnings.map((line) => `- ⚠️ ${line}`) : ["- Không có"]), "");

  out.push(`## Route API không có guard (${result.unguarded.length})`, "");
  out.push(...(result.unguarded.length ? result.unguarded.map((route) => `- \`${route.display}\` — ${route.file}:${route.line}`) : ["- Không có"]), "");

  out.push(`## Route @Public (${result.publicRoutes.length})`, "");
  out.push(
    ...(result.publicRoutes.length
      ? result.publicRoutes.map((route) => `- \`${route.display}\` ${route.access === "public+guard" ? "(có guard riêng)" : "(mở hoàn toàn)"} — ${route.file}:${route.line}`)
      : ["- Không có"]),
    ""
  );

  out.push(`## Route chỉ cần đăng nhập, không yêu cầu quyền (${result.loginOnly.length})`, "");
  out.push(...(result.loginOnly.length ? result.loginOnly.map((route) => `- \`${route.display}\` — ${route.file}:${route.line}`) : ["- Không có"]), "");

  out.push(`## Route có trong code nhưng chưa có trong backlog (${result.untracked.length})`, "");
  out.push(...(result.untracked.length ? result.untracked.map((route) => `- \`${route.display}\` — ${route.file}:${route.line}`) : ["- Không có"]), "");

  out.push(`## File còn import mock-data (${result.mockImports.length})`, "");
  out.push(...result.mockImports.map((file) => `- ${file}`), "");

  if (flag("routes")) {
    out.push(`## Toàn bộ route API (${result.routes.length})`, "");
    out.push(...result.routes.map((route) => `- \`${route.display}\` ${route.guarded ? "🔒" : "🔓"} ${route.access} · ${route.handler} — ${route.file}:${route.line}`), "");
  }

  if (moduleFilter || phaseFilter) {
    out.push("## Chi tiết item", "");
    for (const item of items) {
      const api = item.api.length ? ` — API ${item.presentApi}/${item.api.length}` : "";
      out.push(`- [${item.status}] **${item.id}** ${item.title}${api}${item.missingApi.length ? ` (thiếu: ${item.missingApi.join(", ")})` : ""}`);
    }
    out.push("");
  }

  return out.join("\n");
}

const result = audit();
const report = render(result);
console.log(report);

if (flag("write")) {
  fs.writeFileSync(reportPath, `${report}\n`);
  console.log(`\nĐã ghi ${rel(reportPath)}`);
}

if (flag("strict") && result.errors.length) process.exit(1);
