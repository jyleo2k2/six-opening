import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  chooseDevPort,
  dependencySyncReason,
  ensureDependencies,
  findControlRoot,
  formatEnvironmentStatus,
  getEnvironmentStatus,
  inspectProject,
  isPortFree,
  openBrowser,
  parseEnv,
  runDevServer,
  waitForProject,
  writeDependencyStamp,
} from "./dev-runner.mjs";

function makeTempDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

test("env 값은 파싱하되 상태 문구에 비밀값을 노출하지 않는다", () => {
  const root = makeTempDir("devrunner-env");
  const secret = "secret-value-must-not-leak";
  fs.writeFileSync(
    path.join(root, ".env"),
    `OPENAI_API_KEY='${secret}'\nKIWOOM_APP_KEY=app-key\nKIWOOM_SECRET_KEY=secret-key\nKIWOOM_ENV=mock\n`,
    "utf8",
  );

  assert.deepEqual(parseEnv('A="one"\nB=two # comment\n'), {
    A: "one",
    B: "two",
  });
  const status = getEnvironmentStatus(root, {});
  assert.deepEqual(status, { openAi: true, kiwoom: true, kiwoomMode: "mock" });
  assert.equal(formatEnvironmentStatus(status).join("\n").includes(secret), false);
});

test("placeholder 키는 실제 연결로 표시하지 않는다", () => {
  const root = makeTempDir("devrunner-placeholder");
  fs.writeFileSync(
    path.join(root, ".env"),
    "OPENAI_API_KEY=your_openai_api_key\nKIWOOM_APP_KEY=your_app\nKIWOOM_SECRET_KEY=your_secret\n",
    "utf8",
  );
  assert.deepEqual(getEnvironmentStatus(root, {}), {
    openAi: false,
    kiwoom: false,
    kiwoomMode: "real",
  });
});

test("worktree는 관제 저장소의 env 위치를 찾는다", () => {
  const control = makeTempDir("devrunner-control");
  const worktree = makeTempDir("devrunner-worktree");
  const gitdir = path.join(control, ".git", "worktrees", "sample");
  fs.mkdirSync(gitdir, { recursive: true });
  fs.writeFileSync(
    path.join(worktree, ".git"),
    `gitdir: ${gitdir.replaceAll("\\", "/")}\n`,
    "utf8",
  );
  assert.equal(findControlRoot(worktree), control);
});

test("package-lock 해시가 달라질 때만 의존성을 다시 맞춘다", async () => {
  const web = makeTempDir("devrunner-deps");
  fs.writeFileSync(path.join(web, "package-lock.json"), '{"lockfileVersion":3}', "utf8");
  assert.equal(dependencySyncReason(web), "node_modules가 없습니다");

  let installs = 0;
  await ensureDependencies(web, {
    install: async () => {
      installs += 1;
      fs.mkdirSync(path.join(web, "node_modules"));
      return 0;
    },
    log: () => {},
  });
  assert.equal(installs, 1);
  assert.equal(dependencySyncReason(web), null);

  fs.writeFileSync(path.join(web, "package-lock.json"), '{"lockfileVersion":4}', "utf8");
  assert.match(dependencySyncReason(web), /package-lock\.json/);
  writeDependencyStamp(web);
  assert.equal(dependencySyncReason(web), null);
});

test("패키지 설치 실패는 해결 방법이 포함된 오류가 된다", async () => {
  const web = makeTempDir("devrunner-deps-fail");
  fs.writeFileSync(path.join(web, "package-lock.json"), "{}", "utf8");
  await assert.rejects(
    ensureDependencies(web, { install: async () => 1, log: () => {} }),
    /web 폴더에서 npm install/,
  );
});

test("기존 프로젝트 서버가 있으면 새 포트를 열지 않는다", async () => {
  const selection = await chooseDevPort(3100, [3100], {
    inspect: async () => "project",
    free: async () => {
      throw new Error("free check should not run");
    },
  });
  assert.deepEqual(selection, {
    port: 3100,
    existing: true,
    conflicted: false,
  });
});

test("다른 프로그램과 충돌하면 예약 포트를 건너뛴다", async () => {
  const selection = await chooseDevPort(3100, [3100, 3101], {
    inspect: async () => "other",
    free: async (port) => port === 3102,
  });
  assert.deepEqual(selection, {
    port: 3102,
    existing: false,
    conflicted: true,
  });
});

test("이전에 선택한 대체 포트의 서버도 중복 실행하지 않는다", async () => {
  const selection = await chooseDevPort(3100, [3100, 3101], {
    inspect: async (port) => (port === 3102 ? "project" : "other"),
    free: async () => false,
  });
  assert.deepEqual(selection, {
    port: 3102,
    existing: true,
    conflicted: true,
  });
});

test("막 시작한 기존 서버를 기다렸다가 재사용한다", async () => {
  const selection = await chooseDevPort(3100, [3100], {
    inspect: async () => "unavailable",
    free: async () => false,
    wait: async () => true,
  });
  assert.equal(selection.existing, true);
  assert.equal(selection.port, 3100);
});

test("HTTP 응답의 프로젝트 표식을 구분한다", async (context) => {
  const server = http.createServer((_request, response) => {
    response.end("<html><body>영웅 키움</body></html>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const address = server.address();
  assert.equal(typeof address, "object");
  assert.equal(await isPortFree(address.port), false);
  assert.equal(await inspectProject(address.port), "project");
});

test("준비 확인은 프로젝트 응답이 나올 때까지 반복한다", async () => {
  let attempts = 0;
  const ready = await waitForProject(
    3100,
    100,
    async () => (++attempts === 3 ? "project" : "unavailable"),
    1,
  );
  assert.equal(ready, true);
  assert.equal(attempts, 3);
});

test("브라우저 실행기는 URL을 한 번만 전달한다", () => {
  const calls = [];
  let unrefCount = 0;
  openBrowser("http://localhost:3100", (command, args, options) => {
    calls.push({ command, args, options });
    return {
      once: () => {},
      unref: () => {
        unrefCount += 1;
      },
    };
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].args.join(" "), /http:\/\/localhost:3100/);
  assert.equal(calls[0].options.detached, true);
  assert.equal(unrefCount, 1);
});

test("시작 지연과 조기 종료는 한국어 해결 방법을 출력한다", async () => {
  const child = new EventEmitter();
  const messages = [];
  setTimeout(() => child.emit("exit", 1, null), 20);
  const code = await runDevServer("unused", 3100, {
    error: (message) => messages.push(message),
    inspect: async () => "unavailable",
    intervalMs: 1,
    log: () => {},
    open: () => {
      throw new Error("browser should not open");
    },
    spawnServer: () => child,
    startupWarningMs: 2,
  });
  const output = messages.join("\n");
  assert.equal(code, 1);
  assert.match(output, /시작 지연/);
  assert.match(output, /npm\/Next\.js 오류/);
  assert.match(output, /포트 충돌/);
  assert.match(output, /npm run dev/);
});

test("서버가 준비되면 ui 조립 감시를 켜고 서버 종료 시 함께 끈다", async () => {
  const server = new EventEmitter();
  const watcher = new EventEmitter();
  const stoppedWith = [];
  let watcherSpawns = 0;
  setTimeout(() => server.emit("exit", 0, null), 30);
  const code = await runDevServer("unused", 3100, {
    error: () => {},
    inspect: async () => "project",
    intervalMs: 1,
    log: () => {},
    open: () => {},
    spawnServer: () => server,
    spawnWatcher: () => {
      watcherSpawns += 1;
      return watcher;
    },
    stopWatcher: (child) => stoppedWith.push(child),
  });
  assert.equal(code, 0);
  assert.equal(watcherSpawns, 1);
  assert.deepEqual(stoppedWith, [watcher]);
});

test("서버가 준비되기 전에 죽으면 ui 조립 감시를 켜지 않는다", async () => {
  const server = new EventEmitter();
  setTimeout(() => server.emit("exit", 1, null), 20);
  await runDevServer("unused", 3100, {
    error: () => {},
    inspect: async () => "unavailable",
    intervalMs: 1,
    log: () => {},
    open: () => {},
    spawnServer: () => server,
    spawnWatcher: () => {
      throw new Error("watcher must not start before the server is ready");
    },
    startupWarningMs: 10_000,
  });
});

test("dev.bat은 Node 런처 하나만 호출한다", () => {
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
  const batch = fs.readFileSync(path.join(scriptsDir, "..", "dev.bat"), "utf8");
  assert.match(batch, /scripts\\dev-runner\.mjs/);
});

test(
  "dev.bat은 더블클릭 경로에서 런처 인자를 올바르게 전달한다",
  { skip: process.platform !== "win32" },
  () => {
    const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
    const root = path.join(scriptsDir, "..");
    const fakeBin = makeTempDir("devrunner-bin");
    fs.writeFileSync(
      path.join(fakeBin, "node.cmd"),
      "@echo off\r\necho FAKE_NODE_ARGS:%*\r\nexit /b 0\r\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(fakeBin, "npm.cmd"),
      "@echo off\r\nexit /b 0\r\n",
      "utf8",
    );
    const systemPath = path.join(process.env.SystemRoot, "System32");
    const result = spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/c", "call", path.join(root, "dev.bat")],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, PATH: `${fakeBin};${systemPath}` },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /FAKE_NODE_ARGS:.*scripts\\dev-runner\.mjs/);
  },
);
