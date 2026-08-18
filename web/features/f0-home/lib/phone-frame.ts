import {
  PROTOTYPE_PHONE,
  type PrototypeScreenRect,
} from "../../f10-chatbot/lib/bottom-sheet";

/**
 * 폰 프레임의 기하. `ui-src/template/shell-0.html`·`shell-20.html` 이 쓰던 값이다.
 *
 * 화면은 `PhoneFrame` 안에서 CSS 배율로 줄어들고, 오버레이는 그 안의 `#kw-screen`을
 * 실측한다. 두 좌표계를 다시 계산해 맞추지 않고 실제 client rect 하나를 전달해야
 * 모바일 주소창·키보드·핀치 줌에서도 fixed 오버레이와 프레임이 같은 자리를 본다.
 */
export const PHONE_SCREEN = Object.freeze({
  left: 24,
  top: 23,
  borderRadius: 40,
});

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
 * 챗봇 오버레이와 프레임 이미지는 서로 다른 스태킹 컨텍스트에 있다. z-index 로는
 * 순서를 정할 수 없으므로 화면 사각형으로 잘라, 오버레이가 프레임 밖으로 나가지
 * 않게 한다.
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

/**
 * 프레임 이미지를 **오버레이 위에** 한 번 더 그릴 자리.
 *
 * 자르기만으로는 부족하다. 화면 라운드는 40px 인데 프레임 개구부의 코너는 그보다 깊게
 * 파여 있어, 화면 사각형에 딱 맞춰 잘라도 그 사이 틈으로 오버레이가 베젤 위에 비친다.
 * 프레임을 맨 위에 한 겹 더 깔면 무엇이 올라오든 베젤이 항상 이긴다.
 *
 * 화면 사각형에서 바로 구한다 — 배율·위치를 viewport에서 다시 계산하면 프레임과
 * 화면이 어긋날 수 있다.
 */
export function phoneFrameRect(screen: PrototypeScreenRect | null) {
  if (!screen) return null;

  const width = PROTOTYPE_PHONE.frameWidth * screen.scale;
  const height = PROTOTYPE_PHONE.frameHeight * screen.scale;
  return {
    width,
    height,
    left: screen.left - PHONE_SCREEN.left * screen.scale,
    top: screen.top - PHONE_SCREEN.top * screen.scale,
  };
}

export { PROTOTYPE_PHONE };
