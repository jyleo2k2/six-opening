import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

/**
 * 개발용 `.env.kiwoom.local` 을 늦게 읽는다. `app/api/quote/kiwoom.ts` 와 같은 방식이다.
 *
 * 배포 환경은 진짜 환경변수를 쓰므로 여기서 하는 일이 없다. 문제는 로컬인데,
 * 예전에는 이 파일을 읽는 곳이 `kiwoom.ts` 하나뿐이었다. 그래서 시세 라우트가
 * 한 번이라도 돌기 전에 다른 라우트가 먼저 오면 `process.env` 가 비어 있어
 * Supabase 설정도, `DEMO_USER_ID` 도 없는 것처럼 보였다. 차트는 마운트할 때
 * `/api/quote/.../chart` 와 `/api/trades` 를 **동시에** 부르므로 순서가 운에 달렸고,
 * 진 쪽은 401 을 받아 마커가 통째로 사라졌다.
 *
 * 순서에 기대지 않도록 Supabase 쪽에서도 같은 파일을 읽는다. `dotenv` 는 이미 있는
 * 값을 덮어쓰지 않으므로 두 번 읽어도 안전하다.
 */
let loaded = false;

/** worktree 에서는 `.git` 이 파일이고 그 안의 gitdir 로 본체를 찾는다. */
function repositoryRoots(): string[] {
  const cwd = process.cwd();
  // `next dev` 는 web/ 에서 돈다. 저장소 루트는 그 위다.
  const roots = [cwd, path.resolve(cwd, "..")];
  for (const root of [...roots]) {
    const gitPath = path.resolve(root, ".git");
    if (!existsSync(gitPath) || !statSync(gitPath).isFile()) continue;
    const gitdir = /gitdir:\s*(.+)/.exec(readFileSync(gitPath, "utf8"))?.[1]?.trim();
    if (gitdir) roots.push(path.resolve(root, gitdir, "..", "..", ".."));
  }
  return Array.from(new Set(roots));
}

export function loadDevelopmentEnvironment() {
  if (loaded || process.env.NODE_ENV === "production") return;
  loaded = true;
  for (const root of repositoryRoots()) {
    for (const name of [".env.kiwoom.local", ".env"]) {
      const candidate = path.resolve(root, name);
      if (existsSync(candidate)) config({ path: candidate, quiet: true });
    }
  }
}
