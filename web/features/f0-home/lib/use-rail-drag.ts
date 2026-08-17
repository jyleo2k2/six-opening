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
import { lockSwipeAxis } from "./sector-swipe";

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
/**
 * 레일과 **직각으로** 쓸었을 때 받을 손짓. 세로 레일(`axis:'y'`) 위의 가로 스와이프처럼
 * 레일이 아닌 다른 것을 넘기는 데 쓴다 — 탐색 화면은 이것으로 섹터를 넘긴다.
 *
 * 축은 손짓 하나에 **한 번만** 잠긴다(`lockSwipeAxis`). 레일과 별도로 포인터를 또 받으면
 * 같은 손짓을 둘이 나눠 갖고, 카드가 넘어가면서 섹터까지 바뀐다.
 */
export type RailCrossSwipe = {
  /** 가로로 잠긴 손이 움직였다. `dx` 는 창 좌표 이동량이다. */
  onMove: (dx: number) => void;
  /** 손을 뗐다. `velocity` 는 창 좌표 px/ms 다. */
  onEnd: (dx: number, velocity: number) => void;
  /**
   * 잰 것이 없이 손짓이 끝났다. 제자리로 되돌린다.
   *
   * 끊긴 손짓(`pointercancel`)은 여기로 오지 않는다 — 끊겨도 움직인 만큼은 `onEnd` 가
   * 판정한다(`endCross` 주석). 브라우저가 스크롤을 가져갔다고 해서 다 쓴 손짓을 무르면
   * 손가락으로는 섹터가 영영 안 넘어간다.
   */
  onCancel: () => void;
};

export function useRailDrag(
  onActiveChange?: (index: number) => void,
  activeIndex?: number | null,
  axis: "x" | "y" = "x",
  cross?: RailCrossSwipe,
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
  /** 레일과 직각인 좌표. 세로 레일이면 가로다. */
  const crossPos = (ev: { clientX: number; clientY: number }) => (axis === "y" ? ev.clientX : ev.clientY);

  const stopFling = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    // 끄는 동안 꺼 둔 스냅을 되돌린다. 켠 채로 끌면 스냅이 매 프레임 제자리로 되돌린다.
    if (rail.current) rail.current.style.scrollSnapType = snapType;
  };

  useEffect(() => stopFling, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    // 손가락에는 브라우저 기본 스크롤이 이미 붙어 있다. 주축을 여기서 또 끌면 두 배로
    // 움직이므로, 손가락은 **교차축 손짓을 받을 때만** 따라간다. 그 손짓은 브라우저가
    // 가져가지 않게 레일이 `touch-action:pan-y` 로 세로만 넘겨 주어야 한다.
    const touch = event.pointerType === "touch";
    if (touch && !cross) return;
    const el = event.currentTarget;
    stopFling();
    // 주축 상태는 잠기기 전에 만들어 둔다 — **누른 자리**에서 다시 재야 잠기는 순간에 튀지 않는다.
    const main = beginRailDrag(clientPos(event), scrollPos(el), event.timeStamp);
    const startMain = clientPos(event);
    const startCross = crossPos(event);
    drag.current = null;
    dragged.current = false;
    /** 이 손짓이 어느 축인지. `native` 는 손가락 주축 — 브라우저 스크롤에 맡긴 것이다. */
    let lock: "main" | "cross" | "native" | null = null;
    let crossDrag: RailDrag | null = null;

    const move = (ev: PointerEvent) => {
      if (!lock) {
        const axisLock = lockSwipeAxis(clientPos(ev) - startMain, crossPos(ev) - startCross);
        if (!axisLock) return;
        if (axisLock === "cross" && cross) {
          lock = "cross";
          crossDrag = beginRailDrag(crossPos(ev), 0, ev.timeStamp);
        } else if (touch) {
          lock = "native";
          return;
        } else {
          lock = "main";
          drag.current = main;
          // 끄는 동안 스냅을 꺼 둔다. 켠 채로 끌면 스냅이 매 프레임 제자리로 되돌린다.
          el.style.scrollSnapType = "none";
          el.style.cursor = "grabbing";
        }
      }
      if (lock === "native") return;
      if (lock === "cross") {
        if (!crossDrag) return;
        crossDrag = advanceRailDrag(crossDrag, crossPos(ev), ev.timeStamp);
        // 가로로 잠긴 손짓 뒤의 click 도 삼킨다 — 안 그러면 섹터가 바뀌며 카드가 열린다.
        dragged.current = true;
        cross?.onMove(-crossDrag.scrollLeft);
        ev.preventDefault();
        return;
      }
      const current = drag.current;
      if (!current) return;
      const next = advanceRailDrag(current, clientPos(ev), ev.timeStamp);
      drag.current = next;
      dragged.current = next.dragged;
      setScrollPos(el, next.scrollLeft);
      // 실제로 끈 뒤에만 기본 동작을 막는다. 제자리 클릭에서 막으면 카드 click 이 사라진다.
      if (next.dragged) ev.preventDefault();
    };

    /**
     * 가로로 잠긴 뒤에는 브라우저가 세로 스크롤을 시작하지 못하게 막는다.
     *
     * `touch-action:pan-y` 는 **가로 스크롤만** 막는다. 사람 손은 똑바로 가로로 긋지 못하므로
     * 비스듬히 쓸면 브라우저가 그 세로 성분으로 스크롤을 시작하고, 시작한 순간 포인터가
     * 취소된다(`pointercancel`) — 마우스로는 넘어가는데 손가락으로는 안 넘어가던 이유가
     * 이것이다. `touchmove` 는 같은 손짓의 `pointermove` **뒤에** 오므로 여기 올 때는 축이
     * 이미 잠겨 있고, 스크롤이 시작되기 전이라 아직 막을 수 있다.
     */
    const holdTouch = (ev: TouchEvent) => {
      if (lock === "cross" && ev.cancelable) ev.preventDefault();
    };

    const detach = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", abort);
      el.removeEventListener("touchmove", holdTouch);
    };

    /**
     * 가로로 잠긴 손짓을 끝낸다. **끊겨서 왔든 손을 떼서 왔든 같은 판정을 쓴다** — 브라우저가
     * 스크롤을 가져가며 포인터를 취소해도 이미 넘길 만큼 쓸었다면 넘어가야 한다. 그때마다
     * 제자리로 되돌리면 손가락으로는 아무리 쓸어도 섹터가 안 바뀐다.
     */
    function endCross() {
      detach();
      el.style.cursor = "grab";
      const finished = crossDrag;
      crossDrag = null;
      if (finished) cross?.onEnd(-finished.scrollLeft, finished.velocity);
      else cross?.onCancel();
      setTimeout(() => {
        dragged.current = false;
      }, 0);
    }

    /** 손짓이 끊겼다 — 브라우저가 스크롤을 가져갔거나 창을 벗어났다. */
    function abort() {
      if (lock === "cross") endCross();
      else up();
    }

    function up() {
      if (lock === "cross") {
        endCross();
        return;
      }
      detach();
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
    }

    // setPointerCapture 를 쓰면 click 이 컨테이너로 재타깃돼 카드 진입이 죽는다.
    // 대신 window 리스너로 컨테이너 밖 이동까지 받는다.
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", abort);
    // 손가락일 때만 붙인다. `passive:false` 여야 `preventDefault` 가 산다 — 브라우저는
    // touchmove 리스너를 기본으로 passive 로 보고, 그러면 막아 달라는 말을 무시한다.
    if (touch) el.addEventListener("touchmove", holdTouch, { passive: false });
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
