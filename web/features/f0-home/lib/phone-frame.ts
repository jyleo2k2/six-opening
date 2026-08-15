import {
  getPrototypeScreenRect,
  PROTOTYPE_PHONE,
  type PrototypeScreenRect,
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

/**
 * 폰 화면 사각형 밖으로 나간 오버레이를 잘라내는 `clip-path`.
 *
 * 챗봇 오버레이는 `app.html` iframe **밖**에 있고 프레임 이미지는 그 **안**에 있다.
 * 스태킹 컨텍스트가 갈리므로 z-index 로는 누가 위인지 정할 수 없다. 그래서 순서를 정하는
 * 대신 화면 사각형으로 잘라, 좌표가 어떤 이유로 어긋나도 프레임 밖으로는 못 나가게 한다.
 * 오버레이 하나에 걸면 그 안의 시트·플로팅 버튼·삭제 타깃·말풍선이 전부 함께 갇힌다.
 *
 * 오버레이는 `position:fixed; inset:0` 이라 `100%` 가 곧 뷰포트다. 아직 화면을 재지 못했으면
 * 자를 사각형도 모르므로 `undefined` 를 준다 — 첫 프레임에만 해당한다.
 */
export function phoneScreenClipPath(screen: PrototypeScreenRect | null) {
  if (!screen) return undefined;

  const right = screen.left + screen.width;
  const bottom = screen.top + screen.height;
  const radius = PHONE_SCREEN.borderRadius * screen.scale;
  return `inset(${screen.top}px calc(100% - ${right}px) calc(100% - ${bottom}px) ${screen.left}px round ${radius}px)`;
}

export { PROTOTYPE_PHONE };
