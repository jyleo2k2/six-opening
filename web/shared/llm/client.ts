import { config } from "dotenv";
import OpenAI from "openai";
import { resolve } from "node:path";

export const LLM_MODEL = "gpt-5.6-luna";
export const LLM_REASONING_EFFORT = "low" as const;

let environmentLoaded = false;

function loadDevelopmentEnvironment() {
  if (environmentLoaded) return;
  environmentLoaded = true;

  config({ path: resolve(process.cwd(), "..", ".env"), quiet: true });
}

export function getLlmClient() {
  loadDevelopmentEnvironment();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({ apiKey });
}
