const { resolve } = require("node:path");

require("tsx/cjs");
require(resolve(__dirname, "server-only-cli.cjs"));
require(resolve(__dirname, "run-universe-evaluation.ts"));
