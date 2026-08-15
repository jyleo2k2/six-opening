import { config } from "dotenv";
import OpenAI from "openai";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { controlRepositoryRoot } from "../repo-root";

export const LLM_MODEL = "gpt-5.6-luna";
export const LLM_REASONING_EFFORT = "low" as const;

let environmentLoaded = false;

/** 이 프로세스가 볼 `.env` 후보. worktree 면 관제 저장소 루트의 `.env` 까지 본다. */
export function resolveEnvCandidates(cwd = process.cwd()) {
  const repositoryRoot = resolve(cwd, "..");
  const controlRoot = controlRepositoryRoot(repositoryRoot);
  const candidates = [resolve(repositoryRoot, ".env")];
  if (controlRoot) candidates.push(resolve(controlRoot, ".env"));
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
