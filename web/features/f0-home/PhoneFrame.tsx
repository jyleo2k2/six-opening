"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import type { PrototypeScreenRect } from "../f10-chatbot/lib/bottom-sheet";
import { PROTOTYPE_SCREEN_ID } from "./lib/prototype-bridge";
import {
  PHONE_SCREEN,
  prototypeScreenRectFromClientRect,
  PROTOTYPE_PHONE,
} from "./lib/phone-frame";
import { SCREEN_BG } from "./lib/prototype-theme";
import "./phone-frame.css";

/**
 * 프레임 안 화면의 client rect를 읽는다.
 *
 * `ConnectedPrototype`의 챗봇·튜토리얼 배치는 `PHONE_SCREEN_RECT`라는 프레임 내부
 * 좌표를 쓰지만, 화면 안의 손짓 계산은 실제 client rect가 필요하다. 서버에는 DOM이
 * 없으므로 처음에는 `null` 이고, 마운트 뒤 `ResizeObserver`·viewport 이벤트로 갱신한다.
 */
export function usePhoneScreenRect(remeasureKey?: unknown): PrototypeScreenRect | null {
  const [rect, setRect] = useState<PrototypeScreenRect | null>(null);
  useLayoutEffect(() => {
    let frameId = 0;

    const measure = () => {
      const node = document.getElementById(PROTOTYPE_SCREEN_ID);
      const next = node
        ? prototypeScreenRectFromClientRect(node.getBoundingClientRect())
        : null;
      setRect((current) => {
        if (
          current &&
          next &&
          current.left === next.left &&
          current.top === next.top &&
          current.width === next.width &&
          current.height === next.height &&
          current.scale === next.scale
        ) {
          return current;
        }
        return next;
      });
    };
    const remeasure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measure);
    };

    measure();
    const node = document.getElementById(PROTOTYPE_SCREEN_ID);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(remeasure);
    if (node) observer?.observe(node);

    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    window.visualViewport?.addEventListener("resize", remeasure);
    window.visualViewport?.addEventListener("scroll", remeasure);
    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
      window.visualViewport?.removeEventListener("resize", remeasure);
      window.visualViewport?.removeEventListener("scroll", remeasure);
    };
  }, [remeasureKey]);
  return rect;
}

const NOISE =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNjAnIGhlaWdodD0nMTYwJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC45JyBudW1PY3RhdmVzPSczJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzE2MCcgaGVpZ2h0PScxNjAnIGZpbHRlcj0ndXJsKCNuKScvPjwvc3ZnPg==";

/**
 * 아이폰 프레임. 원본 목업과 같은 사각형을 React 로 그린다.
 *
 * 화면과 오버레이는 이 컴포넌트 안에서 함께 그린다. 프레임 배율은 CSS가 하나만 정하고,
 * `overlay`는 같은 `.phone-stage__content` 좌표계에 들어가므로 바깥 fixed 프레임이 필요 없다.
 *
 * 상태바는 화면 윗부분 색에 따라 고른다 — 위가 짙은 색인 화면만 `light` 로 흰 아이콘을 쓴다.
 */
export function PhoneFrame({
  statusBar = "dark",
  children,
  overlay,
}: {
  statusBar?: "dark" | "light";
  /** 저장소를 읽기 전에는 프레임만 그린다 — 시드 지갑이 한 프레임 스치면 안 된다. */
  children?: ReactNode;
  /** 챗봇·튜토리얼을 같은 transform 좌표계 안에 그린다. 로그인 화면은 넘기지 않는다. */
  overlay?: ReactNode;
}) {
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
      <div className="phone-stage__content">
        {/*
         * 바탕색은 여기 하나가 정한다 — 원본의 폰 화면 컨테이너가 하던 일이다. 화면들은
         * 투명하게 얹히므로 화면 루트에 배경을 다시 적으면 그 화면만 따로 논다.
         */}
        <div
          id={PROTOTYPE_SCREEN_ID}
          style={{ ...screenBox, overflow: "hidden", background: SCREEN_BG }}
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
        {overlay && <div className="phone-stage__overlay">{overlay}</div>}
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

/** 화면 컴포넌트를 단독으로도 쓸 수 있게 하면서 ConnectedPrototype에서는 프레임을 하나만 둔다. */
export function ScreenFrame({
  embedded = false,
  children,
}: {
  embedded?: boolean;
  children?: ReactNode;
}) {
  return embedded ? <>{children}</> : <PhoneFrame>{children}</PhoneFrame>;
}
