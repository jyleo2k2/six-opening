/**
 * 우리 가족 투자 성향 리포트 — `이번 시즌`·`지난 시즌` 두 탭이 쓰는 계산.
 *
 * **원본은 Supabase 다**(2026-08-17). `/api/family` 가 구성원마다 주차 카드(`weeks`)를
 * 함께 주고, 그 카드는 내 성향과 **같은 엔진**(`shared/engine/behavior-profile.ts`)이
 * 매긴 것이다 — 한 화면에서 같은 사람이 탭마다 다른 유형이면 안 된다.
 *
 * 계산의 원본은 서버가 준 주차 카드다. **딱 한 자리만 예외**로 만든 값을 쓴다 —
 * `지난 시즌` 에 진짜 지난 시즌 주차가 하나도 없을 때 세우는 데모 4주
 * (`demoLastSeasonRows`)다. 지금 DB 에는 이번 시즌 기록뿐이라 그 탭이 늘 빈 자리 문구
 * 한 줄이었고, 시연에서 무엇을 만든 화면인지 보이지 않았다. **기록이 있으면 데모는 쓰지
 * 않는다**(`lastSeasonRows`) — 만든 값이 진짜 기록을 덮는 일은 없다.
 *
 * **왜 시즌이 아니라 주차인가.** 통합문서 v2 의 시즌은 4주 × 연 4회이고
 * `season-day.ts` 가 그 경계를 계산한다. 다만 지금 DB 에는 이번 시즌(2026-08-03~)
 * 기록만 있어 진짜 시즌 경계로 가르지 않는다. **`지난 시즌` 탭은 끝난 주차 전체를,
 * `이번 시즌` 탭은 진행 중인 주까지 포함한 전체 주차를 보여 주는 자리**다 — 시즌이
 * 여러 번 쌓이면 `지난 시즌` 이 자연히 진짜 지난 시즌 주차만 남게 된다. 경계로 좁히는
 * 것은 그게 실제로 필요해질 때 한다.
 *
 * 계산은 두 가지뿐이다. 한 사람의 성향은 **주차 중 최빈 유형**이고, 가족 성향은
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
import { SEASON_DAYS, SEASON_WEEKS, seasonDay } from "./season-day";

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
 * `window` 를 주면 그 시즌에 속한 주만 남긴다. `지난 시즌` 탭이 진짜 지난 시즌 주차가
 * 있는지 확인할 때 쓴다 — 비우면 예전처럼 끝난 주 전부다(`이번 시즌` 쪽 계산).
 *
 * 색·얼굴은 `familyMembers` 가 정한 것을 그대로 쓴다. 같은 사람이 이번 시즌 오각형과
 * 지난 시즌 오각형에서 다른 색이면 두 탭을 겹쳐 볼 수가 없다.
 *
 * 끝난 주가 하나도 없는 사람은 아예 뺀다 — 빈 카드를 세워 두면 기록이 있는 사람과
 * 없는 사람이 같은 무게로 보인다.
 */
export function closedWeekRows(members: FamilyRow[], window?: SeasonWindow): SeasonRow[] {
  const views = familyMembers(members);
  return members.flatMap((member, index) => {
    const closed = (member.weeks ?? []).filter((week) =>
      week.status === "closed" && (!window || window.weeks.some((w) => w.start === week.weekStart)));
    if (!closed.length) return [];
    const view = views[index];
    return [{
      key: view.key,
      name: view.name,
      face: view.face,
      color: view.color,
      fill: view.fill,
      /**
       * 지난 시즌 오각형은 **끝난 주 카드의 평균**이다. 누적 카드(`behavior`)를 쓰면
       * 이번 주까지 섞여 이번 시즌 탭과 같은 그림이 되고, 그러면 두 탭을 견줄 것이 없다.
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

/** 유형이 안 정해진 주의 회색. 어느 캐릭터 색도 아니어야 한다. */
const PENDING_INK = "#8E93A8";

export type SeasonWeekRow = { label: string; typeName: string; note: string; ink: string; bg: string };

/** 주차 배열을 카드 목록으로 편다. `지난 시즌`·`이번 시즌` 리포트가 같은 모양을 쓴다. */
function weekRows(weeks: SeasonWeek[]): SeasonWeekRow[] {
  return weeks.map((week) => {
    const meta = week.type ? TYPES[week.type] : null;
    return {
      label: week.label,
      typeName: meta ? meta.name : "관찰 중",
      note: `매수 ${week.count}건`,
      ink: meta ? meta.pal[3] : PENDING_INK,
      bg: meta ? rgba(meta.pal[1], 0.35) : rgba(PENDING_INK, 0.12),
    };
  });
}

/** 주차별 유형을 화살표로 이은 한 줄. 쌓인 주가 없으면 되짚을 것이 없다고 적는다. */
function trendOf(weeks: SeasonWeekRow[]): string {
  return weeks.length
    ? `주차별로 보면 ${weeks.map((week) => week.typeName).join(" → ")} 순서였어요.`
    : "아직 쌓인 주차가 없어요.";
}

/**
 * 이번 시즌 사람별 주차 카드. `closedWeekRows`(지난 시즌)와 달리 **끝나지 않은 이번 주도
 * 포함**한다 — 이번 시즌 리포트에서 한 사람을 누르면 지금까지 쌓인 주차 전부를 보여줘야
 * 하기 때문이다. 원본은 `familyMembers`와 같은 `/api/family` 응답이다.
 */
export function thisSeasonWeeks(member: FamilyRow): { weeks: SeasonWeekRow[]; trend: string } {
  const seasonWeeks: SeasonWeek[] = (member.weeks ?? []).map((week) => ({
    label: week.label,
    type: typeKeyOf(week.card.character),
    count: week.count,
  }));
  const weeks = weekRows(seasonWeeks);
  return { weeks, trend: trendOf(weeks) };
}

export type SeasonMemberView = {
  key: string;
  name: string;
  face: string;
  color: string;
  fill: string;
  scores: number[];
  scaleMax: number;
  /** `지난 시즌 성향 · 저격수` */
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

/**
 * 지난 시즌 종합 리포트. 구성원마다 성향을 세고, 그중 최빈 유형을 가족 성향으로 삼는다.
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
      const weeks = weekRows(row.weeks);
      return {
        key: row.key,
        name: row.name,
        face: row.face,
        color: row.color,
        fill: row.fill,
        scores: row.scores,
        scaleMax: 10,
        title: type ? `지난 시즌 성향 · ${type.name}` : "지난 시즌 성향 · 관찰 중",
        // 사람이 적어 둔 문장이 아니라 유형표의 고정 문구다.
        desc: type ? type.trait : "끝난 주차에 아직 유형이 정해질 만큼 기록이 쌓이지 않았어요.",
        trend: trendOf(weeks),
        weeks,
      };
    }),
  };
}

// ── 지난 시즌 주차 ──────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;

/** KST 자정 기준 날짜 문자열. 브라우저 시간대와 무관하게 한국 날짜로 끊긴다. */
const kstDate = (ms: number) => new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
const shortDay = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/** 엔진(`behavior-profile.ts`)이 붙이는 것과 **같은 모양**의 주차 이름. `8/3 – 8/9` */
const labelOf = (start: string) => `${shortDay(start)} – ${shortDay(kstDate(Date.parse(`${start}T00:00:00Z`) + 6 * DAY_MS))}`;

export type SeasonWindow = { start: string; weeks: { start: string; label: string }[] };

/**
 * 지금 시각이 속한 시즌의 **바로 앞 시즌** 4주. 시즌은 4주이고 월요일 0시(KST)에 갈리므로
 * `seasonDay` 가 준 "시즌 며칠째"에서 이번 시즌 시작일을 되짚고 28일을 더 뺀다.
 *
 * 서버에는 아직 시즌 경계를 아는 곳이 없다(`season-day.ts` 머리말). 그래서 경계는 화면이
 * 같은 상수 하나로 계산하고, 서버가 시즌 시작일을 주기 시작하면 여기만 갈아 끼운다.
 */
export function previousSeasonWindow(now: number = Date.now()): SeasonWindow {
  const { day } = seasonDay(now);
  const start = kstDate(now - (day - 1 + SEASON_DAYS) * DAY_MS);
  const startMs = Date.parse(`${start}T00:00:00Z`);
  return {
    start,
    weeks: Array.from({ length: SEASON_WEEKS }, (_, index) => {
      const weekStart = kstDate(startMs + index * 7 * DAY_MS);
      return { start: weekStart, label: labelOf(weekStart) };
    }),
  };
}

/**
 * 유형마다의 오각형 원형. 축 순서는 `axesFromCard` 와 같은
 * `[집중·분산·정확·직관·근거]` 이고, 보완쌍의 우열은 엔진 판정(`judgeCharacter`)과 맞춘다 —
 * 저격수인데 근거보다 직관이 높은 오각형이 그려지면 카드와 그림이 서로 다른 말을 한다.
 */
const TYPE_AXES: Record<TypeKey, number[]> = {
  sniper: [8.2, 3.4, 6.4, 3.6, 8.6],
  strategist: [3.6, 8.4, 6.8, 3.8, 8.0],
  fighter: [8.0, 3.2, 5.2, 8.4, 3.4],
  explorer: [3.4, 8.6, 5.6, 8.2, 3.6],
};

/** 데모 주차가 도는 순서. 네 주에 네 유형이라 **같은 유형이 두 번 나오지 않는다.** */
const DEMO_ROTATION: TypeKey[] = ["explorer", "fighter", "strategist", "sniper"];

/**
 * 사람마다 오각형을 조금씩 어긋나게 하는 값. 유형 넷을 순서만 바꿔 돌리면 네 주의 평균이
 * 모두 같아져 **가족 오각형이 한 겹으로 포개진다** — 겹쳐 보라고 만든 그림이 한 명짜리로
 * 보인다. 사람·축마다 ±0.8 안에서 정해진 만큼 어긋낸다(같은 입력이면 늘 같은 값이다).
 */
const jitterOf = (member: number, axis: number) => (((member * 7 + axis * 3) % 5) - 2) * 0.4;

/**
 * **데모용 지난 시즌 주차.** 지금 DB 에는 이번 시즌(2026-08-03~) 기록만 있어 지난 시즌
 * 주차가 하나도 없다. 그렇다고 이 자리를 빈 채로 두면 시연에서 `지난 시즌` 탭이 늘
 * "아직 되짚을 주차가 없어요" 한 줄이라 무엇을 만든 화면인지 보이지 않는다.
 *
 * 그래서 **거래 기록을 만들지 않고 화면에서만** 지난 시즌 4주를 세운다. 주차 이름은 실제
 * 지난 시즌 경계에서 나오고, 유형은 사람마다 다른 자리에서 시작하는 회전이라 **한 사람의
 * 네 주가 서로 다르고 사람끼리도 다르다.**
 *
 * **진짜 지난 시즌 기록이 쌓이면 이 함수는 쓰이지 않는다**(`lastSeasonRows`). 되살릴 값이
 * 아니라 없는 동안만 세워 두는 자리이므로, 서버가 지난 시즌 주차를 주기 시작하면 지운다.
 */
export function demoLastSeasonRows(
  members: FamilyRow[],
  window: SeasonWindow = previousSeasonWindow(),
): SeasonRow[] {
  return familyMembers(members).map((view, index) => {
    const weeks = window.weeks.map((week, weekIndex) => ({
      label: week.label,
      type: DEMO_ROTATION[(index + weekIndex) % DEMO_ROTATION.length],
      // 시즌이 갈수록 조금씩 늘어나는 매수 건수. 2~5 건 사이를 돈다.
      count: 2 + ((index + weekIndex) % 4),
    }));
    return {
      key: view.key,
      name: view.name,
      face: view.face,
      color: view.color,
      fill: view.fill,
      // 실제 지난 시즌과 같은 셈이다 — 주차 카드의 축 평균이 그 사람의 오각형이다.
      scores: meanAxes(weeks.map((week) =>
        TYPE_AXES[week.type as TypeKey].map((value, axis) =>
          Math.max(0, Math.min(10, value + jitterOf(index, axis))),
        ),
      )),
      weeks,
    };
  });
}

/**
 * `지난 시즌` 탭이 쓰는 주차. **진짜 지난 시즌 주차가 있으면 그것을**, 하나도 없으면
 * 데모 4주를 낸다 — 기록이 있는데 만든 값을 보여 주는 일은 없다.
 */
export function lastSeasonRows(members: FamilyRow[], now: number = Date.now()): SeasonRow[] {
  if (!members.length) return [];
  const window = previousSeasonWindow(now);
  const real = closedWeekRows(members, window);
  return real.length ? real : demoLastSeasonRows(members, window);
}
