#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  findDevPort,
  findManagedDevPort,
  findReservedDevPorts,
} from "./dev-port.mjs";

export const APP_MARKER = "six-opening-dev-server:v1";
export const APP_PROBE_PATH = "/__dev__/six-opening-ready.txt";
const PORT_MIN = 3000;
const PORT_MAX = 3199;
const DEPENDENCY_STAMP = ".six-opening-package-lock.sha256";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line.trim(),
    );
    if (!match) continue;
    let value = match[2].trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.at(-1) === quote) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values[match[1]] = value;
  }
  return values;
}

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return parseEnv(fs.readFileSync(file, "utf8"));
}

export function findControlRoot(root) {
  const gitPath = path.join(root, ".git");
  if (!fs.existsSync(gitPath) || fs.statSync(gitPath).isDirectory()) return root;
  const gitdir = /gitdir:\s*(.+)/.exec(fs.readFileSync(gitPath, "utf8"))?.[1]?.trim();
  return gitdir
    ? path.resolve(root, gitdir, "..", "..", "..")
    : root;
}

function configured(value) {
  return Boolean(value && !value.toLowerCase().includes("your_"));
}

export function getEnvironmentStatus(root, environment = process.env) {
  const roots = [...new Set([path.resolve(root), findControlRoot(root)])];
  let openAiKey = environment.OPENAI_API_KEY;
  if (!openAiKey) {
    for (const candidateRoot of roots) {
      const file = path.join(candidateRoot, ".env");
      if (!fs.existsSync(file)) continue;
      openAiKey = readEnv(file).OPENAI_API_KEY;
      break;
    }
  }

  const kiwoom = {
    KIWOOM_APP_KEY: environment.KIWOOM_APP_KEY,
    KIWOOM_SECRET_KEY: environment.KIWOOM_SECRET_KEY,
    KIWOOM_ENV: environment.KIWOOM_ENV,
  };
  for (const candidateRoot of roots) {
    for (const filename of [".env.kiwoom.local", ".env"]) {
      const values = readEnv(path.join(candidateRoot, filename));
      for (const key of Object.keys(kiwoom)) {
        if (kiwoom[key] == null && values[key] != null) kiwoom[key] = values[key];
      }
    }
  }

  return {
    openAi: configured(openAiKey),
    kiwoom:
      configured(kiwoom.KIWOOM_APP_KEY) &&
      configured(kiwoom.KIWOOM_SECRET_KEY),
    kiwoomMode:
      String(kiwoom.KIWOOM_ENV ?? "real").toLowerCase() === "mock"
        ? "mock"
        : "real",
  };
}

export function formatEnvironmentStatus(status) {
  return [
    `[환경] OpenAI: ${
      status.openAi ? "연결됨 (LLM 보조 응답)" : "미설정 (고정 FAQ·용어 응답)"
    }`,
    `[환경] 키움 시세: ${
      status.kiwoom
        ? `연결됨 (${status.kiwoomMode} API)`
        : "미설정 (51종 fixture 데이터)"
    }`,
  ];
}

function dependencySource(webDir) {
  const lockfile = path.join(webDir, "package-lock.json");
  return fs.existsSync(lockfile) ? lockfile : path.join(webDir, "package.json");
}

export function dependencyFingerprint(webDir) {
  return createHash("sha256")
    .update(fs.readFileSync(dependencySource(webDir)))
    .digest("hex");
}

function dependencyStamp(webDir) {
  return path.join(webDir, "node_modules", DEPENDENCY_STAMP);
}

export function dependencySyncReason(webDir) {
  if (!fs.existsSync(path.join(webDir, "node_modules"))) {
    return "node_modules가 없습니다";
  }
  const stamp = dependencyStamp(webDir);
  if (!fs.existsSync(stamp)) return "의존성 기준을 처음 확인합니다";
  return fs.readFileSync(stamp, "utf8").trim() === dependencyFingerprint(webDir)
    ? null
    : `${path.basename(dependencySource(webDir))}이 변경되었습니다`;
}

export function writeDependencyStamp(webDir) {
  fs.writeFileSync(
    dependencyStamp(webDir),
    `${dependencyFingerprint(webDir)}\n`,
    "utf8",
  );
}

export async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function inspectProject(port, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetchImpl(
      `http://127.0.0.1:${port}${APP_PROBE_PATH}`,
      { cache: "no-store", signal: controller.signal },
    );
    if (!response.ok) return "other";
    return (await response.text()).trim() === APP_MARKER ? "project" : "other";
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForProject(
  port,
  timeoutMs,
  inspect = inspectProject,
  intervalMs = 400,
) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const state = await inspect(port);
    if (state === "project") return true;
    if (state === "other" || Date.now() >= deadline) return false;
    await delay(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  }
}

export async function chooseDevPort(
  preferredPort,
  reservedPorts,
  {
    inspect = inspectProject,
    free = isPortFree,
    wait = waitForProject,
  } = {},
) {
  const state = await inspect(preferredPort);
  if (state === "project") {
    return { port: preferredPort, existing: true, conflicted: false };
  }
  if (await free(preferredPort)) {
    return { port: preferredPort, existing: false, conflicted: false };
  }
  if (state !== "other" && (await wait(preferredPort, 8000, inspect))) {
    return { port: preferredPort, existing: true, conflicted: false };
  }

  const reserved = new Set(reservedPorts);
  for (let offset = 1; offset <= PORT_MAX - PORT_MIN; offset += 1) {
    const candidate =
      PORT_MIN + ((preferredPort - PORT_MIN + offset) % (PORT_MAX - PORT_MIN + 1));
    if (reserved.has(candidate)) continue;
    const candidateState = await inspect(candidate);
    if (candidateState === "project") {
      return { port: candidate, existing: true, conflicted: true };
    }
    if (await free(candidate)) {
      return { port: candidate, existing: false, conflicted: true };
    }
    if (candidateState !== "other" && (await wait(candidate, 2000, inspect))) {
      return { port: candidate, existing: true, conflicted: true };
    }
  }
  throw new Error(`${PORT_MIN}~${PORT_MAX} 범위에서 사용할 수 있는 포트가 없습니다.`);
}

export async function chooseManagedDevPort(
  port,
  {
    inspect = inspectProject,
    free = isPortFree,
    wait = waitForProject,
  } = {},
) {
  const state = await inspect(port);
  if (state === "project") {
    return { port, existing: true, conflicted: false };
  }
  if (await free(port)) {
    return { port, existing: false, conflicted: false };
  }
  if (state === "unavailable" && (await wait(port, 8000, inspect))) {
    return { port, existing: true, conflicted: false };
  }
  throw new Error(
    `${port}번은 이 작업 세션에 배정된 포트지만 다른 프로그램이 사용 중입니다. ` +
      "해당 프로그램을 종료한 뒤 dev.bat을 다시 실행하세요.",
  );
}

function spawnNpm(args, cwd) {
  const options = { cwd, stdio: "inherit" };
  if (process.platform === "win32") {
    const command = `npm.cmd ${args.join(" ")}`;
    return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command], options);
  }
  return spawn("npm", args, options);
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function runNpmInstall(webDir) {
  const result = await waitForExit(spawnNpm(["install"], webDir));
  return result.code ?? 1;
}

export async function ensureDependencies(
  webDir,
  { install = runNpmInstall, log = console.log } = {},
) {
  const reason = dependencySyncReason(webDir);
  if (!reason) {
    log("[준비] 패키지: 최신 상태");
    return false;
  }
  log(`[준비] 패키지: ${reason}. npm install을 실행합니다.`);
  if ((await install(webDir)) !== 0) {
    throw new Error(
      "패키지 설치에 실패했습니다. 네트워크를 확인한 뒤 web 폴더에서 npm install을 다시 실행하세요.",
    );
  }
  writeDependencyStamp(webDir);
  log("[준비] 패키지: 동기화 완료");
  return true;
}

export function openBrowser(url, spawnImpl = spawn) {
  let command;
  let args;
  if (process.platform === "win32") {
    command = process.env.ComSpec ?? "cmd.exe";
    args = ["/d", "/s", "/c", `start "" "${url}"`];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }
  const opener = spawnImpl(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  opener.once?.("error", () => {
    console.error(`[브라우저] 자동 실행에 실패했습니다. 직접 여세요: ${url}`);
  });
  opener.unref?.();
}

/** cmd.exe 래퍼 밑의 node 까지 함께 끝낸다. child.kill() 은 Windows 에서 래퍼만 죽인다. */
export function stopProcessTree(child, spawnImpl = spawn) {
  if (!child?.pid || child.exitCode !== null || child.killed) return;
  if (process.platform === "win32") {
    spawnImpl("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    child.kill();
  }
}

export async function runDevServer(
  webDir,
  port,
  {
    log = console.log,
    error = console.error,
    spawnServer = () =>
      spawnNpm(["run", "dev", "--", "-p", String(port)], webDir),
    inspect = inspectProject,
    open = openBrowser,
    stop = stopProcessTree,
    startupWarningMs = 90_000,
    intervalMs = 500,
  } = {},
) {
  const url = `http://localhost:${port}`;
  const child = spawnServer();
  let exited = false;
  let opened = false;
  let rejected = false;
  let warned = false;
  const startedAt = Date.now();
  const exit = waitForExit(child).then((result) => {
    exited = true;
    return result;
  }, (error) => {
    exited = true;
    throw error;
  });

  const monitor = (async () => {
    while (!exited) {
      const state = await inspect(port);
      if (state === "project") {
        log(`[준비 완료] ${url}`);
        open(url);
        opened = true;
        // 예전에는 여기서 `npm run ui:watch` 를 함께 띄웠다. iframe 시절 `ui-src` 조립본이
        // pull 로 낡는 것을 막던 감시인데, iframe 철거(PR #296)로 그 스크립트가 사라져
        // 매번 `Missing script` 로 죽는 프로세스만 남았다. Next 개발 서버가 직접 다시 그린다.
        return;
      }
      if (state === "other") {
        rejected = true;
        error(`\n[준비 실패] ${port}번 포트가 이 프로젝트가 아닌 응답을 보냈습니다.`);
        error("- 잘못된 주소를 반복 호출하지 않고 방금 시작한 서버를 종료합니다.");
        error("- 해당 포트를 쓰는 프로그램을 종료한 뒤 dev.bat을 다시 실행하세요.\n");
        stop(child);
        return;
      }
      if (!warned && Date.now() - startedAt >= startupWarningMs) {
        warned = true;
        const seconds = Math.ceil(startupWarningMs / 1000);
        error(`\n[시작 지연] 서버가 ${seconds}초 안에 준비되지 않았습니다.`);
        error(`- 주소: ${url}`);
        error("- 위에 표시된 npm/Next.js 오류와 네트워크 상태를 확인하세요.");
        error("- 서버가 늦게 준비되면 브라우저는 계속 자동으로 열립니다.\n");
      }
      await delay(intervalMs);
    }
  })();

  const result = await exit;
  await monitor;
  if (!opened && !rejected && result.code !== 0) {
    error("\n[실행 실패] 개발 서버가 준비되기 전에 종료됐습니다.");
    error(`- 종료 코드: ${result.code ?? result.signal ?? "알 수 없음"}`);
    error("- 포트 충돌, 패키지 오류, 환경 변수 오류를 위 로그에서 확인하세요.");
    error("- 해결되지 않으면 web 폴더에서 npm run dev를 실행해 상세 로그를 확인하세요.\n");
  }
  if (rejected) return 1;
  return result.code ?? (result.signal ? 1 : 0);
}

export async function runDevLauncher(root, { log = console.log } = {}) {
  const repositoryRoot = path.resolve(root);
  const webDir = path.join(repositoryRoot, "web");
  if (!fs.existsSync(path.join(webDir, "package.json"))) {
    throw new Error(`웹 프로젝트를 찾을 수 없습니다: ${webDir}`);
  }

  for (const line of formatEnvironmentStatus(getEnvironmentStatus(repositoryRoot))) {
    log(line);
  }
  await ensureDependencies(webDir, { log });

  const managedPort = findManagedDevPort(repositoryRoot);
  const preferredPort = managedPort ?? findDevPort(repositoryRoot);
  const selection =
    managedPort === null
      ? await chooseDevPort(preferredPort, findReservedDevPorts(repositoryRoot))
      : await chooseManagedDevPort(managedPort);
  const url = `http://localhost:${selection.port}`;
  if (selection.existing) {
    if (selection.conflicted) {
      log(`[포트 충돌] ${preferredPort}번 대신 실행 중인 ${selection.port}번을 찾았습니다.`);
    }
    log(`[실행 중] 기존 개발 서버를 사용합니다: ${url}`);
    openBrowser(url);
    return 0;
  }
  if (selection.conflicted) {
    log(`[포트 충돌] ${preferredPort}번은 다른 프로그램이 사용 중입니다.`);
    log(`[포트 대체] 예약된 세션 포트를 피해 ${selection.port}번을 사용합니다.`);
  } else {
    log(`[포트] ${selection.port}`);
  }

  log(`[시작] 개발 서버를 실행합니다. 준비되면 브라우저가 열립니다: ${url}`);
  return runDevServer(webDir, selection.port, { log });
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === entry) {
  runDevLauncher(process.argv[2] ?? process.cwd())
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`\n[실행 실패] ${error instanceof Error ? error.message : String(error)}`);
      console.error("[안내] 위 메시지를 확인한 뒤 dev.bat을 다시 실행하세요.\n");
      process.exitCode = 1;
    });
}
