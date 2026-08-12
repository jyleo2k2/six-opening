import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveEnvCandidates } from "./client";

function tempDir(name: string) {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`)));
}

// 관제 저장소에서 켜면 저장소 루트의 .env 하나만 본다.
{
  const root = tempDir("env-control");
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, "web"));
  assert.deepEqual(resolveEnvCandidates(path.join(root, "web")), [
    path.resolve(root, ".env"),
  ]);
}

// worktree에서 켜면 worktree 루트와 관제 저장소 루트를 모두 후보로 둔다.
// .env는 Git이 추적하지 않아 worktree에는 없으므로 이 폴백이 없으면 챗봇이 죽는다.
{
  const control = tempDir("env-src");
  const worktree = tempDir("env-wt");
  fs.mkdirSync(path.join(control, ".git", "worktrees", "sample"), { recursive: true });
  fs.mkdirSync(path.join(worktree, "web"));
  fs.writeFileSync(
    path.join(worktree, ".git"),
    `gitdir: ${path.join(control, ".git", "worktrees", "sample").replaceAll("\\", "/")}\n`,
    "utf8",
  );

  const candidates = resolveEnvCandidates(path.join(worktree, "web"));
  assert.equal(candidates[0], path.resolve(worktree, ".env"));
  assert.equal(candidates.at(-1), path.resolve(control, ".env"));
}

// .git이 없어도 예외 없이 기본 후보만 돌려준다.
{
  const root = tempDir("env-bare");
  fs.mkdirSync(path.join(root, "web"));
  assert.deepEqual(resolveEnvCandidates(path.join(root, "web")), [
    path.resolve(root, ".env"),
  ]);
}

console.log("llm client env tests passed");
