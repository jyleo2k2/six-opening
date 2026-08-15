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
 * 카드 레일을 마우스로 끌어 넘기는 배선. 가로(기본)·세로 모두 이 하나로 배선한다.
 *
 * 계산은 `rail-drag.ts` 가 갖고 여기는 포인터 이벤트와 관성 타이머에 붙이기만 한다 —
 * 레일을 쓰는 화면마다 이 배선을 다시 쓰면 끌리는 느낌이 조용히 갈린다. 계산 함수
 * 자체는 좌표 하나짜리 스칼라 연산이라 축과 무관하다 — `axis:'y'` 를 주면 같은 공식에
 * `clientY`·`scrollTop` 을 대신 흘려보낸다.
 *
 * 쓰는 쪽은 레일에 `onPointerDown` 과 `onScroll` 을 붙이고, 카드의 `onClick` 은
 * `dragged()` 로 감싼다. 끌고 난 직후의 click 을 삼키지 않으면 카드가 열린다.
 *
 * 켜진 카드를 이 훅이 정하게 하려면 `onActiveChange` 와 함께 **지금 켜져 있는 값**을
 * `activeIndex` 로 넘긴다. 그 값과 같으면 알리지 않는다 — 훅이 마지막으로 알린 값을
 * 따로 기억하지 않는 이유는, 쓰는 쪽이 다른 길로 값을 되돌렸을 때(카드 모아보기를
 * 다시 열며 `null` 로 두는 것처럼) 그 기억이 정당한 갱신까지 삼키기 때문이다.
 */
export function useRailDrag(
  onActiveChange?: (index: number) => void,
  activeIndex?: number | null,
  axis: "x" | "y" = "x",
) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<RailDrag | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 손을 뗀 뒤 click 한 번을 삼키기 위해 남기는 표시. */
  const dragged = useRef(false);

  const snapType = axis === "y" ? "y mandatory" : "x mandatory";
  const scrollPos = (el: HTMLDivElement) => (axis === "y" ? el.scrollTop : el.scrollLeft);
  const setScrollPos = (el: HTMLDivElement, value: number) => {
    if (axis === "y") el.scrollTop = value;
    else el.scrollLeft = value;
  };
  const clientPos = (ev: { clientX: number; clientY: number }) => (axis === "y" ? ev.clientY : ev.clientX);

  const stopFling = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    // 끄는 동안 꺼 둔 스냅을 되돌린다. 켠 채로 끌면 스냅이 매 프레임 제자리로 되돌린다.
    if (rail.current) rail.current.style.scrollSnapType = snapType;
  };

  useEffect(() => stopFling, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 손가락에는 브라우저 기본 스크롤이 이미 붙어 있다. 여기서 또 끌면 두 배로 움직인다.
    if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return;
    const el = event.currentTarget;
    stopFling();
    drag.current = beginRailDrag(clientPos(event), scrollPos(el), event.timeStamp);
    dragged.current = false;
    el.style.scrollSnapType = "none";
    el.style.cursor = "grabbing";

    const move = (ev: PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      const next = advanceRailDrag(current, clientPos(ev), ev.timeStamp);
      drag.current = next;
      dragged.current = next.dragged;
      setScrollPos(el, next.scrollLeft);
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
          setScrollPos(el, scrollPos(el) + fling);
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

  /**
   * 스크롤이 멎은 자리에서 가운데 카드를 알린다. 끌든 손가락으로 밀든 같은 길을 탄다.
   *
   * **바뀔 때만 알린다.** 스크롤은 관성 한 프레임(16ms)마다도 오는데 그때마다 알리면
   * 레일을 한 번 튕기는 동안 화면이 수십 번 다시 그려진다. 아카이브처럼 렌더가 무거운
   * 화면은 그 값이 같아도 눈에 띄게 버벅인다.
   */
  const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!onActiveChange) return;
    const el = event.currentTarget;
    const cards =
      axis === "y"
        ? Array.from(el.children).map((node) => ({
            left: (node as HTMLElement).offsetTop,
            width: (node as HTMLElement).offsetHeight,
          }))
        : Array.from(el.children).map((node) => ({
            left: (node as HTMLElement).offsetLeft,
            width: (node as HTMLElement).offsetWidth,
          }));
    if (cards.length === 0) return;
    const mid = axis === "y" ? el.scrollTop + el.clientHeight / 2 : el.scrollLeft + el.clientWidth / 2;
    const index = nearestCardByCenter(cards, mid);
    if (index === activeIndex) return;
    onActiveChange(index);
  };

  return {
    ref: rail,
    /** 끌고 난 직후인가. 카드 `onClick` 을 이걸로 감싼다. */
    dragged: () => dragged.current,
    onPointerDown,
    onScroll,
  };
}
