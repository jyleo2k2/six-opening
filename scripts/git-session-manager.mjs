#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const POLICY = Object.freeze({
  defaultBranch: "main",
  allowedAIs: ["codex", "claude"],
  allowedWorkers: ["이재용", "이호연", "김설빈", "강소정", "박혜준", "김경렬"],
  taskPattern: /^[가-힣]+(?:-[가-힣]+)*$/u,
  integrationOwner: "이재용",
  rolloutAt: "2026-08-12T00:00:00+09:00",
  portStart: 3100,
  portEnd: 3199,
  ownerOnlyPaths: [
    "AGENTS.md",
    "CLAUDE.md",
    "docs/영웅키움_기획_통합문서_v2.md",
    "docs/기술스택.md",
  ],
  hotspots: [
    "AGENTS.md",
    "CLAUDE.md",
    ".gitignore",
    "web/app",
    "web/shared",
    "web/package.json",
    "web/package-lock.json",
    "docs/영웅키움_기획_통합문서_v2.md",
    "docs/기술스택.md",
    "docs/디자인시스템.md",
  ],
});

const REGISTRY_FILE = "six-opening-sessions.json";
const LOCK_FILE = "six-opening-sessions.lock";
const REGISTRY_VERSION = 1;
const REQUIRED_PR_SECTIONS = [
  "## 작업 정보",
  "## 변경 요약",
  "## 작업 범위",
  "## 공유 핫스팟",
  "## 계약 변경",
  "## 검증",
];

export class SessionError extends Error {
  constructor(message) {
    super(message);
    this.name = "SessionError";
  }
}

function run(executable, args, { cwd = process.cwd(), allowFailure = false, input } = {}) {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    input,
    shell: false,
    windowsHide: true,
  });
  if (result.error && !allowFailure) {
    throw new SessionError(`${executable} 실행 실패: ${result.error.message}`);
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || "알 수 없는 오류").trim();
    throw new SessionError(`${executable} ${args.join(" ")} 실패: ${detail}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

function git(args, cwd = process.cwd(), allowFailure = false) {
  return run("git", args, { cwd, allowFailure });
}

export function repositoryContext(cwd = process.cwd()) {
  const root = path.resolve(git(["rev-parse", "--show-toplevel"], cwd).stdout.trim());
  const rawCommon = git(["rev-parse", "--git-common-dir"], root).stdout.trim();
  const commonGitDir = path.resolve(root, rawCommon);
  const controlRoot = path.basename(commonGitDir) === ".git" ? path.dirname(commonGitDir) : root;
  return { root, commonGitDir, controlRoot };
}

function currentBranch(root) {
  const branch = git(["branch", "--show-current"], root).stdout.trim();
  if (!branch) throw new SessionError("detached HEAD에서는 작업 세션을 사용할 수 없습니다.");
  return branch.normalize("NFC");
}

function normalizeComparable(value) {
  const normalized = path.resolve(value).normalize("NFC");
  return process.platform === "win32" ? normalized.toLocaleLowerCase("en-US") : normalized;
}

function samePath(left, right) {
  return normalizeComparable(left) === normalizeComparable(right);
}

export function parseBranchIdentity(branch, policy = POLICY) {
  const normalized = String(branch).normalize("NFC");
  const parts = normalized.split("/");
  if (parts.length !== 3) {
    throw new SessionError(
      `브랜치는 {사용AI}/{작업자이름}/{한글-작업명} 세 구간이어야 합니다: ${branch}`,
    );
  }
  const [ai, worker, task] = parts;
  if (!policy.allowedAIs.includes(ai)) {
    throw new SessionError(`사용AI는 codex 또는 claude만 허용합니다: ${ai}`);
  }
  if (!policy.allowedWorkers.includes(worker)) {
    throw new SessionError(`허용되지 않은 작업자입니다: ${worker}`);
  }
  if (!policy.taskPattern.test(task)) {
    throw new SessionError(`작업명은 한글 낱말과 단어 사이 하이픈만 허용합니다: ${task}`);
  }
  return { ai, worker, task };
}

export function expectedWorktreePath(controlRoot, identity) {
  return path.join(
    path.dirname(controlRoot),
    `${path.basename(controlRoot)}-worktrees`,
    identity.ai,
    identity.worker,
    identity.task,
  );
}

function assertWorktreeLocation(context, identity) {
  const expected = expectedWorktreePath(context.controlRoot, identity);
  if (!samePath(context.root, expected)) {
    throw new SessionError(`worktree 경로가 브랜치와 일치하지 않습니다.\n현재: ${context.root}\n기대: ${expected}`);
  }
}

export function normalizeRepoPath(root, value) {
  const absolute = path.resolve(root, String(value));
  const relative = path.relative(root, absolute);
  if (relative === "") return ".";
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new SessionError(`작업 범위가 worktree 밖입니다: ${value}`);
  }
  return relative.split(path.sep).join("/").normalize("NFC").replace(/\/$/u, "");
}

export function pathOverlaps(left, right) {
  const a = String(left).replace(/^\/+|\/+$/gu, "") || ".";
  const b = String(right).replace(/^\/+|\/+$/gu, "") || ".";
  if (a === "." || b === ".") return true;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

export function scopeContains(scope, file) {
  const normalizedScope = String(scope).replace(/^\/+|\/+$/gu, "") || ".";
  const normalizedFile = String(file).replace(/^\/+|\/+$/gu, "") || ".";
  return normalizedScope === "." || normalizedFile === normalizedScope || normalizedFile.startsWith(`${normalizedScope}/`);
}

export function pathsOutsideScopes(files, scopes) {
  return files.filter((file) => !scopes.some((scope) => scopeContains(scope, file)));
}

export function matchingHotspots(scopes, policy = POLICY) {
  return policy.hotspots.filter((hotspot) => scopes.some((scope) => pathOverlaps(scope, hotspot)));
}

/**
 * claim 겹침을 본다. claim 은 "예상 범위"라 넓게 잡는 게 맞지만, 넓게 잡은
 * 탓에 **실제로는 안 겹치는 작업까지 막혔다** — `web/ui-src` 전체를 claim 한
 * 세션이 실제로는 `renderVals-*` 만 고쳤는데 `notifyChatContext.js` 작업이
 * 막힌 적이 있다.
 *
 * `changedFilesOf` 를 주면 상대 브랜치가 **실제로 고친 파일**을 확인해, 겹치는
 * 파일이 하나도 없으면 차단 대신 경고로 낮춘다. 아직 아무것도 안 고친 세션은
 * 앞으로 고칠 수 있으므로 그대로 차단한다.
 */
export function analyzeLocalConflicts(registry, scopes, branch, options = {}) {
  const { changedFilesOf } = options;
  const conflicts = [];
  const warnings = [];
  for (const session of registry.sessions ?? []) {
    if (!["starting", "active"].includes(session.status) || session.branch === branch) continue;
    const collisions = scopes.filter((scope) =>
      (session.paths ?? []).some((other) => pathOverlaps(scope, other)),
    );
    if (collisions.length === 0) continue;
    const label = `${session.branch} (${session.worker ?? "작업자 미상"}): ${[...new Set(collisions)].join(", ")}`;

    const touched = changedFilesOf ? changedFilesOf(session) : null;
    if (Array.isArray(touched) && touched.length > 0) {
      const realOverlap = touched.some((file) =>
        collisions.some((scope) => scopeContains(scope, file) || pathOverlaps(scope, file)),
      );
      if (!realOverlap) {
        warnings.push(`${label} — claim 은 겹치지만 실제 수정 파일은 겹치지 않습니다.`);
        continue;
      }
    }
    conflicts.push(label);
  }
  return { conflicts, warnings };
}

export function localConflicts(registry, scopes, branch, options = {}) {
  return analyzeLocalConflicts(registry, scopes, branch, options).conflicts;
}

/** 상대 브랜치가 origin/main 이후 실제로 고친 파일. 조회 실패는 null 이다. */
function changedFilesOfSession(context) {
  return (session) => {
    const result = git(
      ["diff", "--name-only", "-z", `origin/${POLICY.defaultBranch}...${session.branch}`],
      context.root,
      true,
    );
    if (result.status !== 0) return null;
    return result.stdout
      .split("\0")
      .filter(Boolean)
      .map((file) => file.normalize("NFC").replaceAll("\\", "/"));
  };
}

function assertOwnerScope(identity, scopes, policy = POLICY) {
  if (identity.worker === policy.integrationOwner) return;
  const restricted = policy.ownerOnlyPaths.filter((ownerPath) =>
    scopes.some((scope) => pathOverlaps(scope, ownerPath)),
  );
  if (restricted.length > 0) {
    throw new SessionError(
      `총괄 전용 경로는 ${policy.integrationOwner} 세션만 claim할 수 있습니다: ${restricted.join(", ")}`,
    );
  }
}

function registryPath(context) {
  return path.join(context.commonGitDir, REGISTRY_FILE);
}

function lockPath(context) {
  return path.join(context.commonGitDir, LOCK_FILE);
}

function emptyRegistry() {
  return { version: REGISTRY_VERSION, sessions: [] };
}

function readRegistry(context) {
  const target = registryPath(context);
  if (!fs.existsSync(target)) return emptyRegistry();
  try {
    const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
    return {
      version: REGISTRY_VERSION,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch (error) {
    throw new SessionError(`세션 상태 파일을 읽을 수 없습니다: ${target} (${error.message})`);
  }
}

function writeRegistry(context, registry) {
  const target = registryPath(context);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, target);
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function withRegistryLock(context, callback) {
  const target = lockPath(context);
  let descriptor;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      descriptor = fs.openSync(target, "wx");
      fs.writeFileSync(descriptor, `${process.pid}\n`, "utf8");
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      sleep(50);
    }
  }
  if (descriptor === undefined) {
    throw new SessionError(`다른 Git 세션 관리 작업이 실행 중입니다: ${target}`);
  }
  try {
    return callback();
  } finally {
    fs.closeSync(descriptor);
    fs.unlinkSync(target);
  }
}

function nextPort(registry, policy = POLICY) {
  const used = new Set(
    (registry.sessions ?? [])
      .filter((session) => ["starting", "active"].includes(session.status))
      .map((session) => session.port)
      .filter(Number.isInteger),
  );
  for (let port = policy.portStart; port <= policy.portEnd; port += 1) {
    if (!used.has(port)) return port;
  }
  throw new SessionError(`${policy.portStart}~${policy.portEnd} 사이에 비어 있는 개발 포트가 없습니다.`);
}

function sessionId(identity) {
  return `${identity.ai}/${identity.worker}/${identity.task}`;
}

function reserveSession(context, identity, worktree, scopes) {
  return withRegistryLock(context, () => {
    const registry = readRegistry(context);
    const branch = sessionId(identity);
    const analysis = analyzeLocalConflicts(registry, scopes, branch, {
      changedFilesOf: changedFilesOfSession(context),
    });
    for (const warning of analysis.warnings) {
      process.stderr.write(`[git-session] 경고: ${warning}\n`);
    }
    if (analysis.conflicts.length > 0) {
      throw new SessionError(`활성 claim과 작업 범위가 겹칩니다:\n- ${analysis.conflicts.join("\n- ")}`);
    }
    if (
      registry.sessions.some(
        (session) =>
          ["starting", "active"].includes(session.status) &&
          (session.branch === branch || samePath(session.worktree, worktree)),
      )
    ) {
      throw new SessionError(`이미 사용 중인 브랜치 또는 worktree입니다: ${branch}`);
    }
    const port = nextPort(registry);
    registry.sessions.push({
      id: sessionId(identity),
      ...identity,
      branch,
      worktree,
      paths: scopes,
      hotspots: matchingHotspots(scopes),
      port,
      status: "starting",
      updatedAt: new Date().toISOString(),
    });
    writeRegistry(context, registry);
    return port;
  });
}

function activateSession(context, branch) {
  withRegistryLock(context, () => {
    const registry = readRegistry(context);
    const session = registry.sessions.find((item) => item.branch === branch && item.status === "starting");
    if (!session) throw new SessionError(`예약된 시작 세션을 찾지 못했습니다: ${branch}`);
    session.status = "active";
    session.updatedAt = new Date().toISOString();
    writeRegistry(context, registry);
  });
}

function cancelStartingSession(context, branch) {
  withRegistryLock(context, () => {
    const registry = readRegistry(context);
    registry.sessions = registry.sessions.filter(
      (session) => !(session.branch === branch && session.status === "starting"),
    );
    writeRegistry(context, registry);
  });
}

function registerCurrentSession(context, identity, scopes) {
  return withRegistryLock(context, () => {
    const registry = readRegistry(context);
    const branch = sessionId(identity);
    const analysis = analyzeLocalConflicts(registry, scopes, branch, {
      changedFilesOf: changedFilesOfSession(context),
    });
    for (const warning of analysis.warnings) {
      process.stderr.write(`[git-session] 경고: ${warning}\n`);
    }
    if (analysis.conflicts.length > 0) {
      throw new SessionError(`활성 claim과 작업 범위가 겹칩니다:\n- ${analysis.conflicts.join("\n- ")}`);
    }
    let session = registry.sessions.find(
      (item) => item.branch === branch && samePath(item.worktree, context.root),
    );
    if (session && session.status === "active") {
      session.paths = [...new Set([...session.paths, ...scopes])].sort();
      session.hotspots = matchingHotspots(session.paths);
      session.updatedAt = new Date().toISOString();
    } else {
      const port = nextPort(registry);
      session = {
        id: sessionId(identity),
        ...identity,
        branch,
        worktree: context.root,
        paths: [...new Set(scopes)].sort(),
        hotspots: matchingHotspots(scopes),
        port,
        status: "active",
        updatedAt: new Date().toISOString(),
      };
      registry.sessions.push(session);
    }
    writeRegistry(context, registry);
    return session;
  });
}

function activeClaim(context, branch) {
  return readRegistry(context).sessions.find(
    (session) =>
      session.status === "active" && session.branch === branch && samePath(session.worktree, context.root),
  );
}

function assertClaimIdentity(claim, identity) {
  if (
    claim.ai !== identity.ai ||
    claim.worker !== identity.worker ||
    claim.task !== identity.task ||
    claim.branch !== sessionId(identity)
  ) {
    throw new SessionError(`브랜치 신원과 등록된 claim이 일치하지 않습니다: ${claim.branch}`);
  }
}

function touchClaim(context, claim) {
  const last = Date.parse(claim.updatedAt ?? 0);
  if (Number.isFinite(last) && Date.now() - last < 60_000) return;
  withRegistryLock(context, () => {
    const registry = readRegistry(context);
    const current = registry.sessions.find((session) => session.id === claim.id && session.status === "active");
    if (current) current.updatedAt = new Date().toISOString();
    writeRegistry(context, registry);
  });
}

function ghAvailable(context) {
  const result = run("gh", ["--version"], { cwd: context.root, allowFailure: true });
  return !result.error && result.status === 0;
}

function remotePullRequestConflicts(context, scopes, branch) {
  if (!ghAvailable(context)) {
    return { conflicts: [], warning: "gh를 사용할 수 없어 열린 PR 겹침 검사를 생략했습니다." };
  }
  const listed = run(
    "gh",
    ["pr", "list", "--state", "open", "--limit", "100", "--json", "number,headRefName,url"],
    { cwd: context.root, allowFailure: true },
  );
  if (listed.status !== 0) {
    return { conflicts: [], warning: "GitHub PR을 조회하지 못해 로컬 claim만 검사했습니다." };
  }
  let pulls;
  try {
    pulls = JSON.parse(listed.stdout || "[]");
  } catch {
    return { conflicts: [], warning: "GitHub PR 응답을 해석하지 못해 로컬 claim만 검사했습니다." };
  }
  const conflicts = [];
  for (const pull of pulls) {
    if (pull.headRefName === branch) continue;
    const viewed = run("gh", ["pr", "view", String(pull.number), "--json", "files"], {
      cwd: context.root,
      allowFailure: true,
    });
    if (viewed.status !== 0) continue;
    const files = JSON.parse(viewed.stdout || "{}").files ?? [];
    const collisions = files
      .map((item) => item.path)
      .filter((file) => scopes.some((scope) => scopeContains(scope, file)));
    if (collisions.length > 0) {
      conflicts.push(`PR #${pull.number} ${pull.headRefName}: ${collisions.join(", ")}`);
    }
  }
  return { conflicts, warning: null };
}

function preflightClaim(context, identity, scopes) {
  assertOwnerScope(identity, scopes);
  const branch = sessionId(identity);
  const local = analyzeLocalConflicts(readRegistry(context), scopes, branch, {
    changedFilesOf: changedFilesOfSession(context),
  });
  for (const warning of local.warnings) {
    process.stderr.write(`[git-session] 경고: ${warning}\n`);
  }
  const remote = remotePullRequestConflicts(context, scopes, branch);
  if (remote.warning) process.stderr.write(`[git-session] 경고: ${remote.warning}\n`);
  const conflicts = [...local.conflicts, ...remote.conflicts];
  if (conflicts.length > 0) {
    throw new SessionError(`활성 세션 또는 열린 PR과 작업 범위가 겹칩니다:\n- ${conflicts.join("\n- ")}`);
  }
}

function changedPaths(root, stagedOnly = false) {
  const commands = stagedOnly
    ? [["diff", "--cached", "--name-only", "-z"]]
    : [
        ["diff", "--name-only", "-z"],
        ["diff", "--cached", "--name-only", "-z"],
        ["ls-files", "--others", "--exclude-standard", "-z"],
      ];
  const files = new Set();
  for (const command of commands) {
    for (const file of git(command, root).stdout.split("\0")) {
      if (file) files.add(file.normalize("NFC").replaceAll("\\", "/"));
    }
  }
  return [...files];
}

function validateManagedSession(context) {
  const branch = currentBranch(context.root);
  if (branch === POLICY.defaultBranch) {
    throw new SessionError("루트 main worktree는 관제 전용이므로 파일을 수정할 수 없습니다.");
  }
  const identity = parseBranchIdentity(branch);
  assertWorktreeLocation(context, identity);
  const claim = activeClaim(context, branch);
  if (!claim) {
    throw new SessionError("활성 claim이 없습니다. 수정 전에 git-session-manager claim을 실행하십시오.");
  }
  assertClaimIdentity(claim, identity);
  return { branch, identity, claim };
}

function validateFileOwnership(identity, file) {
  if (identity.worker === POLICY.integrationOwner) return;
  if (POLICY.ownerOnlyPaths.some((ownerPath) => scopeContains(ownerPath, file))) {
    throw new SessionError(`총괄 전용 파일은 ${POLICY.integrationOwner} 세션만 수정합니다: ${file}`);
  }
}

function validateChangedPaths(context, identity, claim, files) {
  const outside = pathsOutsideScopes(files, claim.paths);
  if (outside.length > 0) {
    throw new SessionError(`claim 범위 밖 변경이 감지됐습니다: ${outside.join(", ")}\nclaim: ${claim.paths.join(", ")}`);
  }
  for (const file of files) validateFileOwnership(identity, file);
}

function parseOptions(tokens) {
  const options = { _: [] };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = tokens[index + 1];
    const value = next && !next.startsWith("--") ? tokens[++index] : true;
    if (key === "path") {
      options.path = [...(options.path ?? []), value];
    } else {
      options[key] = value;
    }
  }
  return options;
}

function requiredOption(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new SessionError(`필수 옵션이 없습니다: --${key}`);
  }
  return value.normalize("NFC");
}

function requiredPaths(context, options) {
  if (!Array.isArray(options.path) || options.path.length === 0) {
    throw new SessionError("최소 하나의 --path를 지정해야 합니다.");
  }
  return [...new Set(options.path.map((value) => normalizeRepoPath(context.root, value)))].sort();
}

function configureHooks(context) {
  git(["config", "core.hooksPath", ".githooks"], context.root);
}

function commandStart(options) {
  const context = repositoryContext();
  if (!samePath(context.root, context.controlRoot)) {
    throw new SessionError("start는 루트 main 관제 worktree에서만 실행합니다.");
  }
  if (currentBranch(context.root) !== POLICY.defaultBranch) {
    throw new SessionError("start는 main 브랜치에서만 실행합니다.");
  }
  if (git(["status", "--porcelain"], context.root).stdout.trim()) {
    throw new SessionError("루트 main worktree에 변경이 있습니다. 다른 사람의 변경을 먼저 확인하십시오.");
  }
  const identity = parseBranchIdentity(
    `${requiredOption(options, "ai")}/${requiredOption(options, "worker")}/${requiredOption(options, "task")}`,
  );
  const scopes = requiredPaths(context, options);
  const branch = sessionId(identity);
  const worktree = expectedWorktreePath(context.controlRoot, identity);
  git(["fetch", "origin", POLICY.defaultBranch], context.root);
  configureHooks(context);
  preflightClaim(context, identity, scopes);
  if (git(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], context.root, true).status === 0) {
    throw new SessionError(`로컬 브랜치가 이미 있습니다: ${branch}`);
  }
  if (fs.existsSync(worktree)) throw new SessionError(`worktree 경로가 이미 있습니다: ${worktree}`);
  fs.mkdirSync(path.dirname(worktree), { recursive: true });
  const port = reserveSession(context, identity, worktree, scopes);
  try {
    git(["worktree", "add", "-b", branch, worktree, `origin/${POLICY.defaultBranch}`], context.root);
    activateSession(context, branch);
  } catch (error) {
    cancelStartingSession(context, branch);
    throw error;
  }
  process.stdout.write(
    `[git-session] 생성 완료\n브랜치: ${branch}\nworktree: ${worktree}\nclaim: ${scopes.join(", ")}\n개발 포트: ${port}\n다음: cd "${path.join(worktree, "web")}"; npm ci; npm run dev -- -p ${port}\n`,
  );
}

function commandClaim(options) {
  const context = repositoryContext();
  const branch = currentBranch(context.root);
  if (branch === POLICY.defaultBranch) throw new SessionError("main에서는 claim할 수 없습니다.");
  const identity = parseBranchIdentity(branch);
  if (requiredOption(options, "ai") !== identity.ai || requiredOption(options, "worker") !== identity.worker) {
    throw new SessionError("브랜치의 사용AI·작업자와 claim 요청이 일치하지 않습니다.");
  }
  assertWorktreeLocation(context, identity);
  const scopes = requiredPaths(context, options);
  configureHooks(context);
  preflightClaim(context, identity, scopes);
  const claim = registerCurrentSession(context, identity, scopes);
  process.stdout.write(
    `[git-session] claim 완료\n브랜치: ${branch}\n경로: ${claim.paths.join(", ")}\n핫스팟: ${claim.hotspots.join(", ") || "없음"}\n개발 포트: ${claim.port}\n`,
  );
}

function hookFileFromStdin() {
  const raw = fs.readFileSync(0, "utf8").trim();
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    return payload?.tool_input?.file_path ?? payload?.tool_input?.path ?? null;
  } catch (error) {
    throw new SessionError(`편집 훅 입력을 해석할 수 없습니다: ${error.message}`);
  }
}

function commandGuard(options) {
  const context = repositoryContext();
  const managed = validateManagedSession(context);
  validateChangedPaths(context, managed.identity, managed.claim, changedPaths(context.root));
  const rawFile = options["hook-input"] ? hookFileFromStdin() : options.file;
  if (typeof rawFile === "string" && rawFile.length > 0) {
    const file = normalizeRepoPath(context.root, rawFile);
    if (!managed.claim.paths.some((scope) => scopeContains(scope, file))) {
      throw new SessionError(`claim 범위 밖 파일입니다: ${file}`);
    }
    validateFileOwnership(managed.identity, file);
  }
  touchClaim(context, managed.claim);
}

function commandCheckStart() {
  const context = repositoryContext();
  const branch = currentBranch(context.root);
  const dirty = Boolean(git(["status", "--porcelain"], context.root).stdout.trim());
  if (branch === POLICY.defaultBranch) {
    process.stdout.write(`[git-session] main 관제 worktree (${dirty ? "변경 있음" : "깨끗함"}); 편집은 차단됩니다.\n`);
    return;
  }
  const managed = validateManagedSession(context);
  process.stdout.write(
    `[git-session] 활성 세션: ${managed.branch}\nclaim: ${managed.claim.paths.join(", ")}\n개발 포트: ${managed.claim.port}\n`,
  );
}

function commandHeartbeat() {
  const context = repositoryContext();
  const managed = validateManagedSession(context);
  withRegistryLock(context, () => {
    const registry = readRegistry(context);
    const session = registry.sessions.find((item) => item.id === managed.claim.id && item.status === "active");
    if (!session) throw new SessionError("활성 claim이 없습니다.");
    session.updatedAt = new Date().toISOString();
    writeRegistry(context, registry);
  });
  process.stdout.write(`[git-session] heartbeat: ${managed.branch}\n`);
}

function commandRelease() {
  const context = repositoryContext();
  const managed = validateManagedSession(context);
  if (git(["status", "--porcelain"], context.root).stdout.trim()) {
    throw new SessionError("변경이 남은 worktree는 release할 수 없습니다.");
  }
  withRegistryLock(context, () => {
    const registry = readRegistry(context);
    const session = registry.sessions.find((item) => item.id === managed.claim.id && item.status === "active");
    if (!session) throw new SessionError("활성 claim이 없습니다.");
    session.status = "released";
    session.updatedAt = new Date().toISOString();
    writeRegistry(context, registry);
  });
  process.stdout.write(`[git-session] release 완료: ${managed.branch}\n병합 확인 후 안전 정리 절차를 사용하십시오.\n`);
}

function sessionIsLive(session) {
  if (session.status !== "active" || !fs.existsSync(session.worktree)) return false;
  const result = git(["branch", "--show-current"], session.worktree, true);
  return result.status === 0 && result.stdout.trim().normalize("NFC") === session.branch;
}

/** 이 시간 넘게 편집이 없고 미병합 커밋이 남아 있으면 `idle` 로 본다. */
export const SESSION_IDLE_MINUTES = 90;
/** 갓 만든 세션을 `done` 으로 오판하지 않게 두는 유예. */
export const SESSION_GRACE_MINUTES = 10;

/**
 * claim 이 끝났는지를 **관측값으로 계산**한다.
 *
 * `live` 는 "폴더가 있고 그 브랜치가 체크아웃돼 있다" 는 뜻뿐이라 끝났는지
 * 알려주지 못했다. 그래서 매번 손으로 PR 병합·clean·origin/main 포함·프로세스
 * 네 가지를 확인해야 했다. 그 네 가지는 전부 자동으로 알 수 있는 값이다.
 *
 * - `done`    정리해도 잃을 게 없다 (미병합 0 + clean, 또는 worktree 없음)
 * - `working` 진행 중 (미커밋 변경 또는 최근 편집된 미병합 커밋)
 * - `idle`    미병합 커밋이 남았는데 오래 조용하다 — 사람이 확인할 것
 * - `released` 이미 해제됨
 */
export function classifySession(facts, options = {}) {
  const idleMinutes = options.idleMinutes ?? SESSION_IDLE_MINUTES;
  const graceMinutes = options.graceMinutes ?? SESSION_GRACE_MINUTES;
  if (facts.status !== "active") return "released";
  if (!facts.worktreeExists) return "done";
  if (facts.dirty) return "working";
  if (facts.ahead > 0) {
    return facts.minutesSinceUpdate > idleMinutes ? "idle" : "working";
  }
  // 미병합 커밋이 없고 깨끗하다. 방금 만든 세션일 수 있으니 유예를 준다.
  return facts.minutesSinceUpdate > graceMinutes ? "done" : "working";
}

/** 한 세션의 관측값을 모은다. git 만 읽고 아무것도 바꾸지 않는다. */
function sessionFacts(context, session) {
  const worktreeExists = fs.existsSync(session.worktree);
  const dirty =
    worktreeExists &&
    Boolean(git(["status", "--porcelain"], session.worktree, true).stdout.trim());
  const aheadResult = git(
    ["rev-list", "--count", `origin/${POLICY.defaultBranch}..${session.branch}`],
    context.root,
    true,
  );
  const ahead = aheadResult.status === 0 ? Number(aheadResult.stdout.trim()) || 0 : 0;
  const updatedAt = Date.parse(session.updatedAt ?? "");
  const minutesSinceUpdate = Number.isFinite(updatedAt)
    ? (Date.now() - updatedAt) / 60_000
    : Number.POSITIVE_INFINITY;
  return { status: session.status, worktreeExists, dirty, ahead, minutesSinceUpdate };
}

export function parseWorktreePorcelain(raw) {
  const entries = [];
  let current = null;
  for (const line of String(raw).split(/\r?\n/u)) {
    if (line.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = { path: line.slice("worktree ".length), branch: null, head: null, detached: false };
    } else if (current && line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length);
    } else if (current && line.startsWith("branch refs/heads/")) {
      current.branch = line.slice("branch refs/heads/".length).normalize("NFC");
    } else if (current && line === "detached") {
      current.detached = true;
    }
  }
  if (current) entries.push(current);
  return entries;
}

export function auditWorktreeEntries(entries, sessions, controlRoot, policy = POLICY) {
  const violations = [];
  for (const entry of entries) {
    if (samePath(entry.path, controlRoot)) {
      if (entry.branch !== policy.defaultBranch) {
        violations.push(`루트 관제 worktree가 ${policy.defaultBranch}이 아닙니다: ${entry.branch ?? "detached HEAD"}`);
      }
      if (entry.dirty) violations.push("루트 관제 worktree에 커밋되지 않은 변경이 있습니다.");
      continue;
    }
    if (!entry.branch) {
      violations.push(`detached HEAD worktree입니다: ${entry.path}`);
      continue;
    }
    let identity;
    try {
      identity = parseBranchIdentity(entry.branch, policy);
    } catch {
      violations.push(`구형 또는 규칙 위반 브랜치 worktree입니다: ${entry.branch} (${entry.path})`);
      continue;
    }
    const expected = expectedWorktreePath(controlRoot, identity);
    if (!samePath(entry.path, expected)) {
      violations.push(`브랜치와 경로가 불일치합니다: ${entry.branch} (${entry.path})`);
    }
    const registered = sessions.some(
      (session) =>
        session.status === "active" &&
        session.branch === entry.branch &&
        samePath(session.worktree, entry.path),
    );
    if (!registered) violations.push(`활성 claim이 없는 worktree입니다: ${entry.branch} (${entry.path})`);
  }
  return violations;
}

function commandStatus(options) {
  const context = repositoryContext();
  git(["fetch", "origin", POLICY.defaultBranch], context.root, true);
  const sessions = readRegistry(context).sessions.map((session) => {
    const facts = sessionFacts(context, session);
    return {
      ...session,
      live: sessionIsLive(session),
      facts,
      state: classifySession(facts),
    };
  });
  const worktrees = parseWorktreePorcelain(
    git(["worktree", "list", "--porcelain"], context.root).stdout,
  ).map((entry) => ({
    ...entry,
    dirty: Boolean(git(["status", "--porcelain"], entry.path, true).stdout.trim()),
  }));
  const violations = auditWorktreeEntries(worktrees, sessions, context.controlRoot);
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ sessions, worktrees, violations }, null, 2)}\n`);
    return;
  }
  if (sessions.length === 0) {
    process.stdout.write("[git-session] 등록된 세션이 없습니다.\n");
  } else {
    // 끝났는지 사람이 매번 따지지 않게 판정을 먼저 보여준다.
    for (const session of sessions.filter((item) => item.state !== "released")) {
      const { dirty, ahead, minutesSinceUpdate } = session.facts;
      const quiet = Number.isFinite(minutesSinceUpdate)
        ? `${Math.round(minutesSinceUpdate)}분 전`
        : "시각 미상";
      const why = dirty
        ? "미커밋 변경 있음"
        : ahead > 0
          ? `미병합 ${ahead}커밋`
          : "미병합 없음 · 정리 가능";
      process.stdout.write(
        `[${session.state}] ${session.branch} — ${why} · 마지막 활동 ${quiet} · port=${session.port}\n` +
          `          paths=${session.paths.join(",")}\n`,
      );
    }
    const done = sessions.filter((item) => item.state === "done").length;
    if (done > 0) {
      process.stdout.write(
        `[git-session] 정리 가능한 세션 ${done}개 — 'git-session-manager gc' 로 한 번에 정리합니다.\n`,
      );
    }
  }
  const behind = git(
    ["rev-list", "--count", `${POLICY.defaultBranch}..origin/${POLICY.defaultBranch}`],
    context.controlRoot,
    true,
  );
  const behindCount = behind.status === 0 ? Number(behind.stdout.trim()) || 0 : 0;
  if (behindCount > 0) {
    process.stdout.write(
      `[주의] 루트 ${POLICY.defaultBranch} 이 origin/${POLICY.defaultBranch} 보다 ${behindCount}커밋 뒤처져 있습니다.\n`,
    );
  }
  for (const violation of violations) process.stdout.write(`[주의] ${violation}\n`);
}

/**
 * 끝난 세션을 한 번에 정리한다 — claim 해제 → worktree 제거 → 병합된 로컬
 * 브랜치 삭제. 손으로 하던 Phase 4 절차 그대로다.
 *
 * `done` 판정(미병관 커밋 0 + clean)만 건드린다. 미커밋 변경이 있는 worktree는
 * 남의 미완성 작업일 수 있어 절대 손대지 않는다.
 */
function commandGc(options) {
  const context = repositoryContext();
  if (!samePath(context.root, context.controlRoot)) {
    throw new SessionError("gc 는 루트 관제 worktree 에서 실행합니다.");
  }
  git(["fetch", "--prune", "origin", POLICY.defaultBranch], context.root, true);

  const sessions = readRegistry(context).sessions.map((session) => ({
    session,
    state: classifySession(sessionFacts(context, session)),
  }));
  const targets = sessions.filter((item) => item.state === "done").map((item) => item.session);
  const kept = sessions.filter((item) => item.state === "working" || item.state === "idle");

  if (targets.length === 0) {
    process.stdout.write("[git-session] 정리할 세션이 없습니다.\n");
  }
  for (const session of targets) {
    if (options.dryRun) {
      process.stdout.write(`[gc] (예정) ${session.branch}\n`);
      continue;
    }
    withRegistryLock(context, () => {
      const registry = readRegistry(context);
      const entry = registry.sessions.find((item) => item.id === session.id && item.status === "active");
      if (entry) {
        entry.status = "released";
        entry.updatedAt = new Date().toISOString();
        writeRegistry(context, registry);
      }
    });
    const removed = fs.existsSync(session.worktree)
      ? git(["worktree", "remove", session.worktree], context.root, true).status === 0
      : true;
    // -d 는 병합된 브랜치만 지운다. 안 지워지면 그대로 두고 알린다.
    const branchDeleted = git(["branch", "-d", session.branch], context.root, true).status === 0;
    process.stdout.write(
      `[gc] ${session.branch} — claim 해제${removed ? " · worktree 제거" : ""}${branchDeleted ? " · 브랜치 삭제" : " · 브랜치 유지(미병합)"}\n`,
    );
  }
  for (const item of kept) {
    process.stdout.write(`[gc] 유지 ${item.session.branch} (${item.state})\n`);
  }
}

function guardPairs(root) {
  const pairs = [];
  const missing = [];
  const different = [];
  const skip = new Set([".git", "node_modules", ".next", "out"]);
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !skip.has(entry.name)) visit(path.join(directory, entry.name));
    }
    const agents = path.join(directory, "AGENTS.md");
    const claude = path.join(directory, "CLAUDE.md");
    const hasAgents = fs.existsSync(agents);
    const hasClaude = fs.existsSync(claude);
    if (hasAgents || hasClaude) pairs.push({ agents, claude });
    if (hasAgents !== hasClaude) missing.push(hasAgents ? claude : agents);
    if (hasAgents && hasClaude && fs.readFileSync(agents, "utf8") !== fs.readFileSync(claude, "utf8")) {
      different.push(directory);
    }
  };
  visit(root);
  return { pairs, missing, different };
}

function commandCheckGuards() {
  const context = repositoryContext();
  const result = guardPairs(context.root);
  if (result.missing.length || result.different.length) {
    const details = [
      ...result.missing.map((file) => `짝 파일 없음: ${file}`),
      ...result.different.map((directory) => `내용 불일치: ${directory}`),
    ];
    throw new SessionError(`AGENTS.md·CLAUDE.md 쌍 검사가 실패했습니다:\n- ${details.join("\n- ")}`);
  }
  process.stdout.write(`[git-session] 가드 쌍 ${result.pairs.length}개 일치\n`);
}

function commandCheckStaged() {
  const context = repositoryContext();
  const managed = validateManagedSession(context);
  validateChangedPaths(context, managed.identity, managed.claim, changedPaths(context.root, true));
  commandCheckGuards();
  process.stdout.write(`[git-session] pre-commit 통과: ${managed.branch}\n`);
}

/**
 * pre-push 는 `<local ref> <local sha> <remote ref> <remote sha>` 줄들을 stdin 으로 준다.
 * 삭제 push 는 local sha 가 전부 0 이다.
 */
export function parsePushRefs(raw) {
  return String(raw)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/u);
      return { localRef, localSha, remoteRef, remoteSha };
    });
}

/** 삭제만 있는 push 인가. 하나라도 실제 갱신이 섞이면 false 다. */
export function isDeleteOnlyPush(refs) {
  return refs.length > 0 && refs.every((ref) => /^0+$/u.test(ref.localSha ?? ""));
}

function commandCheckPush() {
  // 병합 끝난 원격 브랜치를 지우는 건 정상 정리 절차인데, 그때는 claim 도
  // worktree 도 이미 없어서 아래 검사에 걸렸다. 훅이 우회(gh api)를 유도하던
  // 지점이다. ref 삭제는 파일을 건드리지 않으므로 그대로 통과시킨다.
  let refs = [];
  try {
    refs = parsePushRefs(fs.readFileSync(0, "utf8"));
  } catch {
    refs = [];
  }
  if (isDeleteOnlyPush(refs)) {
    process.stdout.write("[git-session] pre-push 통과: 원격 ref 삭제\n");
    return;
  }

  const context = repositoryContext();
  const managed = validateManagedSession(context);
  validateChangedPaths(context, managed.identity, managed.claim, changedPaths(context.root));
  process.stdout.write(`[git-session] pre-push 통과: ${managed.branch}\n`);
}

function commandCheckBranch(options) {
  const branch = requiredOption(options, "branch");
  const identity = parseBranchIdentity(branch);
  process.stdout.write(`[git-session] 브랜치 신원 통과: ${identity.ai} / ${identity.worker} / ${identity.task}\n`);
}

export function validatePullRequestPayload(payload, policy = POLICY) {
  const pull = payload?.pull_request;
  if (!pull) throw new SessionError("GitHub pull_request 이벤트가 아닙니다.");
  if (pull.base?.ref !== policy.defaultBranch) {
    throw new SessionError(`PR base는 ${policy.defaultBranch}이어야 합니다: ${pull.base?.ref ?? "없음"}`);
  }
  const head = String(pull.head?.ref ?? "").normalize("NFC");
  let legacy = false;
  try {
    parseBranchIdentity(head, policy);
  } catch (error) {
    const createdAt = Date.parse(pull.created_at ?? "");
    if (!Number.isFinite(createdAt) || createdAt >= Date.parse(policy.rolloutAt)) throw error;
    legacy = true;
  }
  if (!legacy) {
    const body = pull.body ?? "";
    const missingSections = REQUIRED_PR_SECTIONS.filter((section) => !body.includes(section));
    if (missingSections.length > 0) {
      throw new SessionError(`PR 본문 필수 섹션이 없습니다: ${missingSections.join(", ")}`);
    }
  }
  return { head, legacy };
}

function commandCheckPr(options) {
  const eventPath = requiredOption(options, "event");
  const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  const result = validatePullRequestPayload(payload);
  process.stdout.write(
    result.legacy
      ? `[git-session] 기존 PR 이름 예외 적용: ${result.head}\n`
      : `[git-session] PR 정책 통과: ${result.head}\n`,
  );
}

function commandInstallHooks() {
  const context = repositoryContext();
  configureHooks(context);
  process.stdout.write("[git-session] Git hooksPath를 .githooks로 설정했습니다.\n");
}

function printHelp() {
  process.stdout.write(`병렬 Git 세션 관리자\n\n명령:\n  start --ai <codex|claude> --worker <이름> --task <한글-작업명> --path <경로>...\n  claim --ai <codex|claude> --worker <이름> --path <경로>...\n  status [--json]\n  gc [--dry-run]\n  guard [--file <경로>|--hook-input]\n  check-start\n  heartbeat\n  release\n  check-staged\n  check-push\n  check-branch --branch <브랜치>\n  check-guards\n  check-pr --event <GitHub 이벤트 JSON>\n  install-hooks\n`);
}

function dispatch(argv) {
  const [command = "help", ...tokens] = argv;
  const options = parseOptions(tokens);
  const commands = {
    start: commandStart,
    claim: commandClaim,
    status: commandStatus,
    gc: commandGc,
    guard: commandGuard,
    "check-start": commandCheckStart,
    heartbeat: commandHeartbeat,
    release: commandRelease,
    "check-staged": commandCheckStaged,
    "check-push": commandCheckPush,
    "check-branch": commandCheckBranch,
    "check-guards": commandCheckGuards,
    "check-pr": commandCheckPr,
    "install-hooks": commandInstallHooks,
    help: printHelp,
  };
  const handler = commands[command];
  if (!handler) throw new SessionError(`알 수 없는 명령입니다: ${command}`);
  handler(options);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === entry) {
  try {
    dispatch(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[git-session] ${message}\n`);
    process.exitCode = 1;
  }
}

export const __filename = fileURLToPath(import.meta.url);
