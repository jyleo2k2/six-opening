import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { writeKiwoomLineChart } from "./kiwoom-line-chart.mjs";

const CONFIG_PATH = fileURLToPath(new URL("./.env.kiwoom.local", import.meta.url));

try {
  loadEnvFile(CONFIG_PATH);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error(`설정 파일이 없습니다: ${CONFIG_PATH}`);
    console.error(".env.kiwoom.example을 참고해 .env.kiwoom.local을 만들어주세요.");
    process.exit(2);
  }
  throw error;
}

const APP_KEY = process.env.KIWOOM_APP_KEY;
const SECRET_KEY = process.env.KIWOOM_SECRET_KEY;
const STOCK_CODES = (process.env.KIWOOM_STOCK_CODES || "005930")
  .split(",")
  .map((code) => code.trim())
  .filter(Boolean);
const WS_SECONDS = Number(process.env.KIWOOM_WS_SECONDS || "20");
const KIWOOM_ENV = (process.env.KIWOOM_ENV || "real").trim().toLowerCase();

const ENVIRONMENTS = {
  real: {
    label: "실전투자",
    restUrl: "https://api.kiwoom.com",
    wsUrl: "wss://api.kiwoom.com:10000/api/dostk/websocket",
  },
  mock: {
    label: "모의투자",
    restUrl: "https://mockapi.kiwoom.com",
    wsUrl: "wss://mockapi.kiwoom.com:10000/api/dostk/websocket",
  },
};

const environment = ENVIRONMENTS[KIWOOM_ENV];

if (!environment) {
  console.error("KIWOOM_ENV는 real 또는 mock이어야 합니다.");
  process.exit(2);
}

const REST_URL = environment.restUrl;
const WS_URL = environment.wsUrl;

if (!APP_KEY || !SECRET_KEY) {
  console.error("KIWOOM_APP_KEY와 KIWOOM_SECRET_KEY 환경변수가 필요합니다.");
  process.exit(2);
}

function todayInSeoul() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}`;
}

function findFirstArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return null;

  for (const child of Object.values(value)) {
    const found = findFirstArray(child);
    if (found) return found;
  }

  return null;
}

function summarize(label, data) {
  const array = findFirstArray(data);
  console.log(`\n[성공] ${label}`);
  console.log(`- return_code: ${data.return_code ?? "없음"}`);
  console.log(`- 최상위 필드: ${Object.keys(data).join(", ")}`);

  if (array) {
    console.log(`- 첫 번째 배열 길이: ${array.length}`);
    console.log(`- 첫 데이터: ${JSON.stringify(array[0] ?? null)}`);
  }
}

async function postJson(url, { headers = {}, body }) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      ...headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  const raw = await response.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`JSON이 아닌 응답입니다. HTTP ${response.status}: ${raw.slice(0, 300)}`);
  }

  if (!response.ok || (data.return_code != null && Number(data.return_code) !== 0)) {
    throw new Error(
      `HTTP ${response.status}, return_code=${data.return_code}, message=${data.return_msg || "없음"}`,
    );
  }

  return data;
}

async function issueToken() {
  return postJson(`${REST_URL}/oauth2/token`, {
    body: {
      grant_type: "client_credentials",
      appkey: APP_KEY,
      secretkey: SECRET_KEY,
    },
  });
}

async function callKiwoom(token, apiId, path, body) {
  return postJson(`${REST_URL}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      "api-id": apiId,
    },
    body,
  });
}

async function checkRestApis(token) {
  const stockCode = STOCK_CODES[0];

  const basicInfo = await callKiwoom(token, "ka10001", "/api/dostk/stkinfo", {
    stk_cd: stockCode,
  });
  summarize(`종목 기본정보·현재가 ka10001 (${stockCode})`, basicInfo);

  const minuteChart = await callKiwoom(token, "ka10080", "/api/dostk/chart", {
    stk_cd: stockCode,
    tic_scope: "1",
    upd_stkpc_tp: "1",
  });
  summarize(`1분봉 차트 ka10080 (${stockCode})`, minuteChart);

  const dailyChart = await callKiwoom(token, "ka10081", "/api/dostk/chart", {
    stk_cd: stockCode,
    base_dt: todayInSeoul(),
    upd_stkpc_tp: "1",
  });
  summarize(`일봉 차트 ka10081 (${stockCode})`, dailyChart);

  const chartPath = await writeKiwoomLineChart({
    stockCode,
    minuteResponse: minuteChart,
    dailyResponse: dailyChart,
  });
  console.log(`\n[생성] 선 차트 HTML: ${chartPath}`);
}

async function checkRealtime(token) {
  console.log(`\n[대기] 실시간 주식체결 0B: ${STOCK_CODES.join(", ")}`);
  console.log(`- 최대 ${WS_SECONDS}초 동안 메시지를 기다립니다.`);

  await new Promise((resolve, reject) => {
    const socket = new WebSocket(WS_URL);
    let realtimeCount = 0;
    let registered = false;

    const timer = setTimeout(() => {
      socket.close();
      if (realtimeCount === 0) {
        console.log("[주의] 실시간 체결 메시지가 없었습니다. 장중에 다시 확인하세요.");
      } else {
        console.log(`[성공] 실시간 메시지 ${realtimeCount}건을 받았습니다.`);
      }
      resolve();
    }, WS_SECONDS * 1_000);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ trnm: "LOGIN", token }));
    });

    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        console.log(`[수신] ${String(event.data).slice(0, 300)}`);
        return;
      }

      console.log(`[수신] ${JSON.stringify(message).slice(0, 700)}`);

      if (!registered && message.trnm === "LOGIN") {
        if (message.return_code != null && Number(message.return_code) !== 0) {
          clearTimeout(timer);
          socket.close();
          reject(new Error(`웹소켓 로그인 실패: ${message.return_msg || message.return_code}`));
          return;
        }

        registered = true;
        socket.send(
          JSON.stringify({
            trnm: "REG",
            grp_no: "1",
            refresh: "1",
            data: [{ item: STOCK_CODES, type: ["0B"] }],
          }),
        );
        return;
      }

      if (registered && message.trnm !== "LOGIN") {
        realtimeCount += 1;
      }
    });

    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("키움 실시간 WebSocket 연결에 실패했습니다."));
    });
  });
}

async function main() {
  console.log(`[시작] 환경: ${environment.label}, 테스트 종목: ${STOCK_CODES.join(", ")}`);

  const tokenData = await issueToken();
  console.log(`[성공] 접근토큰 발급, 만료일: ${tokenData.expires_dt || "응답에서 확인 불가"}`);

  await checkRestApis(tokenData.token);
  await checkRealtime(tokenData.token);

  console.log("\n[완료] 현재가·분봉·일봉 API 호출 점검을 마쳤습니다.");
}

function formatError(error) {
  const details = [];
  let current = error;

  while (current) {
    const message = current instanceof Error ? current.message : String(current);
    const code = current?.code ? ` (${current.code})` : "";
    details.push(`${message}${code}`);
    current = current?.cause;
  }

  return details.join("\n  원인: ");
}

function connectionHint(error) {
  const codes = new Set();
  let current = error;

  while (current) {
    if (current?.code) codes.add(current.code);
    current = current?.cause;
  }

  if (codes.has("EACCES") || codes.has("EPERM")) {
    return "연결 권한이 차단되었습니다. 일반 PowerShell에서 다시 실행하고, Windows 방화벽/보안 프로그램에서 node.exe의 api.kiwoom.com:443 연결을 허용하세요.";
  }

  if (codes.has("ETIMEDOUT") || codes.has("ENETUNREACH")) {
    return "키움 서버에 연결할 수 없습니다. 인터넷 연결, VPN/프록시 및 방화벽 설정을 확인하세요.";
  }

  if (codes.has("ENOTFOUND")) {
    return "api.kiwoom.com의 주소를 찾지 못했습니다. DNS 및 인터넷 연결을 확인하세요.";
  }

  return null;
}

main().catch((error) => {
  console.error(`\n[실패] ${formatError(error)}`);
  const hint = connectionHint(error);
  if (hint) console.error(`[조치] ${hint}`);
  process.exitCode = 1;
});
