/**
 * 홈 헤더 칩 "시즌 3 · 15일째" 가 쓰는 시즌 번호와 시즌 안의 날짜.
 *
 * 한 시즌은 4주(28일)이고 월요일 0시(KST)에 갈린다. **기준점 하나만 상수로 두고
 * 나머지는 오늘 날짜에서 계산한다** — 예전에는 시즌 번호와 "28일째" 가 역할별 데모
 * 상수로 박혀 있어서 날이 가도 그대로였고, 세 계정이 서로 다른 날짜를 보인 적도 있다.
 *
 * 서버에는 아직 시즌 경계를 아는 곳이 없다(`archive-season.ts` 머리말). 서버가 시즌
 * 시작일을 주기 시작하면 `SEASON_3_START` 를 그 값으로 갈아 끼우는 것으로 끝난다.
 */

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;

/** 한 시즌은 4주다. */
export const SEASON_WEEKS = 4;

/** 한 시즌의 날 수. 시즌 안의 일수는 1..28 을 돈다. */
export const SEASON_DAYS = SEASON_WEEKS * 7;

/**
 * 시즌 3이 시작한 월요일(KST). 2026-08-17 이 시즌 3의 3주차 월요일이라는 기준에서
 * 두 주를 되짚은 날이다. 이 날짜 하나가 앞뒤 모든 시즌 경계를 정한다.
 */
export const SEASON_3_START = "2026-08-03";

/**
 * KST 자정 기준 날짜 일련번호. 날짜끼리 빼기만 하므로 시차가 남지 않고, 브라우저의
 * 로컬 시간대와 무관하게 한국 날짜로 끊긴다 — 시차가 다른 곳에서 열어도 같은 날짜다.
 */
const kstDayIndex = (ms: number) => Math.floor((ms + KST_OFFSET_MS) / DAY_MS);

const ANCHOR_SEASON = 3;
const ANCHOR_DAY = kstDayIndex(Date.parse(`${SEASON_3_START}T00:00:00+09:00`));

export type SeasonDay = {
  /** 1부터 세는 시즌 번호. */
  season: number;
  /** 시즌 안에서 오늘이 며칠째인지(1~28). */
  day: number;
  /** 시즌 안에서 이번 주가 몇 주차인지(1~4). */
  week: number;
};

/**
 * `now` 가 속한 시즌과 그 안의 날짜. 인자를 비우면 지금 시각이다 — 시각을 받는 이유는
 * 브라우저 없이 경계를 확인하기 위해서다.
 *
 * 시즌 1 시작(2026-06-08) 이전은 시즌 1의 첫날로 묶는다. 시즌 0이나 음수 일수는
 * 화면에 세울 값이 아니다.
 */
export function seasonDay(now: number = Date.now()): SeasonDay {
  const elapsed =
    kstDayIndex(now) - ANCHOR_DAY + (ANCHOR_SEASON - 1) * SEASON_DAYS;
  const fromStart = Math.max(0, elapsed);
  const inSeason = fromStart % SEASON_DAYS;
  return {
    season: Math.floor(fromStart / SEASON_DAYS) + 1,
    day: inSeason + 1,
    week: Math.floor(inSeason / 7) + 1,
  };
}

/** 홈 헤더 칩 문구. 화면은 이 문자열만 받는다. */
export function seasonDayText(now: number = Date.now()): string {
  const { season, day } = seasonDay(now);
  return `시즌 ${season} · ${day}일째`;
}
