const { resolve } = require("node:path");

// 일반 Node CLI에서는 먼저 tsx를 등록하고 server-only marker만 비운 뒤
// 서버 전용 진입점을 불러온다. marker 우회는 이 프로세스 안에서만 적용된다.
require("tsx/cjs");
require(resolve(__dirname, "server-only-cli.cjs"));
require(resolve(__dirname, "run-evaluation.ts"));
