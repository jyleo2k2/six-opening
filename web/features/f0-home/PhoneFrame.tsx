"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PROTOTYPE_SCREEN_ID } from "./lib/prototype-bridge";
import { PHONE_SCREEN, PROTOTYPE_PHONE, phoneFrameScale } from "./lib/phone-frame";
import "./phone-frame.css";

const NOISE =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNjAnIGhlaWdodD0nMTYwJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC45JyBudW1PY3RhdmVzPSczJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzE2MCcgaGVpZ2h0PScxNjAnIGZpbHRlcj0ndXJsKCNuKScvPjwvc3ZnPg==";

/**
 * 아이폰 프레임. `app.html` 이 그리던 것과 같은 사각형을 React 로 그린다.
 *
 * 화면을 하나씩 옮기는 동안 프레임도 두 곳에 있게 되므로 기하는 `lib/phone-frame.ts`
 * 하나에서만 정한다. 여기는 그 값을 붙이기만 한다.
 *
 * 상태바는 화면 윗부분 색에 따라 고른다 — 랭킹처럼 위가 남색인 화면은 흰 아이콘을 쓴다.
 */
export function PhoneFrame({
  statusBar = "dark",
  children,
}: {
  statusBar?: "dark" | "light";
  children: ReactNode;
}) {
  // 서버에는 창 크기가 없다. 처음에는 원래 크기로 그리고 마운트 뒤 창에 맞춘다.
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(phoneFrameScale(window.innerWidth, window.innerHeight));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const screenBox = {
    position: "absolute",
    left: PHONE_SCREEN.left,
    top: PHONE_SCREEN.top,
    width: PROTOTYPE_PHONE.screenWidth,
    height: PROTOTYPE_PHONE.screenHeight,
    borderRadius: PHONE_SCREEN.borderRadius,
  } as const;

  return (
    <div className="phone-stage">
      <div
        style={{
          position: "relative",
          width: PROTOTYPE_PHONE.frameWidth,
          height: PROTOTYPE_PHONE.frameHeight,
          flex: "none",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <div
          id={PROTOTYPE_SCREEN_ID}
          style={{ ...screenBox, overflow: "hidden", background: "#F5F2F8" }}
        >
          {children}
          <img
            alt=""
            height={59}
            src={statusBar === "light" ? "/ui/assets/statusbar-w.svg" : "/ui/assets/statusbar.svg"}
            style={{ position: "absolute", left: 0, top: 0, zIndex: 3, pointerEvents: "none" }}
            width={402}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 6,
              display: "flex",
              justifyContent: "center",
              zIndex: 3,
              pointerEvents: "none",
            }}
          >
            <div
              style={{ width: 140, height: 5, borderRadius: 999, background: "#1A2233", opacity: 0.85 }}
            />
          </div>
        </div>
        <div
          style={{
            ...screenBox,
            pointerEvents: "none",
            zIndex: 4,
            opacity: 0.18,
            mixBlendMode: "overlay",
            backgroundImage: `url(${NOISE})`,
          }}
        />
        <img
          alt=""
          height={PROTOTYPE_PHONE.frameHeight}
          src="/ui/assets/iphone-frame.png"
          style={{ position: "absolute", left: 0, top: 0, display: "block", zIndex: 5, pointerEvents: "none" }}
          width={PROTOTYPE_PHONE.frameWidth}
        />
      </div>
    </div>
  );
}
