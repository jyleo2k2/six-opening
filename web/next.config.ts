import type { NextConfig } from "next";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile("../.env.kiwoom.local");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
