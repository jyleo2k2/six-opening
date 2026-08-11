import { config } from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { resolve } from "node:path";

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

let environmentLoaded = false;

function loadDevelopmentEnvironment() {
  if (environmentLoaded) return;
  environmentLoaded = true;

  config({ path: resolve(process.cwd(), "..", ".env"), quiet: true });
}

export function getGeminiClient() {
  loadDevelopmentEnvironment();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenAI({ apiKey });
}
