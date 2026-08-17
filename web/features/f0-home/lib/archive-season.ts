/**
 * 지난 주차 리포트 — 가족 구성원마다 **이미 끝난 주차**를 되짚는다.
 *
 * **원본은 Supabase 다**(2026-08-17). `/api/family` 가 구성원마다 주차 카드(`weeks`)를
 * 함께 주고, 그 카드는 내 성향과 **같은 엔진**(`shared/engine/behavior-profile.ts`)이
 * 매긴 것이다 — 한 화면에서 같은 사람이 탭마다 다른 유형이면 안 된다.
 *
 * 예전에는 이 자리에 사람이 적어 둔 4주 표본(`LAST_SEASON`)이 있었다. 시즌 경계를 아는
 * 곳이 서버에 없어서였는데, 경계가 생기기를 기다리는 동안 화면이 계속 가짜 값을 보여 주는
 * 편보다 **끝난 주차를 사실대로 보여 주는 편**이 낫다고 정했다. 그래서 이 파일에는
 * 픽스처가 없고, 서버가 준 주차 카드를 화면 모양으로 펴는 계산만 있다.
 *
 * **왜 시즌이 아니라 주차인가.** 통합문서 v2 의 시즌은 4주 × 연 4회이고
 * `season-day.ts` 가 그 경계를 계산한다. 다만 지금 DB 에는 이번 시즌(2026-08-03~)
 * 기록만 있어 지난 시즌으로 좁히면 화면이 통째로 빈다. 끝난 주차는 시즌이 쌓이면
 * 자연히 지난 시즌 주차까지 함께 들어온다 — 좁히는 것은 경계가 실제로 필요해질 때 한다.
 *
 * 계산은 두 가지뿐이다. 한 사람의 성향은 **끝난 주차 중 최빈 유형**이고, 가족 성향은
 * **구성원 성향 중 최빈 유형**이다. 점수를 다시 매기지 않는다 — 채점은 엔진 하나가 한다.
 */

import {
  axesFromCard,
  familyMembers,
  rgba,
  TYPES,
  typeImage,
  typeKeyOf,
  type FamilyRow,
  type TypeKey,
} from "./archive-profile-view";

export type SeasonWeek = {
  /** 엔진이 붙인 주차 이름. `8/3 – 8/9` 처럼 그 주의 날짜 범위다. */
  label: string;
  /** 그 주의 유형. 표본이 모자라 유형이 안 정해진 주는 `null` 이다. */
  type: TypeKey | null;
  /**
   * 그 주에 **산** 횟수. 서버가 주는 `count` 는 `samples.buys` 라 판 것은 안 들어 있다
   * (`/api/profile/season-cards`). 그래서 화면도 `거래` 가 아니라 `매수` 로 적는다 —
   * 판 기록까지 센 것처럼 보이면 아이가 자기 주차를 세어 보고 숫자가 안 맞는다.
   */
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
};

/**
 * 서버가 준 구성원 주차 카드를 리포트 입력으로 편다. **끝난 주(`closed`)만** 쓴다 —
 * 이번 주는 아직 거래가 더 붙을 수 있어 되짚을 기록이 아니다.
 *
 * 색·얼굴은 `familyMembers` 가 정한 것을 그대로 쓴다. 같은 사람이 현재 시즌 오각형과
 * 지난 주차 오각형에서 다른 색이면 두 탭을 겹쳐 볼 수가 없다.
 *
 * 끝난 주가 하나도 없는 사람은 아예 뺀다 — 빈 카드를 세워 두면 기록이 있는 사람과
 * 없는 사람이 같은 무게로 보인다.
 */
export function closedWeekRows(members: FamilyRow[]): SeasonRow[] {
  const views = familyMembers(members);
  return members.flatMap((member, index) => {
    const closed = (member.weeks ?? []).filter((week) => week.status === "closed");
    if (!closed.length) return [];
    const view = views[index];
    return [{
      key: view.key,
      name: view.name,
      face: view.face,
      color: view.color,
      fill: view.fill,
      /**
       * 지난 주차 오각형은 **끝난 주 카드의 평균**이다. 누적 카드(`behavior`)를 쓰면
       * 이번 주까지 섞여 현재 시즌 탭과 같은 그림이 되고, 그러면 두 탭을 견줄 것이 없다.
       */
      scores: meanAxes(closed.map((week) => axesFromCard(week.card))),
      weeks: closed.map((week) => ({
        label: week.label,
        type: typeKeyOf(week.card.character),
        count: week.count,
      })),
    }];
  });
}

/** 축마다 평균. 소수 한 자리까지만 남긴다 — 오각형이 읽을 수 있으면 되는 값이다. */
function meanAxes(rows: number[][]): number[] {
  return [0, 1, 2, 3, 4].map((axis) => {
    const sum = rows.reduce((total, row) => total + (row[axis] ?? 0), 0);
    return Math.round((sum / rows.length) * 10) / 10;
  });
}

/**
 * 최빈 유형. 동점이면 `order` 에 먼저 나온 쪽을 고른다 — `Object.keys` 순서에 맡기면
 * 같은 입력이 브라우저마다 다른 유형을 낼 수 있다. 셀 것이 없으면 `null` 이다.
 */
function topOf(order: (TypeKey | null)[]): TypeKey | null {
  const typed = order.filter((key): key is TypeKey => key !== null);
  if (!typed.length) return null;
  const counts = new Map<TypeKey, number>();
  for (const key of typed) counts.set(key, (counts.get(key) ?? 0) + 1);
  let best = typed[0];
  for (const key of typed) {
    if ((counts.get(key) ?? 0) > (counts.get(best) ?? 0)) best = key;
  }
  return best;
}

/** 한 사람의 성향 — 끝난 주차 중 최빈 유형. 유형이 정해진 주가 없으면 `null` 이다. */
export function seasonTypeOf(weeks: SeasonWeek[]): TypeKey | null {
  return topOf(weeks.map((week) => week.type));
}

export type SeasonMemberView = {
  key: string;
  name: string;
  face: string;
  color: string;
  fill: string;
  scores: number[];
  scaleMax: number;
  /** `지난 주차 성향 · 저격수` */
  title: string;
  desc: string;
  /** `주차별로 보면 탐험가 → 승부사 → 저격수 순서였어요.` */
  trend: string;
  weeks: { label: string; typeName: string; note: string; ink: string; bg: string }[];
};

export type SeasonReport = {
  /** 가족 성향. 카드 겉면 색과 캐릭터 그림이 여기서 나온다. */
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

/** 유형이 안 정해진 주의 회색. 어느 캐릭터 색도 아니어야 한다. */
const PENDING_INK = "#8E93A8";

/**
 * 지난 주차 종합 리포트. 구성원마다 성향을 세고, 그중 최빈 유형을 가족 성향으로 삼는다.
 *
 * 유형 설명(`trait`·`sectors`)은 `TYPES` 의 고정 문구다 — 이 화면이 새로 지어내지 않는다.
 *
 * **되짚을 것이 없으면 `null` 이다.** 끝난 주가 아무에게도 없거나, 있어도 유형이 정해진
 * 주가 하나도 없을 때다. 그때 화면은 리포트 대신 빈 자리 문구를 세운다 — 겉면 색과
 * 캐릭터 그림은 유형에서 나오므로 유형 없이 카드를 세울 수가 없다.
 */
export function seasonReport(rows: SeasonRow[]): SeasonReport | null {
  if (!rows.length) return null;
  const seasonTypes = rows.map((row) => seasonTypeOf(row.weeks));
  const top = topOf(seasonTypes);
  if (!top) return null;
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
      const key = seasonTypes[index];
      const type = key ? TYPES[key] : null;
      const names = row.weeks.map((week) => (week.type ? TYPES[week.type].name : "관찰 중"));
      return {
        key: row.key,
        name: row.name,
        face: row.face,
        color: row.color,
        fill: row.fill,
        scores: row.scores,
        scaleMax: 10,
        title: type ? `지난 주차 성향 · ${type.name}` : "지난 주차 성향 · 관찰 중",
        // 사람이 적어 둔 문장이 아니라 유형표의 고정 문구다.
        desc: type ? type.trait : "끝난 주차에 아직 유형이 정해질 만큼 기록이 쌓이지 않았어요.",
        trend: `주차별로 보면 ${names.join(" → ")} 순서였어요.`,
        weeks: row.weeks.map((week, i) => ({
          label: week.label,
          typeName: names[i],
          note: `매수 ${week.count}건`,
          ink: week.type ? TYPES[week.type].pal[3] : PENDING_INK,
          bg: week.type ? rgba(TYPES[week.type].pal[1], 0.35) : rgba(PENDING_INK, 0.12),
        })),
      };
    }),
  };
}
