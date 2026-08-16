"use client";

import { useMemo, useState } from "react";
import { PROTOTYPE_PHONE } from "./lib/phone-frame";
import { BottomNav } from "./BottomNav";
import { styleFromCss } from "./lib/css-style";
import { ACCENT, feedCards, LANE_HEIGHT, returnSummary, runners, RUN_START } from "./lib/archive-feed";
import {
  familyMembers,
  formatScore,
  gridRings,
  labelAt,
  myProfile,
  pointAt,
  resolveType,
  rgba,
  TRAIT_LABELS,
  TRAIT_META,
  typeImage,
  weekCards,
  type FamilyMember,
  type ResolvedType,
  type WeekCard,
} from "./lib/archive-profile-view";
import { useArchiveData } from "./lib/use-archive-data";
import { sectorCards } from "./lib/archive-sectors";
import { useRailDrag } from "./lib/use-rail-drag";
import { useSheetDrag } from "./lib/use-sheet-drag";
import { useUniverseLive } from "./lib/use-universe";
import { useWallet, type WalletAccountId } from "./lib/use-wallet";
import { PhoneFrame } from "./PhoneFrame";

/**
 * 성장 아카이브. `ui-src/screens/archive.html` 과 `methods/buildArchive.js` 를 옮겨 왔다.
 *
 * 값 계산은 `lib/archive-profile-view.ts`(성향)와 `lib/archive-feed.ts`(수익률)가 하고
 * 여기는 붙이기만 한다. 화면 안에 네 자리가 있다 — 성향 탭, 수익률 탭, 카드 모아보기,
 * 가족 비교. 뒤 둘은 탭을 덮는 **자리**이지 시트가 아니다(원본과 같다).
 *
 * **`보유 종목 · 섹터별` 레일과 그 섹터 상세 모달은 옮기지 않았다.** 레일은 이미 화면에서
 * 빠져 모달로 갈 길이 없었고(기능명세 §10-6 · F9 SPEC §7 의 도달 불가 항목), 이관은 그
 * 판단을 내리는 자리다 — 되살리려면 레일부터 다시 설계해야 한다.
 */
const PAGE = styleFromCss(
  "position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column;background:#F7F6FB",
);
const BACK = styleFromCss(
  "width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;" +
    "font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
const WEEK_LABEL = styleFromCss("font-size:14px;font-weight:600;color:#9095AA");
const TITLE = styleFromCss(
  "font-size:27px;font-weight:800;color:#001E5A;letter-spacing:-0.025em;margin-top:2px",
);
const tabStyle = (on: boolean) =>
  styleFromCss(
    "flex:1;text-align:center;padding:11px 0;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;" +
      "white-space:nowrap;transition:all 0.18s;" +
      (on ? "color:#fff;background:#001E5A" : "color:#7C819A;background:#EAEBF3"),
  );
const BODY = styleFromCss(
  "flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:0 16px;display:flex;flex-direction:column",
);
const CTA = styleFromCss(
  `width:230px;text-align:center;font-size:14px;font-weight:800;color:#fff;border-radius:18px;padding:13px 0;cursor:pointer;background:${ACCENT}`,
);
const SHEET_RATIO = 0.82;
const SHEET_HEIGHT = PROTOTYPE_PHONE.screenHeight * SHEET_RATIO;

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
  onLeave,
  view: requested,
}: {
  account: WalletAccountId;
  onLeave: (path: string) => void;
  /** 주소가 가리킨 자리(`/archive/return` 등). 챗봇 점프가 이 길로 들어온다. */
  view?: string;
}) {
  const { wallet } = useWallet();
  const { universe, quotes } = useUniverseLive();
  const data = useArchiveData();
  const [tab, setTab] = useState<"report" | "return">(
    requested === "return" ? "return" : "report",
  );
  const [view, setView] = useState<"tabs" | "cards" | "family">(
    requested === "cards" ? "cards" : requested === "family" ? "family" : "tabs",
  );
  const [traitPick, setTraitPick] = useState<number | null>(null);
  const [cardActive, setCardActive] = useState<number | null>(null);
  const [sheetIndex, setSheetIndex] = useState<number | null>(null);
  const [famPick, setFamPick] = useState("all");
  const [who, setWho] = useState("all");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const sheet = useSheetDrag(SHEET_HEIGHT);

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
  const summary = returnSummary(me?.cash ?? 0, me?.holdings ?? [], prices);
  const sectors = sectorCards(me?.holdings ?? [], prices);
  // 섹터 레일은 카드 모아보기 레일과 배선을 나눠 쓸 수 없다 — 같은 훅 인스턴스를 두 레일이
  // 쓰면 한쪽을 끌 때 다른 쪽의 스냅이 풀린다. 켜진 카드를 고르지 않는 레일이라 인자는 없다.
  const sectorRail = useRailDrag();
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

  const sheetCard: WeekCard | undefined = cards[sheetIndex ?? activeCard] ?? cards[cards.length - 1];
  const now = new Date();

  return (
    <PhoneFrame>
      <div style={PAGE}>
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "6px 20px 0" }}>
          <div onClick={() => onLeave("/")} style={BACK}>‹</div>
          <div style={{ flex: 1 }} />
        </div>
        <div style={{ flex: "none", padding: "10px 20px 0" }}>
          <div style={WEEK_LABEL}>{`${now.getMonth() + 1}월 ${Math.ceil(now.getDate() / 7)}주차`}</div>
          <div style={TITLE}>성장 아카이브</div>
        </div>
        <div style={{ flex: "none", display: "flex", gap: 8, padding: "16px 20px 12px" }}>
          <div onClick={() => { setTab("report"); setView("tabs"); }} style={tabStyle(view === "tabs" && tab === "report")}>성향</div>
          <div onClick={() => { setTab("return"); setView("tabs"); }} style={tabStyle(view === "tabs" && tab === "return")}>수익률</div>
        </div>

        {view === "family" && (
          <>
            <div style={{ ...BODY, gap: 12 }}>
              <div style={{ flex: "none", display: "flex", gap: 7, flexWrap: "wrap" }}>
                {[{ key: "all", name: "전체" } as Pick<FamilyMember, "key" | "name">, ...family].map((f) => (
                  <div
                    key={f.key}
                    onClick={() => setFamPick(f.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "9px 16px", borderRadius: 999,
                      cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", transition: "all 0.18s",
                      ...(famPick === f.key
                        ? { color: "#fff", background: ACCENT }
                        : { color: "#6B6F85", background: "#fff", boxShadow: "0 1px 5px rgba(30,25,60,0.05)" }),
                    }}
                  >
                    <span>{f.name}</span>
                  </div>
                ))}
              </div>

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
                    {famShown.map((f) => (
                      <polygon
                        fill={f.fill}
                        key={f.key}
                        points={f.scores.map((sc, i) => pointAt(i, sc / f.scaleMax, 92, 118, 118).join(",")).join(" ")}
                        stroke={f.color}
                        strokeLinejoin="round"
                        strokeWidth="2.6"
                      />
                    ))}
                    {famShown.flatMap((f) =>
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
            <div style={{ flex: "none", display: "flex", justifyContent: "center", padding: "6px 16px 18px" }}>
              <div onClick={() => setView("tabs")} style={CTA}>성향 화면으로 돌아가기</div>
            </div>
          </>
        )}

        {view === "cards" && (
          <>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
                          <Radar ink={ink} scaleMax={card.scaleMax} scores={card.scores} />
                        </div>
                        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 9, marginTop: 8, borderRadius: 14, padding: "10px 11px", background: "rgba(255,255,255,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75),inset 0 0 0 1px rgba(255,255,255,0.45)" }}>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600, color: rgba(ink, 0.9), lineHeight: 1.6, textWrap: "pretty", whiteSpace: "pre-line" }}>{card.desc}</div>
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
              <div style={{ flex: "none", textAlign: "center", padding: "14px 26px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#8E93A8", lineHeight: 1.6, textWrap: "pretty" }}>
                  한 주에 한 장씩 쌓여요. 옆으로 넘겨서 지난 주의 나를 볼 수 있어요.
                </div>
              </div>
            </div>
            <div style={{ flex: "none", display: "flex", justifyContent: "center", padding: "0 16px 18px" }}>
              <div onClick={() => setView("tabs")} style={CTA}>성향 화면으로 돌아가기</div>
            </div>
          </>
        )}

        {view === "tabs" && tab === "report" && (
          <div style={BODY}>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 11, paddingBottom: 6 }}>
              <CardShell type={myType}>
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: rgba(myType.ink, 0.9), letterSpacing: "0.12em" }}>나의 투자 성향</span>
                </div>
                <div style={{ position: "relative", textAlign: "center", fontSize: 24, fontWeight: 900, color: myType.ink, marginTop: 5, letterSpacing: "-0.01em", textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}>{myType.title}</div>
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <div style={{ flex: "none", width: 142, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                    {/* 유형이 정해지기 전에는 그림 자리를 비운다. 자리는 남겨 둬야 오각형이 안 움직인다. */}
                    <div style={{ width: 168, height: 208, margin: "0 -14px -4px -12px", background: myType.key ? `url(${typeImage(myType.key)}) center bottom/contain no-repeat` : "none", filter: myType.key ? `drop-shadow(0 12px 14px ${rgba(myType.ink, 0.38)})` : "none" }} />
                    <div style={{ width: 90, height: 20, marginTop: -8, borderRadius: "50%", background: `radial-gradient(ellipse at center,${rgba(myType.ink, 0.22)} 0%,${rgba(myType.ink, 0.06)} 46%,rgba(0,0,0,0) 72%)` }} />
                  </div>
                  <Radar
                    ink={myType.ink}
                    labelSize={11}
                    onPick={(i) => setTraitPick(traitPick === i ? null : i)}
                    picked={traitPick}
                    scaleMax={mine.scaleMax}
                    scores={mine.scores}
                  />
                </div>
                <div style={{ position: "relative", marginTop: 10, borderRadius: 14, padding: "11px 13px", background: "rgba(255,255,255,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75),inset 0 0 0 1px rgba(255,255,255,0.45)" }}>
                  {traitPick !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: myType.ink }}>{TRAIT_LABELS[traitPick]}</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: myType.ink, fontVariantNumeric: "tabular-nums" }}>{formatScore(mine.scores[traitPick])}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: rgba(myType.ink, 0.9), lineHeight: 1.65, marginTop: traitPick !== null ? 6 : 0, textWrap: "pretty", whiteSpace: "pre-line" }}>
                    {traitPick !== null ? TRAIT_META[traitPick].desc : myType.desc}
                  </div>
                </div>
              </CardShell>
            </div>
            <div style={{ display: "flex", gap: 10, paddingBottom: 2, marginTop: 14 }}>
              <div onClick={() => { setCardActive(null); setView("cards"); }} style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: 700, color: "#fff", borderRadius: 16, padding: "14px 0", cursor: "pointer", background: ACCENT }}>카드 모아보기</div>
              <div onClick={() => setView("family")} style={{ flex: 1, textAlign: "center", fontSize: 14.5, fontWeight: 700, color: "#001E5A", borderRadius: 16, padding: "14px 0", cursor: "pointer", background: "#fff", boxShadow: "0 2px 10px rgba(30,25,60,0.06)" }}>가족 투자 성향 비교</div>
            </div>
          </div>
        )}

        {view === "tabs" && tab === "return" && (
          <div style={BODY}>
            <div style={{ display: "flex", flexDirection: "column", gap: 13, paddingBottom: 10 }}>
              <div style={{ background: "#FFFFFF", borderRadius: 22, padding: "16px 16px 14px", boxShadow: "0 2px 10px rgba(30,25,60,0.05)" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: "#01185A" }}>가족 수익률 달리기</div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: "#A9AEC4", whiteSpace: "nowrap" }}>START 왼쪽은 마이너스</div>
                </div>
                <div style={{ position: "relative", marginTop: 12, borderRadius: 16, overflow: "hidden", background: "#F4F5FB", boxShadow: "inset 0 0 0 1px #E4E6F1" }}>
                  <div style={{ position: "absolute", left: `${RUN_START}%`, top: 4, transform: "translateX(-50%)", zIndex: 3, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", color: "#8E93A8", background: "#F4F5FB", padding: "0 5px", whiteSpace: "nowrap" }}>START</div>
                  <div style={{ position: "absolute", left: `${RUN_START}%`, top: 0, bottom: 0, width: 0, borderLeft: "2px dashed #C6CBDD", transform: "translateX(-1px)", pointerEvents: "none" }} />
                  {lanes.map((lane) => (
                    <div key={lane.key} style={{ position: "relative", height: LANE_HEIGHT, boxShadow: "inset 0 -1px 0 #E4E6F1" }}>
                      <div style={{ position: "absolute", left: 8, top: 6, zIndex: 3, fontSize: 11, fontWeight: 700, color: "#8E93A8", whiteSpace: "nowrap", background: "rgba(244,245,251,0.9)", borderRadius: 999, padding: "1px 6px" }}>{lane.name}</div>
                      <div style={{ position: "absolute", left: `${lane.at.toFixed(1)}%`, top: "50%", transform: `translate(-50%,-50%)${lane.minus ? " scaleX(-1)" : ""}`, display: "flex", alignItems: "center", gap: 4, transition: "left 0.4s ease" }}>
                        {lane.showDash && <div style={{ width: 14, height: 12, flex: "none", borderRadius: 2, opacity: 0.45, background: `repeating-linear-gradient(to bottom,${lane.color} 0 2px,transparent 2px 5px)` }} />}
                        <div style={{ width: 34, height: 34, flex: "none", borderRadius: 999, background: `url(${lane.face}) center/cover no-repeat,#EDEFF6`, boxShadow: `0 0 0 2.5px ${lane.color}${lane.has ? "" : "55"},0 2px 6px rgba(30,25,60,0.18)`, ...(lane.has ? {} : { filter: "grayscale(0.6)", opacity: 0.6 }) }} />
                        <div style={{ position: "absolute", left: "50%", top: 34, transform: `translateX(-50%)${lane.minus ? " scaleX(-1)" : ""}`, fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: lane.pctColor }}>{lane.pctText}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ position: "relative", overflow: "hidden", background: "#001E5A", borderRadius: 26, padding: "20px 22px 21px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>내 수익률</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 5 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: summary.positive ? "#FF8574" : "#8AB6FF" }}>{summary.pctText}</div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 15, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,0.13)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.52)", whiteSpace: "nowrap" }}>지금 총 금액</div>
                    <div style={{ fontSize: 21, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", marginTop: 3, whiteSpace: "nowrap" }}>{summary.totalText}</div>
                  </div>
                  <div style={{ flex: "none", textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.52)", whiteSpace: "nowrap" }}>쓸 수 있는 돈</div>
                    <div style={{ fontSize: 15.5, fontWeight: 800, color: "rgba(255,255,255,0.82)", fontVariantNumeric: "tabular-nums", marginTop: 3, whiteSpace: "nowrap" }}>{summary.cashText}</div>
                  </div>
                </div>
              </div>

              {/*
                보유 종목 · 섹터별. 카드 하나가 한 분야이고 값은 그 분야 **합계**로 낸다.
                끌어 넘기는 배선은 카드 모아보기와 같은 `useRailDrag` 를 쓴다 — 한 화면
                안에서 레일마다 끌리는 느낌이 다르면 안 된다.
                보유가 없으면 빈 레일 대신 아무것도 그리지 않는다.
              */}
              {sectors.length > 0 && (
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#001E5A", letterSpacing: "-0.01em", padding: "6px 0 0" }}>
                    보유 종목 · 섹터별
                  </div>
                  {/*
                    **`touch-action` 을 두지 않는다(기본 `auto`).** 카드 모아보기 레일은
                    `pan-x` 를 쓰지만 그건 세로로 스크롤되지 않는 자기 자리에 있어서다.
                    이 레일은 세로로 스크롤되는 `BODY` 안에 있으므로 `pan-x` 를 걸면
                    "세로 팬은 브라우저가 처리하지 말라"가 돼, 섹터 카드에 손가락을 얹고
                    아래로 밀 때 피드가 따라 내려오지 않는다. `useRailDrag` 는 터치를
                    아예 무시하고 네이티브 스크롤에 맡기므로 여기서 막으면 대신할 것이 없다.
                  */}
                  <div
                    onPointerDown={sectorRail.onPointerDown}
                    ref={sectorRail.ref}
                    style={{ display: "flex", alignItems: "stretch", gap: 9, overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", padding: "11px 2px 4px", scrollbarWidth: "none", cursor: "grab", userSelect: "none", WebkitUserSelect: "none" }}
                  >
                    {sectors.map((sector) => (
                      <div
                        key={sector.id}
                        style={{ flex: "none", width: 108, scrollSnapAlign: "start", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", borderRadius: 20, padding: "16px 10px 17px", background: "#fff", boxShadow: "0 2px 10px rgba(30,25,60,0.05)" }}
                      >
                        <div style={{ width: 50, height: 50, flex: "none", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25, fontWeight: 800, color: "#6B6F85", background: "#F5F6FB" }}>
                          {sector.emoji}
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#001E5A", marginTop: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{sector.name}</div>
                        <div style={{ fontSize: 11.5, fontWeight: 500, color: "#A9AEC4", marginTop: 3, whiteSpace: "nowrap" }}>{sector.countText}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#6B6F85", marginTop: 6, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{sector.valueText}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", marginTop: 4, color: sector.pctColor }}>{sector.pctText}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {[{ key: "all", name: "전체" }, ...family.map((f) => ({ key: f.key, name: f.name }))].map((f) => (
                  <div
                    key={f.key}
                    onClick={() => setWho(f.key)}
                    style={{
                      padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
                      ...(who === f.key
                        ? { color: "#fff", background: ACCENT }
                        : { color: "#6B6F85", background: "#fff", boxShadow: "0 1px 5px rgba(30,25,60,0.05)" }),
                    }}
                  >
                    {f.name}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#001E5A", letterSpacing: "-0.01em", padding: "6px 0 0" }}>
                  {who === "all" ? "가족 피드" : `${family.find((f) => f.key === who)?.name ?? ""}의 피드`}
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
                      <div style={{ flex: "none", width: "39%", position: "relative", overflow: "hidden", padding: "13px 14px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: card.positive ? ACCENT : "#001E5A" }}>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" }}>{card.dateLabel}</div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.stockName}</div>
                          <div style={{ fontSize: 25, fontWeight: 800, color: "#fff", marginTop: 5, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{card.bigPctText}</div>
                        </div>
                        <div style={{ position: "absolute", right: -2, bottom: -2, width: 56, height: 60, background: `url(${card.pose}) right bottom/contain no-repeat`, filter: "drop-shadow(0 4px 7px rgba(0,0,0,0.3))" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, background: "#F5F6FB", padding: "14px 15px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#A9AEC4" }}>{card.avgLabel}</div>
                        <div style={{ fontSize: 25, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", marginTop: 4, whiteSpace: "nowrap", color: card.avgColor }}>{card.avgText}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#3D4460", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.oneLiner}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 14.5, fontWeight: 500, color: "#3D4460", lineHeight: 1.72, marginTop: 13, whiteSpace: "pre-line", textWrap: "pretty" }}>{card.text}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20, marginTop: 13 }}>
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
                        <span style={{ fontSize: 19 }}>좋아요</span>
                        <span>{card.likeCount}</span>
                      </div>
                    </div>

                    {openComments[card.id] && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 13, paddingTop: 12, borderTop: "1px solid #F0F1F7" }}>
                        {card.comments.map((comment) => (
                          <div key={comment.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ width: 26, height: 26, flex: "none", borderRadius: 999, background: `url(${comment.face}) center/cover no-repeat,#FFFFFF` }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#001E5A" }}>{comment.authorName}</div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#5C6280", lineHeight: 1.6, marginTop: 2, textWrap: "pretty" }}>{comment.body}</div>
                            </div>
                            {comment.canDelete && (
                              <div
                                onClick={() => { void data.deleteComment(card.id, comment.id).catch((e) => window.alert(e.message)); }}
                                style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: "#A9AEC4", padding: "4px 8px", borderRadius: 999, background: "#F2F3FA", cursor: "pointer", whiteSpace: "nowrap" }}
                              >
                                삭제
                              </div>
                            )}
                          </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            onChange={(event) => setDrafts((current) => ({ ...current, [card.id]: event.target.value }))}
                            placeholder="댓글 남기기"
                            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "#F2F3FA", borderRadius: 999, padding: "9px 13px", fontSize: 13, fontWeight: 600, color: "#001E5A", fontFamily: "inherit" }}
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
              </div>
            </div>
          </div>
        )}

        <BottomNav active="archive" onLeave={onLeave} />

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
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
                {sheetCard.scores.map((score, i) => (
                  <div key={TRAIT_LABELS[i]}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, color: sheetCard.type.ink }}>{TRAIT_LABELS[i]}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: sheetCard.type.ink, fontVariantNumeric: "tabular-nums" }}>{formatScore(score)}</div>
                    </div>
                    <div style={{ height: 9, borderRadius: 999, background: rgba(sheetCard.type.ink, 0.1), boxShadow: `inset 0 1px 2px ${rgba(sheetCard.type.ink, 0.2)}`, overflow: "hidden", marginTop: 8 }}>
                      <div style={{ width: `${(score / sheetCard.scaleMax) * 100}%`, height: "100%", borderRadius: 999, background: TRAIT_META[i].color }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: rgba(sheetCard.type.ink, 0.82), lineHeight: 1.6, marginTop: 7, textWrap: "pretty", whiteSpace: "pre-line" }}>{TRAIT_META[i].desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
