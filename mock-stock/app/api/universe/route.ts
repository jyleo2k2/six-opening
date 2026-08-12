import { readFile } from "fs/promises";
import path from "path";
import { getQuote } from "@/app/api/quote/kiwoom";

// 사장님 HTML은 그대로 두고, 이 엔드포인트가 universe.js를 '실시간 가격이 박힌 채로' 내려준다.
// HTML의 <script src="assets/universe.js"> 를 <script src="/api/universe"> 로만 바꾸면 됨.
// 키움 키가 있으면 실시간가, 없으면 픽스처/더미가 그대로. 초당 1건 제한 때문에 백그라운드로 예열한다.

export const dynamic = "force-dynamic";

let baseText: string | null = null;
let codes: string[] = [];
const warm: Record<string, { price: number; rate: number }> = {};
let polling = false;

async function loadBase(): Promise<string> {
  if (baseText) return baseText;
  const text = await readFile(path.join(process.cwd(), "public", "ui", "assets", "universe.js"), "utf8");
  baseText = text;
  codes = Array.from(text.matchAll(/\['(\d{6})'/g)).map((match) => match[1]);
  return text;
}

function startPolling() {
  if (polling) return;
  polling = true;
  let index = 0;
  const tick = async () => {
    if (codes.length) {
      const code = codes[index % codes.length];
      index += 1;
      try {
        const quote = await getQuote(code);
        warm[code] = { price: quote.price, rate: quote.rate };
      } catch {
        // 미등록/미체결 종목은 base(universe.js)의 값을 그대로 둔다.
      }
    }
    setTimeout(tick, 1100);
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
