"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getPrototypeScreenRect,
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
import {
  isSamePlace,
  nextStepIndex,
  stepIndexAt,
  type TutorialLength,
  type TutorialPlace,
  tutorialSteps,
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

/** 딤은 네이비를 옅게 깐다. 검정은 앱의 보라·네이비 톤에서 혼자 튄다. */
const DIM = "rgba(0,30,90,0.58)";
const RING = "#FFC7DE";

/**
 * 말풍선은 앱 카드(전부 흰색)와 **구분되되 테마 안**에 있어야 한다. 원본 프로토타입의
 * 연회색·보랏빛 유리판을 그대로 쓰고, 글씨는 디자인 토큰 `navy`·`magenta` 다.
 */
const BUBBLE_BG = "linear-gradient(157deg,#E9EBF3 0%,#E4E6F0 46%,#DCDFEC 100%)";
const BUBBLE_TOP = "#E9EBF3";
const BUBBLE_BOTTOM = "#DCDFEC";

/** `globals.css` 의 `--color-navy`·`--color-magenta`. */
const NAVY = "#001E5A";
const MAGENTA = "#D70082";
/** 옮겨 온 화면들이 본문·보조 글씨에 쓰는 회색 두 단계. */
const BODY_INK = "#5C6280";
const SUB_INK = "#6E7488";
const MUTED = "#8E93A8";

/** 미니바가 하단 탭 위에 앉는 높이. */
const MINIBAR_BOTTOM = 76;

const HOLE_RADIUS = 16;

/** 같은 id 가 화면 분기에 여러 개 남아 있을 수 있다. 실제로 그려진 것만 고른다. */
function visibleNode(id: string) {
  for (const node of document.querySelectorAll(`#${CSS.escape(id)}`)) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return node;
  }
  return null;
}

export function TutorialOverlay({
  place,
  length,
  onGo,
  onClose,
}: {
  /** 지금 어느 화면의 어느 자리인지. 장은 이 값에서 읽는다 — 세지 않는다. */
  place: TutorialPlace;
  length?: TutorialLength;
  /** 주소로 데려간다. `ConnectedPrototype` 의 `leaveToPath` 와 같은 경로다. */
  onGo: (path: string) => void;
  onClose: () => void;
}) {
  const steps = useMemo(() => tutorialSteps(length), [length]);
  const [index, setIndex] = useState(() => Math.max(0, stepIndexAt(steps, place)));
  /** 읽고 나면 접는다. 딤과 설명이 계속 떠 있으면 정작 버튼을 누를 수가 없다. */
  const [read, setRead] = useState(false);
  const [openConcept, setOpenConcept] = useState(false);
  const [screen, setScreen] = useState<PrototypeScreenRect | null>(null);
  const [boxes, setBoxes] = useState<AnchorRect[]>([]);
  const [bubbleHeight, setBubbleHeight] = useState(240);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const step = steps[index];

  const placeKey = `${place.screen}:${place.stage ?? ""}`;
  const lastPlace = useRef(placeKey);
  useEffect(() => {
    if (lastPlace.current === placeKey) return;
    lastPlace.current = placeKey;

    const found = stepIndexAt(steps, place);
    // 같은 자리면 그대로 둔다. 여기서 다시 펼치면 방금 읽은 설명이 또 뜬다.
    if (found >= 0 && isSamePlace(steps[found], steps[index])) return;

    // 순서상 다음 자리면 따라가 펼친다.
    const next = nextStepIndex(steps, index);
    if (found >= 0 && next >= 0 && isSamePlace(steps[found], steps[next])) {
      setIndex(next);
      setRead(false);
      setOpenConcept(false);
      return;
    }

    // 그 밖의 화면으로 갔다 = 안내를 그만 보겠다는 뜻이다. 붙잡지 않는다.
    onClose();
  }, [placeKey, place, steps, index, onClose]);

  const measure = useCallback(() => {
    const rect = getPrototypeScreenRect(window.innerWidth, window.innerHeight);
    setScreen(rect);
    const found: AnchorRect[] = [];
    for (const id of step?.anchors ?? []) {
      const node = visibleNode(id);
      if (node) found.push(toScreenRect(node.getBoundingClientRect(), rect));
    }
    setBoxes(found);
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
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [measure]);

  // 말풍선 높이는 문안 길이와 개념을 펼쳤는지에 따라 달라진다. 재서 알아야 위아래
  // 어느 쪽에 붙일지 정할 수 있다.
  useLayoutEffect(() => {
    const node = bubbleRef.current;
    if (!node) return;
    const next = node.offsetHeight;
    setBubbleHeight((current) => (current === next ? current : next));
  }, [step, openConcept, read]);

  if (!step || !screen) return null;

  const holes = boxes.map((box) => holeOf(box));
  // 짚을 것을 못 찾으면 구멍 없이 설명만 띄운다. 화면 전체를 span 으로 주면 위아래
  // 어디에도 자리가 없다는 뜻이라 `placeBubble` 이 바닥을 고른다.
  const placement = placeBubble({
    span: holes.length ? spanOf(holes) : { top: 0, bottom: SCREEN_H },
    bubbleHeight,
  });

  const last = nextStepIndex(steps, index) < 0;

  /**
   * `다음`. 같은 자리면 그 자리에서 이어지고, 자리를 옮겨야 하면 **데려간다**.
   *
   * 데려가기 전에 먼저 접는 이유는 못 데려갈 수도 있어서다 — 학교 시간이라 주문 버튼이
   * 잠겼거나, 아이가 아직 금액을 안 골랐거나. 그때는 남은 미니바 힌트가 무엇을 해야
   * 하는지 말해 준다. 누르는 것은 **이동 버튼뿐**이고 금액·이유 같은 고르는 자리는
   * 건드리지 않는다.
   */
  const advance = () => {
    const next = nextStepIndex(steps, index);
    if (next < 0) return onClose();

    if (isSamePlace(step, steps[next])) {
      setIndex(next);
      setOpenConcept(false);
      return;
    }

    setRead(true);
    const enter = steps[next].enter;
    if (!enter) return;
    if ("path" in enter) return onGo(enter.path);
    const node = visibleNode(enter.anchor);
    if (node instanceof HTMLElement) node.click();
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
        clipPath: phoneScreenClipPath(screen),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: screen.left,
          top: screen.top,
          width: SCREEN_W,
          height: SCREEN_H,
          transform: `scale(${screen.scale})`,
          transformOrigin: "top left",
        }}
      >
        {!read && (
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
        )}

        <div
          ref={bubbleRef}
          style={{
            position: "absolute",
            left: BUBBLE_MARGIN,
            right: BUBBLE_MARGIN,
            top: placement.top,
            // 접혔을 때도 높이를 재야 다시 펼칠 자리를 알 수 있다. 보이지만 않게 둔다.
            visibility: read ? "hidden" : "visible",
            pointerEvents: read ? "none" : "auto",
            background: BUBBLE_BG,
            borderRadius: 24,
            padding: "17px 19px",
            boxShadow:
              "0 20px 44px rgba(0,30,90,0.28),inset 0 1px 0 rgba(255,255,255,0.85),inset 0 0 0 1px rgba(255,255,255,0.5)",
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
              color: NAVY,
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
            개념은 접어 둔다. 짚어 주는 말과 개념 설명을 한꺼번에 펼치면 말풍선이 화면
            절반을 먹고, 정작 짚은 곳이 그 아래로 밀려 안 보인다. 궁금한 아이만 편다.
          */}
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
                color: MAGENTA,
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
            {/* 실제 앱 CTA 가 마젠타다. 여기까지 마젠타면 어느 쪽을 눌러야 할지 헷갈린다. */}
            <div
              onClick={advance}
              style={{
                flex: "none",
                fontSize: 13.5,
                fontWeight: 800,
                color: NAVY,
                cursor: "pointer",
                background: "linear-gradient(180deg,#FCFCFE 0%,#EDEEF5 100%)",
                borderRadius: 999,
                padding: "10px 20px",
                boxShadow:
                  "0 5px 10px -4px rgba(0,30,90,0.22),inset 0 1.5px 1px rgba(255,255,255,1),inset 0 0 0 1px rgba(0,30,90,0.08)",
              }}
            >
              {last ? "다 봤어요" : "다음"}
            </div>
          </div>
        </div>

        {read && (
          <div
            style={{
              position: "absolute",
              left: BUBBLE_MARGIN,
              right: BUBBLE_MARGIN,
              bottom: MINIBAR_BOTTOM,
              display: "flex",
              alignItems: "center",
              gap: 9,
              pointerEvents: "auto",
              background: NAVY,
              borderRadius: 999,
              padding: "9px 10px 9px 16px",
              boxShadow: "0 12px 26px rgba(0,30,90,0.34)",
            }}
          >
            <span style={{ fontSize: 13 }}>💡</span>
            {/* 방금 읽은 제목을 다시 띄우면 "끝났나?" 싶다. 다음에 뭘 할지를 적는다. */}
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {step.hint}
            </span>
            <span
              onClick={() => setRead(false)}
              style={{
                flex: "none",
                fontSize: 12,
                fontWeight: 800,
                color: NAVY,
                background: "#fff",
                borderRadius: 999,
                padding: "6px 12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              다시 보기
            </span>
            <span
              onClick={onClose}
              style={{
                flex: "none",
                fontSize: 15,
                color: "rgba(255,255,255,0.66)",
                cursor: "pointer",
                padding: "0 6px",
              }}
            >
              ✕
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
