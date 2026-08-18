"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PROTOTYPE_PHONE,
  type PrototypeScreenRect,
} from "../f10-chatbot/lib/bottom-sheet";
import { phoneScreenClipPath } from "./lib/phone-frame";
import {
  type AnchorRect,
  BUBBLE_MARGIN,
  TAIL_SIZE,
  holeOf,
  placeBubble,
  spanOf,
  tailLeft,
  toScreenRect,
} from "./lib/tutorial-anchor";
import { loadAccount } from "./lib/use-account";
import {
  backPath,
  enterPath,
  FALLBACK_STOCK,
  isSamePlace,
  nextStepIndex,
  pickTutorialStock,
  stepIndexAt,
  tutorialSteps,
  type TutorialPlace,
} from "./lib/tutorial-steps";

/**
 * 튜토리얼 코치마크.
 *
 * 짚을 곳만 남기고 나머지를 어둡게 덮는다. 화면 컴포넌트는 짚을 자리에 `id="tut-*"` 만
 * 달아 두고, 위치는 여기서 실행 시점에 잰다 — 좌표를 박아두면 레이아웃이 조금만
 * 움직여도 구멍이 엉뚱한 데 뚫린다.
 *
 * **딤은 `pointer-events:none` 이다.** 보기에만 어둡고 클릭은 그대로 통과한다. 짚은
 * 곳만 누르게 막으면 주문 단계에서 다음을 못 눌러 흐름이 멈춘다.
 *
 * **지금 어느 장인지는 세지 않고 `place`(화면 + 화면 안의 자리)에서 읽는다.** 그래서
 * 화면이 바뀌면 설명이 따라오고, 순서에 없는 화면으로 가면 그만 보겠다는 뜻으로 읽어
 * 튜토리얼을 닫는다.
 *
 * 자리 계산은 전부 `lib/tutorial-anchor`, 문안·순서·진입로는 `lib/tutorial-steps` 가
 * 갖는다 — 여기 남은 것은 재고 그리는 일뿐이다.
 */

const { screenWidth: SCREEN_W, screenHeight: SCREEN_H } = PROTOTYPE_PHONE;

/**
 * 딤은 **그냥 어둡다.** 네이비를 깔아 봤더니 앱의 보라·연분홍 위에서 색이 남아 화면이
 * 어두워지는 대신 파랗게 물들었다. 짚은 자리만 밝게 남기는 게 목적이므로 색을 섞지 않는다.
 */
const DIM = "rgba(0,0,0,0.56)";
const RING = "#FFC7DE";

/** `globals.css` 의 `--color-navy`·`--color-magenta`. */
const NAVY = "#001E5A";
const MAGENTA = "#D70082";

/** 말풍선은 앱 카드와 같은 흰색이다. 어두워진 화면 위에서 설명만 밝게 떠 있으면 된다. */
const BUBBLE_BG = "#FFFFFF";
const BUBBLE_TOP = "#FFFFFF";
const BUBBLE_BOTTOM = "#FFFFFF";

/** 흰 판 위 글씨. 옮겨 온 화면들이 본문·보조에 쓰는 회색 단계를 그대로 쓴다. */
const TITLE_INK = NAVY;
const BODY_INK = "#5C6280";
const SUB_INK = "#6E7488";
const MUTED = "#9BA0B5";
const TERM_INK = MAGENTA;

/** `이전`·`다음` 알약. 둘이 같은 모양이라 한 곳에서 정한다. */
const STEP_BTN = {
  flex: "none",
  fontSize: 13.5,
  fontWeight: 800,
  color: NAVY,
  background: "#ECEDF3",
  borderRadius: 999,
  padding: "10px 20px",
} as const;

const HOLE_RADIUS = 16;

/** 같은 id 가 화면 분기에 여러 개 남아 있을 수 있다. 실제로 그려진 것만 고른다. */
function visibleNode(id: string) {
  for (const node of document.querySelectorAll(`#${CSS.escape(id)}`)) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return node;
  }
  return null;
}

/**
 * 적힌 순서대로 **한 프레임에 하나씩** 누른다.
 *
 * 한 번에 몰아 누르면 안 된다 — 금액을 고르는 클릭과 `다음` 클릭이 같은 프레임에 있으면
 * `다음` 은 아직 금액이 0 이던 렌더의 핸들러를 실행해 조용히 무시된다. 화면이 다시
 * 그려질 틈을 주고 다음 것을 누른다. 없는 자리는 건너뛴다(계획을 지켰으면 변경 이유
 * 칸이 아예 없다).
 */
function clickThrough([head, ...rest]: string[]) {
  if (!head) return;
  const node = visibleNode(head);
  if (node instanceof HTMLElement) node.click();
  if (rest.length) requestAnimationFrame(() => clickThrough(rest));
}

export function TutorialOverlay({
  place,
  onGo,
  onClose,
  screenRect,
}: {
  /** 지금 어느 화면의 어느 자리인지. 장은 이 값에서 읽는다 — 세지 않는다. */
  place: TutorialPlace;
  /** 주소로 데려간다. `ConnectedPrototype` 의 `leaveToPath` 와 같은 경로다. */
  onGo: (path: string) => void;
  onClose: () => void;
  /** `ConnectedPrototype`이 `#kw-screen`에서 실측한 client 좌표. */
  screenRect: PrototypeScreenRect | null;
}) {
  /**
   * 이번 튜토리얼이 사고팔 회사. 아이가 갖고 있는 것 중 팔 수 있는 첫 종목이다.
   *
   * 없으면 `null` 이고, 그때는 파는 과정을 빼고 매수까지만 보여 준다 — 매도 화면은
   * 보유가 없으면 막히므로 데려가 놓고 막히느니 사는 것까지만 끝낸다.
   *
   * `loadAccount()` 는 세션당 한 번만 서버를 읽고 그 뒤로는 담아 둔 값을 준다. 홈이 이미
   * 불렀으므로 대개 즉시 온다. 응답 전에는 팔 게 없는 것으로 보는데, 종목이 필요한
   * 자리(상세)까지는 `다음` 을 네 번 눌러야 해서 그 사이에 도착한다.
   */
  const [stock, setStock] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void loadAccount().then((user) => {
      if (!alive) return;
      const holdings = (user?.holdings ?? [])
        .filter((row) => row.stock_code)
        .map((row) => ({
          code: row.stock_code as string,
          qty: row.quantity,
          availableQty:
            typeof row.available_quantity === "number" ? row.available_quantity : undefined,
        }));
      setStock(pickTutorialStock(holdings));
    });
    return () => {
      alive = false;
    };
  }, []);

  const steps = tutorialSteps(stock !== null);
  const [index, setIndex] = useState(() => Math.max(0, stepIndexAt(steps, place)));
  const [openConcept, setOpenConcept] = useState(false);
  const [boxes, setBoxes] = useState<AnchorRect[]>([]);
  const [bubbleHeight, setBubbleHeight] = useState(240);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  /**
   * 말풍선 밖을 누르면 그만 보겠다는 뜻이다 — 어느 화면이든, 무엇을 누르든.
   *
   * 딤이 클릭을 통과시키므로(`pointer-events:none`) 누른 버튼은 제 일을 그대로 한다.
   * 튜토리얼만 닫힌다. 화면 이동이 아니라 **누른 순간**을 보므로, 같은 화면 안에서
   * 딴 곳을 눌러도(홈에서 지갑을 펼치든) 바로 나간다.
   */
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (bubbleRef.current?.contains(target)) return;
      onClose();
    };
    // 캡처 단계라야 그 클릭으로 화면이 갈아치워져도 놓치지 않는다.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [onClose]);

  const step = steps[index];

  // 매수 1단계와 매도 1단계는 화면·자리가 같고 `side` 만 다르다. 여기 빠지면 팔러 갔는데
  // 사는 설명이 그대로 남는다.
  const placeKey = `${place.screen}:${place.stage ?? ""}:${place.side ?? ""}`;
  const lastPlace = useRef(placeKey);
  useEffect(() => {
    if (lastPlace.current === placeKey) return;
    lastPlace.current = placeKey;

    const found = stepIndexAt(steps, place);
    // 이미 이 자리를 가리키고 있으면 그대로 둔다.
    if (found >= 0 && isSamePlace(steps[found], steps[index])) return;

    // 순서상 다음 자리면 따라가 펼친다.
    const next = nextStepIndex(steps, index);
    if (found >= 0 && next >= 0 && isSamePlace(steps[found], steps[next])) {
      setIndex(next);
      setOpenConcept(false);
      return;
    }

    // 그 밖의 화면으로 갔다 = 안내를 그만 보겠다는 뜻이다. 붙잡지 않는다.
    onClose();
  }, [placeKey, place, steps, index, onClose]);

  const measure = useCallback(() => {
    const rect = screenRect;
    if (!rect) {
      setBoxes([]);
      return;
    }
    const found: AnchorRect[] = [];
    for (const id of step?.anchors ?? []) {
      const node = visibleNode(id);
      if (node) found.push(toScreenRect(node.getBoundingClientRect(), rect));
    }
    setBoxes(found);
  }, [screenRect, step]);

  /**
   * 장이 바뀌면 짚을 자리를 **화면 안으로 끌어온다.**
   *
   * 상세 화면처럼 세로로 긴 곳은 회사 소개·요즘 소식 카드가 스크롤 아래에 있어, 그냥
   * 재면 구멍이 화면 밖에 뚫리고 말풍선만 덩그러니 뜬다. 종목이 바뀌면 카드 높이도
   * 달라지므로 좌표를 미리 정해 둘 수도 없다 — 그때그때 그 자리로 옮긴다.
   *
   * 스크롤이 움직이는 동안은 아래 `scroll` 리스너가 계속 다시 재므로 구멍이 따라온다.
   */
  useEffect(() => {
    const id = step?.anchors[0];
    if (!id) return;
    visibleNode(id)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [step]);

  // 원본은 200ms 마다 DOM 을 전수 검색했다. 화면이 React 로 넘어온 지금은 장이 바뀔 때와
  // 화면이 실제로 움직였을 때만 다시 재면 된다. 안쪽 스크롤 컨테이너까지 잡으려면
  // 스크롤은 캡처 단계에서 받아야 한다.
  useLayoutEffect(() => {
    let frameId = 0;
    const remeasure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measure);
    };

    remeasure();
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    window.visualViewport?.addEventListener("resize", remeasure);
    window.visualViewport?.addEventListener("scroll", remeasure);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
      window.visualViewport?.removeEventListener("resize", remeasure);
      window.visualViewport?.removeEventListener("scroll", remeasure);
    };
  }, [measure]);

  // 말풍선 높이는 문안 길이와 개념을 펼쳤는지에 따라 달라진다. 재서 알아야 위아래
  // 어느 쪽에 붙일지 정할 수 있다.
  useLayoutEffect(() => {
    const node = bubbleRef.current;
    if (!node) return;
    const next = node.offsetHeight;
    setBubbleHeight((current) => (current === next ? current : next));
  }, [step, openConcept]);

  if (!step || !screenRect) return null;

  const holes = boxes.map((box) => holeOf(box));
  // 짚을 것을 못 찾으면 구멍 없이 설명만 띄운다. 화면 전체를 span 으로 주면 위아래
  // 어디에도 자리가 없다는 뜻이라 `placeBubble` 이 바닥을 고른다.
  const placement = placeBubble({
    span: holes.length ? spanOf(holes) : { top: 0, bottom: SCREEN_H },
    bubbleHeight,
  });

  const last = nextStepIndex(steps, index) < 0;

  /**
   * `다음`. 같은 자리면 그 자리에서 이어지고, 자리를 옮겨야 하면 그 자리의 진입로
   * (`enter`)를 실행해 **데려간다**. 새 자리에 닿으면 `place` 가 바뀌면서 그 장을 편다.
   */
  const advance = () => {
    const next = nextStepIndex(steps, index);
    if (next < 0) return onClose();

    if (isSamePlace(step, steps[next])) {
      setIndex(next);
      setOpenConcept(false);
      return;
    }

    const enter = steps[next].enter;
    if (!enter) return;
    // 팔 게 없으면 매도 장 자체가 없으므로 여기 `:code` 는 상세로 들어가는 길뿐이다.
    if ("path" in enter) return onGo(enterPath(enter.path, stock ?? FALLBACK_STOCK));
    clickThrough(enter.anchors);
  };

  const prevStep = index > 0 ? steps[index - 1] : null;
  const prevPath = prevStep && backPath(prevStep, stock ?? FALLBACK_STOCK);
  /** 되돌아갈 수 있는가. 주문 화면 밖으로 나가는 뒤로가기는 없다(`backPath` 참고). */
  const canRetreat = prevStep !== null && (isSamePlace(step, prevStep) || prevPath !== null);

  /**
   * `이전`. 같은 자리면 설명만 되돌리고, 화면이 다르면 그 화면 주소로만 되돌아간다.
   *
   * 앞으로 갈 때 쓰는 `enter.anchors` 는 여기서 쓰지 않는다 — 그건 누르는 순서라
   * 되감으려고 다시 실행하면 앞선 입력이나 완료 화면이 반복된다.
   */
  const retreat = () => {
    if (!prevStep) return;
    setOpenConcept(false);

    if (isSamePlace(step, prevStep)) {
      setIndex(index - 1);
      return;
    }
    if (!prevPath) return;
    // 자리를 먼저 되돌려 놔야 화면이 바뀔 때 `place` 를 읽는 쪽이 "순서에 없는 화면" 으로
    // 보고 튜토리얼을 닫아 버리지 않는다.
    setIndex(index - 1);
    onGo(prevPath);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        // 챗봇 오버레이(10)보다 위, 프레임 이미지(20)보다 아래. 튜토리얼이 켜져 있는
        // 동안은 키웅이도 함께 어두워져야 지금 짚는 곳으로 눈이 간다.
        zIndex: 15,
        pointerEvents: "none",
        clipPath: phoneScreenClipPath(screenRect),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: screenRect.left,
          top: screenRect.top,
          width: SCREEN_W,
          height: SCREEN_H,
          transform: `scale(${screenRect.scale})`,
          transformOrigin: "top left",
        }}
      >
        <svg
          height={SCREEN_H}
          style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
          width={SCREEN_W}
        >
          <defs>
            <mask id="tut-mask">
              <rect fill="#fff" height={SCREEN_H} width={SCREEN_W} />
              {holes.map((hole, at) => (
                <rect
                  fill="#000"
                  height={hole.h}
                  key={at}
                  rx={HOLE_RADIUS}
                  width={hole.w}
                  x={hole.x}
                  y={hole.y}
                />
              ))}
            </mask>
          </defs>
          <rect fill={DIM} height={SCREEN_H} mask="url(#tut-mask)" width={SCREEN_W} />
          {holes.map((hole, at) => (
            <rect
              fill="none"
              height={hole.h}
              key={at}
              opacity={0.9}
              rx={HOLE_RADIUS}
              stroke={RING}
              strokeWidth={2.5}
              width={hole.w}
              x={hole.x}
              y={hole.y}
            />
          ))}
        </svg>

        <div
          ref={bubbleRef}
          style={{
            position: "absolute",
            left: BUBBLE_MARGIN,
            right: BUBBLE_MARGIN,
            top: placement.top,
            // 바깥 딤은 클릭을 통과시키되, 말풍선 버튼은 키웅이보다 우선한다.
            pointerEvents: "auto",
            background: BUBBLE_BG,
            borderRadius: 24,
            padding: "17px 19px",
            boxShadow: "0 20px 44px rgba(0,12,40,0.34),0 2px 6px rgba(0,12,40,0.12)",
          }}
        >
          {placement.side !== "floor" && holes.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: tailLeft(holes[0]),
                top: placement.side === "below" ? -8 : bubbleHeight - 12,
                width: TAIL_SIZE,
                height: TAIL_SIZE,
                background: placement.side === "below" ? BUBBLE_TOP : BUBBLE_BOTTOM,
                transform: "rotate(45deg)",
                borderRadius: 4,
              }}
            />
          )}

          <div
            style={{
              position: "relative",
              fontSize: 16.5,
              fontWeight: 800,
              color: TITLE_INK,
              letterSpacing: "-0.01em",
            }}
          >
            {step.title}
          </div>
          <div
            style={{
              position: "relative",
              fontSize: 13.5,
              fontWeight: 500,
              color: BODY_INK,
              lineHeight: 1.65,
              marginTop: 9,
              textWrap: "pretty",
            }}
          >
            {step.what}
          </div>

          {/*
            어려운 낱말이 화면에 실제로 보일 때만 단다(`tutorial-steps.ts` 의 `term` 참고).
            개념은 접어 둔다. 짚어 주는 말과 한꺼번에 펼치면 말풍선이 화면 절반을 먹고,
            정작 짚은 곳이 그 아래로 밀려 안 보인다. 궁금한 아이만 편다.
          */}
          {step.term && (
            <div
              style={{
                position: "relative",
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid rgba(0,30,90,0.10)",
              }}
            >
              <div
                onClick={() => setOpenConcept((open) => !open)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 800,
                  color: TERM_INK,
                }}
              >
                <span style={{ fontSize: 14 }}>💡</span>
                <span>{step.term}</span>
                <span style={{ fontWeight: 600, color: MUTED }}>
                  {openConcept ? "· 접기" : "· 이게 뭐예요?"}
                </span>
              </div>
              {openConcept && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: SUB_INK,
                    lineHeight: 1.7,
                    marginTop: 6,
                    textWrap: "pretty",
                  }}
                >
                  {step.concept}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginTop: 14,
            }}
          >
            <div
              onClick={onClose}
              style={{
                flex: "none",
                fontSize: 13,
                fontWeight: 600,
                color: MUTED,
                cursor: "pointer",
                padding: "9px 4px",
              }}
            >
              그만 보기
            </div>
            <div style={{ flex: 1 }} />
            {/*
              `이전` 은 `다음` 과 같은 알약이다. 되돌아갈 수 없는 자리(주문 입력을 끝낸
              뒤)에서는 지우지 않고 흐리게 둔다 — 있다가 없어지면 옆 버튼 자리가 흔들린다.
            */}
            <div
              onClick={canRetreat ? retreat : undefined}
              style={{
                ...STEP_BTN,
                cursor: canRetreat ? "pointer" : "default",
                opacity: canRetreat ? 1 : 0.4,
              }}
            >
              이전
            </div>
            {/* 실제 앱 CTA 가 마젠타다. 여기까지 마젠타면 어느 쪽을 눌러야 할지 헷갈린다. */}
            <div onClick={advance} style={{ ...STEP_BTN, cursor: "pointer" }}>
              {last ? "다 봤어요" : "다음"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
