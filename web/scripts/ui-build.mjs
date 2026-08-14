// app.html 을 화면별 소스로 나누고, 다시 합치고, 혼자 열리는 HTML 로 내보낸다.
//
//   node scripts/ui-build.mjs split             app.html -> ui-src/
//   node scripts/ui-build.mjs build             ui-src/  -> app.html
//   node scripts/ui-build.mjs verify            ui-src/ 로 합친 결과가 app.html 과 바이트 단위로 같은지
//   node scripts/ui-build.mjs export            ui-dist/app.standalone.html (전 화면)
//   node scripts/ui-build.mjs export --screen=archive   ui-dist/archive.standalone.html (한 화면)
//
// 자르고 붙이는 단위는 줄이 아니라 원본 문자열의 구간이다. 개행 문자를 다시 만들지
// 않으므로 CRLF 파일이 LF 로 바뀌는 사고가 나지 않는다.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_HTML = join(webRoot, "public", "ui", "app.html");
const UI_ROOT = join(webRoot, "public", "ui");
const UI_SRC = join(webRoot, "ui-src");
const UI_DIST = join(webRoot, "ui-dist");
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

function findLine(text, starts, fromLine, toLine, re) {
  for (let i = fromLine; i < toLine; i += 1) {
    if (re.test(lineAt(text, starts, i))) return i;
  }
  return -1;
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
    // renderVals 는 963줄이라 한 조각으로 두면 아무도 못 연다. 값을 계산하는 앞부분과
    // 화면에 넘길 객체를 만드는 뒷부분 사이에만 자른다. 그 경계는 들여쓰기 4의 `return {`
    // 한 줄뿐이라 안전하고, 화면별로 더 쪼개지는 않는다 (§ 아래 주석 참고).
    const cut =
      method.name === "renderVals"
        ? findLine(text, starts, method.fromLine, method.toLine, /^ {4}return \{/)
        : -1;
    if (cut > method.fromLine) {
      push(uniqueName(used, "renderVals-compute"), "methods", method.fromLine, cut);
      push(uniqueName(used, "renderVals-return"), "methods", cut, method.toLine);
    } else {
      push(uniqueName(used, method.name), "methods", method.fromLine, method.toLine);
    }
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

function assemble(keep = () => true) {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  return manifest.files
    .filter(keep)
    .map((file) => readFileSync(join(UI_SRC, file), "utf8"))
    .join("");
}

// ── 내보내기 ────────────────────────────────────────────────────────────
// 디자이너에게 넘길 파일은 서버 없이 혼자 열려야 한다. 서버가 주던 것(런타임 스크립트,
// 종목 데이터, 폰트, 이미지, API 응답)을 전부 파일 안에 넣거나 CDN 으로 돌린다.

const PRETENDARD_CDN =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css";
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };
const INLINE_LIMIT = 400 * 1024;

// 화면 하나만 담은 스냅샷이 서버 없이도 그럴듯하게 보이도록 하는 최소 응답이다.
// 나머지 API 는 일부러 실패시켜 앱이 가진 폴백 경로를 그대로 태운다.
const PROFILE_FIXTURE = {
  snapshot: {
    userId: "export",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-14",
    sampleSize: 5,
    abilities: { evidence: 7, intuition: 3, focus: 8, diversification: 2, accuracy: 60 },
    character: "sniper",
    level: 2,
    gradedTradeCount: 5,
    pendingTradeCount: 0,
    reasonDistribution: { buy_news: 2, buy_chart: 2, buy_familiar: 1 },
    actionAlignment: 0.5,
    observationState: "ready",
  },
  narration: { text: "이번 시즌에는 뉴스와 그래프를 보고 고른 날이 많았어요." },
};

const FETCH_STUB = `<script>
// 내보내기 전용: 서버가 없으므로 /api 호출을 가로챈다.
(() => {
  const profile = ${JSON.stringify(PROFILE_FIXTURE)};
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = String(typeof input === "string" ? input : input.url || "");
    if (!url.includes("/api/")) return real(input, init);
    if (url.includes("/api/profile")) {
      return Promise.resolve(new Response(JSON.stringify(profile), {
        status: 200, headers: { "content-type": "application/json" },
      }));
    }
    return Promise.resolve(new Response("{}", { status: 503 }));
  };
})();
</script>
`;

function inlineAsset(rel) {
  const file = join(UI_ROOT, rel);
  if (!existsSync(file)) return null;
  if (rel.startsWith("assets/logos/")) return null; // 51개 4.7MB — 카드에 noLogo 폴백이 있다
  const ext = extname(rel).toLowerCase();
  if (!MIME[ext]) return null;
  if (statSync(file).size > INLINE_LIMIT) return null;
  return `data:${MIME[ext]};base64,${readFileSync(file).toString("base64")}`;
}

function exportHtml(screen) {
  const keep = screen
    ? (file) => !file.startsWith("screens/") || file === `screens/${screen}.html`
    : undefined;
  let html = assemble(keep);
  const notes = [];

  // 1. dc 런타임을 파일 안으로
  const support = readFileSync(join(UI_ROOT, "support.js"), "utf8");
  html = html.replace('<script src="./support.js"></script>', `<script>\n${support}\n</script>`);

  // 2. 서버가 만들어 주던 종목 데이터를 정적 스냅샷으로
  const universe = readFileSync(join(UI_ROOT, "assets", "universe.js"), "utf8");
  html = html.replace('<script src="/api/universe"></script>', `<script>\n${universe}\n</script>`);

  // 3. 폰트 9MB 를 base64 로 박으면 파일이 못 쓰게 커진다. CDN 으로 돌린다.
  const before = html.length;
  html = html.replace(/@font-face\{font-family:'Pretendard';src:url\('assets\/fonts\/[^\n]*\n/g, "");
  if (html.length < before) html = html.replace("<style>", `<style>\n@import url("${PRETENDARD_CDN}");`);

  // 4. 남은 이미지만 파일 안으로. 로고와 큰 파일은 건너뛴다.
  const skipped = new Set();
  html = html.replace(/(["'(])assets\/([\w./-]+)/g, (whole, quote, rel) => {
    const data = inlineAsset(`assets/${rel}`);
    if (data) return `${quote}${data}`;
    skipped.add(`assets/${rel}`);
    return whole;
  });
  if (skipped.size) notes.push(`인라인 제외 ${skipped.size}개 (로고·초과 용량)`);

  // 5. API 스텁
  html = html.replace("</head>", `${FETCH_STUB}</head>`);

  // 6. 차트는 Next 라우트라 단독 파일에서 못 연다
  const chartCall = "'/tradingview-chart?symbol=' + encodeURIComponent(st.code)";
  if (html.includes(chartCall)) html = html.replace(chartCall, "'about:blank'");
  else notes.push("차트 URL 패턴을 못 찾아 그대로 뒀다");

  // 7. 한 화면만 뽑을 때는 그 화면으로 바로 들어가게 한다
  if (screen) {
    const from = "screen: 'home'";
    if (html.includes(from)) html = html.replace(from, `screen: '${screen}'`);
    else notes.push("첫 화면 상태를 못 바꿨다");
  }

  return { html, notes };
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
} else if (command === "export") {
  const arg = process.argv.find((a) => a.startsWith("--screen="));
  const screen = arg ? arg.slice("--screen=".length) : null;
  if (screen) {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    const names = manifest.files
      .filter((f) => f.startsWith("screens/"))
      .map((f) => f.slice("screens/".length, -".html".length));
    if (!names.includes(screen)) {
      console.error(`--screen=${screen} 은(는) 없다. 있는 화면: ${names.join(", ")}`);
      process.exit(1);
    }
  }
  const { html, notes } = exportHtml(screen);
  mkdirSync(UI_DIST, { recursive: true });
  const name = screen ? `${screen}.standalone.html` : "app.standalone.html";
  writeFileSync(join(UI_DIST, name), html);
  console.log(`export: ui-dist/${name} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
  for (const note of notes) console.log(`  · ${note}`);
} else {
  console.error("사용법: node scripts/ui-build.mjs <split|build|verify|export [--screen=이름]>");
  process.exit(1);
}
