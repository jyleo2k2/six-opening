import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * worktree 의 `.git` 이 가리키는 관제 저장소 루트. worktree 가 아니면 null.
 *
 * `.env` 는 관제 저장소 루트에만 있고 Git 이 추적하지 않는다. 작업용 worktree 에서
 * 개발 서버를 켜면 부모 경로를 아무리 올라가도 찾지 못한다. worktree 의 `.git` 은
 * 디렉터리가 아니라 관제 저장소를 가리키는 파일이므로 그 경로를 따라 복원한다.
 *
 * gitdir = `<관제 루트>/.git/worktrees/<이름>` → 세 단계 위가 관제 루트다.
 */
export function controlRepositoryRoot(dir: string): string | null {
  const gitPath = resolve(dir, ".git");
  if (!existsSync(gitPath) || !statSync(gitPath).isFile()) return null;
  const gitdir = /gitdir:\s*(.+)/.exec(readFileSync(gitPath, "utf8"))?.[1]?.trim();
  return gitdir ? resolve(dir, gitdir, "..", "..", "..") : null;
}
