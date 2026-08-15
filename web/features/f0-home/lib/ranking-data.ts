/**
 * 랭킹 화면의 고정 데모 데이터와 스타일.
 *
 * 무대 없이 밝은 연보라 화면 하나로 간다 — 순위는 시상대의 링 색과 배지로만 구분한다.
 * 이번 주 · 시즌 전체 · 학교별 3탭을 쓴다. 값은 시안(402×874) 기준 절대 좌표라 손대면
 * 시상대가 어긋난다.
 *
 * 이미지는 `/ui/assets/ranking/` 아래에 둔다 — 이 화면은 `/ranking` 에서 열리므로
 * 상대 경로를 쓰면 사진이 깨진다.
 */

export type RankTab = "week" | "season" | "school";

type Family = { img?: string; e?: string; a?: string; b?: string };
type LeagueRow = { name: string; pct: string; me?: boolean; step?: string };

const ASSET = "/ui/assets/ranking/";

// 가족마다 프로필과 색을 하나씩 갖는다. 시상대에 서든 목록에 있든 같은 것을 쓴다.
// img 가 있으면 실제 가족사진, 없으면 마스코트 이모지 + 색으로 대신한다.
// 학교별 탭은 가족이 아니라 학교가 행 주인이라 이름·문장(이미지)만 갖는다.
export const RK_FAMS: Record<string, Family> = {
  "우리 가족": { img: ASSET + "우리가족.png" },
  "별빛 가족": { img: ASSET + "별빛가족.png" },
  "초록곰 가족": { img: ASSET + "초록곰가족.png" },
  "바다별 가족": { img: ASSET + "바다별가족.png" },
  "달토끼 가족": { img: ASSET + "달토끼가족.png" },
  "해바라기 가족": { img: ASSET + "해바라기가족.png" },
  "구름섬 가족": { img: ASSET + "구름섬가족.png" },
  "무지개 가족": { e: "🌈", a: "#F7ECFF", b: "#E2CBF7" },
  "밤톨 가족": { e: "🌰", a: "#FFE9DA", b: "#F9CBA6" },
  "민들레 가족": { img: ASSET + "민들레가족.png" },
  "도토리 가족": { img: ASSET + "도토리가족.png" },
  "눈송이 가족": { img: ASSET + "눈송이가족.png" },
  "파랑새 가족": { img: ASSET + "파랑새가족.png" },
  "산들바람 가족": { e: "🍃", a: "#F2F7EC", b: "#D8E6C2" },
  "반짝별 가족": { img: ASSET + "반짝별가족.png" },
  "씨앗 가족": { img: ASSET + "씨앗가족.png" },
  // 학교 문장 12장은 학교별로 그려진 게 아니라 범용 아이콘 15장 중 이름 뜻에 맞춰 고른 것이다.
  "한빛초등학교": { img: ASSET + "09_sun.png" },
  "푸른솔초등학교": { img: ASSET + "07_twin_trees.png" },
  "해든초등학교": { img: ASSET + "13_mountain_sun.png" },
  "별그리기초등학교": { img: ASSET + "10_star_badge.png" },
  "나래초등학교": { img: ASSET + "04_star_shield.png" },
  "샘터초등학교": { img: ASSET + "11_sprout.png" },
  "봄내초등학교": { img: ASSET + "05_cherry_blossom.png" },
  "숲마루초등학교": { img: ASSET + "01_tree_book.png" },
  "들꽃초등학교": { img: ASSET + "03_three_leaves.png" },
  "온새미초등학교": { img: ASSET + "15_globe_book.png" },
  "하늘터초등학교": { img: ASSET + "06_cloud.png" },
  "물빛초등학교": { img: ASSET + "08_open_book.png" },
};

export const RK_LEAGUES: Record<RankTab, LeagueRow[]> = {
  week: [
    { name: "별빛 가족", pct: "+6.8%" },
    { name: "초록곰 가족", pct: "+5.1%" },
    { name: "바다별 가족", pct: "+3.4%" },
    { name: "우리 가족", pct: "+2.5%", me: true, step: "▲ 2계단" },
    { name: "달토끼 가족", pct: "+1.2%" },
    { name: "해바라기 가족", pct: "-0.4%" },
    { name: "구름섬 가족", pct: "-1.6%" },
    { name: "무지개 가족", pct: "-2.3%" },
    { name: "밤톨 가족", pct: "-2.8%" },
    { name: "민들레 가족", pct: "-3.1%" },
    { name: "도토리 가족", pct: "-3.5%" },
    { name: "눈송이 가족", pct: "-3.9%" },
    { name: "파랑새 가족", pct: "-4.2%" },
    { name: "산들바람 가족", pct: "-4.6%" },
    { name: "반짝별 가족", pct: "-5.0%" },
    { name: "씨앗 가족", pct: "-5.5%" },
  ],
  season: [
    { name: "바다별 가족", pct: "+18.4%" },
    { name: "별빛 가족", pct: "+12.9%" },
    { name: "무지개 가족", pct: "+9.6%" },
    { name: "초록곰 가족", pct: "+7.7%" },
    { name: "밤톨 가족", pct: "+5.1%" },
    { name: "달토끼 가족", pct: "+2.8%" },
    { name: "우리 가족", pct: "+1.9%", me: true, step: "▲ 3계단" },
    { name: "구름섬 가족", pct: "+1.3%" },
    { name: "민들레 가족", pct: "+0.6%" },
    { name: "도토리 가족", pct: "-0.9%" },
    { name: "해바라기 가족", pct: "-1.7%" },
    { name: "눈송이 가족", pct: "-2.6%" },
    { name: "파랑새 가족", pct: "-3.4%" },
    { name: "산들바람 가족", pct: "-4.5%" },
    { name: "반짝별 가족", pct: "-5.8%" },
    { name: "씨앗 가족", pct: "-7.2%" },
  ],
  school: [
    { name: "푸른솔초등학교", pct: "+9.2%" },
    { name: "한빛초등학교", pct: "+7.5%" },
    { name: "해든초등학교", pct: "+6.1%" },
    { name: "별그리기초등학교", pct: "+4.8%" },
    { name: "나래초등학교", pct: "+3.3%", me: true, step: "▲ 1계단" },
    { name: "샘터초등학교", pct: "+2.0%" },
    { name: "봄내초등학교", pct: "+0.7%" },
    { name: "숲마루초등학교", pct: "-0.8%" },
    { name: "들꽃초등학교", pct: "-1.9%" },
    { name: "온새미초등학교", pct: "-2.7%" },
    { name: "하늘터초등학교", pct: "-3.6%" },
    { name: "물빛초등학교", pct: "-4.9%" },
  ],
};

// 등락색 (상승 빨강 / 하락 파랑) — `renderVals-compute.js` 와 같은 값이다.
const UP = "#E8322E";
const DOWN = "#1668DC";

// 사진이면 꽉 차게 깔고, 없으면 가족색 그라데이션 위에 이모지를 얹는다.
function rkFace(f: Family) {
  return f.img
    ? "background-color:#EDEFF6;background-image:url(" + f.img + ");background-size:cover;background-position:center"
    : "background:linear-gradient(153deg," + f.a + " 0%," + f.b + " 100%)";
}

// 순위 링·배지 색 — 1위 금색, 2위 은색, 3위 동색.
const RK_RING: Record<1 | 2 | 3, string> = { 1: "#E8A61E", 2: "#AFB6C2", 3: "#E07B39" };

/** 위쪽 연보라 영역의 시상대 3인. 화면 왼쪽부터 2등 · 1등 · 3등 순으로 그린다. */
export function rkPodium(tab: RankTab) {
  return ([2, 1, 3] as const).map((rank) => {
    const row = (RK_LEAGUES[tab] || RK_LEAGUES.week)[rank - 1];
    const f = RK_FAMS[row.name] || { a: "#FFFFFF", b: "#E9E9F0" };
    const first = rank === 1;
    const av = first ? 88 : 68;
    return {
      rank, name: row.name, pct: row.pct, emoji: f.img ? "" : f.e || row.name.charAt(0),
      step: row.step || "",
      colStyle: "flex:none;width:" + (first ? 118 : 106) + "px;display:flex;flex-direction:column;align-items:center;"
        + "padding-top:" + (first ? 0 : 40) + "px",
      crownStyle: first
        ? "position:relative;z-index:2;width:40px;height:26px;margin-bottom:-4px;"
          + "background:url(" + ASSET + "crown.png) center bottom/contain no-repeat;"
          + "filter:drop-shadow(0 2px 4px rgba(60,36,140,0.18))"
        : "display:none",
      avStyle: "position:relative;width:" + av + "px;height:" + av + "px;border-radius:999px;flex:none;"
        + "display:flex;align-items:center;justify-content:center;font-size:" + Math.round(av * 0.46)
        + "px;line-height:1;overflow:hidden;" + rkFace(f)
        + ";box-shadow:0 0 0 3px " + RK_RING[rank] + ",0 0 0 6px #FFFFFF,0 4px 12px rgba(48,28,120,0.13)"
        + (row.me ? ",0 0 0 8px #FFD3E4" : ""),
      badgeStyle: "margin-top:-11px;z-index:1;width:22px;height:22px;box-sizing:border-box;border-radius:999px;"
        + "display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#FFFFFF;"
        + "background:" + RK_RING[rank] + ";box-shadow:0 0 0 2px #FFFFFF",
      nameStyle: "margin-top:9px;font-size:14px;font-weight:700;text-align:center;color:#001E5A;white-space:nowrap;"
        + "max-width:100%;overflow:hidden;text-overflow:ellipsis",
      pctStyle: "margin-top:3px;font-size:14px;font-weight:800;text-align:center;color:#F5327F;"
        + "font-variant-numeric:tabular-nums;white-space:nowrap",
    };
  });
}

/** 시상대 아래 4위부터의 순위표. 카드가 아니라 얇은 연보라 선으로만 행을 나눈다. */
export function rkRows(tab: RankTab) {
  const list = (RK_LEAGUES[tab] || RK_LEAGUES.week).slice(3);
  return list.map((row, i) => {
    const f = RK_FAMS[row.name] || { a: "#FFFFFF", b: "#E9E9F0" };
    const me = !!row.me, neg = row.pct.charAt(0) === "-";
    const last = i === list.length - 1;
    return {
      rank: i + 4, name: row.name, pct: row.pct, emoji: f.img ? "" : f.e || row.name.charAt(0), step: row.step || "",
      // 내 행만 옅은 분홍 알약으로 감싼다. 나머지는 마지막 행만 아래 선을 뺀다.
      rowStyle: "flex:none;box-sizing:border-box;height:69px;display:flex;align-items:center;" + (me
        ? "margin:0 8px;padding:0 12px;border-radius:18px;background:#FFF3F8;box-shadow:inset 0 0 0 1px #FFC9DE"
        : "padding:0 20px;" + (last ? "" : "box-shadow:inset 0 -1px 0 #F1EDFB")),
      rankStyle: "flex:none;width:22px;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;color:"
        + (me ? "#FF2D78" : "#A9AEC4"),
      plateStyle: "flex:none;margin-left:8px;width:42px;height:42px;border-radius:999px;display:flex;align-items:center;"
        + "justify-content:center;font-size:21px;line-height:1;overflow:hidden;"
        + rkFace(f.img ? f : { a: "#FFFFFF", b: f.b })
        + ";box-shadow:0 2px 7px rgba(60,40,140,0.10),inset 0 0 0 1px rgba(255,255,255,0.85)",
      nameStyle: "flex:1;min-width:0;margin-left:13px;font-size:15.5px;font-weight:" + (me ? 800 : 700) + ";color:"
        + (me ? "#FF2D78" : "#001E5A") + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
      badgeStyle: row.step
        ? "flex:none;margin-right:10px;display:flex;align-items:center;padding:0 10px;height:21px;border-radius:999px;"
          + "background:#FFFFFF;font-size:11.5px;font-weight:800;color:#FF2D78;white-space:nowrap;"
          + "box-shadow:0 2px 6px rgba(120,40,90,0.14)"
        : "display:none",
      pctStyle: "flex:none;font-size:15.5px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:"
        + (me ? "#FF2D78" : neg ? DOWN : UP),
    };
  });
}

/** 주·시즌·학교 토글 한 칸. 흰 알약 배경 위라 고른 칸은 진한 남색으로 뒤집는다. */
export function rkSeg(on: boolean) {
  return "flex:1;display:flex;align-items:center;justify-content:center;border-radius:17px;font-size:13.5px;cursor:pointer;" + (on
    ? "font-weight:800;color:#FFFFFF;background:#1E3A6E"
    : "font-weight:600;color:#7C819A");
}
