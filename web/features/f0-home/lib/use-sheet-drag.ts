"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePhoneScreenRect } from "../PhoneFrame";
import {
  advanceSheetDrag,
  beginSheetDrag,
  SHEET_CLOSE_MS,
  shouldDismissSheet,
  type SheetDrag,
} from "./sheet-drag";

/**
 * 쓸어내려 닫는 바텀 시트의 React 배선.
 *
 * 판정과 배율 보정은 `sheet-drag.ts` 가, 챗봇 시트와 같은 닫힘 문턱은
 * `f10-chatbot/lib/bottom-sheet` 가 갖고 있다. 여기는 그 값을 포인터 이벤트와
 * 열림 상태에 붙이기만 한다 — 시트를 쓰는 화면마다 이 배선을 다시 쓰면
 * 닫히는 느낌이 조용히 갈린다.
 *
 * 반환한 `handleProps` 를 **손잡이 영역**에만 붙인다. 그 안에서 눌러야 하는 것에는
 * `data-sheet-static` 을 달아 둔다 — 포인터를 잡으면 click 이 손잡이로 재타깃돼 죽는다.
 */
export function useSheetDrag(sheetHeight: number) {
  const scale = usePhoneScreenRect()?.scale ?? 1;
  const [open, setOpen] = useState(false);
  // 시트를 민 거리와 그 이유. 손을 대는 순간 올라오는 연출을 끄고(`grabbed`) 손을 뗀 뒤
  // 미끄러지는 동안(`closing`)에는 다시 잡히지 않는다.
  const [offset, setOffset] = useState(0);
  const [grabbed, setGrabbed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const drag = useRef<SheetDrag | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const openSheet = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    drag.current = null;
    setOffset(0);
    setGrabbed(false);
    setDragging(false);
    setClosing(false);
    setOpen(true);
  };

  /**
   * 닫는 길은 이 하나뿐이다 — 쓸어내리기·닫기 버튼·배경 탭이 모두 같은 미끄러짐을 쓴다.
   * 시트를 아래로 밀어 두고 그만큼 기다렸다가 지운다. `transitionend` 를 기다리지 않는 건
   * 손가락이 이미 바닥까지 내려온 경우 옮길 거리가 없어 그 사건이 오지 않기 때문이다.
   */
  const closeSheet = () => {
    if (closing) return;
    drag.current = null;
    setDragging(false);
    setClosing(true);
    setOffset(sheetHeight);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setGrabbed(false);
      setOffset(0);
    }, SHEET_CLOSE_MS);
  };

  const grab = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || closing) return;
    if (event.target instanceof HTMLElement && event.target.closest("[data-sheet-static]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = beginSheetDrag(event.pointerId, event.clientY, event.timeStamp);
    setGrabbed(true);
    setDragging(true);
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = advanceSheetDrag(current, event.clientY, event.timeStamp, { scale, sheetHeight });
    drag.current = next;
    setOffset(next.offsetY);
  };

  const release = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    // 손을 떼는 순간의 좌표도 한 번 더 넣는다 — 마지막 몇 ms 가 튕김의 대부분이다.
    const last = advanceSheetDrag(current, event.clientY, event.timeStamp, { scale, sheetHeight });
    drag.current = null;
    setDragging(false);
    if (!cancelled && shouldDismissSheet(last, sheetHeight)) {
      closeSheet();
      return;
    }
    setOffset(0);
  };

  return {
    open,
    openSheet,
    closeSheet,
    /** 시트를 내리는 만큼 배경도 같이 밝아진다 — 손가락에 붙어 있다는 표시다. */
    scrimStyle: {
      opacity: closing ? 0 : 1 - Math.min(0.7, offset / sheetHeight),
      transition: dragging ? "none" : `opacity ${SHEET_CLOSE_MS}ms ease`,
    },
    /**
     * 손을 댄 뒤에는 올라오는 연출을 끈다. 켜 둔 채로 두면 되돌아갈 때마다 `sheetUp` 이
     * 다시 재생돼 시트가 바닥에서 새로 올라온다.
     */
    sheetStyle: (enterAnimation?: string) => ({
      animation: grabbed ? "none" : enterAnimation,
      transform: offset ? `translateY(${offset}px)` : undefined,
      transition: dragging ? "none" : `transform ${SHEET_CLOSE_MS}ms cubic-bezier(0.22,1,0.36,1)`,
    }),
    handleProps: {
      onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => release(event, true),
      onPointerDown: grab,
      onPointerMove: move,
      onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => release(event),
    },
  };
}
