"use client";

import { styleFromCss } from "./lib/css-style";

/**
 * 화면 아래 탭 네 개. `ui-src` 의 화면들이 저마다 같은 마크업을 복사해 갖고 있었다 —
 * 옮겨 온 화면끼리는 하나만 둔다.
 *
 * 이동은 직접 하지 않고 `onLeave` 로 올린다. 화면 이동은 `ConnectedPrototype` 이 소유한다 —
 * 문서를 갈아끼우지 않고 iframe 을 살려 둔 채 주소만 바꾸기 위해서다.
 */
export type NavTab = "home" | "trade" | "archive" | "ranking";

// 프로토타입의 `navStyle`·`navItemX`·`navLabelX` 와 같은 값이다.
//
// 예전에는 `ui-src` 의 `navBarStyle` 을 따라 흰 유리 알약이었는데, **새 프로토타입에는
// 유리 알약이 없다** — `backdrop-filter` 가 원본에 한 번도 안 나온다. 연보라 둥근 바
// 하나로 바뀌었고 그 변경이 안 옮겨져 있었다. 하단바는 모든 화면에 걸리므로 여기만
// 옛 디자인으로 남아 있으면 화면마다 어긋난다.
const BAR = styleFromCss(
  "flex:none;display:flex;align-items:flex-start;margin:0 12px 12px;border-radius:26px;" +
    "background:#EDE9FB;box-shadow:inset 0 1px 0 rgba(255,255,255,0.9)",
);
const TAB = (on: boolean) =>
  styleFromCss(
    "flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 0 9px;cursor:pointer;color:" +
      (on ? "#F5327F" : "#9B94C4"),
  );

// `line-height:normal` 만 원본에 없는 값이다. 전역 CSS 가 body 에 1.5 를 깔아 두어 그냥 두면
// 12px 라벨이 18px 줄높이를 상속받고, 그 6px 이 탭·바 높이로 그대로 올라간다. 원본 문서에는
// 그 전역이 없으므로 여기서 되돌려야 같은 높이가 된다.
const labelStyle = styleFromCss(
  "font-size:12px;line-height:normal;letter-spacing:-0.02em;white-space:nowrap;font-weight:",
);
const label = (on: boolean) => ({ ...labelStyle, fontWeight: on ? 700 : 600 });

// 아이콘도 원본의 것이다. 선 색은 항목이 정하고(`currentColor`) 굵기는 모양마다 다르다.
const TABS: { id: NavTab; label: string; path: string; icon: React.ReactNode }[] = [
  {
    id: "home",
    label: "홈",
    path: "/",
    icon: (
      <path
        d="M4 10.4 L12 4 L20 10.4 V19 a1 1 0 0 1 -1 1 H5 a1 1 0 0 1 -1 -1 Z"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    ),
  },
  {
    id: "trade",
    label: "모의투자",
    path: "/explore",
    icon: <path d="M4 16.5 L9.5 10.5 L13.5 14 L20 6.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />,
  },
  {
    id: "archive",
    label: "아카이브",
    path: "/archive",
    icon: (
      <>
        <rect height="4" rx="1.4" strokeWidth="1.8" width="15" x="4.5" y="5" />
        <rect height="4" rx="1.4" strokeWidth="1.8" width="15" x="4.5" y="11" />
        <path d="M6.5 18.5 H17.5" strokeLinecap="round" strokeWidth="1.8" />
      </>
    ),
  },
  {
    id: "ranking",
    label: "랭킹",
    path: "/ranking",
    icon: (
      <>
        <path d="M7 4.5 H17 V10 a5 5 0 0 1 -10 0 Z" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M7 6 H4.6 a0.6 0.6 0 0 0 -0.6 0.6 C4 8.6 5.4 10 7.2 10.2" strokeLinecap="round" strokeWidth="1.7" />
        <path d="M17 6 h2.4 a0.6 0.6 0 0 1 0.6 0.6 C20 8.6 18.6 10 16.8 10.2" strokeLinecap="round" strokeWidth="1.7" />
        <path d="M12 15 V18 M8.8 19.5 H15.2" strokeLinecap="round" strokeWidth="1.8" />
      </>
    ),
  },
];

export function BottomNav({
  active,
  atTabRoot = true,
  onLeave,
}: {
  active: NavTab | null;
  /**
   * 지금 화면이 켜진 탭의 **첫 화면**인가. 기본은 그렇다 — 홈·탐색·아카이브·랭킹은
   * 자기 탭의 첫 화면이라 그 탭을 다시 눌러도 갈 곳이 없다.
   *
   * 종목 상세·차트·뉴스처럼 탭 안쪽으로 한 걸음 들어온 화면은 `false` 다. 이때는 켜진
   * 탭을 눌러도 이동한다 — 안 그러면 목록으로 돌아가려고 `모의투자` 를 누른 손이
   * 아무 일도 일어나지 않는 화면 앞에 남는다.
   */
  atTabRoot?: boolean;
  onLeave: (path: string) => void;
}) {
  return (
    <div style={BAR}>
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <div
            // 튜토리얼이 짚고 대신 눌러 주는 자리다 — `lib/tutorial-steps.ts` 의 `nav-trade` 장.
            id={tab.id === "trade" ? "tut-nav-trade" : undefined}
            key={tab.id}
            onClick={() => {
              if (!on || !atTabRoot) onLeave(tab.path);
            }}
            style={TAB(on)}
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="24"
              stroke="currentColor"
              style={{ display: "block" }}
              viewBox="0 0 24 24"
              width="24"
            >
              {tab.icon}
            </svg>
            <div style={label(on)}>{tab.label}</div>
          </div>
        );
      })}
    </div>
  );
}
