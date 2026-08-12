import { readFile } from "fs/promises";
import path from "path";
import { getQuote } from "@/app/api/quote/kiwoom";

// 사장님 HTML은 그대로 두고, 이 엔드포인트가 universe.js를 '실시간 가격이 박힌 채로' 내려준다.
// HTML의 <script src="assets/universe.js"> 를 <script src="/api/universe"> 로만 바꾸면 됨.
// 키움 키가 있으면 실시간가, 없으면 픽스처/더미가 그대로. 초당 1건 제한 때문에 백그라운드로 예열한다.

export const dynamic = "force-dynamic";

let codes: string[] = [];
const warm: Record<string, { price: number; rate: number }> = {};
let polling = false;

// 매 요청 읽는다. universe.js를 고쳤을 때 서버를 재시작해야 하는 함정을 없앤다(30KB, 비용 무시 가능).
async function loadBase(): Promise<string> {
  const text = await readFile(path.join(process.cwd(), "public", "ui", "assets", "universe.js"), "utf8");
  codes = Array.from(text.matchAll(/\['(\d{6})'/g)).map((match) => match[1]);
  return text;
}

// 키움은 연속 호출에 민감하다. 실측상 1.1초 간격이면 실패가 잦고 2.6초면 안정적이다.
const POLL_INTERVAL_MS = 2600;

function startPolling() {
  if (polling) return;
  polling = true;
  let index = 0;
  const retry: string[] = [];
  const tick = async () => {
    // 실패한 종목을 먼저 처리하고, 없으면 다음 종목으로 넘어간다.
    const code = retry.shift() ?? codes[index++ % codes.length];
    if (code) {
      try {
        const quote = await getQuote(code);
        warm[code] = { price: quote.price, rate: quote.rate };
      } catch {
        // 한 바퀴 안에 다시 시도한다. 끝내 못 받으면 base(universe.js) 값이 남는다.
        if (!retry.includes(code)) retry.push(code);
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
  return new Response(out, {
    headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" },
  });
}
