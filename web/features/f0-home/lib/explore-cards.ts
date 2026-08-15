import type { Universe, UniverseLive } from "./use-universe";

/**
 * 탐색 화면의 게임형 수집 카드 값. `ui-src/methods/renderVals-compute.js` 의
 * 카드 목록 계산과 `renderVals-return-2-explore.js` 의 칩·제목·도트를 그대로 옮겨 왔다.
 *
 * 계산을 화면에서 떼어 두는 이유는 브라우저 없이 확인하기 위해서다 — 정렬·필터가
 * 틀리면 "오늘 많이 오른 순"이 거짓말을 하는데 화면만 봐서는 알기 어렵다.
 */
const UP = "#E8322E";
const DOWN = "#1668DC";

/** 흰색을 `weight` 만큼 섞는다 — 어두운 카드 위 글자용 밝은 톤을 만든다. */
export function mixWhite(hex: string, weight: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(v + (255 - v) * weight),
  );
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

export type ExploreFilter = string; // 'rank' | 'watch' | 유니버스 섹터 id

export type ExploreStockRow = {
  code: string;
  name: string;
  desc: string;
  sector: string;
  price: number;
  change: number;
  spark: number[];
};

/** 검색어가 있으면 섹터·관심 선택보다 검색이 앞선다. 정렬·필터는 `app.html` 과 같다. */
export function exploreList(
  universe: Universe,
  live: Pick<UniverseLive, "quotes" | "sparks">,
  filter: ExploreFilter,
  query: string,
  watchlist: string[],
): ExploreStockRow[] {
  const merged = universe.stocks.map((stock) => ({
    code: stock.code,
    name: stock.name,
    desc: stock.desc,
    sector: stock.sector,
    price: live.quotes[stock.code]?.price ?? stock.price,
    change: live.quotes[stock.code]?.rate ?? stock.change,
    spark: live.sparks[stock.code] ?? stock.spark ?? [],
  }));
  const q = query.trim().toLowerCase();
  if (q) {
    return merged
      .filter((stock) => stock.name.toLowerCase().includes(q))
      .sort((a, b) => b.change - a.change);
  }
  if (filter === "all") return merged;
  if (filter === "rank") return [...merged].sort((a, b) => b.change - a.change);
  if (filter === "watch") return merged.filter((stock) => watchlist.includes(stock.code));
  return merged.filter((stock) => stock.sector === filter);
}

export function sectorChips(universe: Universe, filter: ExploreFilter) {
  return [
    { id: "all", name: "전체", emoji: "" },
    { id: "rank", name: "오늘 많이 오른 순", emoji: "" },
    { id: "watch", name: "관심 기업", emoji: "" },
    ...universe.sectors,
  ].map((sector) => ({
    id: sector.id,
    name: sector.name,
    active: sector.id === filter,
    style:
      "display:flex;align-items:center;gap:6px;flex:none;padding:11px 16px;border-radius:999px;font-size:13.5px;font-weight:" +
      (sector.id === filter ? "700" : "500") +
      ";white-space:nowrap;cursor:pointer;" +
      (sector.id === filter
        ? "color:#fff;background:#F5327F,0 0 16px -4px rgba(245,50,127,0.55),inset 0 1.5px 1px rgba(255,255,255,0.4)"
        : "color:#5C6280;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)"),
  }));
}

/** 칩을 펼친 동안은 칩 줄이 이미 무슨 목록인지 말해주므로 제목을 비운다. */
export function exploreTitle(
  universe: Universe,
  filter: ExploreFilter,
  query: string,
  listLength: number,
  chipsOpen = false,
) {
  const q = query.trim();
  if (chipsOpen) return "";
  if (q) return `"${q}" 검색 결과`;
  if (filter === "all" || filter === "rank") return "";
  if (filter === "watch") return `관심 기업 ${listLength}곳`;
  const sector = universe.sectors.find((entry) => entry.id === filter);
  const count = universe.stocks.filter((stock) => stock.sector === filter).length;
  return `${sector?.name ?? ""} 회사 ${count}곳`;
}

export function emptyState(query: string) {
  return query.trim()
    ? {
        title: "찾는 회사가 없어요",
        hint: '이름 일부만 넣어도 찾아줄게요. 예를 들면 "삼성"',
      }
    : {
        title: "아직 관심 기업이 없어요",
        hint: "회사를 눌러서 들어간 다음, 오른쪽 위 하트를 누르면 여기에 모여요.",
      };
}

/**
 * 종목이 많으면 도트가 화면을 넘친다. 현재 위치 주변만 창처럼 보여주고 양끝은 작게 흘린다.
 * `axis:'y'` 면 카드가 위아래로 넘어가는 세로 레일이라 도트도 세로로 세운다(폭↔높이를 바꾼다).
 */
export function cardDots(total: number, activeIndex: number, axis: "x" | "y" = "x") {
  const MAX = 9;
  const start =
    total <= MAX ? 0 : Math.min(Math.max(0, activeIndex - Math.floor(MAX / 2)), total - MAX);
  const shown = Math.min(MAX, total);
  return Array.from({ length: shown }, (_, k) => {
    const i = start + k;
    const on = i === activeIndex;
    const fadeL = total > MAX && k === 0 && start > 0;
    const fadeR = total > MAX && k === shown - 1 && start + shown < total;
    const main = on ? 18 : fadeL || fadeR ? 4 : 6;
    const cross = on ? 6 : main === 4 ? 4 : 6;
    const [w, h] = axis === "y" ? [cross, main] : [main, cross];
    const transitionProp = axis === "y" ? "height" : "width";
    return (
      `width:${w}px;height:${h}px;border-radius:999px;transition:${transitionProp} .18s ease;background:` +
      (on ? "#FF3D8D" : fadeL || fadeR ? "#E3DFEE" : "#D6D0E5") +
      (on ? ";box-shadow:0 0 9px rgba(255,61,141,0.42)" : "")
    );
  });
}

export type ExploreCard = ReturnType<typeof buildExploreCard>;

/** 카드 한 장의 그리기 값 전부. 스타일 문자열은 `app.html` 과 같은 값이다. */
export function buildExploreCard(
  stock: ExploreStockRow,
  universe: Universe,
  active: boolean,
) {
  const sector = universe.sectors.find((entry) => entry.id === stock.sector) ?? {
    id: "",
    name: "",
    emoji: "",
    accent: "#8E93A8",
  };
  // universe.js 의 로고 경로는 app.html 기준 상대경로다. 부모 문서에서는 /ui/ 를 붙인다.
  const logo = universe.logos?.[stock.code] ? `/ui/${universe.logos[stock.code]}` : "";
  const brand = universe.brands?.[stock.code] ?? {};
  const B = brand.color || sector.accent; // 브랜드 색
  const BL = mixWhite(B, 0.45); // 어두운 배경 위 글자용
  const CL = stock.change >= 0 ? UP : DOWN; // 등락색 (상승 빨강 / 하락 파랑)
  // 후광은 등락색 한 계열로만 간다 — 안쪽은 밝게 타고 바깥은 같은 색의 옅은 톤으로 사라진다
  const CN = mixWhite(CL, 0.3); // 네온 심지
  const CM = mixWhite(CL, 0.42); // 중간 번짐
  const CF = mixWhite(CL, 0.6); // 바깥 안개

  // 차트 — 우하단 넓은 영역. 값과 방향은 실제 시세 그대로.
  const sp = stock.spark;
  const W = 127;
  const H = 104;
  const PL = 5;
  const PR = 15;
  const PY = 12;
  const N = Math.max(2, sp.length);
  const pts = sp.map((v, i) => [PL + i * ((W - PL - PR) / (N - 1)), H - PY - (v / 100) * (H - PY * 2)]);
  const xy = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1));
  const last = pts[pts.length - 1] || [W - PR, H / 2];
  const priceText = stock.price.toLocaleString("ko-KR");
  // 자릿수가 늘어도 차트와 부딪히지 않게 크기만 단계적으로 줄인다
  const priceFont = priceText.length >= 9 ? 24 : priceText.length === 8 ? 26 : priceText.length === 7 ? 28 : 30;

  const BI = mixWhite(B, 0.66); // 설명용 아이스 톤
  const CB = mixWhite(CL, 0.42); // 어두운 글래스 배지 위 등락 글자

  return {
    code: stock.code,
    name: stock.name,
    desc: stock.desc,
    emoji: sector.emoji,
    category: brand.cat || sector.name,
    logo,
    hasLogo: !!logo,
    sparkLine: xy.join(" "),
    sparkArea: "M" + xy.join(" L ") + " L " + (W - PR) + "," + H + " L " + PL + "," + H + " Z",
    endX: last[0].toFixed(1),
    endY: last[1].toFixed(1),
    lineColor: CL,
    gradId: "ar" + stock.code,
    priceText,
    changeText: (stock.change >= 0 ? "▲ " : "▼ ") + Math.abs(stock.change).toFixed(2) + "%",
    brand: B,
    // 카드 바깥 래퍼 — 카드는 손대지 않고 뒤쪽에만 후광 레이어를 깐다
    // scroll-snap-stop:always — 네이티브 플링이 스냅 지점을 건너뛰지 못하게 막는다.
    slideStyle:
      "position:relative;isolation:isolate;flex:none;scroll-snap-align:center;scroll-snap-stop:always;opacity:" +
      (active ? "1" : "0.72") +
      ";transition:opacity 300ms ease",
    // 주 후광 — 등락색 한 계열로만. 바깥으로 갈수록 같은 색의 옅은 톤이 되어 흰 배경에 사라진다.
    auraMain:
      "position:absolute;z-index:-2;left:50%;top:50%;width:162%;height:152%;transform:translate(-50%,-50%);pointer-events:none;filter:blur(46px);opacity:" +
      (active ? "1" : "0") +
      ";transition:opacity 300ms ease;background:radial-gradient(ellipse at center,rgba(" +
      rgbOf(CL) + ",0.30) 0%,rgba(" + rgbOf(CL) + ",0.22) 20%,rgba(" + rgbOf(CM) + ",0.15) 38%,rgba(" +
      rgbOf(CM) + ",0.09) 52%,rgba(" + rgbOf(CF) + ",0.05) 66%,rgba(" + rgbOf(CF) + ",0.02) 78%,rgba(" +
      rgbOf(CF) + ",0) 88%)",
    // 좁은 반사광 — 네온관의 블룸. 가장자리에서 밝게 타고 여러 단계로 번져 흰 배경에 녹아든다.
    auraNeon:
      "position:absolute;z-index:-1;left:-14px;top:-14px;right:-14px;bottom:-14px;border-radius:48px;pointer-events:none;filter:blur(9px);opacity:" +
      (active ? "1" : "0") +
      ";transition:opacity 300ms ease;background:radial-gradient(ellipse at 50% 46%,rgba(" +
      rgbOf(CN) + ",0.34) 0%,rgba(" + rgbOf(CL) + ",0.20) 44%,rgba(" + rgbOf(CL) + ",0.08) 66%,rgba(" +
      rgbOf(CL) + ",0) 82%);box-shadow:0 0 9px rgba(" + rgbOf(CN) + ",0.60),0 0 22px rgba(" +
      rgbOf(CL) + ",0.38),0 0 46px rgba(" + rgbOf(CL) + ",0.22),0 0 84px rgba(" + rgbOf(CL) + ",0.11)",
    // 차트 쪽을 조금 더 밝게 — 빛이 한쪽으로 치우쳐 자연스럽게 보이도록
    auraTrend:
      "position:absolute;z-index:-1;right:-10%;bottom:2%;width:56%;height:46%;pointer-events:none;filter:blur(26px);opacity:" +
      (active ? "1" : "0") +
      ";transition:opacity 300ms ease;background:radial-gradient(ellipse at center,rgba(" +
      rgbOf(CN) + ",0.18) 0%,rgba(" + rgbOf(CL) + ",0.10) 38%,rgba(" + rgbOf(CM) + ",0.04) 60%,rgba(" +
      rgbOf(CM) + ",0) 80%)",

    // 카드 몸체 — 좌상단 브랜드 광원, 중앙은 깊게, 우하단은 검정에 가깝게
    cardStyle:
      "position:relative;overflow:hidden;flex:none;width:310px;height:340px;border-radius:34px;cursor:pointer;scroll-snap-align:center;background:radial-gradient(78% 56% at 17% 3%," +
      B + "5E 0%,rgba(12,18,38,0) 66%),radial-gradient(62% 48% at 97% 97%,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0) 72%),linear-gradient(146deg,#101B39 0%,#0A1024 46%,#05070E 100%);box-shadow:0 26px 50px -20px rgba(52,42,98,0.40),0 0 40px -14px " +
      CL + "B3",
    sheenStyle:
      "position:absolute;left:-20%;top:-20%;right:-20%;bottom:-20%;pointer-events:none;background:linear-gradient(122deg,rgba(255,255,255,0) 34%,rgba(255,255,255,0.075) 50%,rgba(255,255,255,0) 63%)",
    // 격자는 차트 주변에서만 아주 옅게
    gridStyle:
      "position:absolute;left:150px;top:212px;width:140px;height:112px;pointer-events:none;opacity:0.4;background-image:linear-gradient(" +
      B + "26 1px,transparent 1px),linear-gradient(90deg," + B +
      "26 1px,transparent 1px);background-size:22px 22px;-webkit-mask-image:radial-gradient(75% 75% at 60% 60%,#000 0%,rgba(0,0,0,0) 78%);mask-image:radial-gradient(75% 75% at 60% 60%,#000 0%,rgba(0,0,0,0) 78%)",

    // 로고 — 배경판 없이 표면 위에 뜬 오브젝트. 흰 반사광 + 브랜드 림라이트 + 짧고 정교한 그림자.
    artStyle:
      "position:absolute;left:28px;top:26px;width:88px;height:88px;display:flex;align-items:center;justify-content:center;background:" +
      (logo ? "url(" + logo + ") center/contain no-repeat" : "none") +
      ";filter:drop-shadow(0 0 1.5px rgba(255,255,255," + (brand.dark ? "0.85" : "0.55") +
      ")) drop-shadow(0 0 9px " + B + "AA) drop-shadow(0 5px 5px " + B + "59) drop-shadow(0 7px 8px rgba(0,0,0,0.8))",

    catStyle:
      "position:absolute;left:136px;top:60px;font-size:11.5px;font-weight:800;letter-spacing:0.3em;color:" +
      BL + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 10px " + B,
    catBarStyle: "position:absolute;left:136px;top:84px;pointer-events:none",
    nameStyle:
      "position:absolute;left:28px;top:134px;right:28px;font-size:30px;font-weight:800;color:#F4F7FF;letter-spacing:-0.035em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 10px rgba(0,0,0,0.6),0 0 14px " +
      B + "33",
    descStyle:
      "position:absolute;left:28px;top:188px;right:28px;font-size:14px;font-weight:600;color:" +
      BI + ";line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
    priceStyle:
      "position:absolute;left:28px;top:" + (270 - priceFont) + "px;font-size:" + priceFont +
      "px;font-weight:800;color:#FFFFFF;font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:-0.035em;line-height:1;text-shadow:0 3px 14px rgba(0,0,0,0.75)",
    // 등락 배지 — 어두운 반투명 글래스 캡슐. 버튼이 아니라 능력치 표시.
    changeStyle:
      "position:absolute;left:28px;top:284px;display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 16px;border-radius:999px;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:" +
      CB + ";background:linear-gradient(180deg,rgba(255,255,255,0.10) 0%,rgba(0,0,0,0.42) 100%)," +
      CL + "26;box-shadow:inset 0 1px 0 rgba(255,255,255,0.30),inset 0 0 0 1.5px " + CL + "B3,0 0 18px -6px " + CL,
    chartStyle: "position:absolute;left:155px;top:212px;pointer-events:none",
  };
}
