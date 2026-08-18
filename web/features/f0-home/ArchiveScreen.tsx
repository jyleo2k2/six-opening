"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PROTOTYPE_PHONE } from "./lib/phone-frame";
import { BottomNav } from "./BottomNav";
import { styleFromCss } from "./lib/css-style";
import { ACCENT, familySummary, feedCards, FEED_LIMIT, LANE_HEIGHT, returnSummary, runners, RUN_START } from "./lib/archive-feed";
import {
  buildTypePicks,
  familyMembers,
  formatScore,
  gridRings,
  labelAt,
  mondayOf,
  myProfile,
  PICKS_LEAD,
  PICKS_NOTE,
  PICKS_PENDING,
  pointAt,
  resolveType,
  rgba,
  TRAIT_DESCS,
  TRAIT_LABELS,
  typeImage,
  weekCards,
  weekLabel,
  type FamilyMember,
  type ResolvedType,
  type WeekCard,
} from "./lib/archive-profile-view";
import { useArchiveData } from "./lib/use-archive-data";
import { closedWeekRows, seasonReport } from "./lib/archive-season";
import { useRailDrag } from "./lib/use-rail-drag";
import { useSheetDrag } from "./lib/use-sheet-drag";
import { useUniverseLive } from "./lib/use-universe";
import { useWallet, type WalletAccountId } from "./lib/use-wallet";
import { PhoneFrame } from "./PhoneFrame";

/**
 * 성장 아카이브. `ui-src/screens/archive.html` 과 `methods/buildArchive.js` 를 옮겨 왔다.
 *
 * 값 계산은 `lib/archive-profile-view.ts`(성향)·`lib/archive-feed.ts`(수익률)·
 * `lib/archive-season.ts`(지난 시즌)가 하고 여기는 붙이기만 한다.
 *
 * **자리는 셋이고 첫 화면만 개인 것이다.** 들어오면 로그인한 사람의 주차 성향 카드가
 * 레일로 깔리고(`cards`), 가족 것은 두 자리다 — `성향 리포트`(`family`)가 가족 성향을
 * `지금까지`·`지난 주차`로 갈아 끼우고, `투자 현황`(`return`)이 수익률 자리다.
 * 돌아오는 길은 머리의 `‹` 다.
 *
 * **지난 주차도 Supabase 다**(2026-08-17). `/api/family` 가 구성원마다 주차 카드를 함께
 * 주고 `archive-season.ts` 가 끝난 주만 골라 편다. 예전에 있던 4주 표본 픽스처는 지웠다 —
 * 되짚을 주가 없으면 빈 자리 문구를 세우고 가짜 값을 그리지 않는다.
 *
 * **가족으로 가는 문은 첫 화면 아래 `우리 가족 투자 보기` 하나다**(2026-08-17). 머리에
 * 있던 분홍 단추 둘과 제목 옆 지갑을 지우고 목업대로 시트 한 장으로 모았다 — 첫 화면의
 * 주인공은 내 성향 카드이고, 가족 숫자는 그 위에 얹히면 카드보다 먼저 읽힌다.
 * 시트가 가족 총자산과 두 갈래(`성향 리포트`·`투자 현황`)를 함께 들고 있으므로 어디로
 * 가는지는 시트 안에서 정한다. 튜토리얼이 짚는 `id="tut-archive-family"` 는 그 문에 있다.
 *
 * **`보유 종목 · 섹터별` 레일은 2026-08-16 지웠다.** 그 레일에서만 열리던 섹터 상세 모달은
 * 이관 때 이미 빠져 도달 불가로 남아 있었고(F9 SPEC §7), 디자인 목업에도 레일이 없다.
 * 계산하던 `lib/archive-sectors.ts` 와 그 테스트도 같은 변경에서 지웠다 — 되살리려면
 * 레일부터 다시 설계한다.
 *
 * **카드 시트는 성향별 종목 세 개다**(2026-08-17). 다섯 축 막대를 지우고 디자인 목업의
 * "같은 성향 투자자들이 많이 담은 종목" 자리로 바꿨다. 목록·문구는
 * `archive-profile-view.ts` 의 `TYPE_PICKS` 가 갖고, 한 줄을 누르면 `/buy/{code}` 로 나가
 * 주문 화면이 이어받는다 — 목업이 시트 안에 넣은 3단계 주문 흐름은 옮기지 않았다.
 * **목표가·수익률 전망·"지금 사라" 는 여기에 넣지 않는다.**
 */
const PAGE = styleFromCss(
  "position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column;background:#F7F6FB",
);
const TITLE = styleFromCss(
  "font-size:27px;font-weight:800;color:#001E5A;letter-spacing:-0.025em;margin-top:2px",
);
/**
 * 첫 화면 아래 가족으로 가는 문. 탭이 아니라 문이라 **켜짐·꺼짐이 없다** — 누르면
 * 시트가 올라오고 어디로 갈지는 거기서 고른다.
 */
const FAMILY_DOOR = styleFromCss(
  "display:flex;align-items:center;gap:12px;padding:17px 18px;border-radius:20px;cursor:pointer;" +
    "background:#F4F2FE;box-shadow:inset 0 0 0 1px #E3E0F5,0 2px 8px -4px rgba(30,25,60,0.18)",
);
/** 시트 안의 두 갈래. 문과 같은 연보라를 쓰되 한 겹 안이라 그림자를 뺀다. */
const FAMILY_ROW = styleFromCss(
  "display:flex;align-items:center;gap:11px;padding:16px 17px;border-radius:18px;cursor:pointer;" +
    "background:#F4F2FE;box-shadow:inset 0 0 0 1px #E3E0F5",
);
const DOOR_LABEL = styleFromCss(
  "flex:1;min-width:0;font-size:16px;font-weight:800;color:#1A1F4B;letter-spacing:-0.02em;white-space:nowrap",
);
const DOOR_CHEVRON = styleFromCss("flex:none;font-size:17px;font-weight:800;color:#E5007E;line-height:1");
const tabStyle = (on: boolean) =>
  styleFromCss(
    "flex:1;text-align:center;padding:11px 0;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;" +
      "white-space:nowrap;transition:all 0.18s;" +
      (on ? "color:#fff;background:#001E5A" : "color:#7C819A;background:#EAEBF3"),
  );
const BODY = styleFromCss(
  "flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:0 16px;display:flex;flex-direction:column",
);
const BACK = styleFromCss(
  "width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;" +
    "font-size:22px;font-weight:800;line-height:1;padding-bottom:2px;color:#001E5A;cursor:pointer;" +
    "background:#FFFFFF;box-shadow:0 2px 8px rgba(30,25,60,0.14),inset 0 0 0 1px #E4E6F1",
);
/**
 * ⓘ 안내가 서는 층. **카드 레일(`2`)보다 위**여야 한다 — 아래에 두면 확대된 가운데
 * 카드가 안내를 덮어 무슨 말인지 보이지 않는다. 시트(`6`·`7`)보다는 낮게 둔다:
 * 시트가 올라오면 안내는 그 뒤로 가려지는 것이 맞다.
 */
const INFO_Z = 5;
const SHEET_RATIO = 0.82;
const SHEET_HEIGHT = PROTOTYPE_PHONE.screenHeight * SHEET_RATIO;
/**
 * 가족 시트는 내용만큼만 자란다. 쓸어내려 닫는 판정은 시트 높이를 알아야 하므로
 * 대략의 높이를 준다 — 실제보다 조금 크게 잡으면 닫히는 문턱이 그만큼 멀어질 뿐이다.
 */
const FAM_SHEET_HEIGHT = PROTOTYPE_PHONE.screenHeight * 0.46;

/** 오각형 한 장. 성향 카드·주차 카드가 같은 것을 쓴다(반지름과 색만 다르다). */
function Radar({
  scores,
  scaleMax,
  ink,
  box = 160,
  radius = 48,
  labelSize = 9.5,
  onPick,
  picked,
}: {
  scores: number[];
  scaleMax: number;
  ink: string;
  box?: number;
  radius?: number;
  labelSize?: number;
  onPick?: (index: number) => void;
  picked?: number | null;
}) {
  const center = box / 2;
  const dots = scores.map((score, i) => pointAt(i, score / scaleMax, radius, center, center));
  return (
    <div style={{ flex: 1, minWidth: 0, position: "relative", aspectRatio: "1/1" }}>
      <svg
        style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block", overflow: "visible" }}
        viewBox={`0 0 ${box} ${box}`}
      >
        {gridRings(radius, center, center).map((ring, i) => (
          <polygon fill="none" key={i} points={ring.points} stroke={rgba(ink, 0.18)} strokeWidth="0.8" />
        ))}
        {scores.map((_, i) => {
          const outer = pointAt(i, 1, radius, center, center);
          return (
            <line
              key={i}
              stroke={rgba(ink, 0.16)}
              strokeWidth="0.8"
              x1={center}
              x2={outer[0]}
              y1={center}
              y2={outer[1]}
            />
          );
        })}
        <polygon
          fill={rgba(ink, 0.24)}
          points={dots.map((d) => d.join(",")).join(" ")}
          stroke={ink}
          strokeLinejoin="round"
          strokeWidth="2"
        />
        {dots.map((dot, i) => (
          <circle
            cx={dot[0]}
            cy={dot[1]}
            fill={picked === i ? "#FFFFFF" : ink}
            key={i}
            r={picked === i ? 4.2 : 2.4}
            stroke="#FFFFFF"
            strokeWidth="1"
          />
        ))}
      </svg>
      {scores.map((score, i) => {
        const at = labelAt(i, radius, center, center, box);
        const on = picked === i;
        return (
          <div
            key={i}
            onClick={onPick ? (event) => { event.stopPropagation(); onPick(i); } : undefined}
            style={{
              position: "absolute",
              left: `${at.left.toFixed(1)}%`,
              top: `${at.top.toFixed(1)}%`,
              transform: "translate(-50%,-50%)",
              whiteSpace: "nowrap",
              cursor: onPick ? "pointer" : undefined,
              fontSize: labelSize,
              fontWeight: 800,
              padding: labelSize > 10 ? "3px 8px" : "2px 6px",
              borderRadius: 999,
              color: on ? "#fff" : ink,
              background: on ? ink : "rgba(255,255,255,0.85)",
              boxShadow: on ? `0 3px 8px ${rgba(ink, 0.35)}` : `0 1px 3px ${rgba(ink, 0.18)}`,
            }}
          >
            {TRAIT_LABELS[i]}{" "}
            <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
              {formatScore(score)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 여러 사람의 오각형을 겹쳐 그리는 큰 판. 가족 비교와 지난 시즌 리포트가 **같은 것**을 쓴다 —
 * 두 화면에서 같은 사람의 오각형이 다른 크기·다른 라벨 자리로 보이면 겹쳐 볼 수가 없다.
 */
function FamilyRadar({
  shown,
}: {
  shown: { key: string; color: string; fill: string; scores: number[]; scaleMax: number }[];
}) {
  return (
    <div style={{ flex: "none", display: "flex", justifyContent: "center", background: "#FFFFFF", borderRadius: 26, padding: "10px 12px 14px", boxShadow: "0 2px 10px rgba(30,25,60,0.05)" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 300, aspectRatio: "1/1" }}>
        <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block", overflow: "visible" }} viewBox="0 0 236 236">
          {gridRings(92, 118, 118).map((ring, i) => (
            <polygon fill="none" key={i} points={ring.points} stroke="#E4E6F1" strokeWidth="1.2" />
          ))}
          {TRAIT_LABELS.map((_, i) => {
            const outer = pointAt(i, 1, 92, 118, 118);
            return <line key={i} stroke="#EAEBF4" strokeWidth="1.2" x1="118" x2={outer[0]} y1="118" y2={outer[1]} />;
          })}
          {shown.map((f) => (
            <polygon
              fill={f.fill}
              key={f.key}
              points={f.scores.map((sc, i) => pointAt(i, sc / f.scaleMax, 92, 118, 118).join(",")).join(" ")}
              stroke={f.color}
              strokeLinejoin="round"
              strokeWidth="2.6"
            />
          ))}
          {shown.flatMap((f) =>
            f.scores.map((sc, i) => {
              const d = pointAt(i, sc / f.scaleMax, 92, 118, 118);
              return <circle cx={d[0]} cy={d[1]} fill={f.color} key={`${f.key}-${i}`} r="3.4" stroke="#FFFFFF" strokeWidth="1.4" />;
            }),
          )}
        </svg>
        {TRAIT_LABELS.map((label, i) => {
          const at = labelAt(i, 92, 118, 118, 236, 1.24);
          return (
            <div key={label} style={{ position: "absolute", left: `${at.left.toFixed(1)}%`, top: `${at.top.toFixed(1)}%`, transform: "translate(-50%,-50%)", whiteSpace: "nowrap", fontSize: 11.5, fontWeight: 800, color: "#5C6280" }}>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 이름표 칩 한 줄. 가족 비교·지난 시즌·피드 필터가 같은 모양을 쓴다. */
function Chips({
  items,
  picked,
  onPick,
  compact = false,
}: {
  items: { key: string; name: string }[];
  picked: string;
  onPick: (key: string) => void;
  compact?: boolean;
}) {
  return (
    <>
      {items.map((item) => (
        <div
          key={item.key}
          onClick={() => onPick(item.key)}
          style={{
            flex: "none", padding: compact ? "6px 12px" : "9px 16px", borderRadius: 999, cursor: "pointer",
            fontSize: compact ? 12 : 13, fontWeight: 700, whiteSpace: "nowrap", transition: "all 0.18s",
            ...(picked === item.key
              ? { color: "#fff", background: ACCENT }
              : { color: "#6B6F85", background: "#fff", boxShadow: "0 1px 5px rgba(30,25,60,0.05)" }),
          }}
        >
          {item.name}
        </div>
      ))}
    </>
  );
}

/** 카드 겉면 — 성향 카드와 주차 카드가 같은 유리 질감을 쓴다. */
function CardShell({ type, children, style }: { type: ResolvedType; children: React.ReactNode; style?: React.CSSProperties }) {
  const [p0, p1, p2] = type.pal;
  const ink = type.ink;
  return (
    <div style={{ borderRadius: 28, padding: 8, background: `linear-gradient(160deg,${p0} 0%,${p1} 46%,${p2} 100%)`, ...style }}>
      <div
        style={{
          position: "relative",
          borderRadius: 21,
          padding: "15px 14px 13px",
          overflow: "hidden",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6),inset 0 0 0 1px rgba(255,255,255,0.36),inset 0 -20px 40px ${rgba(ink, 0.1)}`,
          background:
            "linear-gradient(158deg,rgba(255,255,255,0.42) 0%,rgba(255,255,255,0.14) 34%,rgba(255,255,255,0.06) 62%,rgba(255,255,255,0.2) 100%)",
        }}
      >
        <div style={{ position: "absolute", left: -40, top: -30, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,255,255,0.6) 0%,rgba(255,255,255,0) 68%)", filter: "blur(18px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: -50, bottom: -40, width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle,${rgba(ink, 0.16)} 0%,${rgba(ink, 0)} 68%)`, filter: "blur(22px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: "-30%", top: "-60%", width: "64%", height: "200%", transform: "rotate(22deg)", background: "linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.28) 50%,rgba(255,255,255,0) 100%)", pointerEvents: "none" }} />
        {children}
      </div>
    </div>
  );
}

export function ArchiveScreen({
  account,
  infoOpen,
  onInfoOpenChange,
  onLeave,
  view: requested,
}: {
  account: WalletAccountId;
  infoOpen: boolean;
  onInfoOpenChange: (open: boolean) => void;
  onLeave: (path: string) => void;
  /** 주소가 가리킨 자리(`/archive/return` 등). 챗봇 점프가 이 길로 들어온다. */
  view?: string;
}) {
  const { wallet } = useWallet();
  const { universe, quotes } = useUniverseLive();
  const data = useArchiveData();
  /**
   * 자리 셋. **첫 화면(`cards`)은 로그인한 사람 개인의 주차 성향 카드**이고, 두 탭은 가족
   * 것이다 — `family` 가 가족 성향, `return` 이 가족 수익이다. `last` 주소는 가족 성향의
   * 지난 시즌 자리를 가리키므로 `family` + `season: "last"` 로 편다.
   */
  const [view, setView] = useState<"cards" | "family" | "return">(
    requested === "return" ? "return" : requested === "family" || requested === "last" ? "family" : "cards",
  );
  /** 가족 성향 탭 안에서 보고 있는 시즌. 주소 `/archive/last` 로 바로 들어올 수 있다. */
  const [season, setSeason] = useState<"now" | "last">(requested === "last" ? "last" : "now");
  const [cardActive, setCardActive] = useState<number | null>(null);
  const [sheetIndex, setSheetIndex] = useState<number | null>(null);
  /**
   * 카드 아래 설명칸이 지금 무엇을 말하는지. `null` 이면 그 주 성향 설명이고, 축을 고르면
   * 그 축의 점수·설명으로 바뀐다. **켜진 카드 하나에만** 걸린다 — 옆 카드까지 축 설명으로
   * 바뀌면 넘길 때마다 같은 문장이 세 장에 겹쳐 보인다.
   */
  const [pickedAxis, setPickedAxis] = useState<number | null>(null);
  const [famDetailOpen, setFamDetailOpen] = useState(false);
  /** 글쓰기 시트에서 고른 거래와 적고 있는 글. 시트를 닫으면 둘 다 버린다. */
  const [pickedTrade, setPickedTrade] = useState<string | null>(null);
  const [postDraft, setPostDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [famPick, setFamPick] = useState("all");
  const [who, setWho] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [lastPick, setLastPick] = useState("all");
  const [lastOpen, setLastOpen] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /** 고칠 댓글 하나. 두 개를 동시에 열 수 없다 — 열려 있던 쪽은 저장 없이 닫힌다. */
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const returnScrollTop = useRef(0);
  const sheet = useSheetDrag(SHEET_HEIGHT);
  /**
   * 가족 시트도 카드 시트와 **같은 배선**을 쓴다. 한 폰 안에서 시트마다 쓸어내려 닫는
   * 느낌이 다르면 안 되기 때문이다(`use-sheet-drag` 머리말).
   */
  const famSheet = useSheetDrag(FAM_SHEET_HEIGHT);
  /** 피드 글쓰기 시트. 카드 시트·가족 시트와 같은 배선을 쓴다. */
  const postSheet = useSheetDrag(SHEET_HEIGHT);

  useEffect(() => {
    if (view === "return") returnScrollTop.current = 0;
  }, [view]);

  const prices = useMemo(
    () =>
      Object.fromEntries(
        (universe?.stocks ?? []).map((s) => [s.code, quotes[s.code]?.price ?? s.price]),
      ),
    [universe, quotes],
  );
  // 성향 — `season-cards` 누적 카드 하나가 원본이다. 로컬 기록으로 다시 계산하지 않는다.
  const mine = myProfile(data.season);
  const myType = resolveType(mine.characterKey, mine.level);
  const cards = useMemo(
    () => weekCards(data.season, mine, myType),
    [data.season, mine.scores.join(), myType.key],
  );
  const activeCard = Math.max(0, Math.min(cardActive ?? cards.length - 1, cards.length - 1));
  // 끌어서 넘기고, 멎은 자리의 가운데 카드를 켠다. 켜는 쪽이 없으면 손가락으로 밀었을 때
  // 엉뚱한 카드가 커진 채로 남고, 가운데 카드를 눌러도 시트가 아니라 스냅만 다시 걸린다.
  // 지금 켜진 카드(`activeCard`)를 함께 넘겨 **바뀔 때만** 다시 그린다 — 이 화면은 한 번
  // 그릴 때 가족·피드 계산이 통째로 돌아서, 스크롤마다 그리면 튕길 때 눈에 띄게 버벅인다.
  const rail = useRailDrag(setCardActive, activeCard);

  const family = familyMembers(data.family?.members ?? []);
  const famShown = family.filter((f) => f.has && (famPick === "all" || f.key === famPick));
  const lanes = runners(data.family?.members ?? []);
  const me = wallet?.acc[account];
  const summary = returnSummary(
    me?.cash ?? 0,
    me?.holdings ?? [],
    prices,
    new Date(),
    me?.reservedCash ?? 0,
  );
  /**
   * 제목 옆 지갑 — 같은 `family_tag` 사람들의 자산 합계다. 서버가 합계를 못 줄 때만
   * (비로그인·조회 실패) 내 계좌 요약으로 되돌아가므로 자리가 비지 않는다.
   */
  const walletHead = familySummary(data.family?.total) ?? summary;
  const feed = feedCards(
    data.family?.trades ?? [],
    data.family?.members ?? [],
    prices,
    data.comments,
    data.likes,
    who,
  );

  const openSheetAt = (index: number) => {
    setSheetIndex(index);
    sheet.openSheet();
  };
  const snapTo = (index: number) => {
    const node = rail.ref.current?.children[index] as HTMLElement | undefined;
    node?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  /**
   * 끝까지 내렸는데 **카드가 아직 여섯 장을 못 채웠을 때만** 다음 페이지를 부른다.
   *
   * 피드는 `FEED_LIMIT` 장만 깔기 때문에, 이미 찼으면 더 읽어도 보이는 것이 늘지 않는다 —
   * 그런데도 페이지가 필요한 이유는 서버가 보유 종목으로 거른 뒤라 한 페이지(50건)가 여섯
   * 장을 못 채울 수 있어서다. 이 조건을 빼면 스크롤할 때마다 아무것도 안 바뀌는 요청이 나간다.
   */
  const loadMoreOnScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const movingDown = node.scrollTop > returnScrollTop.current;
    returnScrollTop.current = node.scrollTop;
    const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (movingDown && remaining < 240 && data.hasMore && feed.length < FEED_LIMIT) {
      void data.loadMoreFamily();
    }
  };

  const sheetCard: WeekCard | undefined = cards[sheetIndex ?? activeCard] ?? cards[cards.length - 1];
  /** 그 주 유형의 종목 세 개. 유형이 아직 없는 주(`관찰 중`)면 빈 배열이다. */
  const sheetPicks = buildTypePicks(sheetCard?.type.key ?? null, universe, quotes);

  /**
   * 지난 주차 — 서버가 구성원마다 준 주차 카드에서 **끝난 주만** 골라 되짚는다.
   * 되짚을 것이 없으면 `null` 이고 그 자리에는 빈 자리 문구가 선다.
   */
  const last = useMemo(
    () => seasonReport(closedWeekRows(data.family?.members ?? [])),
    [data.family?.members],
  );
  const lastShown = last?.members.filter((m) => lastPick === "all" || m.key === lastPick) ?? [];

  /** 제목이 곧 현재 자리다. 주차 머리말은 어느 자리에서나 같은 이번 주를 가리킨다. */
  const screenTitle =
    view === "return" ? "우리 가족 투자 현황" : view === "family" ? "우리 가족 성향 리포트" : "내 투자 성향";
  const thisWeek = weekLabel(mondayOf(Date.now()));
  return (
    <PhoneFrame>
      <div style={PAGE}>
        {/*
          뒤로는 **가족 자리에만** 있다 — 내 카드(첫 화면)로 돌아오는 길이다.
          첫 화면에는 단추 자체를 두지 않는다(2026-08-17 유저 확정). 아카이브는 하단
          탭으로 드나드는 곳이라 나갈 문이 이미 있고, 목업의 뒤로가기도 첫 화면에서는
          아무 일도 하지 않았다. 줄째로 접어야 제목이 그만큼 올라와 카드 자리가 넓다.
        */}
        {view !== "cards" && (
          <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "6px 20px 0" }}>
            <div onClick={() => setView("cards")} style={BACK}>‹</div>
            <div style={{ flex: 1 }} />
          </div>
        )}
        <div style={{ flex: "none", display: "flex", alignItems: "flex-end", gap: 10, padding: "10px 20px 4px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#9095AA", letterSpacing: "-0.01em" }}>{thisWeek}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
              <div style={{ ...TITLE, flex: "none" }}>{screenTitle}</div>
              {/* 안내는 첫 화면에만 있다 — 넘길 카드가 있는 자리가 여기뿐이다. */}
              {view === "cards" && (
                <div
                  onClick={() => onInfoOpenChange(!infoOpen)}
                  style={{ flex: "none", display: "flex", alignItems: "center", cursor: "pointer", paddingBottom: 3 }}
                >
                  <svg fill="none" height="24" stroke="#9095AA" style={{ display: "block" }} viewBox="0 0 24 24" width="24">
                    <circle cx="12" cy="12" r="9.2" strokeWidth="1.6" />
                    <circle cx="12" cy="7.9" fill="#9095AA" r="1.15" stroke="none" />
                    <path d="M12 11 V16.6" strokeLinecap="round" strokeWidth="1.9" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/*
          카드를 어떻게 보는지 알려 주는 안내. 화면 아래 도움말 줄을 없애고 여기로 모았다 —
          아래에 두면 카드 레일이 그만큼 눌려 가운데 카드가 작아진다.
        */}
        {/* 안내도 카드가 선 뒤에 띄운다 — 가리킬 카드가 아직 없는데 꼬리만 서면 이상하다. */}
        {view === "cards" && infoOpen && !data.seasonLoading && (
          // `top` 은 제목 줄 바로 아래다 — 첫 화면은 뒤로가기 줄이 없어 제목이 위에 붙는다.
          <div style={{ position: "absolute", left: 20, right: 20, top: 136, zIndex: INFO_Z, borderRadius: 20, padding: "16px 18px 17px", background: "#FDE7F1", boxShadow: "0 6px 18px -8px rgba(215,0,130,0.3)" }}>
            {/*
              꼬리는 **아래로** 내려 가운데 성향 카드를 가리킨다. 안내가 말하는 대상이
              ⓘ 가 아니라 그 아래 카드이기 때문이다. 카드는 레일 한가운데에 서므로
              꼬리도 가운데다 — ⓘ 를 재서 맞추던 코드는 그래서 지웠다.
              2026-08-18 유저 확정 — 한 번 위로 뒤집혔다가 되돌렸다. 계정 종류와
              무관하게 이 한 곳이 모든 화면의 원본이니 방향을 다시 뒤집지 않는다.
            */}
            <div style={{ position: "absolute", left: "50%", bottom: -7, width: 14, height: 14, transform: "translateX(-50%) rotate(45deg)", background: "#FDE7F1" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: ACCENT, letterSpacing: "-0.02em" }}>매주 새로운 카드가 쌓여요</div>
              <div onClick={() => onInfoOpenChange(false)} style={{ flex: "none", fontSize: 15, fontWeight: 800, color: ACCENT, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>✕</div>
            </div>
            <div style={{ position: "relative", fontSize: 13.5, fontWeight: 600, color: "#5C6280", lineHeight: 1.65, marginTop: 8, whiteSpace: "pre-line" }}>
              {"좌우로 넘기면 지난주의 나를 볼 수 있어요.\n가운데 카드를 누르면 다섯 가지 투자 성향을 자세히 확인할 수 있어요."}
            </div>
          </div>
        )}
        {/* 가족 성향 안에서만 시즌을 바꾼다. 두 시즌이 같은 페이지에서 갈아 끼워진다. */}
        {view === "family" && (
          <div style={{ flex: "none", display: "flex", gap: 8, padding: "16px 20px 12px" }}>
            <div onClick={() => setSeason("now")} style={tabStyle(season === "now")}>지금까지</div>
            <div onClick={() => setSeason("last")} style={tabStyle(season === "last")}>지난 주차</div>
          </div>
        )}

        {view === "family" && season === "now" && (
          <>
            <div style={{ ...BODY, gap: 12 }}>
              <div style={{ flex: "none", display: "flex", gap: 7, flexWrap: "wrap" }}>
                <Chips
                  items={[{ key: "all", name: "전체" }, ...family.map((f) => ({ key: f.key, name: f.name }))]}
                  onPick={setFamPick}
                  picked={famPick}
                />
              </div>

              <FamilyRadar shown={famShown} />

              {family.map((f) => (
                <div
                  key={f.key}
                  onClick={() => setFamPick(famPick === f.key ? "all" : f.key)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 15px", borderRadius: 22,
                    cursor: "pointer", transition: "box-shadow 0.18s ease", background: "#FFFFFF",
                    boxShadow: famPick === f.key
                      ? `inset 0 0 0 2px ${f.color},0 2px 10px rgba(30,25,60,0.05)`
                      : "0 2px 10px rgba(30,25,60,0.05)",
                  }}
                >
                  <div style={{ width: 42, height: 42, flex: "none", borderRadius: 999, background: `url(${f.face}) center/cover no-repeat,${f.color}2E`, boxShadow: `inset 0 0 0 2px ${f.color}99` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 9, height: 9, borderRadius: 999, flex: "none", background: f.color }} />
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#001E5A" }}>{f.name}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#D70082" }}>{f.title}</span>
                    </div>
                    <div style={{ whiteSpace: "pre-line", fontSize: 12.5, fontWeight: 500, color: "#7E849B", lineHeight: 1.65, marginTop: 5, textWrap: "pretty" }}>{f.desc}</div>
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 12, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.65, textAlign: "center", padding: "2px 6px 4px", textWrap: "pretty" }}>
                누가 더 좋다는 뜻은 아니에요. 서로 왜 그렇게 했는지 이야기해 보세요.
              </div>
            </div>
          </>
        )}

        {/*
          되짚을 끝난 주가 없을 때. 첫 주에 들어온 가족이 여기다 — 없는 것을 지어내지 않고
          왜 비었는지만 적는다.
        */}
        {view === "family" && season === "last" && !last && (
          <div style={{ ...BODY, alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 40 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#5C6280" }}>아직 되짚을 주차가 없어요</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.65, textAlign: "center", textWrap: "pretty" }}>
              이번 주가 끝나면 그 주의 성향 카드가 여기에 쌓여요.
            </div>
          </div>
        )}

        {view === "family" && season === "last" && last && (
          <>
            <div style={{ ...BODY, gap: 12 }}>
              {/* 종합 카드. 겉면 색과 캐릭터는 가족의 최빈 성향에서 나온다. */}
              <div style={{ flex: "none", borderRadius: 26, padding: 7, background: last.gradient }}>
                <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, padding: "16px 18px 14px", background: "linear-gradient(158deg,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0.16) 44%,rgba(255,255,255,0.24) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7),inset 0 0 0 1px rgba(255,255,255,0.4)" }}>
                  <div style={{ position: "absolute", right: -40, bottom: -40, width: 170, height: 170, borderRadius: "50%", filter: "blur(22px)", pointerEvents: "none", background: last.glow }} />
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: "none", width: 104, height: 124, margin: "-8px 0 -12px", background: last.image, filter: last.imageShadow }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: last.inkSoft }}>지난 주차 종합 리포트</div>
                      <div style={{ fontSize: 21, fontWeight: 900, marginTop: 4, letterSpacing: "-0.01em", lineHeight: 1.25, color: last.ink }}>{last.title}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.6, marginTop: 6, textWrap: "pretty", color: last.inkSoft }}>{last.text}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: "none", display: "flex", gap: 7, flexWrap: "wrap" }}>
                <Chips
                  items={[{ key: "all", name: "전체" }, ...last.members.map((m) => ({ key: m.key, name: m.name }))]}
                  onPick={setLastPick}
                  picked={lastPick}
                />
              </div>

              <FamilyRadar shown={lastShown} />

              {last.members.map((m) => {
                const open = lastOpen === m.key;
                return (
                  <div key={m.key} style={{ flex: "none", background: "#FFFFFF", borderRadius: 22, padding: "13px 15px", boxShadow: open ? `inset 0 0 0 2px ${m.color},0 2px 10px rgba(30,25,60,0.05)` : "0 2px 10px rgba(30,25,60,0.05)" }}>
                    <div
                      // 펼치면서 오각형도 그 사람만 남긴다. 접으면 다시 전체로 돌린다 —
                      // 카드를 닫았는데 오각형만 한 명으로 남아 있으면 왜 그런지 알 수가 없다.
                      onClick={() => { setLastOpen(open ? null : m.key); setLastPick(open ? "all" : m.key); }}
                      style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}
                    >
                      <div style={{ width: 42, height: 42, flex: "none", borderRadius: 999, background: `url(${m.face}) center/cover no-repeat,${m.color}2E`, boxShadow: `inset 0 0 0 2px ${m.color}99` }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 9, height: 9, borderRadius: 999, flex: "none", background: m.color }} />
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#001E5A" }}>{m.name}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: ACCENT }}>{m.title}</span>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "#7E849B", lineHeight: 1.65, marginTop: 5, textWrap: "pretty" }}>{m.desc}</div>
                      </div>
                      <div style={{ flex: "none", fontSize: 12, fontWeight: 700, color: "#A9AEC4", paddingTop: 3, whiteSpace: "nowrap" }}>{open ? "닫기" : "주차별"}</div>
                    </div>
                    {open && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0F1F7" }}>
                        {m.weeks.map((week) => (
                          <div key={week.label} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 14, padding: "9px 11px", background: week.bg }}>
                            <span style={{ flex: "none", fontSize: 12, fontWeight: 700, color: "#8E93A8", whiteSpace: "nowrap" }}>{week.label}</span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 800, color: week.ink, whiteSpace: "nowrap" }}>{week.typeName}</span>
                            <span style={{ flex: "none", fontSize: 12, fontWeight: 600, color: "#8E93A8", whiteSpace: "nowrap" }}>{week.note}</span>
                          </div>
                        ))}
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.6, padding: "2px 2px 0", textWrap: "pretty" }}>{m.trend}</div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ fontSize: 12, fontWeight: 500, color: "#A9AEC4", lineHeight: 1.65, textAlign: "center", padding: "2px 6px 4px", textWrap: "pretty" }}>
                끝난 주차 기록은 그대로 보관돼요. 위 단추로 지금까지와 견줘 보세요.
              </div>
            </div>
          </>
        )}

        {/*
          성향 응답을 기다리는 동안에는 카드를 세우지 않는다. 기다림 없이 그리면 중립
          카드(`관찰 중` · 전부 5)가 1초쯤 떴다가 진짜 카드로 바뀌어 깜빡인다 — "아직
          안 왔다"는 빈 자리로, "정말 없다"(비로그인·조회 실패)는 중립 카드로 가른다.
        */}
        {view === "cards" && data.seasonLoading && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#A9AEC4" }}>기록을 불러오고 있어요</div>
          </div>
        )}
        {view === "cards" && !data.seasonLoading && (
          <>
            <div style={{ position: "relative", zIndex: 2, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div
                className="kwcardrail"
                onPointerDown={rail.onPointerDown}
                onScroll={rail.onScroll}
                ref={rail.ref}
                style={{ flex: "none", display: "flex", alignItems: "center", gap: 4, overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", padding: "14px 36px", scrollbarWidth: "none", cursor: "grab", touchAction: "pan-x", userSelect: "none", WebkitUserSelect: "none" }}
              >
                {cards.map((card, index) => {
                  const on = index === activeCard;
                  const ink = card.type.ink;
                  return (
                    <CardShell
                      key={card.key}
                      style={{
                        flex: "none", scrollSnapAlign: "center", width: 296, margin: "0 9px", cursor: "pointer",
                        transition: "transform 0.28s ease", transformOrigin: "center",
                        transform: on ? "scale(1.05)" : "scale(0.9)",
                        boxShadow: on
                          ? `inset 0 1px 0 rgba(255,255,255,0.7),0 0 0 1.5px ${rgba(ink, 0.3)},0 2px 3px ${rgba(ink, 0.2)},0 14px 18px -8px ${rgba(ink, 0.35)}`
                          : `inset 0 1px 0 rgba(255,255,255,0.5),0 1px 2px ${rgba(ink, 0.14)},0 7px 10px -7px ${rgba(ink, 0.22)}`,
                      }}
                      type={card.type}
                    >
                      <div
                        onClick={() => {
                          // 끌고 난 직후의 click 은 삼킨다. 안 그러면 손을 뗀 자리의 카드가 열린다.
                          if (rail.dragged()) return;
                          if (index !== activeCard) {
                            snapTo(index);
                            setCardActive(index);
                          } else openSheetAt(index);
                        }}
                      >
                        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: rgba(ink, 0.9), letterSpacing: "0.12em", whiteSpace: "nowrap" }}>{card.week}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: rgba(ink, 0.75), whiteSpace: "nowrap" }}>{card.date}</span>
                        </div>
                        <div style={{ position: "relative", textAlign: "center", fontSize: 21, fontWeight: 900, color: ink, marginTop: 5, letterSpacing: "-0.01em", textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}>{card.title}</div>
                        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 2, marginTop: 6 }}>
                          <div style={{ flex: "none", width: 124, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                            {/* 유형이 정해지기 전에는 그림 자리를 비운다. 자리는 남겨 둬야 오각형이 안 움직인다. */}
                            <div style={{ width: 158, height: 196, margin: "0 -16px -4px -14px", background: card.type.key ? `url(${typeImage(card.type.key)}) center bottom/contain no-repeat` : "none", filter: card.type.key ? `drop-shadow(0 12px 14px ${rgba(ink, 0.38)})` : "none" }} />
                            <div style={{ width: 82, height: 18, marginTop: -8, borderRadius: "50%", background: `radial-gradient(ellipse at center,${rgba(ink, 0.22)} 0%,${rgba(ink, 0.06)} 46%,rgba(0,0,0,0) 72%)` }} />
                          </div>
                          <Radar
                            ink={ink}
                            onPick={on ? (axis) => setPickedAxis(pickedAxis === axis ? null : axis) : undefined}
                            picked={on ? pickedAxis : null}
                            scaleMax={card.scaleMax}
                            scores={card.scores}
                          />
                        </div>
                        {/*
                          설명칸 하나를 둘이 나눠 쓴다. 축 이름표를 누르면 그 축의 점수·뜻으로
                          바뀌고 다시 누르면 그 주 성향 설명으로 돌아온다 — 칸을 따로 만들면
                          카드가 그만큼 길어져 레일에서 아래가 잘린다.
                        */}
                        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 9, marginTop: 8, borderRadius: 14, padding: "10px 11px", background: "rgba(255,255,255,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75),inset 0 0 0 1px rgba(255,255,255,0.45)" }}>
                          {on && pickedAxis !== null ? (
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
                                <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.01em", marginRight: 8, color: ink }}>{TRAIT_LABELS[pickedAxis]}</span>
                                <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums", color: ink }}>{Math.round(card.scores[pickedAxis])}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", marginLeft: 3, color: rgba(ink, 0.6) }}>/{card.scaleMax}점</span>
                              </div>
                              <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.6, marginTop: 4, textWrap: "pretty", color: rgba(ink, 0.9) }}>{TRAIT_DESCS[pickedAxis]}</div>
                            </div>
                          ) : (
                            <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600, color: rgba(ink, 0.9), lineHeight: 1.6, textWrap: "pretty", whiteSpace: "pre-line" }}>{card.desc}</div>
                          )}
                        </div>
                      </div>
                    </CardShell>
                  );
                })}
              </div>
              <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 0 0" }}>
                {cards.map((card, i) => (
                  <div key={card.key} style={{ width: i === activeCard ? 20 : 7, height: 7, borderRadius: 999, transition: "width 0.25s ease,background 0.25s ease", background: i === activeCard ? ACCENT : "#D5D8E6" }} />
                ))}
              </div>
            </div>
            {/*
              가족으로 가는 문. **첫 화면에만** 있고 어디로 갈지는 시트 안에서 고른다.
              튜토리얼(`tutorial-steps`)이 이 `id` 를 짚으므로 지우기 전에 그 파일을 본다.
            */}
            <div style={{ flex: "none", padding: "0 20px 14px" }}>
              <div id="tut-archive-family" onClick={famSheet.openSheet} style={FAMILY_DOOR}>
                <svg fill="none" height="26" stroke="#1A1F4B" style={{ display: "block", flex: "none" }} viewBox="0 0 24 24" width="26">
                  <circle cx="8" cy="7.4" r="2.6" strokeWidth="1.7" />
                  <circle cx="16" cy="8.6" r="2.1" strokeWidth="1.7" />
                  <path d="M4 19.5 v-3.2 a4 4 0 0 1 8 0 v3.2" strokeLinecap="round" strokeWidth="1.7" />
                  <path d="M13.6 19.5 v-2.6 a3.2 3.2 0 0 1 6.4 0 v2.6" strokeLinecap="round" strokeWidth="1.7" />
                </svg>
                <div style={DOOR_LABEL}>우리 가족 투자 보기</div>
                <div style={DOOR_CHEVRON}>›</div>
              </div>
            </div>
          </>
        )}

        {view === "return" && (
          <div onScroll={loadMoreOnScroll} style={BODY}>
            <div style={{ display: "flex", flexDirection: "column", gap: 13, padding: "20px 0 10px" }}>
              {/*
                머리 카드 — **가족 합계**의 총액·손익이다(2026-08-17 유저 확정). 화면
                이름이 `우리 가족 투자 현황` 인데 내 계좌 숫자가 서 있으면 제목과 숫자가
                다른 말을 한다. 서버가 합계를 못 줄 때만(비로그인·조회 실패) 내 계좌로
                되돌아간다(`walletHead`). `상세` 를 켜야 투자 가능 금액과 결제 기준이
                나온다 — 아이가 먼저 볼 숫자는 총액과 수익률이다.
              */}
              <div style={{ background: "#FFFFFF", borderRadius: 22, padding: "18px 19px 16px", boxShadow: "0 2px 10px rgba(30,25,60,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, color: "#001E5A", letterSpacing: "-0.01em" }}>우리 가족 총자산</div>
                  <div onClick={() => setDetailOpen(!detailOpen)} style={{ flex: "none", display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: detailOpen ? "#3D4460" : "#9CA1B4" }}>상세</span>
                    <div style={{ width: 40, height: 23, borderRadius: 999, padding: 2, display: "flex", transition: "background 0.2s ease", background: detailOpen ? ACCENT : "#DFE1EB", justifyContent: detailOpen ? "flex-end" : "flex-start" }}>
                      <div style={{ width: 19, height: 19, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(30,25,60,0.28)" }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                  <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: "#111524" }}>{walletHead.totalNumber}</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "#111524" }}>원</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: walletHead.pctColor }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{walletHead.pnlText}</span>
                  <span style={{ width: 1, height: 13, background: "#DFE1EB" }} />
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{walletHead.pctText}</span>
                </div>
                {detailOpen && (
                  <div style={{ marginTop: 15, paddingTop: 14, borderTop: "1px solid #EFF0F6", display: "flex", flexDirection: "column", gap: 11 }}>
                    {/*
                      가족 예수금 합계다. 총자산이 가족 것인데 이 줄만 내 현금이면 한 카드
                      안에서 기준이 갈린다. 합계가 없으면(구버전 응답) 내 것으로 되돌아간다.
                    */}
                    {[{ label: "투자 가능 금액", value: walletHead.cashText ?? summary.cashText }].map((row) => (
                      <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "#8E93A8" }}>{row.label}</div>
                        <div style={{ flex: "none", fontSize: 15, fontWeight: 700, color: "#2C3245", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{row.value}</div>
                      </div>
                    ))}
                    <div style={{ alignSelf: "flex-end", fontSize: 12, fontWeight: 600, color: "#A9AEC4", whiteSpace: "nowrap" }}>{summary.settleText}</div>
                  </div>
                )}
              </div>

              {/*
                달리기 트랙. 어두운 판 위에 결승선 체크무늬를 둬서 어디가 끝인지 보이게 한다 —
                밝은 판일 때는 주자가 오른쪽 끝에 붙어도 다 온 것인지 알 수 없었다.
              */}
              <div style={{ background: "#2F3140", borderRadius: 22, padding: "15px 14px 14px", boxShadow: "0 6px 18px -8px rgba(20,18,40,0.5)" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "0 3px" }}>
                  <div style={{ flex: "none", fontSize: 15.5, fontWeight: 800, color: "#FFFFFF", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>수익률 레이스</div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "right", fontSize: 11, fontWeight: 700, color: "#F3C64B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>START 왼쪽은 마이너스</div>
                </div>
                <div style={{ position: "relative", marginTop: 13, borderRadius: 16, overflow: "hidden", background: "#3A3C4C", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                  <div style={{ position: "absolute", left: `${RUN_START}%`, top: 0, bottom: 0, width: 0, borderLeft: "2px dashed rgba(255,255,255,0.42)", transform: "translateX(-1px)", zIndex: 2, pointerEvents: "none" }} />
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${RUN_START}%`, zIndex: 1, pointerEvents: "none", background: "rgba(0,0,0,0.16)" }} />
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 11, zIndex: 1, pointerEvents: "none", background: "repeating-conic-gradient(#F2F3F7 0% 25%,#33353F 0% 50%) 0 0/11px 11px" }} />
                  <div style={{ position: "absolute", left: `${RUN_START}%`, top: 5, transform: "translateX(-50%)", zIndex: 3, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", color: "#FFFFFF", whiteSpace: "nowrap", background: "#3A3C4C", padding: "0 6px", borderRadius: 999 }}>START</div>
                  {lanes.map((lane) => (
                    <div key={lane.key} style={{ position: "relative", height: LANE_HEIGHT, boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.09)" }}>
                      <div style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", zIndex: 3, fontSize: 11.5, fontWeight: 800, color: "#EDEEF4", whiteSpace: "nowrap", textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}>{lane.name}</div>
                      <div style={{ position: "absolute", left: `${lane.at.toFixed(1)}%`, top: "50%", zIndex: 2, transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", gap: 5, transition: "left 0.4s ease" }}>
                        {/* 속도선은 마이너스일 때 반대쪽으로 붙는다 — 주자 얼굴은 뒤집지 않는다. */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: "none", opacity: lane.showDash ? 0.75 : 0, order: lane.minus ? 2 : 0, transform: lane.minus ? "scaleX(-1)" : "none" }}>
                          <div style={{ width: 22, height: 2.5, borderRadius: 999, background: lane.color }} />
                          <div style={{ width: 15, height: 2.5, borderRadius: 999, marginLeft: 7, background: lane.color }} />
                          <div style={{ width: 19, height: 2.5, borderRadius: 999, marginLeft: 3, background: lane.color }} />
                        </div>
                        <div
                          onClick={() => setWho(who === lane.key ? "all" : lane.key)}
                          style={{ position: "relative", flex: "none", cursor: "pointer", order: 1 }}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: 999, background: `url(${lane.face}) center/cover no-repeat,#EDEFF6`, boxShadow: `0 0 0 3px ${lane.color}${lane.has ? "" : "55"},0 3px 8px rgba(0,0,0,0.4)`, ...(lane.has ? {} : { filter: "grayscale(0.6)", opacity: 0.6 }) }} />
                          {lane.rank !== null && (
                            <div style={{ position: "absolute", left: -6, top: -7, width: 18, height: 18, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 800, color: "#fff", background: lane.color, boxShadow: "0 2px 5px rgba(0,0,0,0.4)" }}>{lane.rank}</div>
                          )}
                          <div style={{ position: "absolute", left: "50%", top: 38, transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 11.5, fontWeight: 800, fontVariantNumeric: "tabular-nums", textShadow: "0 1px 3px rgba(0,0,0,0.6)", color: lane.pctColor }}>{lane.pctText}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/*
                  제목과 필터 칩이 한 줄이다. 칩이 오른쪽으로 밀려 제목과 나란히 선다.
                  제목은 **누구를 골라도 `투자 피드` 로 고정**한다 — 지금 누구를 보고 있는지는
                  바로 옆 칩이 이미 켜져서 말하고, 제목까지 `○○의 피드` 로 바뀌면 칩을 누를 때마다
                  제목 너비가 달라져 칩 줄이 좌우로 흔들렸다. 목업은 이름을 갈아 끼우지만
                  그 흔들림은 이미 고친 것이라 되돌리지 않는다.
                */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px 0" }}>
                  <div style={{ flex: "none", fontSize: 16, fontWeight: 800, color: "#001E5A", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                    투자 피드
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-end", gap: 5, overflowX: "auto", scrollbarWidth: "none" }}>
                    <Chips
                      compact
                      items={[{ key: "all", name: "전체" }, ...family.map((f) => ({ key: f.key, name: f.name }))]}
                      onPick={setWho}
                      picked={who}
                    />
                  </div>
                </div>
                {/*
                  글쓰기 문. **산다고 피드가 저절로 생기지 않으므로** 올릴 자리가 여기 있어야
                  한다 — 이 단추가 없으면 새로 산 기록은 어디에서도 가족에게 갈 수 없다.
                */}
                <div
                  onClick={() => {
                    setPickedTrade(null);
                    setPostDraft("");
                    void data.loadCandidates().catch(() => {});
                    postSheet.openSheet();
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", borderRadius: 18, cursor: "pointer", background: "#FFFFFF", boxShadow: "0 2px 10px rgba(30,25,60,0.05)" }}
                >
                  <div style={{ flex: "none", width: 28, height: 28, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, lineHeight: 1, color: "#fff", background: ACCENT }}>+</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: "#3D4460" }}>내 기록을 피드에 올리기</div>
                  <div style={{ flex: "none", fontSize: 15, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>›</div>
                </div>
                {feed.map((card) => (
                  <div key={card.id} style={{ background: "#fff", borderRadius: 22, padding: "16px 17px 14px", boxShadow: "0 2px 10px rgba(30,25,60,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{ width: 44, height: 44, flex: "none", borderRadius: 999, background: `url(${card.face}) center/cover no-repeat,#FFFFFF`, boxShadow: "0 4px 9px -3px rgba(35,25,80,0.22)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15.5, fontWeight: 800, color: "#001E5A", whiteSpace: "nowrap" }}>{card.name}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "#B8BDD0", marginTop: 3, whiteSpace: "nowrap" }}>{card.time}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", borderRadius: 16, overflow: "hidden", marginTop: 13, minHeight: 112 }}>
                      <div style={{ flex: "none", width: "39%", position: "relative", overflow: "hidden", padding: "13px 14px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: card.bigBg }}>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" }}>{card.dateLabel}</div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.stockName}</div>
                          <div style={{ fontSize: card.bigSize, fontWeight: 800, color: "#fff", marginTop: 5, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{card.bigValue}</div>
                        </div>
                        <div style={{ position: "absolute", right: -2, bottom: -2, width: 56, height: 60, background: `url(${card.pose}) right bottom/contain no-repeat`, filter: "drop-shadow(0 4px 7px rgba(0,0,0,0.3))" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, background: "#F5F6FB", padding: "14px 15px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#A9AEC4" }}>{card.sideLabel}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", marginTop: 4, lineHeight: 1.35, textWrap: "pretty", color: card.sideColor }}>{card.sideValue}</div>
                        {/* 못 잰 손익은 자리를 비운다 — `0원`으로 적으면 본전인 거래와 같아 보인다. */}
                        {card.pnlText && (
                          <div style={{ fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", marginTop: 3, whiteSpace: "nowrap", color: card.pnlColor }}>{card.pnlText}</div>
                        )}
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#3D4460", marginTop: 3, lineHeight: 1.4, textWrap: "pretty" }}>{card.shortMent}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 14.5, fontWeight: 500, color: "#3D4460", lineHeight: 1.72, marginTop: 13, whiteSpace: "pre-line", textWrap: "pretty" }}>{card.text}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 13 }}>
                      {/*
                        내가 올린 카드만 내릴 수 있다. 내려도 거래 기록은 남는다 — 성향과
                        수익률은 체결을 그대로 읽어야 하기 때문이다.
                      */}
                      {String(data.viewerId ?? "") === card.userId ? (
                        <div
                          onClick={() => {
                            if (!window.confirm("이 기록을 피드에서 내릴까요? 사고판 기록은 그대로 남아요.")) return;
                            void data.removeFeed(card.id).catch((e) => window.alert(e.message));
                          }}
                          style={{ flex: "none", fontSize: 12.5, fontWeight: 700, color: "#A9AEC4", cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                          피드에서 내리기
                        </div>
                      ) : null}
                      <div style={{ flex: 1 }} />
                      <div
                        onClick={() => setOpenComments((current) => ({ ...current, [card.id]: !current[card.id] }))}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", fontVariantNumeric: "tabular-nums", color: openComments[card.id] ? "#0A3272" : "#A9AEC4" }}
                      >
                        <span>댓글</span>
                        <span>{card.comments.length}</span>
                      </div>
                      <div
                        onClick={() => { void data.toggleLike(card.id).catch((e) => window.alert(e.message)); }}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", fontVariantNumeric: "tabular-nums", color: card.liked ? ACCENT : "#A9AEC4" }}
                      >
                        <svg fill={card.liked ? ACCENT : "none"} height="17" stroke={card.liked ? ACCENT : "#A9AEC4"} strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="17">
                          <path d="M12 20.5 4.6 13.3a4.7 4.7 0 0 1 0-6.7 4.7 4.7 0 0 1 6.7 0l.7.7.7-.7a4.7 4.7 0 0 1 6.7 0 4.7 4.7 0 0 1 0 6.7z" />
                        </svg>
                        <span>{card.likeCount}</span>
                      </div>
                    </div>

                    {openComments[card.id] && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 13, paddingTop: 12, borderTop: "1px solid #F0F1F7" }}>
                        {card.comments.map((comment) => {
                          const editingThis = editing?.id === String(comment.id);
                          return (
                            <div key={comment.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ width: 26, height: 26, flex: "none", borderRadius: 999, background: `url(${comment.face}) center/cover no-repeat,#FFFFFF` }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#001E5A" }}>{comment.authorName}</div>
                                {editingThis ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                                    <input
                                      onChange={(event) => setEditing({ id: String(comment.id), body: event.target.value })}
                                      style={{ flex: 1, minWidth: 0, border: "none", background: "#F2F3FA", borderRadius: 10, padding: "8px 11px", fontSize: 13, fontWeight: 600, color: "#001E5A", fontFamily: "inherit" }}
                                      value={editing.body}
                                    />
                                    <div
                                      onClick={() => {
                                        const body = editing.body.trim();
                                        // 비우면 저장하지 않는다. 지우려면 삭제를 쓴다 —
                                        // 빈 댓글이 남으면 누가 무슨 말을 지웠는지 알 수 없다.
                                        if (!body) return;
                                        void data
                                          .editComment(card.id, comment.id, body)
                                          .then(() => setEditing(null))
                                          .catch((e) => window.alert(e.message));
                                      }}
                                      style={{ flex: "none", fontSize: 11.5, fontWeight: 800, color: "#fff", background: "#001E5A", borderRadius: 999, padding: "7px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
                                    >
                                      저장
                                    </div>
                                    <div
                                      onClick={() => setEditing(null)}
                                      style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: "#A9AEC4", padding: "7px 4px", cursor: "pointer", whiteSpace: "nowrap" }}
                                    >
                                      취소
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 13, fontWeight: 500, color: "#5C6280", lineHeight: 1.6, marginTop: 2, textWrap: "pretty" }}>{comment.body}</div>
                                )}
                              </div>
                              {comment.canDelete && !editingThis && (
                                <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 5 }}>
                                  <div
                                    onClick={() => setEditing({ id: String(comment.id), body: comment.body ?? "" })}
                                    style={{ fontSize: 11.5, fontWeight: 700, color: "#7E849B", padding: "4px 8px", borderRadius: 999, background: "#F2F3FA", cursor: "pointer", whiteSpace: "nowrap" }}
                                  >
                                    수정
                                  </div>
                                  <div
                                    onClick={() => { void data.deleteComment(card.id, comment.id).catch((e) => window.alert(e.message)); }}
                                    style={{ fontSize: 11.5, fontWeight: 700, color: "#A9AEC4", padding: "4px 8px", borderRadius: 999, background: "#F2F3FA", cursor: "pointer", whiteSpace: "nowrap" }}
                                  >
                                    삭제
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            onChange={(event) => setDrafts((current) => ({ ...current, [card.id]: event.target.value }))}
                            placeholder="댓글 남기기"
                            style={{ flex: 1, minWidth: 0, border: "none", background: "#F2F3FA", borderRadius: 999, padding: "9px 13px", fontSize: 13, fontWeight: 600, color: "#001E5A", fontFamily: "inherit" }}
                            value={drafts[card.id] ?? ""}
                          />
                          <div
                            onClick={() => {
                              const body = (drafts[card.id] ?? "").trim();
                              if (!body) return;
                              void data
                                .sendComment(card.id, body)
                                .then(() => setDrafts((current) => ({ ...current, [card.id]: "" })))
                                .catch((e) => window.alert(e.message));
                            }}
                            style={{
                              flex: "none", fontSize: 12.5, fontWeight: 800, padding: "8px 12px", borderRadius: 999,
                              cursor: "pointer", whiteSpace: "nowrap",
                              ...((drafts[card.id] ?? "").trim()
                                ? { color: "#fff", background: "#001E5A" }
                                : { color: "#B8BDD0", background: "#F0F1F7" }),
                            }}
                          >
                            올리기
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {data.loadingMore && (
                  <div style={{ padding: "8px 0 14px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#8E93A8" }}>
                    다음 기록 50개를 불러오는 중이에요
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <BottomNav active="archive" onLeave={onLeave} />

        {/*
          가족 시트. 총자산도 투자 가능 금액도 같은 `family_tag` 사람들의 **합계**다
          (2026-08-17 유저 확정) — 투자 현황 머리 카드와 같은 값이라 두 자리의 숫자가
          늘 같다. 서버가 합계를 못 줄 때만 내 계좌로 되돌아간다.
        */}
        {famSheet.open && (
          <>
            <div
              onClick={famSheet.closeSheet}
              style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(20,15,40,0.4)", ...famSheet.scrimStyle }}
            />
            <div
              style={{
                position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 7,
                borderRadius: "30px 30px 0 0", padding: "14px 22px 26px", background: "#FFFFFF",
                boxShadow: "0 -18px 40px rgba(30,25,60,0.26)",
                ...famSheet.sheetStyle("sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)"),
              }}
            >
              <div {...famSheet.handleProps}>
                <div style={{ width: 44, height: 5, borderRadius: 999, margin: "0 auto 16px", background: "#E1E3EE" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 21, fontWeight: 800, color: "#001E5A", letterSpacing: "-0.02em" }}>우리 가족 한눈에 보기</div>
                  <div data-sheet-static onClick={famSheet.closeSheet} style={{ flex: "none", fontSize: 14, fontWeight: 700, color: "#A9AEC4", padding: "6px 4px", cursor: "pointer", whiteSpace: "nowrap" }}>닫기</div>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#001E5A", marginTop: 16 }}>총자산</div>
              <div onClick={() => setFamDetailOpen(!famDetailOpen)} style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8, cursor: "pointer" }}>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: "#111524" }}>{walletHead.totalNumber}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111524" }}>원</div>
                {/*
                  펼침표는 **글자를 바꾸지 않고 돌린다**. › 와 ⌄ 는 글자꼴에서 굵기·크기·기준선이 달라
                  갈아 끼우면 화살표가 한 프레임에 튀고 자리까지 훅 옮겨 보인다. 같은 꺾쇠 하나를
                  90° 돌리면 시트가 올라오는 곡선(`cubic-bezier(0.22,1,0.36,1)`)과 같은 결을 타도록 이어진다.
                */}
                <div style={{ flex: "none", alignSelf: "center", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg fill="none" height="14" stroke="#111524" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="14" style={{ display: "block", transform: famDetailOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.26s cubic-bezier(0.22,1,0.36,1)" }}>
                    <path d="M9 4.5 L16.5 12 L9 19.5" />
                  </svg>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: walletHead.pctColor }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{walletHead.pnlText}</span>
                <span style={{ width: 1, height: 13, background: "#DFE1EB" }} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>{walletHead.pctText}</span>
              </div>
              {/*
                펼쳐지는 속은 **DOM에 늘 두고 높이만 여닫는다**. 조건부로 붙였다 떼면 화살표만
                부드럽고 속은 한 프레임에 튀어나와, 같은 손짓이 두 가지 속도로 보인다.

                높이를 재지 않고 `grid-template-rows` 를 `0fr↔1fr` 로 옮긴다 — 내용이 몇 줄이든
                제 높이만큼만 열리므로 `max-height` 처럼 어림값을 박아 둘 필요가 없다. 속을 감싼
                칸은 `minHeight: 0` 이어야 접힌다 — 그리드 칸의 기본 최소 크기가 내용 높이라서다.
                곡선·시간은 화살표와 **같은 값**이다. 한 손짓이니 한 속도로 움직여야 한다.
              */}
              <div
                aria-hidden={!famDetailOpen}
                style={{
                  display: "grid", gridTemplateRows: famDetailOpen ? "1fr" : "0fr",
                  opacity: famDetailOpen ? 1 : 0,
                  transition: "grid-template-rows 0.26s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease",
                }}
              >
                <div style={{ minHeight: 0, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 15, borderTop: "1px solid #EFF0F6" }}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "#8E93A8" }}>투자 가능 금액</div>
                    <div style={{ flex: "none", fontSize: 15.5, fontWeight: 700, color: "#2C3245", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{walletHead.cashText ?? summary.cashText}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: "#A9AEC4", marginTop: 6, whiteSpace: "nowrap" }}>{summary.settleText}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18 }}>
                <div onClick={() => { setView("family"); setSeason("now"); setFamPick("all"); famSheet.closeSheet(); }} style={FAMILY_ROW}>
                  <svg fill="none" height="22" stroke="#1A1F4B" style={{ display: "block", flex: "none" }} viewBox="0 0 24 24" width="22">
                    <circle cx="12" cy="12" r="8.2" strokeWidth="1.7" />
                    <path d="M12 12 V3.8" strokeWidth="1.7" />
                    <path d="M12 12 L19.4 15.6" strokeWidth="1.7" />
                    <path d="M12 3.8 a8.2 8.2 0 0 1 7.4 11.8 L12 12 Z" fill="#1A1F4B" stroke="none" />
                  </svg>
                  <div style={{ ...DOOR_LABEL, fontSize: 15.5 }}>성향 리포트</div>
                  <div style={{ ...DOOR_CHEVRON, fontSize: 16 }}>›</div>
                </div>
                <div onClick={() => { setView("return"); famSheet.closeSheet(); }} style={FAMILY_ROW}>
                  <svg fill="none" height="22" stroke="#1A1F4B" style={{ display: "block", flex: "none" }} viewBox="0 0 24 24" width="22">
                    <path d="M4.5 20 H20" strokeLinecap="round" strokeWidth="1.8" />
                    <rect height="6.5" rx="1" strokeWidth="1.7" width="3.4" x="6" y="10.5" />
                    <rect height="11" rx="1" strokeWidth="1.7" width="3.4" x="11.3" y="6" />
                    <rect height="8.5" rx="1" strokeWidth="1.7" width="3.4" x="16.6" y="8.5" />
                  </svg>
                  <div style={{ ...DOOR_LABEL, fontSize: 15.5 }}>투자 현황</div>
                  <div style={{ ...DOOR_CHEVRON, fontSize: 16 }}>›</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/*
          피드 글쓰기. 위에서 기록 하나를 고르고 아래에 글을 적는다 — 고르는 목록은 **아직
          안 올린 내 체결**뿐이라(`GET /api/feed`) 같은 거래로 카드를 두 장 세울 수 없다.
        */}
        {postSheet.open && (
          <>
            <div
              onClick={postSheet.closeSheet}
              style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(20,15,40,0.4)", ...postSheet.scrimStyle }}
            />
            <div
              className="kwnos"
              style={{
                position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 7, maxHeight: `${SHEET_RATIO * 100}%`,
                overflowY: "auto", borderRadius: "30px 30px 0 0", padding: "14px 22px 26px", background: "#FFFFFF",
                boxShadow: "0 -18px 40px rgba(30,25,60,0.26)",
                ...postSheet.sheetStyle("sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)"),
              }}
            >
              <div {...postSheet.handleProps}>
                <div style={{ width: 44, height: 5, borderRadius: 999, margin: "0 auto 16px", background: "#E1E3EE" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 21, fontWeight: 800, color: "#001E5A", letterSpacing: "-0.02em" }}>피드에 올리기</div>
                  <div data-sheet-static onClick={postSheet.closeSheet} style={{ flex: "none", fontSize: 14, fontWeight: 700, color: "#A9AEC4", padding: "6px 4px", cursor: "pointer", whiteSpace: "nowrap" }}>닫기</div>
                </div>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#8E93A8", lineHeight: 1.65, marginTop: 8, textWrap: "pretty" }}>
                올릴 기록을 고르고 가족에게 남길 말을 적어요. 사고판 기록은 올리지 않아도 그대로 남아요.
              </div>

              {data.candidates.length === 0 ? (
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#A9AEC4", lineHeight: 1.65, padding: "22px 2px", textAlign: "center", textWrap: "pretty" }}>
                  올릴 수 있는 기록이 없어요.{"\n"}사고팔면 여기에서 고를 수 있어요.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
                  {data.candidates.map((trade) => {
                    const on = pickedTrade === trade.id;
                    const at = new Date(trade.tradedAt);
                    return (
                      <div
                        key={trade.id}
                        onClick={() => setPickedTrade(on ? null : trade.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, cursor: "pointer",
                          background: on ? "#FDE7F1" : "#F5F6FB",
                          boxShadow: on ? `inset 0 0 0 2px ${ACCENT}` : "inset 0 0 0 1px #E9EAF2",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 800, color: "#001E5A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{trade.stockName}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#8E93A8", marginTop: 3, whiteSpace: "nowrap" }}>
                            {`${at.getMonth() + 1}월 ${at.getDate()}일 ${trade.side === "sell" ? "매도" : "매수"}`}
                          </div>
                        </div>
                        <div style={{ flex: "none", fontSize: 13.5, fontWeight: 700, color: "#3D4460", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          {trade.price === null ? "비공개" : `${Math.round(trade.price).toLocaleString("ko-KR")}원`}
                        </div>
                      </div>
                    );
                  })}
                  <textarea
                    onChange={(event) => setPostDraft(event.target.value)}
                    placeholder="왜 사고팔았는지 가족에게 한 줄 남겨요"
                    rows={3}
                    style={{ marginTop: 7, border: "none", resize: "none", background: "#F2F3FA", borderRadius: 16, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#001E5A", fontFamily: "inherit", lineHeight: 1.6 }}
                    value={postDraft}
                  />
                  <div
                    onClick={() => {
                      const body = postDraft.trim();
                      if (!pickedTrade || !body || posting) return;
                      setPosting(true);
                      void data
                        .postFeed(pickedTrade, body)
                        .then(() => { setPostDraft(""); setPickedTrade(null); postSheet.closeSheet(); })
                        .catch((e) => window.alert(e.message))
                        .finally(() => setPosting(false));
                    }}
                    style={{
                      marginTop: 7, textAlign: "center", padding: "15px 0", borderRadius: 999,
                      fontSize: 16, fontWeight: 800, whiteSpace: "nowrap",
                      ...(pickedTrade && postDraft.trim() && !posting
                        ? { color: "#fff", background: ACCENT, cursor: "pointer", boxShadow: "0 3px 10px -2px rgba(215,0,130,0.4)" }
                        : { color: "#B8BDD0", background: "#F0F1F7" }),
                    }}
                  >
                    {posting ? "올리는 중이에요" : "피드에 올리기"}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {sheet.open && sheetCard && (
          <>
            <div
              onClick={sheet.closeSheet}
              style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(20,15,40,0.4)", ...sheet.scrimStyle }}
            />
            <div
              style={{
                position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 7, maxHeight: `${SHEET_RATIO * 100}%`,
                overflowY: "auto", borderRadius: "30px 30px 0 0", padding: "14px 20px 26px",
                background: `linear-gradient(168deg,rgba(255,255,255,0.82) 0%,rgba(255,255,255,0.74) 100%),linear-gradient(168deg,${sheetCard.type.pal[0]} 0%,${sheetCard.type.pal[1]} 52%,${sheetCard.type.pal[2]} 100%)`,
                boxShadow: `0 -18px 40px ${rgba(sheetCard.type.ink, 0.3)}`,
                ...sheet.sheetStyle("sheetUp 0.34s cubic-bezier(0.22,1,0.36,1)"),
              }}
            >
              <div {...sheet.handleProps}>
                <div style={{ width: 44, height: 5, borderRadius: 999, background: rgba(sheetCard.type.ink, 0.25), margin: "0 auto 14px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: sheetCard.type.ink, letterSpacing: "-0.01em", lineHeight: 1.1, textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>{sheetCard.title}</div>
                  </div>
                  <div data-sheet-static onClick={sheet.closeSheet} style={{ flex: "none", whiteSpace: "nowrap", fontSize: 14, fontWeight: 700, color: rgba(sheetCard.type.ink, 0.6), cursor: "pointer", padding: "6px 4px" }}>닫기</div>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: rgba(sheetCard.type.ink, 0.85), lineHeight: 1.6, marginTop: 8, textWrap: "pretty", whiteSpace: "pre-line" }}>
                {sheetPicks.length ? PICKS_LEAD : PICKS_PENDING}
              </div>
              {sheetPicks.length > 0 && (
                <>
                  <div style={{ background: "rgba(255,255,255,0.72)", borderRadius: 20, padding: "5px 3px", marginTop: 14, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)" }}>
                    {sheetPicks.map((pick) => (
                      <div
                        key={pick.code}
                        onClick={() => onLeave(pick.path)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 13px", borderRadius: 17, cursor: "pointer" }}
                      >
                        <div style={{ flex: "none", width: 40, height: 40, borderRadius: 999, backgroundColor: "#FFFFFF", backgroundImage: pick.logo ? `url(${pick.logo})` : undefined, backgroundSize: "30px auto", backgroundPosition: "center", backgroundRepeat: "no-repeat", boxShadow: "0 1px 3px rgba(30,25,60,0.14)" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15.5, fontWeight: 700, color: "#171B2B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pick.name}</div>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: "#8A8F9F", marginTop: 2, whiteSpace: "nowrap" }}>{pick.sub}</div>
                        </div>
                        <div style={{ flex: "none", textAlign: "right" }}>
                          <div style={{ fontSize: 15.5, fontWeight: 800, color: "#171B2B", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{pick.priceText}</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: pick.changeColor, fontVariantNumeric: "tabular-nums", marginTop: 2, whiteSpace: "nowrap" }}>{pick.changeText}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: rgba(sheetCard.type.ink, 0.6), lineHeight: 1.6, textAlign: "center", padding: "12px 8px 2px", textWrap: "pretty" }}>{PICKS_NOTE}</div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
