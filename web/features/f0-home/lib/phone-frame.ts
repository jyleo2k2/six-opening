import {
  getPrototypeScreenRect,
  PROTOTYPE_PHONE,
} from "../../f10-chatbot/lib/bottom-sheet";

/**
 * 폰 프레임의 기하. `ui-src/template/shell-0.html`·`shell-20.html` 이 쓰던 값이다.
 *
 * 화면을 하나씩 React 로 옮기는 동안 프레임은 두 곳에 존재한다 — 아직 안 옮긴 화면은
 * `app.html` 이, 옮긴 화면은 `PhoneFrame` 이 그린다. 두 프레임이 어긋나면 화면을
 * 오갈 때 폰이 튀고, 챗봇 시트가 프레임 밖으로 나온다. 그래서 배율은 새로 계산하지 않고
 * 챗봇이 쓰는 `getPrototypeScreenRect` 의 값을 그대로 쓴다 — 기하의 원본은 하나다.
 */
export const PHONE_SCREEN = Object.freeze({
  left: 24,
  top: 23,
  borderRadius: 40,
});

/** `--runtime-scale` — 창에 맞춰 450×920 프레임을 줄인다. 키우지는 않는다. */
export function phoneFrameScale(viewportWidth: number, viewportHeight: number) {
  return getPrototypeScreenRect(viewportWidth, viewportHeight).scale;
}

export { PROTOTYPE_PHONE };
