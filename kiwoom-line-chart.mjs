import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT_PATH = fileURLToPath(
  new URL("./kiwoom-line-chart.html", import.meta.url),
);

function findFirstArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return null;

  for (const child of Object.values(value)) {
    const found = findFirstArray(child);
    if (found) return found;
  }

  return null;
}

function findChartRows(response, preferredKeys) {
  for (const key of preferredKeys) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return findFirstArray(response) || [];
}

function parsePrice(value) {
  const parsed = Number(String(value ?? "").replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

function extractPoints(response, type) {
  const minuteKeys = ["stk_min_pole_chart_qry", "stk_min_chart", "output"];
  const dailyKeys = ["stk_dt_pole_chart_qry", "stk_day_chart", "output"];
  const rows = findChartRows(response, type === "minute" ? minuteKeys : dailyKeys);

  return rows
    .map((row) => {
      const time = String(
        type === "minute"
          ? row.cntr_tm ?? row.stck_cntg_hour ?? row.time ?? row.dt ?? ""
          : row.dt ?? row.stck_bsop_date ?? row.date ?? "",
      ).replace(/\D/g, "");
      const price = parsePrice(row.cur_prc ?? row.stck_prpr ?? row.close_pric ?? row.close);
      return { time, price };
    })
    .filter((point) => point.time && point.price != null)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function safeJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

export function buildLineChartHtml({ stockCode, minuteResponse, dailyResponse }) {
  const minute = extractPoints(minuteResponse, "minute");
  const daily = extractPoints(dailyResponse, "daily");

  if (minute.length === 0 || daily.length === 0) {
    throw new Error(
      `차트 데이터 변환 실패: 분봉 ${minute.length}건, 일봉 ${daily.length}건`,
    );
  }

  const payload = safeJson({
    stockCode,
    generatedAt: new Date().toISOString(),
    minute,
    daily,
  });

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${stockCode} 분봉·일봉 선 차트</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    body { margin: 0; padding: 24px; background: #f4f6f8; color: #17212b; }
    main { max-width: 1120px; margin: 0 auto; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    h1 { margin: 0; font-size: clamp(22px, 4vw, 34px); font-weight: 700; }
    .meta { margin: 7px 0 0; color: #667085; }
    .tabs { display: flex; gap: 8px; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 16px; background: #fff; color: #344054; cursor: pointer; font: inherit; }
    button[aria-pressed="true"] { background: #175cd3; border-color: #175cd3; color: #fff; }
    .chart-wrap { position: relative; margin-top: 18px; padding: 12px; border: 1px solid #d0d5dd; border-radius: 12px; background: #fff; box-shadow: 0 4px 20px rgb(16 24 40 / 8%); }
    svg { display: block; width: 100%; min-height: 360px; overflow: visible; }
    .frame { fill: none; stroke: #d0d5dd; }
    .grid { stroke: #eaecf0; stroke-width: 1; }
    .line { fill: none; stroke: #175cd3; stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; }
    .axis-label { fill: #667085; font-size: 13px; }
    .guide { stroke: #98a2b3; stroke-width: 1; stroke-dasharray: 4 4; pointer-events: none; }
    .marker { fill: #fff; stroke: #175cd3; stroke-width: 3; pointer-events: none; }
    .hit { fill: transparent; cursor: crosshair; }
    .tooltip { position: absolute; display: none; pointer-events: none; padding: 8px 10px; border-radius: 7px; background: #101828; color: #fff; font-size: 13px; line-height: 1.45; transform: translate(10px, -105%); white-space: nowrap; }
    .summary { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 12px; color: #475467; }
    .summary strong { color: #17212b; }
    @media (prefers-color-scheme: dark) {
      body { background: #101318; color: #f2f4f7; }
      .meta, .summary { color: #98a2b3; }
      .summary strong { color: #f2f4f7; }
      button { background: #1d2939; border-color: #475467; color: #e4e7ec; }
      button[aria-pressed="true"] { background: #528bff; border-color: #528bff; color: #081120; }
      .chart-wrap { background: #18212f; border-color: #344054; box-shadow: none; }
      .frame { stroke: #475467; }
      .grid { stroke: #344054; }
      .line { stroke: #84adff; }
      .axis-label { fill: #98a2b3; }
      .marker { fill: #18212f; stroke: #84adff; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1><span id="stock-code"></span> 가격 선 차트</h1>
        <p class="meta" id="period-label"></p>
      </div>
      <div class="tabs" aria-label="차트 기간">
        <button type="button" data-period="minute" aria-pressed="true">1분봉</button>
        <button type="button" data-period="daily" aria-pressed="false">일봉</button>
      </div>
    </header>
    <div class="chart-wrap" id="chart-wrap">
      <svg id="chart" role="img" aria-label="주가 선 차트"></svg>
      <div class="tooltip" id="tooltip" role="tooltip"></div>
    </div>
    <div class="summary" id="summary"></div>
  </main>
  <script>
    const payload = ${payload};
    const svg = document.getElementById("chart");
    const wrap = document.getElementById("chart-wrap");
    const tooltip = document.getElementById("tooltip");
    const summary = document.getElementById("summary");
    const periodLabel = document.getElementById("period-label");
    document.getElementById("stock-code").textContent = payload.stockCode;
    let period = "minute";

    const won = new Intl.NumberFormat("ko-KR");
    function labelTime(raw, kind) {
      if (kind === "daily" && raw.length >= 8) return raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8);
      if (raw.length >= 12) return raw.slice(4, 6) + "-" + raw.slice(6, 8) + " " + raw.slice(8, 10) + ":" + raw.slice(10, 12);
      return raw;
    }

    function node(name, attrs = {}) {
      const item = document.createElementNS("http://www.w3.org/2000/svg", name);
      for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
      return item;
    }

    function render() {
      const data = payload[period];
      const width = Math.max(320, wrap.clientWidth - 24);
      const height = Math.max(360, Math.min(560, width * 0.54));
      const margin = { top: 24, right: 24, bottom: 54, left: 76 };
      const plotWidth = width - margin.left - margin.right;
      const plotHeight = height - margin.top - margin.bottom;
      const prices = data.map((item) => item.price);
      let min = Math.min(...prices);
      let max = Math.max(...prices);
      const padding = Math.max((max - min) * 0.08, max * 0.005, 1);
      min -= padding;
      max += padding;
      const x = (index) => margin.left + (data.length === 1 ? plotWidth / 2 : index * plotWidth / (data.length - 1));
      const y = (price) => margin.top + (max - price) * plotHeight / (max - min);

      svg.replaceChildren();
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      const title = node("title");
      title.textContent = payload.stockCode + " " + (period === "minute" ? "1분봉" : "일봉") + " 종가 선 차트";
      svg.append(title);

      for (let i = 0; i <= 5; i += 1) {
        const gridY = margin.top + i * plotHeight / 5;
        svg.append(node("line", { x1: margin.left, x2: width - margin.right, y1: gridY, y2: gridY, class: "grid" }));
        const tick = node("text", { x: margin.left - 10, y: gridY + 4, "text-anchor": "end", class: "axis-label" });
        tick.textContent = won.format(Math.round(max - i * (max - min) / 5));
        svg.append(tick);
      }

      const tickIndexes = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];
      for (const index of tickIndexes) {
        const tick = node("text", { x: x(index), y: height - 20, "text-anchor": index === 0 ? "start" : index === data.length - 1 ? "end" : "middle", class: "axis-label" });
        tick.textContent = labelTime(data[index].time, period);
        svg.append(tick);
      }

      svg.append(node("rect", { x: margin.left, y: margin.top, width: plotWidth, height: plotHeight, class: "frame" }));
      const points = data.map((item, index) => x(index) + "," + y(item.price)).join(" ");
      svg.append(node("polyline", { points, class: "line" }));

      const guide = node("line", { y1: margin.top, y2: height - margin.bottom, class: "guide", visibility: "hidden" });
      const marker = node("circle", { r: 5, class: "marker", visibility: "hidden" });
      svg.append(guide, marker);

      const hit = node("rect", { x: margin.left, y: margin.top, width: plotWidth, height: plotHeight, class: "hit" });
      hit.addEventListener("pointermove", (event) => {
        const rect = svg.getBoundingClientRect();
        const cursorX = (event.clientX - rect.left) * width / rect.width;
        const index = Math.max(0, Math.min(data.length - 1, Math.round((cursorX - margin.left) * (data.length - 1) / plotWidth)));
        const pointX = x(index);
        const pointY = y(data[index].price);
        guide.setAttribute("x1", pointX);
        guide.setAttribute("x2", pointX);
        guide.setAttribute("visibility", "visible");
        marker.setAttribute("cx", pointX);
        marker.setAttribute("cy", pointY);
        marker.setAttribute("visibility", "visible");
        tooltip.style.display = "block";
        tooltip.style.left = (pointX * rect.width / width) + "px";
        tooltip.style.top = (pointY * rect.height / height) + "px";
        tooltip.textContent = labelTime(data[index].time, period) + " · " + won.format(data[index].price) + "원";
      });
      hit.addEventListener("pointerleave", () => {
        guide.setAttribute("visibility", "hidden");
        marker.setAttribute("visibility", "hidden");
        tooltip.style.display = "none";
      });
      svg.append(hit);

      const latest = data[data.length - 1];
      const dataMin = Math.min(...prices);
      const dataMax = Math.max(...prices);
      periodLabel.textContent = (period === "minute" ? "1분봉" : "일봉") + " · " + data.length.toLocaleString("ko-KR") + "개 데이터";
      summary.innerHTML = "<span>최근 <strong>" + won.format(latest.price) + "원</strong></span><span>최고 <strong>" + won.format(dataMax) + "원</strong></span><span>최저 <strong>" + won.format(dataMin) + "원</strong></span>";
    }

    document.querySelectorAll("button[data-period]").forEach((button) => {
      button.addEventListener("click", () => {
        period = button.dataset.period;
        document.querySelectorAll("button[data-period]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        render();
      });
    });

    new ResizeObserver(render).observe(wrap);
    render();
  </script>
</body>
</html>`;
}

export async function writeKiwoomLineChart({
  stockCode,
  minuteResponse,
  dailyResponse,
  outputPath = DEFAULT_OUTPUT_PATH,
}) {
  const html = buildLineChartHtml({ stockCode, minuteResponse, dailyResponse });
  await writeFile(outputPath, html, "utf8");
  return outputPath;
}
