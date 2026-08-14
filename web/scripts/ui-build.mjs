// app.html 을 화면별 소스로 나누고 다시 합친다.
//
//   node scripts/ui-build.mjs split    app.html -> ui-src/
//   node scripts/ui-build.mjs build    ui-src/  -> app.html
//   node scripts/ui-build.mjs verify   ui-src/ 로 합친 결과가 app.html 과 바이트 단위로 같은지
//
// 자르고 붙이는 단위는 줄이 아니라 원본 문자열의 구간이다. 개행 문자를 다시 만들지
// 않으므로 CRLF 파일이 LF 로 바뀌는 사고가 나지 않는다.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_HTML = join(webRoot, "public", "ui", "app.html");
const UI_SRC = join(webRoot, "ui-src");
const MANIFEST = join(UI_SRC, "manifest.json");

// 원본을 줄 시작 위치 배열로 바꾼다. lineStart[i] 는 i 번째 줄이 시작하는 문자 위치다.
function indexLines(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  if (starts[starts.length - 1] === text.length) starts.pop();
  return starts;
}

function lineAt(text, starts, i) {
  const from = starts[i];
  const to = i + 1 < starts.length ? starts[i + 1] : text.length;
  return text.slice(from, to).replace(/\r?\n$/, "");
}

// [fromLine, toLine) 구간의 원본 문자열을 그대로 떼어 낸다.
function sliceLines(text, starts, fromLine, toLine) {
  const from = starts[fromLine];
  const to = toLine < starts.length ? starts[toLine] : text.length;
  return text.slice(from, to);
}

const SCRIPT_OPEN = /^<script type="text\/x-dc"/;
const SCRIPT_CLOSE = /^<\/script>\s*$/;
// 깊이는 모든 sc-if 를 센다. 화면 이름은 `{{ isHome }}` 꼴일 때만 뽑는다.
// (`{{ c.noLogo }}` 처럼 점이 들어간 조건도 있어서 이름 규칙으로 깊이를 세면 안 된다.)
const SC_IF_ANY = /^<sc-if\b/;
const SC_IF_SCREEN = /^<sc-if value="\{\{ (is\w+) \}\}"/;
const SC_IF_CLOSE = /^<\/sc-if>\s*$/;
const CLASS_OPEN = /^class Component extends DCLogic \{/;
const METHOD = /^ {2}([A-Za-z_$][\w$]*)\s*\(/;

// isHome -> home, isBuy2 -> buy2
function screenName(flag) {
  return flag.replace(/^is/, "").replace(/^[A-Z]/, (c) => c.toLowerCase());
}

// 템플릿 영역에서 깊이 0 인 sc-if 블록만 화면으로 본다. 중첩된 sc-if 는 부모 안에 남는다.
function findScreens(text, starts, fromLine, toLine) {
  const screens = [];
  let depth = 0;
  let open = null;
  for (let i = fromLine; i < toLine; i += 1) {
    const line = lineAt(text, starts, i);
    if (SC_IF_ANY.test(line)) {
      if (depth === 0) {
        const named = SC_IF_SCREEN.exec(line);
        open = { name: named ? screenName(named[1]) : "block", fromLine: i };
      }
      depth += 1;
      continue;
    }
    if (SC_IF_CLOSE.test(line)) {
      depth -= 1;
      if (depth === 0 && open) {
        screens.push({ ...open, toLine: i + 1 });
        open = null;
      }
    }
  }
  if (depth !== 0) throw new Error(`sc-if 짝이 맞지 않는다 (depth=${depth})`);
  return screens;
}

// 클래스 본문을 메서드 단위로 나눈다. 각 조각은 메서드 시작 줄부터 다음 메서드 직전까지다.
function findMethods(text, starts, fromLine, toLine) {
  const heads = [];
  for (let i = fromLine; i < toLine; i += 1) {
    const m = METHOD.exec(lineAt(text, starts, i));
    if (m) heads.push({ name: m[1], fromLine: i });
  }
  return heads.map((head, idx) => ({
    ...head,
    toLine: idx + 1 < heads.length ? heads[idx + 1].fromLine : toLine,
  }));
}

function uniqueName(used, base) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  used.add(`${base}-${n}`);
  return `${base}-${n}`;
}

function plan(text) {
  const starts = indexLines(text);
  const total = starts.length;

  let scriptOpenLine = -1;
  let scriptCloseLine = -1;
  for (let i = 0; i < total; i += 1) {
    const line = lineAt(text, starts, i);
    if (scriptOpenLine === -1 && SCRIPT_OPEN.test(line)) scriptOpenLine = i;
    else if (scriptOpenLine !== -1 && SCRIPT_CLOSE.test(line)) scriptCloseLine = i;
  }
  if (scriptOpenLine === -1 || scriptCloseLine === -1) {
    throw new Error("text/x-dc 스크립트 블록을 찾지 못했다");
  }

  const parts = [];
  const used = new Set();
  const push = (name, dir, fromLine, toLine) => {
    if (toLine <= fromLine) return;
    parts.push({ name, dir, fromLine, toLine });
  };

  // 템플릿 영역: 화면 블록과 그 사이 껍데기를 순서대로 담는다.
  const screens = findScreens(text, starts, 0, scriptOpenLine);
  let cursor = 0;
  for (const screen of screens) {
    push(uniqueName(used, `shell-${parts.length}`), "template", cursor, screen.fromLine);
    push(uniqueName(used, screen.name), "screens", screen.fromLine, screen.toLine);
    cursor = screen.toLine;
  }
  push(uniqueName(used, `shell-${parts.length}`), "template", cursor, scriptOpenLine);

  // 로직 영역: 스크립트 여는 태그, 상수, 클래스 여는 줄, 메서드들, 클래스 닫는 줄.
  push(uniqueName(used, "script-open"), "template", scriptOpenLine, scriptOpenLine + 1);

  let classOpenLine = -1;
  for (let i = scriptOpenLine + 1; i < scriptCloseLine; i += 1) {
    if (CLASS_OPEN.test(lineAt(text, starts, i))) {
      classOpenLine = i;
      break;
    }
  }
  if (classOpenLine === -1) throw new Error("class Component 선언을 찾지 못했다");

  push(uniqueName(used, "constants"), "logic", scriptOpenLine + 1, classOpenLine);
  push(uniqueName(used, "class-open"), "logic", classOpenLine, classOpenLine + 1);

  const methods = findMethods(text, starts, classOpenLine + 1, scriptCloseLine);
  let bodyCursor = classOpenLine + 1;
  for (const method of methods) {
    push(uniqueName(used, `gap-${parts.length}`), "logic", bodyCursor, method.fromLine);
    push(uniqueName(used, method.name), "methods", method.fromLine, method.toLine);
    bodyCursor = method.toLine;
  }
  push(uniqueName(used, "class-close"), "logic", bodyCursor, scriptCloseLine);

  // 꼬리: </script> 부터 문서 끝까지.
  push(uniqueName(used, "doc-tail"), "template", scriptCloseLine, total);

  return parts.map((part) => ({
    file: `${part.dir}/${part.name}.${part.dir === "logic" || part.dir === "methods" ? "js" : "html"}`,
    text: sliceLines(text, starts, part.fromLine, part.toLine),
  }));
}

function readApp() {
  return readFileSync(APP_HTML, "utf8");
}

function assemble() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  return manifest.files.map((file) => readFileSync(join(UI_SRC, file), "utf8")).join("");
}

const command = process.argv[2];

if (command === "split") {
  const parts = plan(readApp());
  rmSync(UI_SRC, { recursive: true, force: true });
  for (const part of parts) {
    const target = join(UI_SRC, part.file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, part.text);
  }
  writeFileSync(
    MANIFEST,
    `${JSON.stringify({ source: "public/ui/app.html", files: parts.map((p) => p.file) }, null, 2)}\n`,
  );
  const screens = parts.filter((p) => p.file.startsWith("screens/")).length;
  const methods = parts.filter((p) => p.file.startsWith("methods/")).length;
  console.log(`split: 조각 ${parts.length}개 (화면 ${screens} · 메서드 ${methods}) -> web/ui-src/`);
} else if (command === "build") {
  writeFileSync(APP_HTML, assemble());
  console.log("build: web/public/ui/app.html 을 다시 만들었다");
} else if (command === "verify") {
  const built = Buffer.from(assemble(), "utf8");
  const current = readFileSync(APP_HTML);
  if (built.equals(current)) {
    console.log(`verify: 바이트 동일 (${current.length} bytes)`);
  } else {
    let at = 0;
    while (at < built.length && at < current.length && built[at] === current[at]) at += 1;
    console.error(
      `verify: 다르다. 원본 ${current.length} bytes / 조립 ${built.length} bytes, 첫 차이 ${at}번째 바이트`,
    );
    process.exit(1);
  }
} else {
  console.error("사용법: node scripts/ui-build.mjs <split|build|verify>");
  process.exit(1);
}
