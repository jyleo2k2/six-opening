"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  advanceRailDrag,
  beginRailDrag,
  nearestCardByCenter,
  railFling,
  stepRailFling,
  type RailDrag,
} from "./rail-drag";

/** 관성 한 프레임. `requestAnimationFrame` 을 쓰지 않는 건 배경 탭에서 멈춰 스냅이 안 돌아오기 때문이다. */
const FLING_FRAME_MS = 16;
/** 관성이 아무리 길어도 여기서 끊고 스냅을 되돌린다. */
const FLING_MAX_MS = 1_200;

/**
 * 가로 카드 레일을 마우스로 끌어 넘기는 배선.
 *
 * 계산은 `rail-drag.ts` 가 갖고 여기는 포인터 이벤트와 관성 타이머에 붙이기만 한다 —
 * 레일을 쓰는 화면마다 이 배선을 다시 쓰면 끌리는 느낌이 조용히 갈린다.
 *
 * 쓰는 쪽은 레일에 `onPointerDown` 과 `onScroll` 을 붙이고, 카드의 `onClick` 은
 * `dragged()` 로 감싼다. 끌고 난 직후의 click 을 삼키지 않으면 카드가 열린다.
 */
export function useRailDrag(onActiveChange?: (index: number) => void) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<RailDrag | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 손을 뗀 뒤 click 한 번을 삼키기 위해 남기는 표시. */
  const dragged = useRef(false);

  const stopFling = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    // 끄는 동안 꺼 둔 스냅을 되돌린다. 켠 채로 끌면 스냅이 매 프레임 제자리로 되돌린다.
    if (rail.current) rail.current.style.scrollSnapType = "x mandatory";
  };

  useEffect(() => stopFling, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 손가락에는 브라우저 기본 스크롤이 이미 붙어 있다. 여기서 또 끌면 두 배로 움직인다.
    if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return;
    const el = event.currentTarget;
    stopFling();
    drag.current = beginRailDrag(event.clientX, el.scrollLeft, event.timeStamp);
    dragged.current = false;
    el.style.scrollSnapType = "none";
    el.style.cursor = "grabbing";

    const move = (ev: PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      const next = advanceRailDrag(current, ev.clientX, ev.timeStamp);
      drag.current = next;
      dragged.current = next.dragged;
      el.scrollLeft = next.scrollLeft;
      // 실제로 끈 뒤에만 기본 동작을 막는다. 제자리 클릭에서 막으면 카드 click 이 사라진다.
      if (next.dragged) ev.preventDefault();
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.style.cursor = "grab";
      const current = drag.current;
      drag.current = null;
      let fling = current ? railFling(current) : 0;
      if (fling !== 0) {
        const startedAt = Date.now();
        timer.current = setInterval(() => {
          fling = Date.now() - startedAt > FLING_MAX_MS ? 0 : stepRailFling(fling);
          if (fling === 0) {
            stopFling();
            return;
          }
          el.scrollLeft += fling;
        }, FLING_FRAME_MS);
      } else {
        stopFling();
      }
      // click 은 pointerup 바로 뒤에 온다. 그 한 번만 지나가면 표시를 지운다.
      setTimeout(() => {
        dragged.current = false;
      }, 0);
    };

    // setPointerCapture 를 쓰면 click 이 컨테이너로 재타깃돼 카드 진입이 죽는다.
    // 대신 window 리스너로 컨테이너 밖 이동까지 받는다.
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  /** 스크롤이 멎은 자리에서 가운데 카드를 알린다. 끌든 손가락으로 밀든 같은 길을 탄다. */
  const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!onActiveChange) return;
    const el = event.currentTarget;
    const cards = Array.from(el.children).map((node) => ({
      left: (node as HTMLElement).offsetLeft,
      width: (node as HTMLElement).offsetWidth,
    }));
    if (cards.length === 0) return;
    onActiveChange(nearestCardByCenter(cards, el.scrollLeft + el.clientWidth / 2));
  };

  return {
    ref: rail,
    /** 끌고 난 직후인가. 카드 `onClick` 을 이걸로 감싼다. */
    dragged: () => dragged.current,
    onPointerDown,
    onScroll,
  };
}
