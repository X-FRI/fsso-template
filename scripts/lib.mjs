// 文件职责：集中提供仓库根定位、断言、pnpm 运行器、子进程与进程树清理、HTTP 等待、日志记录、哈希和 F# 注释剥离等跨脚本基础设施，减少重复实现。
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function reserveLoopbackPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolvePort(port)));
    });
  });
}

export function startKitServer(label, options) {
  const port = options.port;
  const origin = `http://127.0.0.1:${port}`;
  const appRoot = options.appRoot ?? root;
  const child = startProcess(label, process.execPath, [resolve(appRoot, "web/build/index.js")], {
    cwd: resolve(appRoot, "web"),
    logFile: options.logFile,
    env: {
      ...process.env,
      ...options.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      ORIGIN: origin,
      FSSO_API_ORIGIN: options.apiOrigin,
    },
  });
  return { child, origin };
}

export function pnpmRunner() {
  const execpath = process.env.npm_execpath;
  if (execpath && /pnpm/i.test(execpath) && existsSync(execpath)) {
    return { command: process.execPath, prefix: [execpath] };
  }
  return { command: "pnpm", prefix: [] };
}

export function resetFile(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "");
}

export function append(path, text) {
  appendFileSync(path, text);
}

export function runLogged(label, command, args, options = {}) {
  const logFile = options.logFile;
  if (logFile) resetFile(logFile);
  console.log(`\n== ${label}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (logFile) append(logFile, output);
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  const failed = Boolean(result.error) || Boolean(result.signal) || result.status === null;
  const status = failed ? 1 : result.status;
  console.log(`== ${label} RC=${status}${result.signal ? ` signal=${result.signal}` : ""}`);
  if (result.error) console.error(result.error.message);
  return { status, output, signal: result.signal ?? null };
}

export function psTable() {
  const result = spawnSync("ps", ["-axo", "pid=,ppid=,comm=,args="], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("ps failed");
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
      if (!match) return null;
      return { pid: Number(match[1]), ppid: Number(match[2]), comm: match[3], args: match[4] };
    })
    .filter(Boolean);
}

export function descendants(pid) {
  const table = psTable();
  const found = [];
  let frontier = [pid];
  while (frontier.length) {
    const next = [];
    for (const parent of frontier) {
      for (const row of table) {
        if (row.ppid === parent && !found.some((item) => item.pid === row.pid)) {
          found.push(row);
          next.push(row.pid);
        }
      }
    }
    frontier = next;
  }
  return found;
}

export function assertSingleDotnetTree(pid) {
  const children = descendants(pid);
  if (children.length !== 0) {
    throw new Error(`Published host spawned child processes: ${JSON.stringify(children)}`);
  }
  const nodeChildren = children.filter((row) => /(^|\/)node(\.exe)?$/.test(row.comm) || /node(\.exe)?\s/.test(row.args));
  if (nodeChildren.length) throw new Error(`Published host has Node child: ${JSON.stringify(nodeChildren)}`);
  return { pid, descendants: children };
}

export function killOwnedTree(pid) {
  if (!pid) return;
  const rows = descendants(pid);
  const signal = (sig) => {
    for (const row of [...rows].reverse()) {
      try { process.kill(row.pid, sig); } catch {}
    }
    try { process.kill(pid, sig); } catch {}
    try { process.kill(-pid, sig); } catch {}
  };
  signal("SIGTERM");
  return sleep(700).then(() => signal("SIGKILL"));
}

export function startProcess(label, command, args, options = {}) {
  const logFile = options.logFile;
  if (logFile) resetFile(logFile);
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  const write = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(`[${label}] ${text}`);
    if (logFile) append(logFile, text);
    options.onText?.(text);
  };
  child.stdout.on("data", write);
  child.stderr.on("data", write);
  return child;
}

export async function waitForHttp(url, options = {}) {
  const deadline = Date.now() + (options.timeoutMs ?? 60_000);
  const child = options.child;
  let lastError = "";
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      throw new Error(`${options.label ?? url} exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.status < 500) return response;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await sleep(250);
  }
  throw new Error(`${options.label ?? url} did not become ready: ${lastError}`);
}

export async function httpJson(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { response, status: response.status, text, json };
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function readText(path) {
  return readFileSync(path, "utf8");
}

export function cleanDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

export function sha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error("git rev-parse HEAD failed");
  return result.stdout.trim();
}

export function stripFSharpComments(source, options = {}) {
  const blankStrings = options.blankStrings ?? false;
  const blank = (text) => (blankStrings ? text.replace(/[^\n]/g, " ") : text);

  let output = "";
  let index = 0;
  let blockDepth = 0;
  const length = source.length;

  while (index < length) {
    if (blockDepth > 0) {
      if (source[index] === "(" && source[index + 1] === "*") {
        blockDepth += 1;
        output += "  ";
        index += 2;
      } else if (source[index] === "*" && source[index + 1] === ")") {
        blockDepth -= 1;
        output += "  ";
        index += 2;
      } else {
        output += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    if (source[index] === "/" && source[index + 1] === "/") {
      while (index < length && source[index] !== "\n") {
        output += " ";
        index += 1;
      }
      continue;
    }

    if (source[index] === "(" && source[index + 1] === "*") {
      blockDepth = 1;
      output += "  ";
      index += 2;
      continue;
    }

    if (source.startsWith('"""', index)) {
      output += blank('"""');
      index += 3;
      while (index < length && !source.startsWith('"""', index)) {
        output += blank(source[index]);
        index += 1;
      }
      if (index < length) {
        output += blank('"""');
        index += 3;
      }
      continue;
    }

    if (source[index] === "@" && source[index + 1] === '"') {
      output += blank('@"');
      index += 2;
      while (index < length) {
        if (source[index] === '"' && source[index + 1] === '"') {
          output += blank('""');
          index += 2;
        } else if (source[index] === '"') {
          output += blank('"');
          index += 1;
          break;
        } else {
          output += blank(source[index]);
          index += 1;
        }
      }
      continue;
    }

    if (source[index] === '"') {
      output += blank('"');
      index += 1;
      while (index < length) {
        if (source[index] === "\\" && index + 1 < length) {
          output += blank(source.slice(index, index + 2));
          index += 2;
        } else if (source[index] === '"') {
          output += blank('"');
          index += 1;
          break;
        } else {
          output += blank(source[index]);
          index += 1;
        }
      }
      continue;
    }

    output += source[index];
    index += 1;
  }

  return output;
}

export function collectApiSymbols(repoRoot = root, moduleName = "Demo") {
  const directory = resolve(repoRoot, `src/Modules/${moduleName}/Api`);
  const symbols = new Set();
  if (!existsSync(directory)) return symbols;

  for (const entry of readdirSync(directory, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".fs")) continue;
    const file = join(entry.parentPath ?? entry.path, entry.name);
    if (/(^|[/\\])(bin|obj)([/\\]|$)/.test(file)) continue;
    const text = stripFSharpComments(readFileSync(file, "utf8"), { blankStrings: true });
    for (const match of text.matchAll(/^\s*type\s+([A-Za-z_][A-Za-z0-9_']*)/gm)) symbols.add(match[1]);
    for (const match of text.matchAll(/^\s*module\s+([A-Za-z_][A-Za-z0-9_']*)/gm)) symbols.add(match[1]);
  }

  return symbols;
}

export function collectDemoApiSymbols(repoRoot = root) {
  return collectApiSymbols(repoRoot, "Demo");
}

export function moduleBoundaryViolations(
  source,
  apiNamespace,
  symbols = new Set(),
  allowedSymbols = new Set(),
  forbiddenNamespaces = []
) {
  const text = stripFSharpComments(source, { blankStrings: true });
  const violations = new Set();
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedNamespace = escape(apiNamespace);

  for (const match of text.matchAll(new RegExp(`^\\s*open\\s+(?:type\\s+)?(?:global\\.)?(${escapedNamespace}(?:\\.[A-Za-z0-9_']+)*)`, "gm"))) {
    if (match[1] !== apiNamespace) {
      violations.add(`forbidden ${apiNamespace} open: ${match[1]}`);
    }
  }

  for (const match of text.matchAll(new RegExp(`\\b(?:global\\.)?${escapedNamespace}\\.([A-Za-z_][A-Za-z0-9_']*)`, "g"))) {
    if (!allowedSymbols.has(match[1])) {
      violations.add(`forbidden fully-qualified ${apiNamespace} symbol: ${match[1]}`);
    }
  }

  for (const symbol of symbols) {
    if (allowedSymbols.has(symbol)) continue;
    const pattern = new RegExp(`\\b${escape(symbol)}\\b`);
    if (pattern.test(text)) violations.add(`forbidden ${apiNamespace} symbol usage: ${symbol}`);
  }

  for (const namespace of forbiddenNamespaces) {
    const pattern = new RegExp(`\\b${escape(namespace)}(?![A-Za-z0-9_'])`);
    if (pattern.test(text)) violations.add(`forbidden namespace usage: ${namespace}`);
  }

  return [...violations];
}

export function hostBoundaryViolations(
  source,
  demoSymbols = new Set(),
  forbiddenNamespaces = ["Fsso.Database", "Fsso.Infrastructure"]
) {
  return moduleBoundaryViolations(
    source,
    "Fsso.Demo.Api",
    demoSymbols,
    new Set(["DemoModule"]),
    forbiddenNamespaces
  );
}

const PLACEHOLDER_PATTERN = /__[A-Z0-9_]+__/;

function toPosixPath(path) {
  return path.split(sep).join("/");
}

function walkMarkdown(directory, files = []) {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "artifacts", "bin", "obj", ".tools", ".pnpm-store", "test-results", "playwright-report"].includes(entry.name)) {
      continue;
    }
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walkMarkdown(absolute, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(absolute);
  }
  return files;
}

export function reportGateFailures(repoRoot = root) {
  const failures = [];
  const markdown = [
    resolve(repoRoot, "README.md"),
    resolve(repoRoot, "README_zh.md"),
    ...walkMarkdown(resolve(repoRoot, "docs")),
  ].filter((file) => existsSync(file));

  for (const file of markdown) {
    const text = readFileSync(file, "utf8");
    const relativePath = toPosixPath(relative(repoRoot, file));
    const match = text.match(PLACEHOLDER_PATTERN);
    if (match) failures.push(`${relativePath} contains unresolved placeholder ${match[0]}`);
  }

  const reportPath = resolve(repoRoot, "docs/reviews/fsso-modular-final-report.md");
  const reviewLogPath = resolve(repoRoot, "docs/reviews/fsso-modular-review-log.md");
  const ledgerPath = resolve(repoRoot, "docs/ledger.md");
  const report = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
  const reviewLog = existsSync(reviewLogPath) ? readFileSync(reviewLogPath, "utf8") : "";
  const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, "utf8") : "";
  const pending = /\bPENDING\b/i.test(reviewLog) || /\bIN REVIEW\b/i.test(report);

  if (pending) {
    const statusLine = report.split(/\r?\n/).find((line) => /^Status:/i.test(line)) ?? "";
    if (/\bCOMPLETE\b/i.test(statusLine)) {
      failures.push("modular final report says COMPLETE while a review verdict remains PENDING");
    }

    const marker = "## Phase 6 — FSSO modular Task 3";
    const start = ledger.indexOf(marker);
    if (start !== -1) {
      const section = ledger.slice(start).split(/\n## /)[0];
      if (/\bCOMPLETE\b/i.test(section)) {
        failures.push("ledger Phase 6 says COMPLETE while a review verdict remains PENDING");
      }
    }
  }

  return failures;
}

export function assertReportGates(repoRoot = root) {
  const failures = reportGateFailures(repoRoot);
  if (failures.length) {
    throw new Error(`report gates failed:\n${failures.map((item) => `- ${item}`).join("\n")}`);
  }
}
