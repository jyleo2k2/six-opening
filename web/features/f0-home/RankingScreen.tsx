"use client";

import { useState } from "react";
import { BottomNav } from "./BottomNav";
import { styleFromCss } from "./lib/css-style";
import { rkPodium, rkRows, rkSeg, type RankTab } from "./lib/ranking-data";
import { PhoneFrame } from "./PhoneFrame";

/**
 * 랭킹 화면. `app.html` 이 그리던 것을 그대로 옮겨 왔다 (`ui-src/screens/ranking.html`).
 *
 * 화면을 실제 라우트로 해체하는 작업의 **첫 이관**이다. 랭킹을 먼저 고른 이유는
 * 고정 데모 데이터만 읽어 보유·시세·주문 초안과 상태가 얽히지 않아서다.
 *
 * 이동은 직접 하지 않고 `onLeave` 로 올린다. 화면 이동은 `ConnectedPrototype` 이 소유한다 —
 * 문서를 갈아끼우면 app.html 이 처음부터 다시 떠서, 계정을 판정하기 전까지 아이 계정 데모가
 * 먼저 그려져 남의 계좌가 잠깐 보인다. 챗봇 오버레이도 부모가 하나만 얹는다.
 */

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
export function RankingScreen({ onLeave }: { onLeave: (path: string) => void }) {
  const [tab, setTab] = useState<RankTab>("week");
  const podium = rkPodium(tab);
  const rows = rkRows(tab);

  return (
    <PhoneFrame statusBar="light">
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <div style={HEAD}>
          <div onClick={() => onLeave("/")} style={BACK}>
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

        <BottomNav active="ranking" onLeave={onLeave} />
      </div>
    </PhoneFrame>
  );
}
