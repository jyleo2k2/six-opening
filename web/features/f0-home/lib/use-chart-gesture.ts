"use client";

import { useEffect, useRef } from "react";
import type { PrototypeChartType } from "../../f2-trade/chart-data";
import {
  barsFromPixels,
  panChartWindow,
  resolveChartWindow,
  zoomChartWindow,
  type ChartWindow,
} from "./chart-window";

/**
 * 차트를 끌어 옮기고 오므려 확대하는 손짓의 **배선**.
 *
 * 계산은 `chart-window.ts` 가 갖고 여기는 포인터·휠에 붙이기만 한다 — `rail-drag` ↔
 * `use-rail-drag` 와 같은 나눔이다. 그래야 창이 어떻게 움직이는지는 브라우저 없이
 * 확인할 수 있고, 이 파일에는 확인할 것이 남지 않는다.
 *
 * ## 왜 React 의 `onWheel`·`onTouchMove` 를 안 쓰고 직접 붙이나
 *
 * React 17 부터 `wheel`·`touchmove` 는 루트에 **passive** 로 달린다. passive 리스너
 * 안에서는 `preventDefault()` 가 무시되므로 합성 이벤트로는 페이지 스크롤을 막을 수 없다.
 * 휠은 `{ passive: false }` 로 직접 달고, 손가락 쪽은 리스너 대신 CSS `touch-action:none`
 * 이 막는다(쓰는 쪽이 그 값을 준다).
 *
 * ## 손짓이 시작할 때의 창을 얼려 두는 이유
 *
 * 봉은 1초마다 다시 들어온다. 움직인 값에 또 움직이면 그 사이 늘어난 봉만큼 창이 밀리고
 * 반올림도 쌓여 손가락과 그림이 어긋난다. 그래서 누른 순간의 창(`start`)을 잡아 두고
 * **매번 그 값에서 다시 잰다** — `rail-drag` 가 `startLeft` 를 두는 것과 같은 이유다.
 */

/** 이 아래로 움직인 것은 제자리 누름으로 본다. 손이 떨린 정도로 창이 흔들리면 안 된다. */
const MOVE_THRESHOLD = 4;
/** 휠 한 칸이 바꾸는 배율. 1.25 면 네 칸에 약 2.4배가 되어 한 화면 안에서 오간다. */
const WHEEL_STEP = 1.25;

export type ChartGesture = {
  /** 차트 상자에 그대로 펼쳐 넣는다. 손짓을 받을 자리이자 좌표를 재는 기준이다. */
  ref: React.RefObject<HTMLDivElement | null>;
};

export function useChartGesture(options: {
  /** 지금 창. 손짓이 이 값에서 출발한다. */
  window: ChartWindow;
  /** 새 창을 알린다. 값이 그대로면 부르지 않는다. */
  onWindow: (next: ChartWindow) => void;
  /** 봉의 시각들. 창을 시각으로 붙잡으므로 인덱스가 아니라 이것이 필요하다. */
  times: readonly number[];
  chartType: PrototypeChartType;
  /** 봉을 늘어놓는 폭(`chart-view` 의 `PLOT_W`). 픽셀을 봉 개수로 바꾸는 데 쓴다. */
  plotWidth: number;
  /** 기본 창. 두 번 누르면 여기로 되돌린다. */
  defaults: ChartWindow;
}): ChartGesture {
  const ref = useRef<HTMLDivElement | null>(null);
  /**
   * 매초 바뀌는 값(봉·창)을 리스너가 읽는 통로. 이것 없이 `useEffect` 의존성에 넣으면
   * 1초마다 리스너를 떼고 다시 다는 동안 진행 중이던 손짓이 끊긴다.
   */
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    /** 지금 화면에 닿아 있는 포인터들. 두 개가 되면 오므리기로 넘어간다. */
    const active = new Map<number, number>();
    /** 손짓 하나가 시작한 자리. 끝날 때까지 바뀌지 않는다. */
    let origin: { window: ChartWindow; x: number; span: number; ratio: number } | null = null;
    let moved = false;

    /** 플롯 폭에서의 가로 비율(0=왼쪽 끝, 1=오른쪽 끝). 붙잡을 봉을 정한다. */
    const ratioAt = (clientX: number) => {
      const box = element.getBoundingClientRect();
      const width = latest.current.plotWidth || box.width;
      return width > 0 ? Math.max(0, Math.min(1, (clientX - box.left) / width)) : 0.5;
    };

    /** 지금 닿아 있는 포인터들의 가운데와 벌어진 거리. 하나뿐이면 거리는 0 이다. */
    const touch = () => {
      const xs = [...active.values()];
      const center = xs.reduce((sum, value) => sum + value, 0) / (xs.length || 1);
      const span = xs.length > 1 ? Math.abs(Math.max(...xs) - Math.min(...xs)) : 0;
      return { center, span };
    };

    /** 지금 닿아 있는 포인터들을 기준으로 손짓을 다시 시작한다. 손가락이 늘거나 줄 때 부른다. */
    const restart = () => {
      if (!active.size) {
        origin = null;
        return;
      }
      const { center, span } = touch();
      const { window, times, chartType } = latest.current;
      // 창을 지금 자리로 못 박아 둔다. 손짓 도중 새 봉이 붙어도 "맨 오른쪽" 이 옮겨 가지
      // 않게 하려는 것이고, 다시 오른쪽 끝까지 끌면 `panChartWindow` 가 놓아 준다.
      const resolved = resolveChartWindow(times, window, chartType);
      origin = {
        window: {
          endTime: resolved.live ? (times.at(-1) ?? null) : window.endTime,
          barCount: resolved.barCount,
        },
        x: center,
        span,
        ratio: ratioAt(center),
      };
    };

    const apply = (next: ChartWindow) => {
      const now = latest.current.window;
      if (next.endTime === now.endTime && next.barCount === now.barCount) return;
      latest.current.onWindow(next);
    };

    const onPointerDown = (event: PointerEvent) => {
      // 마우스는 왼쪽 버튼만 받는다. 오른쪽 버튼으로 끌면 메뉴와 겹친다.
      if (event.pointerType === "mouse" && event.button !== 0) return;
      active.set(event.pointerId, event.clientX);
      element.setPointerCapture?.(event.pointerId);
      moved = false;
      restart();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!active.has(event.pointerId) || !origin) return;
      active.set(event.pointerId, event.clientX);
      const { center, span } = touch();
      const { times, chartType, plotWidth } = latest.current;

      if (origin.span > 0 && span > 0) {
        // 두 손가락 — 벌어진 만큼이 곧 배율이다. 붙잡은 자리는 처음 가운데 자리로 둔다.
        if (Math.abs(span - origin.span) < MOVE_THRESHOLD && !moved) return;
        moved = true;
        apply(zoomChartWindow(times, origin.window, span / origin.span, origin.ratio, chartType));
        return;
      }

      const dx = center - origin.x;
      if (Math.abs(dx) < MOVE_THRESHOLD && !moved) return;
      moved = true;
      // 왼쪽으로 끌면(dx < 0) 그림이 따라 왼쪽으로 밀리며 오른쪽(미래)이 드러난다.
      apply(
        panChartWindow(times, origin.window, -barsFromPixels(dx, plotWidth, origin.window.barCount), chartType),
      );
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!active.delete(event.pointerId)) return;
      element.releasePointerCapture?.(event.pointerId);
      // 두 손가락 중 하나만 뗐으면 남은 손가락으로 끌기를 이어 간다. 여기서 멈추면
      // 손이 아직 화면에 있는데 차트가 굳는다.
      restart();
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      // 차트 위에서는 페이지가 아니라 차트가 움직인다. passive 가 아니어야 막을 수 있다.
      event.preventDefault();
      const { window, times, chartType } = latest.current;
      apply(
        zoomChartWindow(
          times,
          window,
          event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP,
          ratioAt(event.clientX),
          chartType,
        ),
      );
    };

    /** 두 번 누르면 기본 구간으로 되돌린다. 멀리 끌고 간 뒤 돌아올 길이 이것뿐이다. */
    const onDoubleClick = () => apply(latest.current.defaults);

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("dblclick", onDoubleClick);
    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("dblclick", onDoubleClick);
    };
  }, []);

  return { ref };
}
