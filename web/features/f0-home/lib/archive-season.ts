/**
 * 지난 시즌 종합 리포트가 그릴 값.
 *
 * **원본이 아직 서버에 없다.** `/api/profile/season-cards` 는 이번 시즌의 주차 카드만 주고,
 * 시즌 경계를 아는 곳이 어디에도 없다. 그래서 여기 픽스처 한 벌을 두고 계산만 순수 함수로
 * 갈라 놨다 — 나중에 API 가 생기면 `LAST_SEASON` 자리에 응답을 꽂으면 되고
 * `lastSeasonReport` 는 그대로 쓴다. 화면이 픽스처를 직접 읽지 않게 하는 것이 요점이다.
 *
 * 계산은 두 가지뿐이다. 한 사람의 시즌 성향은 **네 주 중 최빈 유형**이고, 가족의 시즌 성향은
 * **구성원 시즌 성향 중 최빈 유형**이다. 점수를 다시 매기지 않는다 — 채점은
 * `shared/engine/behavior-profile.ts` 하나가 한다.
 */

import { rgba, TYPES, typeImage, type TypeKey } from "./archive-profile-view";

export type SeasonWeek = {
  label: string;
  type: TypeKey;
  /** 그 주에 체결한 거래 건수. */
  count: number;
};

export type SeasonRow = {
  key: string;
  name: string;
  face: string;
  color: string;
  fill: string;
  scores: number[];
  weeks: SeasonWeek[];
  /** 네 주 동안 어떻게 옮겨갔는지 한 줄. 표본이라 사람이 적어 둔 문장이다. */
  trend: string;
};

const A = "/ui/assets/archive/";

/**
 * 지난 시즌 표본 4주 기록. **서버 값이 아니다.**
 *
 * 색은 `familyMembers` 의 `FAMILY_COLORS` 와 같은 순서를 쓴다 — 같은 사람이 이번 시즌
 * 오각형과 지난 시즌 오각형에서 다른 색이면 겹쳐 볼 수가 없다.
 */
export const LAST_SEASON: SeasonRow[] = [
  {
    key: "dad",
    name: "찬영아빠",
    face: `${A}face-dad.jpg`,
    color: "#7FD2FF",
    fill: "rgba(96,190,255,0.3)",
    scores: [6, 5, 7, 3, 8],
    weeks: [
      { label: "1주차", type: "sniper", count: 2 },
      { label: "2주차", type: "sniper", count: 2 },
      { label: "3주차", type: "strategist", count: 3 },
      { label: "4주차", type: "sniper", count: 1 },
    ],
    trend: "근거를 챙기면서도 소수 종목에 집중하는 습관이 뚜렷했어요.",
  },
  {
    key: "mom",
    name: "찬영엄마",
    face: `${A}face-mom.jpg`,
    color: "#FF8AD0",
    fill: "rgba(245,50,127,0.26)",
    scores: [4, 8, 6, 3, 7],
    weeks: [
      { label: "1주차", type: "strategist", count: 3 },
      { label: "2주차", type: "strategist", count: 2 },
      { label: "3주차", type: "explorer", count: 1 },
      { label: "4주차", type: "strategist", count: 3 },
    ],
    trend: "네 주 내내 여러 곳에 나눠 담는 방식을 지켰어요.",
  },
  {
    key: "me",
    name: "김찬영",
    face: `${A}face-me.jpg`,
    color: "#FFD84D",
    fill: "rgba(255,197,61,0.24)",
    scores: [7, 4, 6, 4, 7],
    weeks: [
      { label: "1주차", type: "explorer", count: 2 },
      { label: "2주차", type: "fighter", count: 3 },
      { label: "3주차", type: "sniper", count: 3 },
      { label: "4주차", type: "sniper", count: 4 },
    ],
    trend: "가볍게 둘러보다 확신이 생긴 곳에 몰아 담는 쪽으로 옮겨갔어요.",
  },
];

/**
 * 최빈 유형. 동점이면 `order` 에 먼저 나온 쪽을 고른다 — `Object.keys` 순서에 맡기면
 * 같은 입력이 브라우저마다 다른 유형을 낼 수 있다.
 */
function topOf(counts: Map<TypeKey, number>, order: TypeKey[]): TypeKey {
  let best = order[0];
  for (const key of order) {
    if ((counts.get(key) ?? 0) > (counts.get(best) ?? 0)) best = key;
  }
  return best;
}

const tally = (keys: TypeKey[]) => {
  const counts = new Map<TypeKey, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
};

/** 한 사람의 시즌 성향 — 네 주 중 최빈 유형. */
export function seasonTypeOf(weeks: SeasonWeek[]): TypeKey {
  const order = weeks.map((w) => w.type);
  return topOf(tally(order), order);
}

export type SeasonMemberView = {
  key: string;
  name: string;
  face: string;
  color: string;
  fill: string;
  scores: number[];
  scaleMax: number;
  /** `시즌 성향 · 저격수` */
  title: string;
  desc: string;
  /** `주차별로 보면 탐험가 → 승부사 → 저격수 → 저격수 순서였어요.` */
  trend: string;
  weeks: { label: string; typeName: string; note: string; ink: string; bg: string }[];
};

export type SeasonReport = {
  /** 가족의 시즌 성향. 카드 겉면 색과 캐릭터 그림이 여기서 나온다. */
  type: TypeKey;
  ink: string;
  inkSoft: string;
  gradient: string;
  glow: string;
  image: string;
  imageShadow: string;
  title: string;
  text: string;
  members: SeasonMemberView[];
};

/**
 * 지난 시즌 종합 리포트. 구성원마다 시즌 성향을 세고, 그중 최빈 유형을 가족 성향으로 삼는다.
 *
 * 유형 설명(`trait`·`sectors`)은 `TYPES` 의 고정 문구다 — 이 화면이 새로 지어내지 않는다.
 */
export function lastSeasonReport(rows: SeasonRow[] = LAST_SEASON): SeasonReport {
  const seasonTypes = rows.map((row) => seasonTypeOf(row.weeks));
  const top = topOf(tally(seasonTypes), seasonTypes);
  const meta = TYPES[top];
  const ink = meta.pal[3];
  return {
    type: top,
    ink,
    inkSoft: rgba(ink, 0.85),
    gradient: `linear-gradient(160deg,${meta.pal[0]} 0%,${meta.pal[1]} 46%,${meta.pal[2]} 100%)`,
    glow: `radial-gradient(circle,${rgba(ink, 0.18)} 0%,${rgba(ink, 0)} 68%)`,
    image: `url(${typeImage(top)}) center bottom/contain no-repeat`,
    imageShadow: `drop-shadow(0 10px 14px ${rgba(ink, 0.35)})`,
    title: `${meta.name} 가족이었어요`,
    text: `${meta.trait} 주로 ${meta.sectors}에 투자했어요.`,
    members: rows.map((row, index) => {
      const type = TYPES[seasonTypes[index]];
      return {
        key: row.key,
        name: row.name,
        face: row.face,
        color: row.color,
        fill: row.fill,
        scores: row.scores,
        scaleMax: 10,
        title: `시즌 성향 · ${type.name}`,
        desc: row.trend,
        trend: `주차별로 보면 ${row.weeks.map((w) => TYPES[w.type].name).join(" → ")} 순서였어요.`,
        weeks: row.weeks.map((week) => ({
          label: week.label,
          typeName: TYPES[week.type].name,
          note: `거래 ${week.count}건`,
          ink: TYPES[week.type].pal[3],
          bg: rgba(TYPES[week.type].pal[1], 0.35),
        })),
      };
    }),
  };
}
