"use client";

import { useState } from "react";
import type { ChatUiAction } from "../../shared/types/chatbot";
import { F10ChatbotDemo } from "../f10-chatbot/F10ChatbotDemo";
import { styleFromCss } from "./lib/css-style";
import { leaveToRoute } from "./lib/leave-to-route";
import { phoneScreenClipPath } from "./lib/phone-frame";
import { rkPodium, rkRows, rkSeg, type RankTab } from "./lib/ranking-data";
import { PhoneFrame, usePhoneScreenRect } from "./PhoneFrame";

/**
 * 랭킹 화면. `app.html` 이 그리던 것을 그대로 옮겨 왔다 (`ui-src/screens/ranking.html`).
 *
 * 화면을 실제 라우트로 해체하는 작업의 **첫 이관**이다. 랭킹을 먼저 고른 이유는
 * 고정 데모 데이터만 읽어 보유·시세·주문 초안과 상태가 얽히지 않아서다.
 * 아직 안 옮긴 화면으로 나갈 때는 `leaveToRoute` 로 문서를 갈아끼운다.
 */

// 나머지 화면은 아직 app.html 이 그린다. 챗봇 맥락의 화면 이름도 그때 쓰던 값을 그대로 쓴다
// — 랭킹은 챗봇용으로 뭉뚱그리면 `home` 이다 (`ui-src/methods/notifyChatContext.js`).
const CHAT_CONTEXT = { screen: "home" } as const;

const navIcon = (on: boolean) => (on ? "#5B23D6" : "#B7BACB");
const navLabel = (on: boolean) =>
  styleFromCss("font-size:11px;font-weight:" + (on ? "800" : "600") + ";color:" + (on ? "#01185A" : "#A9AEC4"));
const navTab = styleFromCss(
  "flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer",
);

const HEAD = styleFromCss(
  'flex:none;position:relative;height:416px;border-radius:0 0 48px 48px;overflow:hidden;'
    + 'background:radial-gradient(125% 100% at 50% 8%,#2A5FC4 0%,#123B8E 38%,#0B2A6B 68%,#01185A 100%)',
);
const BACK = styleFromCss(
  'position:absolute;left:18px;top:65px;width:38px;height:38px;border-radius:999px;background:rgba(255,255,255,0.14);'
    + 'display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;line-height:1;padding-bottom:3px;'
    + 'box-sizing:border-box;cursor:pointer',
);
const TITLE = styleFromCss(
  'position:absolute;left:0;right:0;top:65px;height:38px;display:flex;align-items:center;justify-content:center;gap:7px;'
    + 'font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em',
);
const SEG_WRAP = styleFromCss(
  'position:absolute;left:78px;top:117px;width:246px;height:40px;box-sizing:border-box;border-radius:20px;'
    + 'background:rgba(0,0,0,0.26);display:flex;padding:4px;gap:6px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3)',
);
const CONE = styleFromCss(
  'position:absolute;left:135px;top:150px;width:132px;height:192px;pointer-events:none;filter:blur(7px);'
    + 'clip-path:polygon(34% 0%,66% 0%,100% 100%,0% 100%);'
    + 'background:linear-gradient(180deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.07) 56%,rgba(255,255,255,0) 100%)',
);
const GROUND = styleFromCss(
  'position:absolute;left:26px;top:383px;width:350px;height:12px;border-radius:999px;filter:blur(2px);'
    + 'background:radial-gradient(closest-side,rgba(0,0,0,0.42) 0%,rgba(0,0,0,0) 78%)',
);
const LIST = styleFromCss(
  'flex:1;overflow-y:auto;overflow-x:hidden;padding:20px 16px 4px;display:flex;flex-direction:column;gap:13px',
);
// 좌우 22 는 폰 프레임 개구부(하단 코너 반경 63px)에 물리지 않는 여백이다.
// `ui-src/methods/renderVals-return-7-shared.js` 의 `navBarStyle` 과 같은 값이어야 한다.
const NAV_BAR = styleFromCss('flex:none;display:flex;align-items:center;gap:8px;padding:6px 22px 10px');
const NAV_PILL = styleFromCss(
  'flex:1;display:flex;align-items:center;border-radius:999px;padding:9px 6px;background:rgba(255,255,255,0.6);'
    + 'backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);'
    + 'box-shadow:0 14px 28px -12px rgba(35,25,80,0.35),inset 0 0 0 1px rgba(255,255,255,0.5)',
);

export function RankingScreen() {
  const [tab, setTab] = useState<RankTab>("week");
  const podium = rkPodium(tab);
  const rows = rkRows(tab);
  // 챗봇 오버레이는 `PhoneFrame` 밖에 있어 화면 밖으로 나갈 수 있다. 프레임과 같은 사각형으로
  // 잘라 가둔다 — 챗봇도 같은 값을 스스로 계산하지만, 잘못 계산해도 프레임은 넘지 못한다.
  const screenRect = usePhoneScreenRect();

  // 챗봇이 시킨 화면 이동은 아직 app.html 몫이다. 지시를 들고 그쪽으로 넘어간다.
  const openChatAction = (action: ChatUiAction) => leaveToRoute("/", action);

  return (
    <>
      <PhoneFrame statusBar="light">
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <div style={HEAD}>
            <div onClick={() => leaveToRoute("/")} style={BACK}>
              ‹
            </div>
            <div style={TITLE}>
              <span>랭킹</span>
            </div>
            <div style={SEG_WRAP}>
              <div onClick={() => setTab("week")} style={styleFromCss(rkSeg(tab === "week"))}>
                이번 주
              </div>
              <div onClick={() => setTab("season")} style={styleFromCss(rkSeg(tab === "season"))}>
                시즌 전체
              </div>
            </div>
            <div style={CONE} />
            <div style={GROUND} />
            {podium.map((p) => (
              <div key={`ped-${p.rank}`} style={styleFromCss(p.pedStyle)}>
                <div style={styleFromCss(p.pedTopStyle)} />
                <div style={styleFromCss(p.ribLStyle)} />
                <div style={styleFromCss(p.ribRStyle)} />
                <div style={styleFromCss(p.medStyle)}>{p.rank}</div>
              </div>
            ))}
            {podium.map((p) => (
              <div key={`slot-${p.rank}`} style={styleFromCss(p.slotStyle)}>
                <div style={styleFromCss(p.crownStyle)}>{p.crown}</div>
                <div style={styleFromCss(p.nameStyle)}>{p.name}</div>
                <div style={styleFromCss(p.pillStyle)}>
                  <div style={styleFromCss(p.pctStyle)}>{p.pct}</div>
                  <div style={styleFromCss(p.stepStyle)}>{p.step}</div>
                </div>
                <div style={styleFromCss(p.avStyle)}>{p.emoji}</div>
              </div>
            ))}
          </div>

          <div style={LIST}>
            {rows.map((r) => (
              <div key={r.rank} style={styleFromCss(r.rowStyle)}>
                <div style={styleFromCss(r.rankStyle)}>{r.rank}</div>
                <div style={styleFromCss(r.plateStyle)}>{r.emoji}</div>
                <div style={styleFromCss(r.nameStyle)}>{r.name}</div>
                <div style={styleFromCss(r.badgeStyle)}>{r.step}</div>
                <div style={styleFromCss(r.pctStyle)}>{r.pct}</div>
              </div>
            ))}
          </div>

          <div style={NAV_BAR}>
            <div style={NAV_PILL}>
              <div onClick={() => leaveToRoute("/")} style={navTab}>
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="23"
                  stroke={navIcon(false)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="23"
                >
                  <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
                </svg>
                <span style={navLabel(false)}>홈</span>
              </div>
              <div onClick={() => leaveToRoute("/explore")} style={navTab}>
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="23"
                  stroke={navIcon(false)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="23"
                >
                  <path d="M3 17l5-5 4 4 8-9" />
                  <circle cx="20" cy="7" fill={navIcon(false)} r="1.5" stroke="none" />
                </svg>
                <span style={navLabel(false)}>모의투자</span>
              </div>
              <div onClick={() => leaveToRoute("/archive")} style={navTab}>
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="23"
                  stroke={navIcon(false)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="23"
                >
                  <rect height="3" rx="1" width="16" x="4" y="15" />
                  <rect height="3" rx="1" width="14" x="5" y="11" />
                  <rect height="3" rx="1" width="12" x="6" y="7" />
                </svg>
                <span style={navLabel(false)}>아카이브</span>
              </div>
              <div style={navTab}>
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="23"
                  stroke={navIcon(true)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="23"
                >
                  <path d="M8 4h8v4a4 4 0 0 1-8 0z" />
                  <path d="M8 5H5a3 3 0 0 0 3 5" />
                  <path d="M16 5h3a3 3 0 0 1-3 5" />
                  <path d="M12 13v3" />
                  <path d="M9 20h6" />
                  <path d="M9 20a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                </svg>
                <span style={navLabel(true)}>랭킹</span>
              </div>
            </div>
          </div>
        </div>
      </PhoneFrame>
      <div
        className="prototype-chat-overlay"
        style={{ clipPath: phoneScreenClipPath(screenRect) }}
      >
        <F10ChatbotDemo context={CHAT_CONTEXT} onUiAction={openChatAction} />
      </div>
    </>
  );
}
