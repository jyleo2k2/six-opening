import { config } from "dotenv";
import OpenAI from "openai";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

export const LLM_MODEL = "gpt-5.6-luna";
export const LLM_REASONING_EFFORT = "low" as const;

let environmentLoaded = false;

/**
 * `.env`는 관제 저장소 루트에만 있고 Git이 추적하지 않는다. 작업용 worktree에서
 * 개발 서버를 켜면 저장소 루트가 달라 부모 경로를 아무리 올라가도 찾지 못한다.
 * worktree의 `.git`은 디렉터리가 아니라 관제 저장소를 가리키는 파일이므로
 * 그 경로를 따라가 관제 루트를 복원한다.
 */
export function resolveEnvCandidates(cwd = process.cwd()) {
  const repositoryRoot = resolve(cwd, "..");
  const candidates = [resolve(repositoryRoot, ".env")];

  const gitPath = resolve(repositoryRoot, ".git");
  if (existsSync(gitPath) && statSync(gitPath).isFile()) {
    const gitdir = /gitdir:\s*(.+)/.exec(readFileSync(gitPath, "utf8"))?.[1]?.trim();
    // gitdir = <관제 루트>/.git/worktrees/<이름> → 세 단계 위가 관제 루트다.
    if (gitdir) {
      candidates.push(resolve(repositoryRoot, gitdir, "..", "..", "..", ".env"));
    }
  }

  return candidates;
}

function loadDevelopmentEnvironment() {
  if (environmentLoaded) return;
  environmentLoaded = true;

  for (const path of resolveEnvCandidates()) {
    if (existsSync(path)) {
      config({ path, quiet: true });
      return;
    }
  }
}

export function getLlmClient() {
  loadDevelopmentEnvironment();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({ apiKey });
}
