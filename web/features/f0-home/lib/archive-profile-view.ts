import {
  computeAbilityScores,
  gradeAccuracy,
  resolveCharacter,
} from "../../../shared/engine/archive-profile.js";

/**
 * 성향 탭·카드 모아보기·가족 비교가 쓰는 값. `ui-src/methods/buildArchive.js` 의
 * 성향 절반을 그대로 옮겨 왔다.
 *
 * 계산을 화면에서 떼어 두는 이유는 브라우저 없이 확인하기 위해서다 — 오각형은 스케일이
 * 두 벌(0~10 로그인 정본 / 0~100 비로그인 폴백)이라 섞이면 모양이 조용히 거짓말을 한다.
 */

export const TRAIT_LABELS = ["집중", "분산", "정확", "직관", "근거"] as const;

export const TRAIT_META = [
  { color: "#FFC53D", desc: "확신한 곳에 몰아 담은 정도예요. 담은 섹터가 적고 현금이 적을수록 높아요." },
  { color: "#4FC3F7", desc: "여러 곳에 나눠 담은 정도예요. 집중의 반대쪽 축이에요." },
  { color: "#7BE3A0", desc: "사고판 시점이 맞았는지예요. 산 뒤 오르거나 판 뒤 내리면 올라가요." },
  { color: "#FF8AD0", desc: "느낌으로 빠르게 결정한 비율이에요. 근거의 반대쪽 축이에요." },
  { color: "#9B8CFF", desc: "사기 전에 뉴스·기업정보·차트를 확인하고 결정한 비율이에요." },
] as const;

export type TypeKey = "sniper" | "strategist" | "fighter" | "explorer";

/** 어느 유형인지와 레벨은 엔진이 정한다. 여기 있는 건 이름·색·설명뿐이다. */
export const TYPES: Record<TypeKey, { name: string; pal: string[]; desc: string }> = {
  sniper: {
    name: "저격수",
    pal: ["#FCE3B4", "#F7D08A", "#E3AF57", "#63430A"],
    desc: "찾아볼 건 다 찾아보고, 확신이 선 소수 섹터에 몰아 담았어요.\n근거는 촘촘하지만 한쪽으로 쏠려 있어요.",
  },
  strategist: {
    name: "전략가",
    pal: ["#F0F8CC", "#E3F09B", "#C6DA66", "#404F16"],
    desc: "알아본 뒤 여러 섹터에 나눠 담았어요.\n근거와 분산을 모두 챙긴 한 주였어요.",
  },
  fighter: {
    name: "승부사",
    pal: ["#FCC7AB", "#F79F79", "#DE7B50", "#5E2410"],
    desc: "마음에 들면 바로 한 곳에 걸었어요.\n결정은 빠르지만 남긴 기록은 얇아요.",
  },
  explorer: {
    name: "탐험가",
    pal: ["#B2D2C7", "#87B6A7", "#619484", "#1B3F35"],
    desc: "여기저기 가볍게 조금씩 담거나 현금을 남겨뒀어요.\n부담은 적지만 확신은 아직 얕아요.",
  },
};

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

export type TradeRecord = {
  user_id?: string;
  /** 엔진은 종목·이유를 필수로 본다. 화면 기록에는 늘 들어 있다. */
  symbol: string;
  reason_code: string;
  order_status?: string;
  qty?: number;
  amount_krw?: number;
  /** 체결 시각. 정확 채점과 주차 묶음이 쓴다. */
  ts: string;
};

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

/** 종목별 보관 일봉 종가. 정확 채점이 산 뒤·판 뒤 값을 여기서 읽는다. */
export type DailyCloses = Record<string, { date: string; close: number }[]>;

/** 로컬 `kw_proto_v1` 기록으로 낸 구버전(0~100) 점수. 비로그인·응답 전 폴백이다. */
export function localScores(
  records: TradeRecord[],
  sellRecords: TradeRecord[],
  closes: DailyCloses,
  userId: string,
  sectorOf: (code: string) => string | null,
) {
  const mine = records.filter((r) => r.user_id === userId);
  // 정확 채점 입력. 대기 주문은 체결이 아니라 빼고, 매수가는 주문금액 ÷ 주 수로 낸다.
  const buys = records
    .filter(
      (r) =>
        r.user_id === userId &&
        r.order_status === "filled" &&
        (r.qty ?? 0) > 0 &&
        (r.amount_krw ?? 0) > 0,
    )
    .map((r) => ({ symbol: r.symbol, price: (r.amount_krw as number) / (r.qty as number), tradedAt: r.ts }));
  const sells = sellRecords
    .filter((r) => r.user_id === userId && r.order_status === "filled")
    .map((r) => ({ symbol: r.symbol, tradedAt: r.ts }));
  const grade = gradeAccuracy(buys, sells, closes);
  const out = computeAbilityScores(mine, sectorOf, grade.accuracy);
  return { count: out.count as number, scores: out.scores as number[], level: grade.level as number };
}

export type Profile = {
  scores: number[];
  scaleMax: number;
  level: number;
  characterKey: TypeKey | null;
  sampleCount: number;
};

/**
 * 성향 탭이 그릴 내 성향. **로그인 정본은 `season-cards` 누적 카드(0~10)** 이고,
 * 없으면 로컬 기록으로 낸 구버전(0~100)으로 폴백한다.
 */
export function myProfile(
  season: SeasonCards,
  fallback: { count: number; scores: number[]; level: number },
): Profile {
  const cumulative = season?.cumulative;
  if (cumulative) {
    return {
      scores: axesFromCard(cumulative),
      scaleMax: 10,
      level: cumulative.level || 2,
      characterKey: typeKeyOf(cumulative.character),
      sampleCount: (cumulative.samples?.buys ?? 0) + (cumulative.samples?.sells ?? 0),
    };
  }
  return {
    scores: fallback.scores,
    scaleMax: 100,
    level: fallback.level,
    characterKey: null,
    sampleCount: fallback.count,
  };
}

export type ResolvedType = {
  key: TypeKey;
  name: string;
  desc: string;
  pal: string[];
  ink: string;
  level: number;
  title: string;
};

/**
 * `overrideKey` 가 있으면 로그인 사용자의 실제 행동 데이터로 정한 캐릭터를 그대로 쓴다
 * (F9 SPEC §3.2 대체 입력). 다섯 축 막대·레벨 산식은 바뀌지 않는다.
 */
export function resolveType(
  scores: number[],
  level: number | null,
  overrideKey?: TypeKey | null,
): ResolvedType {
  // 엔진은 레벨을 1·2·3 으로만 받는다. 없으면(로컬 주차 재계산) 정확 점수로 되짚게 둔다.
  const graded = level === 1 || level === 2 || level === 3 ? level : undefined;
  const decided = overrideKey
    ? { key: overrideKey as string, level }
    : (resolveCharacter(scores, graded) as { key: string; level: number });
  const key = (typeKeyOf(decided.key) ?? "sniper") as TypeKey;
  const meta = TYPES[key];
  const lv = decided.level ?? 2;
  return {
    key,
    name: meta.name,
    desc: meta.desc,
    pal: meta.pal,
    ink: meta.pal[3],
    level: lv,
    title: `${meta.name} LV${lv}`,
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
 * 카드 모아보기 — 한 주에 한 장. **기록이 있는 주 + 이번 주**를 오래된 순으로 낸다.
 *
 * 로그인 상태의 지난 주차는 서버가 실제로 채점한 `season-cards` 값이 로컬 재계산보다
 * 우선한다. 이번 주 카드만은 성향 탭과 같은 값을 써야 한다 — 한 화면에서 같은 주가
 * 다른 유형으로 보이면 안 된다.
 */
export function weekCards(
  season: SeasonCards,
  mine: Profile,
  myType: ResolvedType,
  records: TradeRecord[],
  userId: string,
  sectorOf: (code: string) => string | null,
  now = Date.now(),
): WeekCard[] {
  const myRecords = records.filter((r) => r.user_id === userId);
  const localWeeks = new Map<number, TradeRecord[]>();
  for (const r of myRecords) {
    const k = mondayOf(r.ts ?? now).getTime();
    localWeeks.set(k, [...(localWeeks.get(k) ?? []), r]);
  }
  const thisMonday = mondayOf(now).getTime();

  const seasonByKey = new Map<number, { count: number; card: AbilityCard }>();
  for (const w of season?.weeks ?? []) {
    seasonByKey.set(new Date(`${w.weekStart}T00:00:00`).getTime(), w);
  }

  const keys = [...new Set([...localWeeks.keys(), ...seasonByKey.keys(), thisMonday])].sort(
    (a, b) => a - b,
  );

  return keys.map((k) => {
    const isNow = k === thisMonday;
    const seasonWeek = seasonByKey.get(k);
    let scores: number[];
    let scaleMax: number;
    let level: number | null;
    let count: number;
    let characterKey: TypeKey | null;

    if (isNow) {
      scores = mine.scores;
      scaleMax = mine.scaleMax;
      level = mine.level;
      count = (localWeeks.get(thisMonday) ?? []).length;
      characterKey = mine.characterKey;
    } else if (seasonWeek) {
      scores = axesFromCard(seasonWeek.card);
      scaleMax = 10;
      level = seasonWeek.card.level || 2;
      count = seasonWeek.count;
      characterKey = typeKeyOf(seasonWeek.card.character);
    } else {
      const raw = localWeeks.get(k) ?? [];
      scores = computeAbilityScores(raw, sectorOf).scores as number[];
      scaleMax = 100;
      level = null;
      count = raw.length;
      characterKey = null;
    }

    const type = isNow ? myType : resolveType(scores, level, characterKey);
    const monday = new Date(k);
    const sunday = new Date(k + 6 * 86400000);
    return {
      key: k,
      week: isNow
        ? "이번 주"
        : `${monday.getMonth() + 1}월 ${Math.ceil((monday.getDate() + 6) / 7)}주차`,
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
