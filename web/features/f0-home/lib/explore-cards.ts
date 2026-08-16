import { searchAliasesFor } from "../../../shared/data/stocks";
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

const CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
const CHOSUNG_SET = new Set(CHOSUNG);
const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

/** 완성형 한글 한 글자를 초성으로 줄인다. 한글이 아니면 그대로 둔다. */
function toChosung(char: string): string {
  const code = char.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_LAST) return char;
  return CHOSUNG[Math.floor((code - HANGUL_BASE) / (21 * 28))];
}

function chosungString(text: string): string {
  return [...text].map(toChosung).join("");
}

/** "ㅅㅅㅈㅈ" 처럼 자음만 쳤으면 초성 검색으로 본다. */
function isChosungQuery(query: string): boolean {
  return [...query].every((char) => CHOSUNG_SET.has(char));
}

/**
 * `query`의 글자가 `text`에 이 순서 그대로 나오면(붙어 있지 않아도 된다) 맞는다.
 * "SK하이닉스"에서 "하"(3번째) 다음에 "닉"(5번째)이 나오므로 "하닉"이 걸리는 식이다.
 * 한 글자짜리 검색어는 부분일치와 결과가 같다.
 */
function isOrderedSubsequence(query: string, text: string): boolean {
  let i = 0;
  for (const char of text) {
    if (i < query.length && char === query[i]) i += 1;
  }
  return i === query.length;
}

/**
 * 종목명은 순서만 맞으면 붙어 있지 않아도 찾는다("하닉"→SK하이닉스, "현차"→현대차).
 * 별칭(`shared/data/stocks`의 `searchAliases`)은 정확한 표기라 부분일치로만 찾는다 —
 * "YG"로 와이지엔터테인먼트를 찾는 식이다. 자음만 쳤으면 초성으로 줄여 견준다 —
 * "ㅅㅅㅈㅈ"로 삼성전자를 찾는 식이다.
 */
function matchesQuery(name: string, code: string, query: string): boolean {
  if (isChosungQuery(query)) return chosungString(name).includes(query);
  if (isOrderedSubsequence(query, name.toLowerCase())) return true;
  return searchAliasesFor(code).some((alias) => alias.toLowerCase().includes(query));
}

export type ExploreFilter = string; // 'all' | 'watch' | 유니버스 섹터 id

/**
 * 줄 세우는 기준. **무엇을 보는지(필터)와 다른 축이라** 주소가 아니라 화면이 소유한다.
 *
 * 예전에는 "오늘 많이 오른 순"이 칩 하나로 필터 줄에 섞여 있었다. 그래서 섹터를 고르면
 * 정렬을 잃고 정렬을 고르면 섹터를 잃었다 — 둘을 동시에 가질 수 없었다.
 *
 * `sector` 는 업종끼리 묶는 차례이고 기본값이다. 카드 사이 업종 구분 헤더는 이 차례로
 * 줄을 세웠을 때만 뜻이 있으므로, **숨은 규칙으로 두지 않고 정렬의 한 항목으로 드러낸다.**
 */
export type ExploreSort = "sector" | "change" | "name";

export const SORT_LABEL: Record<ExploreSort, string> = {
  sector: "업종별",
  change: "많이 오른 순",
  name: "가나다순",
};

export const SORT_OPTIONS = Object.keys(SORT_LABEL) as ExploreSort[];

/** 업종 차례는 유니버스가 정한 순서다 — 그래야 같은 업종이 한 덩어리로 붙어 헤더가 한 번만 선다. */
function comparator(sort: ExploreSort, universe: Universe) {
  if (sort === "change") return (a: ExploreStockRow, b: ExploreStockRow) => b.change - a.change;
  if (sort === "name")
    return (a: ExploreStockRow, b: ExploreStockRow) => a.name.localeCompare(b.name, "ko");
  const order = universe.sectors.map((sector) => sector.id);
  return (a: ExploreStockRow, b: ExploreStockRow) =>
    order.indexOf(a.sector) - order.indexOf(b.sector);
}

/**
 * 업종 헤더를 세울지. **목록에 업종이 둘 이상 있을 때만** 뜻이 있다 — 섹터 하나를 고른
 * 화면에서 세우면 칩이 이미 말한 업종 이름을 제목으로 한 번 더 얹는 꼴이고, 그건 이번에
 * 걷어낸 "자동차 회사 3곳" 줄과 같은 것이다.
 */
export const hasManySectors = (list: ExploreStockRow[]) =>
  list.some((stock) => stock.sector !== list[0]?.sector);

export type ExploreStockRow = {
  code: string;
  name: string;
  desc: string;
  sector: string;
  price: number;
  change: number;
  spark: number[];
};

/** 검색어가 있으면 섹터·관심 선택보다 검색이 앞선다. 어느 목록이든 `sort` 가 줄을 세운다. */
export function exploreList(
  universe: Universe,
  live: Pick<UniverseLive, "quotes" | "sparks">,
  filter: ExploreFilter,
  query: string,
  watchlist: string[],
  sort: ExploreSort = "sector",
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
  // 아래 목록은 전부 `merged` 에서 새로 만든 배열이라 제자리 정렬해도 원본이 상하지 않는다.
  // `Array.sort` 가 안정 정렬이라, 업종별에서 같은 업종끼리는 유니버스 차례가 그대로 남는다.
  const ordered = (rows: ExploreStockRow[]) => rows.sort(comparator(sort, universe));
  const q = query.trim().toLowerCase();
  if (q) return ordered(merged.filter((stock) => matchesQuery(stock.name, stock.code, q)));
  if (filter === "all") return ordered(merged);
  if (filter === "watch") return ordered(merged.filter((stock) => watchlist.includes(stock.code)));
  return ordered(merged.filter((stock) => stock.sector === filter));
}

/**
 * 필터 칩 줄. **고른 섹터를 맨 앞(전체 다음)으로 끌어올린다.**
 *
 * 예전에는 목록 위에 "자동차 회사 3곳" 제목이 지금 무엇을 보고 있는지 말해 줬다. 그 줄을
 * 걷어냈으므로 칩 줄이 그 일을 대신해야 하는데, 섹터가 20개 넘게 가로로 흐르는 줄이라
 * 고른 칩이 화면 밖에 있으면 아무 단서도 남지 않는다. 자리를 고정하면 스크롤하지 않아도
 * 항상 보인다.
 */
/**
 * 업종 칩 줄. **순서는 늘 같다** — 고른 칩이 자리를 옮기지 않고 점등만 한다.
 *
 * 예전에는 고른 업종을 `전체` 바로 뒤로 끌어올렸다. 그래서 칩을 누르는 순간 그 칩이 손가락
 * 밑에서 왼쪽으로 튀고, 옆 칩들이 밀려 다음에 누르려던 칩이 딴 자리에 가 있었다. 원본
 * 프로토타입(`sectorChips`)은 `defs` 를 고정 순서로 만들고 색·굵기만 바꾼다.
 *
 * 원본의 `오늘 많이 오른 순` 칩은 여기 없다 — 정렬이 필터 줄에서 빠져나와 헤더 메뉴로
 * 갔기 때문이다(PR #263). 그 결정은 그대로 두고 자리만 원본처럼 고정한다.
 */
export function sectorChips(universe: Universe, filter: ExploreFilter) {
  return [
    { id: "all", name: "전체", emoji: "" },
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
      // 고른 칩은 분홍으로 채우고 흰 글자를 얹는다. `background` 선언 하나에 box-shadow 값이
      // 섞여 들어가 있어서 선언 전체가 무효였고, 그래서 **흰 글자만 남아 안 보였다.**
      (sector.id === filter
        ? "color:#FFFFFF;background:#F5327F;" +
          "box-shadow:0 0 16px -4px rgba(245,50,127,0.55),inset 0 1.5px 1px rgba(255,255,255,0.4)"
        : "color:#5C6280;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)"),
  }));
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

/** 업종 태그 — 글자색과 옅은 배경 한 쌍. 새 프로토타입 값 그대로다. */
const SECTAG: Record<string, [string, string]> = {
  semi: ["#2F6BE0", "#E6EEFD"],
  game: ["#6D3FD4", "#F0EAFE"],
  food: ["#C4571F", "#FDEDE2"],
  auto: ["#1F7A5F", "#E3F4EE"],
  enter: ["#C42A6D", "#FCE7F0"],
  beauty: ["#A93E9B", "#F7E9F6"],
  air: ["#1E8FCC", "#E4F3FC"],
  ship: ["#106E7E", "#DEF0F2"],
  defense: ["#4E5C78", "#EBEEF4"],
  energy: ["#A07207", "#FBF1DC"],
  retail: ["#7A5230", "#F2EBE2"],
  logi: ["#5C6B3D", "#EFF2E6"],
  bank: ["#2A3B6E", "#E8EAF2"],
};
const DEFAULT_SECTAG: [string, string] = ["#4E5C78", "#EBEEF4"];
/** 코스닥 상장 종목 — 나머지는 코스피(새 프로토타입과 같은 51종 판정). */
const KOSDAQ = new Set(["035900", "041510", "122870", "263750"]);

/**
 * 카드가 중앙에서 멀어질수록 뒤로 눕는 정도. 프로토타입의 `stackDepth` 노브가 1일 때 값이다.
 *
 * 노브 자체는 옮기지 않았다 — 디자인 도구의 Tweaks 패널에 해당하는 것이 앱에 없고,
 * 값을 바꿀 화면이 없는 설정은 죽은 코드다. 눕는 정도를 조절하고 싶으면 여기 숫자를 고친다.
 */
const STACK = Object.freeze({
  /** 이 칸 너머는 더 눕지 않는다 — 51장짜리 목록에서 끝 카드가 뒤집히지 않게 자른다. */
  reach: 3,
  tiltDeg: 11,
  depthPx: 46,
  shrink: 0.045,
  perspective: 1150,
});

/**
 * 활성 카드에서 얼마나 떨어졌는지. `signed` 는 방향(아래가 +), `steps` 는 거리다.
 * 방향은 회전축을 정하고 거리는 눕는 양을 정한다.
 */
export function stackOffset(index: number, activeIndex: number) {
  const signed = Math.max(-STACK.reach, Math.min(STACK.reach, index - activeIndex));
  return { signed, steps: Math.abs(signed) };
}

/** 검정을 `weight` 만큼 섞는다 — 밝은 유리 카드 위에서 읽히도록 색을 눌러 쓴다. */
function mixDark(hex: string, weight: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - weight)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/**
 * 카드 한 장의 그리기 값 전부. 스타일 문자열은 새 claude.ai/design 프로토타입과 같은 값이다
 * (밝은 유리 카드 — 어둡고 빛나는 수집 카드 디자인은 지난 라운드 것이라 걷어냈다).
 *
 * `list`·`index`는 업종이 바뀌는 첫 카드 위에 구분 헤더를 세우기 위해서다. 세울지 말지는
 * 부르는 쪽이 `showGroups`로 정한다 — 업종별로 줄을 세웠고 업종이 둘 이상일 때만이다.
 *
 * `activeIndex`는 지금 보고 있는 카드다. 이 카드에서 **몇 칸 떨어졌는지**로 눕는 정도가
 * 정해지므로 "활성이냐 아니냐"만으로는 부족하다.
 */
export function buildExploreCard(
  list: ExploreStockRow[],
  index: number,
  universe: Universe,
  activeIndex: number,
  showGroups: boolean,
) {
  const stock = list[index];
  const sector = universe.sectors.find((entry) => entry.id === stock.sector) ?? {
    id: "",
    name: "",
    emoji: "",
    accent: "#8E93A8",
  };
  // universe.js 의 로고 경로는 app.html 기준 상대경로다. 부모 문서에서는 /ui/ 를 붙인다.
  const logo = universe.logos?.[stock.code] ? `/ui/${universe.logos[stock.code]}` : "";
  const SA = sector.accent; // 업종 색 — 로고 뒤 은은한 배경
  const CL = stock.change >= 0 ? UP : DOWN; // 등락색 (상승 빨강 / 하락 파랑)
  const CD = mixDark(CL, 0.24); // 등락 배지 글자
  const ST = SECTAG[stock.sector] ?? DEFAULT_SECTAG;

  // 차트 — 카드 하단 전체 폭. 값과 방향은 실제 시세 그대로.
  const sp = stock.spark;
  const W = 310;
  const H = 104;
  const PL = 0;
  const PR = 18;
  const PY = 16;
  const N = Math.max(2, sp.length);
  const pts = sp.map((v, i) => [PL + i * ((W - PL - PR) / (N - 1)), H - PY - (v / 100) * (H - PY * 2)]);
  const xy = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1));
  const last = pts[pts.length - 1] || [W - PR, H / 2];
  const priceText = stock.price.toLocaleString("ko-KR");
  // 자릿수가 늘어도 카드 폭에 맞게 크기만 단계적으로 줄인다
  const priceFont = priceText.length >= 9 ? 36 : priceText.length === 8 ? 39 : 42;
  // 등락률만으로 원화 변동폭을 되짚는다: price = prevClose * (1 + change/100)
  const changeWon = Math.abs(Math.round((stock.price * stock.change) / (100 + stock.change)));

  const groupChanged = index === 0 || list[index - 1].sector !== stock.sector;
  const away = stackOffset(index, activeIndex);

  return {
    code: stock.code,
    name: stock.name,
    emoji: sector.emoji,
    category: sector.name,
    logo,
    hasLogo: !!logo,
    sparkLine: xy.join(" "),
    sparkArea: "M" + xy.join(" L ") + " L " + (W - PR) + "," + H + " L " + PL + "," + H + " Z",
    endX: last[0].toFixed(1),
    endY: last[1].toFixed(1),
    lineColor: CL,
    gradId: "ar" + stock.code,
    priceText,
    changeText: (stock.change >= 0 ? "▲ " : "▼ ") + changeWon.toLocaleString("ko-KR") + "원",
    changePctText: (stock.change >= 0 ? "+" : "") + stock.change.toFixed(2) + "%",
    // "전체" 보기에서 업종이 바뀌는 첫 카드에만 구분 헤더를 세운다. 맨 첫 카드는 위에
    // 아무것도 없으니 구분선은 생략한다.
    groupShow: showGroups && groupChanged,
    groupShowLine: showGroups && groupChanged && index !== 0,
    groupName: sector.name,
    // scroll-snap-stop:always — 네이티브 플링이 스냅 지점을 건너뛰지 못하게 막는다.
    slideStyle:
      "position:relative;isolation:isolate;flex:none;scroll-snap-align:center;scroll-snap-stop:always;padding-top:" +
      (showGroups && groupChanged ? "60px" : "0") +
      ";transform:perspective(" + STACK.perspective + "px) rotateX(" +
      (-away.signed * STACK.tiltDeg).toFixed(2) + "deg) translateZ(" +
      (-away.steps * STACK.depthPx).toFixed(1) + "px) scale(" +
      (1 - away.steps * STACK.shrink).toFixed(3) + ")" +
      // 회전축은 활성 카드 쪽 모서리다. 아래 카드는 윗변, 위 카드는 아랫변을 축으로 돌아야
      // 활성 카드에서 **멀어지는** 쪽으로 눕는다. 반대로 주면 카드가 앞으로 쏟아진다.
      ";transform-origin:50% " + (away.signed > 0 ? "0%" : away.signed < 0 ? "100%" : "50%") +
      ";opacity:" + (away.steps === 0 ? "1" : away.steps === 1 ? "0.82" : "0.55") +
      ";transition:transform 460ms cubic-bezier(.22,.61,.36,1),opacity 320ms ease",
    // 카드 몸체 — 색 없는 두꺼운 유리판. 등락색은 아래·오른쪽 엣지에서만 아주 옅게 굴절한다.
    cardStyle:
      "position:relative;overflow:hidden;flex:none;width:310px;height:340px;border-radius:34px;cursor:pointer;scroll-snap-align:center;background:#FCFBFF;" +
      "box-shadow:0 0 0 1.2px rgba(255,255,255,0.85),0 2px 5px rgba(104,96,150,0.10),0 14px 30px -6px rgba(104,96,150,0.16)," +
      "0 28px 56px -18px rgba(104,96,150,0.13),inset 1.5px 1.5px 0 rgba(255,255,255,0.95),inset -1px -1px 0 rgba(104,96,150,0.10)," +
      "inset -1px 0 0 " + CL + "3D,inset 0 -1px 0 " + CL + "42,inset 0 -18px 26px -22px " + CL + "26",
    // 상단 표면광 — 로고 자리는 비껴간다
    glintStyle:
      "position:absolute;left:0;right:0;top:0;height:14%;pointer-events:none;" +
      "background:linear-gradient(180deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.05) 60%,rgba(255,255,255,0) 100%);" +
      "-webkit-mask-image:linear-gradient(90deg,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 116px,#000 150px);" +
      "mask-image:linear-gradient(90deg,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 116px,#000 150px)",
    // 로고 뒤에만 업종색 — 카드 전체가 아니라 이 자리에서만 색이 돈다
    artStyle:
      "position:absolute;left:28px;top:24px;width:88px;height:88px;display:flex;align-items:center;justify-content:center;background:" +
      (logo ? "url(" + logo + ") center/84px 84px no-repeat," : "") +
      "radial-gradient(circle at 50% 52%," + SA + "2E 0%," + SA + "14 46%," + SA + "00 72%)",
    // 업종 태그 — 카드 우상단
    catStyle:
      "position:absolute;right:22px;top:22px;display:inline-flex;align-items:center;height:28px;padding:0 13px;border-radius:999px;font-size:12.5px;font-weight:700;white-space:nowrap;color:" +
      ST[0] + ";background:" + ST[1],
    // 종목명과 코드는 로고 옆에
    nameStyle:
      "position:absolute;left:130px;right:26px;top:24px;height:88px;display:flex;flex-direction:column;justify-content:flex-end;gap:5px;min-width:0;padding-bottom:6px",
    nameTextStyle:
      "font-size:" + (stock.name.length >= 10 ? 17 : stock.name.length >= 8 ? 19 : 22) +
      "px;font-weight:800;color:#141B3D;letter-spacing:-0.045em;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
    codeStyle:
      "font-size:12.5px;font-weight:400;color:#9096AE;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums",
    codeText: stock.code + " · " + (KOSDAQ.has(stock.code) ? "KOSDAQ" : "KOSPI"),
    wonStyle: "margin-left:4px;font-size:15px;font-weight:600;color:#9096AE;letter-spacing:0",
    priceStyle:
      "position:absolute;left:28px;top:" + (176 - priceFont) + "px;display:flex;align-items:baseline;font-size:" + priceFont +
      "px;font-weight:800;color:#0D1330;font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:-0.035em;line-height:1",
    // 등락 배지 — 밝은 유리 캡슐
    changeStyle:
      "position:absolute;left:28px;top:196px;display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 13px;border-radius:999px;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:" +
      CD + ";background:" + CL + "1A;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:inset 0 0 0 1px " + CL + "38,inset 0 1px 0 rgba(255,255,255,0.6)",
    changePctStyle: "margin-left:7px;padding-left:8px;font-size:13px;font-weight:700;border-left:1px solid " + CL + "38",
    chartStyle: "position:absolute;left:0;bottom:0;pointer-events:none",
  };
}
