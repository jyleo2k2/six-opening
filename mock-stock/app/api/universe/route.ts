import { readFile } from "fs/promises";
import path from "path";
import { getQuote, getChart } from "@/app/api/quote/kiwoom";

// 사장님 HTML은 그대로 두고, 이 엔드포인트가 universe.js를 '실시간 값이 박힌 채로' 내려준다.
// HTML의 <script src="assets/universe.js"> 를 <script src="/api/universe"> 로만 바꾸면 됨.
// 키움 키가 있으면 실시간, 없으면 픽스처/더미가 그대로. 초당 1건 제한 때문에 백그라운드로 예열한다.

export const dynamic = "force-dynamic";

let codes: string[] = [];
const warm: Record<string, { price: number; rate: number }> = {};
const sparks: Record<string, number[]> = {};
let polling = false;

// 매 요청 읽는다. universe.js를 고쳤을 때 서버를 재시작해야 하는 함정을 없앤다(30KB, 비용 무시 가능).
async function loadBase(): Promise<string> {
  const text = await readFile(path.join(process.cwd(), "public", "ui", "assets", "universe.js"), "utf8");
  codes = Array.from(text.matchAll(/\['(\d{6})'/g)).map((match) => match[1]);
  return text;
}

// 카드 스파크라인은 0~100 눈금을 쓴다. 실제 종가 흐름을 그 눈금에 맞춘다.
function toSpark(prices: number[]): number[] {
  const points = prices.slice(-16);
  if (points.length < 2) return [];
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min;
  // 변동이 거의 없으면 가운데 평평한 선으로 둔다(억지로 확대하지 않는다).
  if (span <= 0) return points.map(() => 50);
  return points.map((p) => Math.round((6 + ((p - min) / span) * 88) * 10) / 10);
}

// 키움은 연속 호출에 민감하다. 실측상 1.1초 간격이면 실패가 잦고 2.6초면 안정적이다.
const POLL_INTERVAL_MS = 2600;

function startPolling() {
  if (polling) return;
  polling = true;
  let qi = 0, ci = 0, loop = 0;
  const retry: string[] = [];
  const tick = async () => {
    // 시세를 한 바퀴 먼저 채우고, 그다음 차트를 채운 뒤, 이후에는 시세만 순환한다.
    let job: "quote" | "chart" = "quote";
    let code = "";
    if (retry.length) code = retry.shift() as string;
    else if (qi < codes.length) code = codes[qi++];
    else if (ci < codes.length) { code = codes[ci++]; job = "chart"; }
    else if (codes.length) code = codes[loop++ % codes.length];

    if (code) {
      try {
        if (job === "chart") {
          const points = await getChart(code, "daily");
          const spark = toSpark(points.map((p) => p.price));
          if (spark.length) sparks[code] = spark;
        } else {
          const quote = await getQuote(code);
          warm[code] = { price: quote.price, rate: quote.rate };
        }
      } catch {
        // 한 바퀴 안에 다시 시도한다. 끝내 못 받으면 base(universe.js) 값이 남는다.
        if (job === "quote" && !retry.includes(code)) retry.push(code);
      }
    }
    setTimeout(tick, POLL_INTERVAL_MS);
  };
  tick();
}

export async function GET() {
  const text = await loadBase();
  startPolling();
  let out = text;
  for (const code of codes) {
    const w = warm[code];
    if (!w) continue;
    const row = new RegExp("(\\['" + code + "',[^\\]]*?,\\s*)[-\\d.]+(\\s*,\\s*)[-\\d.]+(\\s*\\])");
    out = out.replace(row, `$1${Math.round(w.price)}$2${w.rate}$3`);
  }
  // 차트는 universe.js가 함수로 만들어 쓰므로 값을 바꿔치기할 수 없다.
  // IIFE가 끝난 뒤 실제 종가 흐름으로 덮어쓴다.
  if (Object.keys(sparks).length) {
    out += `\n;(function(){var S=${JSON.stringify(sparks)};var u=window.KW_UNIVERSE;if(u&&u.stocks)u.stocks.forEach(function(x){if(S[x.code])x.spark=S[x.code];});})();\n`;
  }
  return new Response(out, {
    headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" },
  });
}
