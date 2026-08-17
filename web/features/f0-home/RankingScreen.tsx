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
 *
 * 무대 없이 밝은 연보라 화면 하나로 간다 — 순위는 시상대 링 색과 배지로만 구분한다.
 * 하단 탭은 다른 이관 화면과 같은 `BottomNav`를 그대로 쓴다.
 */

const WRAP = styleFromCss(
  "position:absolute;inset:0;display:flex;flex-direction:column;"
    + "background:linear-gradient(180deg,#F1ECFF 0%,#EDE7FC 100%)",
);
const HEAD = styleFromCss("flex:none;position:relative;height:366px;overflow:hidden;background:transparent");
const TITLE = styleFromCss(
  "position:absolute;left:0;right:0;top:60px;height:38px;display:flex;align-items:center;justify-content:center;gap:7px;"
    + "font-size:22.5px;font-weight:700;color:#001E5A;letter-spacing:-0.01em",
);
const SEG_WRAP = styleFromCss(
  "position:absolute;left:50%;transform:translateX(-50%);top:117px;width:322px;height:44px;box-sizing:border-box;"
    + "border-radius:22px;background:#FFFFFF;display:flex;padding:4px;gap:4px;box-shadow:inset 0 0 0 1px #E7E4F2",
);
const POD_ROW = styleFromCss(
  "position:absolute;left:0;right:0;bottom:16px;display:flex;align-items:flex-start;justify-content:center;gap:6px",
);
const LIST = styleFromCss(
  "position:relative;z-index:2;flex:1;min-height:0;margin:0 12px;background:#FFFFFF;"
    + "border-radius:26px 26px 0 0;overflow-y:auto;overflow-x:hidden;padding:10px 0 6px",
);

export function RankingScreen({ onLeave }: { onLeave: (path: string) => void }) {
  const [tab, setTab] = useState<RankTab>("week");
  const podium = rkPodium(tab);
  const rows = rkRows(tab);

  return (
    <PhoneFrame>
    <div style={WRAP}>
      <div style={HEAD}>
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
          <div onClick={() => setTab("school")} style={styleFromCss(rkSeg(tab === "school"))}>
            학교별
          </div>
        </div>
        <div id="tut-ranking" style={POD_ROW}>
          {podium.map((p) => (
            <div key={p.rank} style={styleFromCss(p.colStyle)}>
              <div style={styleFromCss(p.crownStyle)} />
              <div style={styleFromCss(p.avStyle)}>{p.emoji}</div>
              <div style={styleFromCss(p.badgeStyle)}>{p.rank}</div>
              <div style={styleFromCss(p.nameStyle)}>{p.name}</div>
              <div style={styleFromCss(p.pctStyle)}>{p.pct}</div>
            </div>
          ))}
        </div>
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
