import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  findDevPort,
  findManagedDevPort,
  findReservedDevPorts,
} from "./dev-port.mjs";

function makeTempDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

function writeRegistry(gitDir, sessions) {
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(
    path.join(gitDir, "six-opening-sessions.json"),
    JSON.stringify({ version: 1, sessions }),
    "utf8",
  );
}

test("등록되지 않은 폴더는 기본 포트를 쓴다", () => {
  const root = makeTempDir("devport-plain");
  assert.equal(findDevPort(root), 3000);
  assert.equal(findManagedDevPort(root), null);

  fs.mkdirSync(path.join(root, ".git"));
  assert.equal(findDevPort(root), 3000);
  assert.equal(findManagedDevPort(root), null);
});

test("관제 저장소는 자기 세션 포트를 찾는다", () => {
  const root = makeTempDir("devport-control");
  writeRegistry(path.join(root, ".git"), [
    { worktree: root, port: 3123, status: "active" },
  ]);
  assert.equal(findDevPort(root), 3123);
  assert.equal(findManagedDevPort(root), 3123);
});

test("worktree는 .git 파일을 따라 관제 저장소의 레지스트리를 읽는다", () => {
  const control = makeTempDir("devport-src");
  const worktree = makeTempDir("devport-wt");
  const gitDir = path.join(control, ".git");
  writeRegistry(gitDir, [
    { worktree: control, port: 3000, status: "active" },
    { worktree, port: 3117, status: "active" },
  ]);
  fs.writeFileSync(
    path.join(worktree, ".git"),
    `gitdir: ${path.join(gitDir, "worktrees", "sample").replaceAll("\\", "/")}\n`,
    "utf8",
  );
  assert.equal(findDevPort(worktree), 3117);
  assert.equal(findManagedDevPort(worktree), 3117);
});

test("해제된 세션의 포트는 쓰지 않는다", () => {
  const root = makeTempDir("devport-released");
  writeRegistry(path.join(root, ".git"), [
    { worktree: root, port: 3131, status: "released" },
  ]);
  assert.equal(findDevPort(root), 3000);
  assert.equal(findManagedDevPort(root), null);
});

test("레지스트리가 깨져 있어도 기본 포트로 떨어진다", () => {
  const root = makeTempDir("devport-broken");
  const gitDir = path.join(root, ".git");
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(path.join(gitDir, "six-opening-sessions.json"), "{ not json", "utf8");
  assert.equal(findDevPort(root), 3000);
  assert.deepEqual(findReservedDevPorts(root), []);
});

test("활성 세션 포트만 중복 없이 예약 목록으로 돌려준다", () => {
  const root = makeTempDir("devport-reserved");
  writeRegistry(path.join(root, ".git"), [
    { worktree: root, port: 3100, status: "active" },
    { worktree: `${root}-other`, port: 3101, status: "starting" },
    { worktree: `${root}-duplicate`, port: 3101, status: "active" },
    { worktree: `${root}-released`, port: 3102, status: "released" },
  ]);

  assert.deepEqual(findReservedDevPorts(root), [3100, 3101]);
});
