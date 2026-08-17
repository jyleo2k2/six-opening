/**
 * 성향 탭·카드 모아보기·가족 비교가 쓰는 값. `ui-src/methods/buildArchive.js` 의
 * 성향 절반을 그대로 옮겨 왔다.
 *
 * 계산을 화면에서 떼어 두는 이유는 브라우저 없이 확인하기 위해서다.
 *
 * **값의 원본은 신버전 엔진(`shared/engine/behavior-profile.ts`) 하나다.** 예전에는 같은
 * 질문에 답하는 산식이 셋이었다 — 로컬 `records` 구버전(0~100), `GET /api/profile/behavior`
 * 의 행동 신호 근사, 그리고 `season-cards` 누적 카드. 셋이 서로 다른 시점에 도착하면서
 * 캐릭터가 `승부사 LV2 → 저격수 LV2 → 승부사 LV3` 으로 번갈아 떴다. 이제 이 파일에는
 * 신버전 값을 화면 모양으로 펴는 코드만 있고 판정 산식은 없다.
 */

import { pathFromRoute } from "../screen-route";
import type { Universe, UniverseLive } from "./use-universe";

export const TRAIT_LABELS = ["집중", "분산", "정확", "직관", "근거"] as const;

/**
 * 축 이름표를 눌렀을 때 카드 설명칸이 보여 주는 한 줄. `TRAIT_LABELS` 와 같은 순서다.
 *
 * **무엇을 재는지만 적는다** — 점수가 높으면 좋다·낮으면 나쁘다는 말도, 다음에 무엇을
 * 하라는 말도 넣지 않는다. 다섯 축은 지난 한 주의 행동을 되짚는 눈금이다.
 */
export const TRAIT_DESCS: readonly string[] = [
  "확신한 곳에 몰아 담은 정도예요. 담은 섹터가 적고 현금이 적을수록 높아요.",
  "여러 곳에 나눠 담은 정도예요. 집중의 반대쪽 축이에요.",
  "사고판 시점이 맞았는지예요. 산 뒤 오르거나 판 뒤 내리면 올라가요.",
  "느낌으로 빠르게 결정한 비율이에요. 근거의 반대쪽 축이에요.",
  "사기 전에 뉴스·기업정보·차트를 확인하고 결정한 비율이에요.",
];

export type TypeKey = "sniper" | "strategist" | "fighter" | "explorer";

/**
 * 어느 유형인지와 레벨은 엔진이 정한다. 여기 있는 건 이름·색·설명뿐이다.
 *
 * `desc` 는 한 주를 되짚는 카드 문구이고, `trait`·`sectors` 는 시즌을 통째로 되짚는
 * 지난 시즌 리포트가 쓴다(`archive-season.ts`). 셋 다 **지나간 행동을 설명하는 문구**다 —
 * 앞으로 무엇을 사라는 말을 여기에 넣지 않는다.
 */
export const TYPES: Record<
  TypeKey,
  { name: string; pal: string[]; desc: string; trait: string; sectors: string }
> = {
  sniper: {
    name: "저격수",
    pal: ["#FCE3B4", "#F7D08A", "#E3AF57", "#63430A"],
    desc: "찾아볼 건 다 찾아보고, 확신이 선 소수 섹터에 몰아 담았어요.\n근거는 촘촘하지만 한쪽으로 쏠려 있어요.",
    trait: "찾아볼 건 다 찾아보고 확신이 선 소수 종목에 몰아 담는 성향이에요.",
    sectors: "반도체·전자 같은 큰 기업",
  },
  strategist: {
    name: "전략가",
    pal: ["#F0F8CC", "#E3F09B", "#C6DA66", "#404F16"],
    desc: "알아본 뒤 여러 섹터에 나눠 담았어요.\n근거와 분산을 모두 챙긴 한 주였어요.",
    trait: "알아본 뒤 여러 곳에 나눠 담아 위험을 줄이는 성향이에요.",
    sectors: "금융·자동차처럼 익숙한 업종",
  },
  fighter: {
    name: "승부사",
    pal: ["#FCC7AB", "#F79F79", "#DE7B50", "#5E2410"],
    desc: "마음에 들면 바로 한 곳에 걸었어요.\n결정은 빠르지만 남긴 기록은 얇아요.",
    trait: "마음에 들면 빠르게 한 곳에 걸어보는 성향이에요.",
    sectors: "게임·방산처럼 움직임이 큰 종목",
  },
  explorer: {
    name: "탐험가",
    pal: ["#B2D2C7", "#87B6A7", "#619484", "#1B3F35"],
    desc: "여기저기 가볍게 조금씩 담거나 현금을 남겨뒀어요.\n부담은 적지만 확신은 아직 얕아요.",
    trait: "여기저기 조금씩 담아보며 부담을 낮추는 성향이에요.",
    sectors: "식품·엔터처럼 생활에서 아는 회사",
  },
};

/** 등락색. 다른 화면(`explore-cards`·`portfolio-view`)과 같은 두 색이다. */
const UP = "#E8322E";
const DOWN = "#1668DC";

/**
 * 성향 카드를 눌렀을 때 여는 시트가 보여 주는 **성향별 종목 세 개**.
 *
 * 목록은 사람이 정한 고정 표본이다 — 서버에 "이 성향이 무엇을 담았는지" 를 집계하는
 * 경로가 아직 없다. 집계 API 가 생기면 이 표를 지우고 응답을 그 자리에 꽂는다.
 *
 * `sub` 는 업종·시장 표기라 유니버스에서 뽑지 않고 여기 적는다 — `universe.js` 에는
 * 시장(코스피·코스닥) 칸이 없고, 이름·시세·로고만 유니버스에서 온다. `name` 은 유니버스가
 * 아직 안 실린 첫 프레임에 쓰는 대체 이름이다.
 */
export type TypePick = { code: string; name: string; sub: string };

export const TYPE_PICKS: Record<TypeKey, readonly TypePick[]> = {
  sniper: [
    { code: "005930", name: "삼성전자", sub: "반도체 · 코스피" },
    { code: "000660", name: "SK하이닉스", sub: "반도체 · 코스피" },
    { code: "066570", name: "LG전자", sub: "가전 · 코스피" },
  ],
  strategist: [
    { code: "105560", name: "KB금융", sub: "금융 · 코스피" },
    { code: "055550", name: "신한지주", sub: "금융 · 코스피" },
    { code: "005380", name: "현대차", sub: "자동차 · 코스피" },
  ],
  fighter: [
    { code: "012450", name: "한화에어로스페이스", sub: "방산 · 코스피" },
    { code: "329180", name: "HD현대중공업", sub: "조선 · 코스피" },
    { code: "259960", name: "크래프톤", sub: "게임 · 코스피" },
  ],
  explorer: [
    { code: "352820", name: "하이브", sub: "엔터 · 코스피" },
    { code: "271560", name: "오리온", sub: "식품 · 코스피" },
    { code: "278470", name: "에이피알", sub: "화장품 · 코스피" },
  ],
};

export const PICKS_LEAD = "같은 성향 투자자들이 많이 담은 종목이에요.";
/** 목록 아래 각주. 고르는 사람은 아이라 "참고용" 이라고 분명히 적는다. */
export const PICKS_NOTE = "추천은 참고용이에요. 왜 오를 것 같은지 이유를 적고 담아보세요.";
/** 유형이 아직 없을 때. 없는 성향의 종목을 지어내지 않는다. */
export const PICKS_PENDING = "아직 투자 유형이 정해지지 않아 보여 줄 종목이 없어요.\n조금 더 사고팔면 여기에 나타나요.";

export type PickRow = {
  code: string;
  name: string;
  sub: string;
  /** 로고 파일이 없으면 빈 문자열. 화면은 그때 동그라미만 그린다. */
  logo: string;
  priceText: string;
  changeText: string;
  changeColor: string;
  /** 누르면 갈 곳. 주소 만들기는 `screen-route` 하나가 안다. */
  path: string;
};

/**
 * 시트에 그릴 세 줄. 이름·로고·시세는 **유니버스와 5초 시세가 원본**이고 이 파일은
 * 코드와 업종 표기만 갖는다 — 같은 종목이 탐색 화면과 다른 값으로 보이면 안 된다.
 */
export function buildTypePicks(
  key: TypeKey | null,
  universe: Universe | null,
  quotes: UniverseLive["quotes"],
): PickRow[] {
  if (!key) return [];
  return TYPE_PICKS[key].map((pick) => {
    const stock = universe?.stocks.find((entry) => entry.code === pick.code) ?? null;
    const price = quotes[pick.code]?.price ?? stock?.price ?? 0;
    const rate = quotes[pick.code]?.rate ?? stock?.change ?? 0;
    // 등락률만으로 원화 변동폭을 되짚는다: price = prevClose * (1 + rate/100).
    // 탐색 카드(`explore-cards`)와 같은 식이라 두 화면의 변동폭이 어긋나지 않는다.
    const base = 100 + rate;
    const changeWon = base === 0 ? 0 : Math.abs(Math.round((price * rate) / base));
    const up = rate >= 0;
    const sign = up ? "+" : "−";
    return {
      code: pick.code,
      name: stock?.name ?? pick.name,
      sub: pick.sub,
      logo: universe?.logos?.[pick.code] ? `/ui/${universe.logos[pick.code]}` : "",
      priceText: `${Math.round(price).toLocaleString("ko-KR")}원`,
      changeText: `${sign}${changeWon.toLocaleString("ko-KR")} (${sign}${Math.abs(rate).toFixed(1)}%)`,
      changeColor: up ? UP : DOWN,
      path: pathFromRoute({ screen: "order", code: pick.code, side: "buy" }),
    };
  });
}

/**
 * 모든 축의 중립값. 엔진의 `NEUTRAL`(`behavior-profile.ts`)과 같은 값이어야 한다 —
 * 표본이 없을 때 엔진이 내놓는 값과 화면이 그리는 값이 달라지면 안 된다.
 */
export const NEUTRAL_SCORE = 5;

/** 다섯 축 모두 중립. 응답이 없거나 표본이 모자랄 때 오각형이 이 모양이다. */
export const NEUTRAL_SCORES = TRAIT_LABELS.map(() => NEUTRAL_SCORE);

/** 유형을 아직 말할 수 없을 때 쓰는 무채색. 네 캐릭터 팔레트와 섞이지 않는다. */
const PENDING_PAL = ["#F1F2F7", "#E5E7EF", "#D4D8E5", "#5B6280"];

/** 서버가 예전 이름으로 준 캐릭터를 지금 이름에 맞춘다. */
const CHARACTER_ALIAS: Record<string, TypeKey> = { challenger: "fighter" };

export function typeKeyOf(character: string | null | undefined): TypeKey | null {
  if (!character) return null;
  const mapped = CHARACTER_ALIAS[character] ?? (character as TypeKey);
  return mapped in TYPES ? mapped : null;
}

export const ASSETS = "/ui/assets/archive/";
export const typeImage = (key: TypeKey) => `${ASSETS}type-${key}.png`;

export function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** 화면에 찍는 숫자는 두 스케일 모두 정수다. 좌표·막대는 반올림 전 원값 비율을 쓴다. */
export const formatScore = (v: number) => String(Math.round(v));

/** 오각형 위 한 점. 축은 12시부터 시계방향 72도씩. */
export function pointAt(index: number, ratio: number, radius: number, cx: number, cy: number) {
  const angle = ((-90 + index * 72) * Math.PI) / 180;
  const r = radius * Math.max(0.1, Math.min(1, ratio));
  return [(cx + r * Math.cos(angle)).toFixed(1), (cy + r * Math.sin(angle)).toFixed(1)] as const;
}

/** 라벨은 SVG 밖 퍼센트 좌표에 얹는다 — 반지름 1.32배 자리. */
export function labelAt(index: number, radius: number, cx: number, cy: number, box: number, spread = 1.32) {
  const angle = ((-90 + index * 72) * Math.PI) / 180;
  return {
    left: ((cx + radius * spread * Math.cos(angle)) / box) * 100,
    top: ((cy + radius * spread * Math.sin(angle)) / box) * 100,
  };
}

export function gridRings(radius: number, cx: number, cy: number) {
  return [0.25, 0.5, 0.75, 1].map((k) => ({
    points: TRAIT_LABELS.map((_, i) => pointAt(i, k, radius, cx, cy).join(",")).join(" "),
  }));
}

/** `season-cards` 카드의 다섯 축을 화면 순서(집중·분산·정확·직관·근거)로 편다. */
export type AbilityCard = {
  scores: {
    focus: number;
    diversification: number;
    accuracy: number;
    intuition: number;
    evidence: number;
  };
  character?: string | null;
  level?: number | null;
  samples?: { buys?: number; sells?: number };
};

export const axesFromCard = (card: AbilityCard) => [
  card.scores.focus,
  card.scores.diversification,
  card.scores.accuracy,
  card.scores.intuition,
  card.scores.evidence,
];

export type SeasonCards = {
  cumulative?: AbilityCard | null;
  weeks?: { weekStart: string; count: number; card: AbilityCard }[];
} | null;

export type Profile = {
  scores: number[];
  scaleMax: number;
  /** 엔진이 정확 표본으로 정한 레벨. 표본이 모자라면 `null` 이고 화면은 레벨을 감춘다. */
  level: number | null;
  characterKey: TypeKey | null;
  sampleCount: number;
};

/**
 * 성향 탭이 그릴 내 성향. **원본은 `season-cards` 누적 카드(0~10) 하나다.**
 *
 * 응답이 없으면(비로그인·조회 실패) 축을 중립 5로 두고 유형을 비워 둔다. 예전에는 로컬
 * `kw_proto_v1` 기록을 구버전 산식으로 다시 계산해 채웠는데, 그 값이 서버 응답보다 먼저
 * 도착해 캐릭터가 한 번 떴다가 바뀌었다. 없는 것은 없다고 두는 편이 정직하고 조용하다.
 */
export function myProfile(season: SeasonCards): Profile {
  const cumulative = season?.cumulative;
  if (!cumulative) {
    return {
      scores: NEUTRAL_SCORES,
      scaleMax: 10,
      level: null,
      characterKey: null,
      sampleCount: 0,
    };
  }
  return {
    scores: axesFromCard(cumulative),
    scaleMax: 10,
    // 표본이 모자라면 엔진이 `null` 을 준다. 2로 채우면 판정된 LV2 와 구별되지 않는다.
    level: cumulative.level ?? null,
    characterKey: typeKeyOf(cumulative.character),
    sampleCount: (cumulative.samples?.buys ?? 0) + (cumulative.samples?.sells ?? 0),
  };
}

export type ResolvedType = {
  /** 유형이 정해졌을 때만 있다. 캐릭터 그림 파일 이름이 이 값으로 만들어진다. */
  key: TypeKey | null;
  name: string;
  desc: string;
  pal: string[];
  ink: string;
  level: number | null;
  title: string;
  /** 아직 유형을 말할 수 없다. 화면은 캐릭터 그림을 그리지 않는다. */
  pending: boolean;
};

/**
 * 유형을 아직 못 정한 카드. 엔진이 `character: null` 을 줄 때다 — 체결 매수가
 * `MIN_BUYS_FOR_PROFILE` 미만이거나 보완쌍이 동점대(`TIE_BAND`)라 한쪽으로 기울지 않았다.
 * 그 판단을 구버전 산식으로 덮지 않는다. 오각형은 중립 5 그대로 그린다.
 */
export const PENDING_TYPE: ResolvedType = {
  key: null,
  name: "관찰 중",
  desc: "아직 투자 유형을 말할 만큼 기록이 쌓이지 않았어요.\n조금 더 사고팔면 여기에 나타나요.",
  pal: PENDING_PAL,
  ink: PENDING_PAL[3],
  level: null,
  title: "관찰 중",
  pending: true,
};

/**
 * 엔진이 정한 유형 키를 화면 값(이름·색·설명)으로 편다. **판정은 하지 않는다.**
 * 키가 없으면 판정 보류 카드이고, 레벨이 없으면 이름만 적는다.
 */
export function resolveType(key: TypeKey | null, level: number | null): ResolvedType {
  if (!key) return PENDING_TYPE;
  const meta = TYPES[key];
  return {
    key,
    name: meta.name,
    desc: meta.desc,
    pal: meta.pal,
    ink: meta.pal[3],
    level,
    title: level ? `${meta.name} LV${level}` : meta.name,
    pending: false,
  };
}

/** 월요일 0시. 주차 묶음의 기준이다. */
export function mondayOf(ts: number | string) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const monthDay = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

/**
 * `8월 3주차`. 카드 레일의 주차 표기와 머리말 주차가 **같은 식으로** 세야 한다 —
 * 머리말이 4주차인데 가운데 카드가 3주차면 어느 쪽이 지금인지 알 수 없다.
 */
export function weekLabel(monday: Date) {
  return `${monday.getMonth() + 1}월 ${Math.ceil(monday.getDate() / 7)}주차`;
}

export type WeekCard = {
  key: number;
  week: string;
  date: string;
  title: string;
  type: ResolvedType;
  desc: string;
  scores: number[];
  scaleMax: number;
};

/**
 * 카드 모아보기 — 한 주에 한 장. **서버가 채점한 주 + 이번 주**를 오래된 순으로 낸다.
 *
 * 주차 목록도 `season-cards` 가 원본이다. 예전에는 로컬 `records` 에만 있는 주를 구버전
 * 산식으로 재계산해 끼워 넣어서, 같은 레일 안에 0~10 카드와 0~100 카드가 섞였다.
 * 이번 주 카드는 성향 탭과 같은 값을 쓴다 — 한 화면에서 같은 주가 다른 유형이면 안 된다.
 */
export function weekCards(
  season: SeasonCards,
  mine: Profile,
  myType: ResolvedType,
  now = Date.now(),
): WeekCard[] {
  const thisMonday = mondayOf(now).getTime();

  const seasonByKey = new Map<number, { count: number; card: AbilityCard }>();
  for (const w of season?.weeks ?? []) {
    seasonByKey.set(new Date(`${w.weekStart}T00:00:00`).getTime(), w);
  }

  const keys = [...new Set([...seasonByKey.keys(), thisMonday])].sort((a, b) => a - b);

  return keys.map((k) => {
    // 이번 주는 서버 주차 카드가 아직 없을 수 있다. 그때도 성향 탭 값을 그대로 쓴다.
    const isNow = k === thisMonday;
    const seasonWeek = seasonByKey.get(k);
    const useMine = isNow || !seasonWeek;
    const scores = useMine ? mine.scores : axesFromCard(seasonWeek.card);
    const count = seasonWeek?.count ?? 0;
    const type = useMine
      ? myType
      : resolveType(typeKeyOf(seasonWeek.card.character), seasonWeek.card.level ?? null);
    const scaleMax = 10;
    const monday = new Date(k);
    const sunday = new Date(k + 6 * 86400000);
    return {
      key: k,
      week: weekLabel(monday),
      date: `${monthDay(monday)} – ${monthDay(sunday)}`,
      title: type.title,
      type,
      desc:
        count > 0
          ? type.desc
          : isNow
            ? "이번 주는 아직 산 게 없어요.\n한 번 사고 나면 여기에 채워질 거예요."
            : "이 주는 산 게 없었어요.",
      scores,
      scaleMax,
    };
  });
}

export type FamilyMember = {
  key: string;
  name: string;
  face: string;
  color: string;
  fill: string;
  has: boolean;
  scores: number[];
  scaleMax: number;
  title: string;
  desc: string;
};

const FAMILY_COLORS = [
  { color: "#7FD2FF", fill: "rgba(96,190,255,0.3)" },
  { color: "#FF8AD0", fill: "rgba(245,50,127,0.26)" },
  { color: "#FFD84D", fill: "rgba(255,197,61,0.24)" },
];

/** 이름만으로 아빠·엄마 얼굴을 고른다. `guardian_role` 이 비어 있는 행도 있어서다. */
export const isDadName = (name: string) => /아빠|부/.test(name || "");

export const faceOf = (role: string, name: string) =>
  role === "child" ? `${ASSETS}face-me.jpg` : isDadName(name) ? `${ASSETS}face-dad.jpg` : `${ASSETS}face-mom.jpg`;

export type FamilyRow = {
  id: number | string;
  name: string;
  role: string;
  returnRate?: number | null;
  behavior?: {
    scores?: Record<string, number>;
    samples?: { buys?: number; sells?: number };
    character?: string | null;
    level?: number | null;
  } | null;
};

/**
 * 가족 비교 오각형. 타인 성향도 같은 서버 엔진이 계산한 값이라 스케일은 0~10이다.
 * 점수를 못 받은 축은 중립 5로 둔다 — 0으로 두면 안 담은 축이 "최악"처럼 보인다.
 */
export function familyMembers(members: FamilyRow[]): FamilyMember[] {
  return members.map((member, index) => {
    const behavior = member.behavior ?? {};
    const scores = ["focus", "diversification", "accuracy", "intuition", "evidence"].map((key) => {
      const value = Number(behavior.scores?.[key]);
      return Number.isFinite(value) ? value : 5;
    });
    const samples = behavior.samples ?? {};
    const has = Number(samples.buys ?? 0) + Number(samples.sells ?? 0) > 0;
    const key = typeKeyOf(behavior.character);
    const meta = key ? TYPES[key] : null;
    const color = FAMILY_COLORS[index % FAMILY_COLORS.length];
    return {
      key: `db_${member.id}`,
      name: member.name,
      face: faceOf(member.role, member.name),
      color: color.color,
      fill: color.fill,
      has,
      scores,
      scaleMax: 10,
      title: meta ? meta.name + (behavior.level ? ` LV${behavior.level}` : "") : has ? "관찰 중" : "",
      desc: has
        ? (meta?.desc ?? "거래 기록이 더 쌓이면 투자 유형도 함께 보여요.")
        : "아직 체결된 거래가 없어요.\n한 번 사고 나면 성향이 만들어져요.",
    };
  });
}
