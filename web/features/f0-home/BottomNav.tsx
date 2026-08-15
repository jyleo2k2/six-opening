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

// 좌우 22 는 `ui-src` 의 `navBarStyle` 과 같은 값이다. 프레임 개구부의 하단 코너가 화면
// 라운드보다 깊게 파여, 여백 14 면 알약 모서리가 개구부 경계에 붙는다. 두 값이 갈리면
// 화면을 오갈 때 하단바 폭이 달라 보인다.
const BAR = styleFromCss("flex:none;display:flex;align-items:center;gap:8px;padding:6px 22px 10px");
const PILL = styleFromCss(
  "flex:1;display:flex;align-items:center;border-radius:999px;padding:9px 6px;background:rgba(255,255,255,0.6);" +
    "backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);" +
    "box-shadow:0 14px 28px -12px rgba(35,25,80,0.35),inset 0 0 0 1px rgba(255,255,255,0.5)",
);
const TAB = styleFromCss("flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer");

const iconColor = (on: boolean) => (on ? "#5B23D6" : "#B7BACB");
const labelStyle = (on: boolean) =>
  styleFromCss(
    "font-size:11px;font-weight:" + (on ? "800" : "600") + ";color:" + (on ? "#01185A" : "#A9AEC4"),
  );

const TABS: { id: NavTab; label: string; path: string; icon: (color: string) => React.ReactNode }[] = [
  {
    id: "home",
    label: "홈",
    path: "/",
    icon: () => <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />,
  },
  {
    id: "trade",
    label: "모의투자",
    path: "/explore",
    icon: (color) => (
      <>
        <path d="M3 17l5-5 4 4 8-9" />
        <circle cx="20" cy="7" fill={color} r="1.5" stroke="none" />
      </>
    ),
  },
  {
    id: "archive",
    label: "아카이브",
    path: "/archive",
    icon: () => (
      <>
        <rect height="3" rx="1" width="16" x="4" y="15" />
        <rect height="3" rx="1" width="14" x="5" y="11" />
        <rect height="3" rx="1" width="12" x="6" y="7" />
      </>
    ),
  },
  {
    id: "ranking",
    label: "랭킹",
    path: "/ranking",
    icon: () => (
      <>
        <path d="M8 4h8v4a4 4 0 0 1-8 0z" />
        <path d="M8 5H5a3 3 0 0 0 3 5" />
        <path d="M16 5h3a3 3 0 0 1-3 5" />
        <path d="M12 13v3" />
        <path d="M9 20h6" />
        <path d="M9 20a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
      </>
    ),
  },
];

export function BottomNav({
  active,
  onLeave,
}: {
  active: NavTab | null;
  onLeave: (path: string) => void;
}) {
  return (
    <div style={BAR}>
      <div style={PILL}>
        {TABS.map((tab) => {
          const on = tab.id === active;
          const color = iconColor(on);
          return (
            <div
              key={tab.id}
              onClick={() => {
                if (!on) onLeave(tab.path);
              }}
              style={TAB}
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="23"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="23"
              >
                {tab.icon(color)}
              </svg>
              <span style={labelStyle(on)}>{tab.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
