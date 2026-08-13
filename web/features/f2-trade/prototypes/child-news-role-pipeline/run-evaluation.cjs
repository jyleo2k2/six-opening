const { resolve } = require("node:path");
const NodeModule = require("node:module");

// Next는 빌드 중 server-only marker를 내부 패키지로 해석한다. 일반 Node CLI도
// 같은 marker만 찾도록 이 프로세스의 모듈 탐색 경로를 좁혀 추가한다.
const nextCompiled = resolve(
  __dirname,
  "../../../../node_modules/next/dist/compiled",
);
process.env.NODE_PATH = [nextCompiled, process.env.NODE_PATH]
  .filter(Boolean)
  .join(require("node:path").delimiter);
NodeModule.Module._initPaths();

import("./run-evaluation.ts").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
