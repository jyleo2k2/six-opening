import { config } from "dotenv";
import { resolve } from "node:path";
import OpenAI from "openai";

let environmentLoaded = false;

function loadDevelopmentEnvironment() {
  if (environmentLoaded) return;
  environmentLoaded = true;

  config({ path: resolve(process.cwd(), "..", ".env"), quiet: true });
}

function getOpenAiEnvironment() {
  loadDevelopmentEnvironment();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MODEL;
  if (!model) {
    throw new Error("OPENAI_MODEL is not configured");
  }

  return { apiKey, model };
}

export function getOpenAiClient() {
  return new OpenAI({ apiKey: getOpenAiEnvironment().apiKey });
}

export function getOpenAiModel() {
  return getOpenAiEnvironment().model;
}
