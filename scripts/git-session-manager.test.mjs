import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  POLICY,
  SessionError,
  analyzeLocalConflicts,
  auditWorktreeEntries,
  classifySession,
  expectedWorktreePath,
  isDeleteOnlyPush,
  localConflicts,
  parsePushRefs,
  matchingHotspots,
  parseBranchIdentity,
  parseWorktreePorcelain,
  pathOverlaps,
  pathsOutsideScopes,
  scopeContains,
  validatePullRequestPayload,
} from "./git-session-manager.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sessionScript = path.join(repositoryRoot, "scripts", "git-session-manager.mjs");

function execute(executable, args, cwd, allowFailure = false) {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (!allowFailure && result.status !== 0) {
    assert.fail(`${executable} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

test("허용된 AI와 여섯 작업자의 한글 브랜치를 받는다", () => {
  for (const worker of POLICY.allowedWorkers) {
    assert.deepEqual(parseBranchIdentity(`codex/${worker}/챗봇-안전게이트`), {
      ai: "codex",
      worker,
      task: "챗봇-안전게이트",
    });
    assert.equal(parseBranchIdentity(`claude/${worker}/문서정리`).worker, worker);
  }
});

test("구형 작업자와 영문·숫자·공백 작업명을 거부한다", () => {
  const invalid = [
    "front/이재용/챗봇",
    "codex/홍길동/챗봇",
    "codex/이재용/chatbot",
    "codex/이재용/챗봇-2",
    "codex/이재용/챗봇 작업",
    "codex/이재용/-챗봇",
    "codex/이재용/챗봇/게이트",
  ];
  for (const branch of invalid) {
    assert.throws(() => parseBranchIdentity(branch), SessionError, branch);
  }
});

test("브랜치와 동일한 중첩 worktree 경로를 만든다", () => {
  const controlRoot = path.join(path.parse(process.cwd()).root, "dev", "six-opening");
  const actual = expectedWorktreePath(controlRoot, {
    ai: "codex",
    worker: "이재용",
    task: "병렬작업-하네스",
  });
  assert.equal(
    actual,
    path.join(
      path.dirname(controlRoot),
      "six-opening-worktrees",
      "codex",
      "이재용",
      "병렬작업-하네스",
    ),
  );
});

test("부모·자식 경로 겹침과 claim 포함 관계를 판정한다", () => {
  assert.equal(pathOverlaps("web/shared", "web/shared/llm/filter.ts"), true);
  assert.equal(pathOverlaps("web/features/f9-archive", "web/features/f10-chatbot"), false);
  assert.equal(scopeContains("web/app", "web/app/api/chat/route.ts"), true);
  assert.deepEqual(
    pathsOutsideScopes(
      ["web/features/f10-chatbot/SPEC.md", "web/shared/llm/filter.ts"],
      ["web/features/f10-chatbot"],
    ),
    ["web/shared/llm/filter.ts"],
  );
});

test("활성 claim이 겹치면 충돌을 반환하고 release된 claim은 무시한다", () => {
  const registry = {
    sessions: [
      {
        branch: "claude/김설빈/공용필터-수정",
        worker: "김설빈",
        status: "active",
        paths: ["web/shared/llm"],
      },
      {
        branch: "codex/강소정/문서-정리",
        worker: "강소정",
        status: "released",
        paths: ["docs"],
      },
    ],
  };
  assert.equal(localConflicts(registry, ["web/shared"], "codex/이재용/통합-연결").length, 1);
  assert.equal(localConflicts(registry, ["docs"], "codex/이재용/통합-연결").length, 0);
});

test("claim 은 겹쳐도 실제 수정 파일이 안 겹치면 경고로 낮춘다", () => {
  const registry = {
    sessions: [
      {
        branch: "claude/김설빈/렌더값-분해",
        worker: "김설빈",
        status: "active",
        paths: ["web/ui-src"],
      },
    ],
  };
  const scopes = ["web/ui-src/methods/notifyChatContext.js"];
  const mine = "claude/이재용/지갑값-전달";

  // 상대가 다른 파일만 고쳤다 -> 통과시키고 경고만 남긴다.
  const apart = analyzeLocalConflicts(registry, scopes, mine, {
    changedFilesOf: () => ["web/ui-src/methods/renderVals-return.js"],
  });
  assert.equal(apart.conflicts.length, 0);
  assert.equal(apart.warnings.length, 1);

  // 같은 파일을 고쳤다 -> 그대로 차단한다.
  const same = analyzeLocalConflicts(registry, scopes, mine, {
    changedFilesOf: () => ["web/ui-src/methods/notifyChatContext.js"],
  });
  assert.equal(same.conflicts.length, 1);

  // 아직 아무것도 안 고쳤으면 앞으로 고칠 수 있으므로 차단을 유지한다.
  const untouched = analyzeLocalConflicts(registry, scopes, mine, {
    changedFilesOf: () => [],
  });
  assert.equal(untouched.conflicts.length, 1);

  // 조회 실패(null)도 안전하게 차단한다.
  const unknown = analyzeLocalConflicts(registry, scopes, mine, {
    changedFilesOf: () => null,
  });
  assert.equal(unknown.conflicts.length, 1);
});

test("pre-push 는 원격 ref 삭제만 있는 push 를 통과시킨다", () => {
  const zero = "0000000000000000000000000000000000000000";
  const sha = "1111111111111111111111111111111111111111";

  // 병합 끝난 브랜치 삭제 — claim 도 worktree 도 없는 정리 단계다.
  const del = parsePushRefs(`(delete) ${zero} refs/heads/claude/이재용/끝난작업 ${sha}`);
  assert.equal(del.length, 1);
  assert.equal(isDeleteOnlyPush(del), true);

  // 일반 push 는 그대로 검사한다.
  const push = parsePushRefs(`refs/heads/a ${sha} refs/heads/a ${zero}`);
  assert.equal(isDeleteOnlyPush(push), false);

  // 삭제와 갱신이 섞이면 통과시키지 않는다.
  const mixed = parsePushRefs(
    `(delete) ${zero} refs/heads/a ${sha}\nrefs/heads/b ${sha} refs/heads/b ${zero}`,
  );
  assert.equal(isDeleteOnlyPush(mixed), false);

  // stdin 이 비면 삭제로 보지 않는다.
  assert.equal(isDeleteOnlyPush(parsePushRefs("")), false);
});

test("claim 이 끝났는지를 관측값으로 판정한다", () => {
  const base = { status: "active", worktreeExists: true, dirty: false, ahead: 0, minutesSinceUpdate: 600 };

  // 미병합 0 + clean -> 정리 가능
  assert.equal(classifySession(base), "done");
  // worktree 가 이미 없어도 정리 대상
  assert.equal(classifySession({ ...base, worktreeExists: false }), "done");
  // 미커밋 변경은 남의 미완성 작업일 수 있다 -> 절대 정리하지 않는다
  assert.equal(classifySession({ ...base, dirty: true }), "working");
  // 미병합 커밋 + 최근 활동 -> 진행 중
  assert.equal(classifySession({ ...base, ahead: 2, minutesSinceUpdate: 5 }), "working");
  // 미병합 커밋 + 오래 조용 -> 사람이 확인할 것 (자동으로 뺏지 않는다)
  assert.equal(classifySession({ ...base, ahead: 2, minutesSinceUpdate: 600 }), "idle");
  // 갓 만든 빈 세션을 done 으로 오판하지 않는다
  assert.equal(classifySession({ ...base, minutesSinceUpdate: 1 }), "working");
  // 해제된 세션
  assert.equal(classifySession({ ...base, status: "released" }), "released");
});

test("공용 앱·shared·기술 문서를 핫스팟으로 찾는다", () => {
  const hotspots = matchingHotspots(["web/shared/llm", "docs/기술스택.md"]);
  assert.ok(hotspots.includes("web/shared"));
  assert.ok(hotspots.includes("docs/기술스택.md"));
});

test("실제 worktree 목록에서 루트 main·경로·claim 위반을 찾는다", () => {
  const controlRoot = path.join(path.parse(process.cwd()).root, "dev", "six-opening");
  const managedPath = path.join(
    path.dirname(controlRoot),
    "six-opening-worktrees",
    "codex",
    "이재용",
    "병렬작업-하네스",
  );
  const entries = parseWorktreePorcelain(
    `worktree ${controlRoot}\nHEAD abc\nbranch refs/heads/codex/이재용/루트작업\n\n` +
      `worktree ${managedPath}\nHEAD def\nbranch refs/heads/codex/이재용/병렬작업-하네스\n`,
  );
  entries[0].dirty = true;
  const violations = auditWorktreeEntries(
    entries,
    [
      {
        status: "active",
        branch: "codex/이재용/병렬작업-하네스",
        worktree: managedPath,
      },
    ],
    controlRoot,
  );
  assert.equal(violations.length, 2);
  assert.match(violations[0], /루트 관제 worktree/u);
  assert.match(violations[1], /커밋되지 않은 변경/u);

  const unclaimed = auditWorktreeEntries(entries.slice(1), [], controlRoot);
  assert.equal(unclaimed.length, 1);
  assert.match(unclaimed[0], /활성 claim/u);
});

test("새 PR은 main base, 규칙 브랜치, 필수 본문을 요구한다", () => {
  const sections = [
    "## 작업 정보",
    "## 변경 요약",
    "## 작업 범위",
    "## 공유 핫스팟",
    "## 계약 변경",
    "## 검증",
  ].join("\n");
  assert.deepEqual(
    validatePullRequestPayload({
      pull_request: {
        created_at: "2026-08-12T10:00:00Z",
        base: { ref: "main" },
        head: { ref: "codex/이재용/병렬작업-하네스" },
        body: sections,
      },
    }),
    { head: "codex/이재용/병렬작업-하네스", legacy: false },
  );
  assert.throws(
    () =>
      validatePullRequestPayload({
        pull_request: {
          created_at: "2026-08-12T10:00:00Z",
          base: { ref: "develop" },
          head: { ref: "codex/이재용/병렬작업-하네스" },
          body: sections,
        },
      }),
    /PR base/u,
  );
  assert.throws(
    () =>
      validatePullRequestPayload({
        pull_request: {
          created_at: "2026-08-12T10:00:00Z",
          base: { ref: "main" },
          head: { ref: "codex/이재용/병렬작업-하네스" },
          body: "## 변경 요약",
        },
      }),
    /필수 섹션/u,
  );
});

test("도입 전 생성된 PR만 구형 브랜치 이름 예외를 받는다", () => {
  assert.deepEqual(
    validatePullRequestPayload({
      pull_request: {
        created_at: "2026-08-10T00:00:00Z",
        base: { ref: "main" },
        head: { ref: "feat/f10-old" },
        body: "",
      },
    }),
    { head: "feat/f10-old", legacy: true },
  );
  assert.throws(
    () =>
      validatePullRequestPayload({
        pull_request: {
          created_at: "2026-08-12T10:00:00Z",
          base: { ref: "main" },
          head: { ref: "feat/f10-new" },
          body: "",
        },
      }),
    /세 구간/u,
  );
});

test("Codex와 Claude의 Git 세션 스킬 사본이 같다", () => {
  const pairs = [
    [".agents/skills/git-session-manager/SKILL.md", ".claude/skills/git-session-manager/SKILL.md"],
    [
      ".agents/skills/git-session-manager/references/team-git-policy.md",
      ".claude/skills/git-session-manager/references/team-git-policy.md",
    ],
    [
      ".agents/skills/git-session-manager/references/trigger-cases.md",
      ".claude/skills/git-session-manager/references/trigger-cases.md",
    ],
    [
      ".agents/skills/git-session-manager/agents/openai.yaml",
      ".claude/skills/git-session-manager/agents/openai.yaml",
    ],
  ];
  for (const [left, right] of pairs) {
    assert.equal(
      fs.readFileSync(path.join(repositoryRoot, left), "utf8"),
      fs.readFileSync(path.join(repositoryRoot, right), "utf8"),
      `${left} != ${right}`,
    );
  }
});

test("루트 가드가 정확한 여섯 작업자와 한글 작업명을 공유한다", () => {
  const agents = fs.readFileSync(path.join(repositoryRoot, "AGENTS.md"), "utf8");
  const claude = fs.readFileSync(path.join(repositoryRoot, "CLAUDE.md"), "utf8");
  assert.equal(agents, claude);
  for (const worker of POLICY.allowedWorkers) assert.ok(agents.includes(worker), worker);
  assert.ok(agents.includes("^[가-힣]+(?:-[가-힣]+)*$"));
  assert.equal(agents.includes("홍길동"), false);
});

test("Claude 편집 전 훅과 Git 훅이 세션 가드를 호출한다", () => {
  const settings = JSON.parse(fs.readFileSync(path.join(repositoryRoot, ".claude/settings.json"), "utf8"));
  assert.match(settings.hooks.PreToolUse[0].hooks[0].command, /guard --hook-input/u);
  assert.match(settings.hooks.SessionStart[0].hooks[0].command, /check-start/u);
  assert.match(fs.readFileSync(path.join(repositoryRoot, ".githooks/pre-commit"), "utf8"), /check-staged/u);
  assert.match(fs.readFileSync(path.join(repositoryRoot, ".githooks/pre-push"), "utf8"), /check-push/u);
});

test("PR 템플릿과 GitHub 정책 검사가 같은 필수 항목을 사용한다", () => {
  const template = fs.readFileSync(path.join(repositoryRoot, ".github/pull_request_template.md"), "utf8");
  for (const section of [
    "## 작업 정보",
    "## 변경 요약",
    "## 작업 범위",
    "## 공유 핫스팟",
    "## 계약 변경",
    "## 검증",
  ]) {
    assert.ok(template.includes(section), section);
  }
  const workflow = fs.readFileSync(
    path.join(repositoryRoot, ".github/workflows/session-policy.yml"),
    "utf8",
  );
  assert.match(workflow, /node --test scripts\/git-session-manager\.test\.mjs/u);
  assert.match(workflow, /check-pr --event/u);
  assert.match(workflow, /check-guards/u);
});

test("로컬 원격 저장소에서 start가 브랜치·worktree·claim을 함께 만든다", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "six-opening-session-test-"));
  const safeTempRoot = path.resolve(os.tmpdir());
  assert.ok(path.resolve(temporaryRoot).startsWith(`${safeTempRoot}${path.sep}`));
  try {
    const remote = path.join(temporaryRoot, "remote.git");
    const controlRoot = path.join(temporaryRoot, "six-opening");
    fs.mkdirSync(controlRoot, { recursive: true });
    execute("git", ["init", "--bare", remote], temporaryRoot);
    execute("git", ["init", "-b", "main"], controlRoot);
    execute("git", ["config", "user.name", "Harness Test"], controlRoot);
    execute("git", ["config", "user.email", "harness@example.com"], controlRoot);
    fs.writeFileSync(path.join(controlRoot, "README.md"), "# test\n", "utf8");
    execute("git", ["add", "README.md"], controlRoot);
    execute("git", ["commit", "-m", "init"], controlRoot);
    execute("git", ["remote", "add", "origin", remote], controlRoot);
    execute("git", ["push", "-u", "origin", "main"], controlRoot);

    const ownerBlocked = execute(
      "node",
      [
        sessionScript,
        "start",
        "--ai",
        "codex",
        "--worker",
        "이호연",
        "--task",
        "총괄문서-수정",
        "--path",
        "AGENTS.md",
      ],
      controlRoot,
      true,
    );
    assert.notEqual(ownerBlocked.status, 0);
    assert.match(ownerBlocked.stderr, /총괄 전용/u);

    const started = execute(
      "node",
      [
        sessionScript,
        "start",
        "--ai",
        "codex",
        "--worker",
        "이호연",
        "--task",
        "테스트-작업",
        "--path",
        "README.md",
      ],
      controlRoot,
    );
    assert.match(started.stdout, /생성 완료/u);
    assert.equal(
      execute("git", ["config", "--get", "core.hooksPath"], controlRoot).stdout.trim(),
      ".githooks",
    );

    const worktree = path.join(
      temporaryRoot,
      "six-opening-worktrees",
      "codex",
      "이호연",
      "테스트-작업",
    );
    assert.equal(fs.existsSync(worktree), true);
    assert.equal(
      execute("git", ["branch", "--show-current"], worktree).stdout.trim(),
      "codex/이호연/테스트-작업",
    );
    assert.equal(execute("node", [sessionScript, "guard", "--file", "README.md"], worktree).status, 0);

    fs.writeFileSync(path.join(worktree, "outside.txt"), "blocked\n", "utf8");
    const blocked = execute("node", [sessionScript, "guard"], worktree, true);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /claim 범위 밖/u);
  } finally {
    assert.ok(path.resolve(temporaryRoot).startsWith(`${safeTempRoot}${path.sep}`));
    fs.rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  }
});
