import {
  PROTOTYPE_PHONE,
  type PrototypeScreenRect,
} from "../../f10-chatbot/lib/bottom-sheet";

/**
 * 폰 프레임의 기하. `ui-src/template/shell-0.html`·`shell-20.html` 이 쓰던 값이다.
 *
 * 화면과 오버레이는 `PhoneFrame` 안에서 CSS 배율을 함께 받는다. 오버레이는 프레임
 * 내부의 `PHONE_SCREEN_RECT`를 쓰고, 손짓처럼 client 좌표가 필요한 기능만
 * `prototypeScreenRectFromClientRect`로 실제 `#kw-screen` rect를 변환한다.
 */
export const PHONE_SCREEN = Object.freeze({
  left: 24,
  top: 23,
  borderRadius: 40,
});

/** `.phone-stage__content` 안에서 쓰는 화면 좌표. 부모 transform이 브라우저 배율을 맡는다. */
export const PHONE_SCREEN_RECT: PrototypeScreenRect = {
  left: PHONE_SCREEN.left,
  top: PHONE_SCREEN.top,
  width: PROTOTYPE_PHONE.screenWidth,
  height: PROTOTYPE_PHONE.screenHeight,
  scale: 1,
};

export function prototypeScreenRectFromClientRect(
  rect: { left: number; top: number; width: number; height: number },
): PrototypeScreenRect | null {
  if (
    ![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return null;
  }

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    scale: rect.width / PROTOTYPE_PHONE.screenWidth,
  };
}

/**
 * 폰 화면 사각형 밖으로 나간 오버레이를 잘라내는 `clip-path`.
 *
 * 챗봇 오버레이는 `.phone-stage__overlay` 안의 같은 스태킹 컨텍스트에 있다. 화면
 * 사각형으로 잘라 오버레이가 프레임 개구부 밖으로 나가지 않게 한다.
 * 오버레이 하나에 걸면 그 안의 시트·플로팅 버튼·삭제 타깃·말풍선이 전부 함께 갇힌다.
 *
 * 오버레이 컨테이너는 450×920 프레임 안의 absolute 레이어라 `100%` 가 그 무대다.
 * 아직 화면을 재지 못했으면 자를 사각형도 모르므로 `undefined` 를 준다 — 단독
 * 오버레이가 첫 client 측정을 기다릴 때만 해당한다.
 */
export function phoneScreenClipPath(screen: PrototypeScreenRect | null) {
  if (!screen) return undefined;

  const right = screen.left + screen.width;
  const bottom = screen.top + screen.height;
  const radius = PHONE_SCREEN.borderRadius * screen.scale;
  return `inset(${screen.top}px calc(100% - ${right}px) calc(100% - ${bottom}px) ${screen.left}px round ${radius}px)`;
}

export { PROTOTYPE_PHONE };
