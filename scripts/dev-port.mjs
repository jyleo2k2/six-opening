#!/usr/bin/env node
// 현재 worktree에 배정된 개발 포트를 표준 출력으로 돌려준다.
// 등록된 세션이 없으면 기본 포트 3000을 쓴다. dev.bat이 이 값을 읽어 넘긴다.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PORT = 3000;
const REGISTRY_FILE = "six-opening-sessions.json";

/** worktree의 `.git`은 관제 저장소를 가리키는 파일이다. 일반 저장소면 디렉터리다. */
function commonGitDir(root) {
  const gitPath = path.join(root, ".git");
  if (!fs.existsSync(gitPath)) return null;
  if (fs.statSync(gitPath).isDirectory()) return gitPath;

  const gitdir = /gitdir:\s*(.+)/.exec(fs.readFileSync(gitPath, "utf8"))?.[1]?.trim();
  if (!gitdir) return null;
  // gitdir = <관제 루트>/.git/worktrees/<이름> → 두 단계 위가 관제 저장소의 .git이다.
  return path.resolve(root, gitdir, "..", "..");
}

function samePath(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function readSessions(root) {
  const gitDir = commonGitDir(root);
  if (!gitDir) return [];

  const registry = path.join(gitDir, REGISTRY_FILE);
  if (!fs.existsSync(registry)) return [];

  try {
    return JSON.parse(fs.readFileSync(registry, "utf8")).sessions ?? [];
  } catch {
    return [];
  }
}

export function findManagedDevPort(root) {
  const session = readSessions(root).find(
    (entry) =>
      ["starting", "active"].includes(entry.status) &&
      entry.worktree &&
      samePath(entry.worktree, root),
  );
  return Number.isInteger(session?.port) ? session.port : null;
}

export function findDevPort(root) {
  return findManagedDevPort(root) ?? DEFAULT_PORT;
}

export function findReservedDevPorts(root) {
  return [
    ...new Set(
      readSessions(root)
        .filter(
          (entry) =>
            ["starting", "active"].includes(entry.status) &&
            Number.isInteger(entry.port),
        )
        .map((entry) => entry.port),
    ),
  ].sort((left, right) => left - right);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === entry) {
  process.stdout.write(String(findDevPort(process.argv[2] ?? process.cwd())));
}
