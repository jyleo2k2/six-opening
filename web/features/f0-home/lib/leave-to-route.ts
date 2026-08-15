import type { ChatUiAction } from "../../../shared/types/chatbot";
import { isAllowedUiAction } from "../../f10-chatbot/lib/contracts";

/**
 * React 화면에서 아직 `app.html` 이 그리는 화면으로 넘어갈 때 쓴다.
 *
 * 화면이 실제 라우트로 나뉘면서 화면 이동이 문서 교체가 됐다. 앱 입장에선 새로고침과 같아서
 * 작성 중이던 주문이 메모리와 함께 사라진다. `ui-src/methods/persist.js` 의 `leaveToRoute`
 * 가 남기는 것과 **같은 표시**를 남겨야 다음 문서가 화면 임시값을 되살린다.
 * 표시가 없으면(F5·새 탭·직접 진입) 임시값은 버려진다 — 그게 F2 SPEC §6.2 의 약속이다.
 */
const NAV_MARK = "kw_proto_nav_v1";
const PENDING_CHAT_ACTION = "kw_proto_chat_action_v1";

/**
 * 챗봇이 시킨 화면 이동은 주소만으로 표현할 수 없다 — 업종·주문 단계·아카이브 탭까지
 * 담긴 지시라 주소로 옮기면 그만큼이 떨어져 나간다. 지시를 통째로 넘겨 두고
 * `ConnectedPrototype` 이 iframe 에 그대로 전달하게 한다.
 */
export function leaveToRoute(path: string, action?: ChatUiAction) {
  try {
    sessionStorage.setItem(NAV_MARK, "1");
    if (action) sessionStorage.setItem(PENDING_CHAT_ACTION, JSON.stringify(action));
  } catch {
    // 저장을 막아 둔 브라우저에서도 이동 자체는 해야 한다. 초안만 잃는다.
  }
  window.location.href = path;
}

/** 넘겨받은 지시를 한 번만 쓰고 버린다. 남겨두면 다음 새로고침에서 또 화면이 튄다. */
export function takePendingChatAction(): ChatUiAction | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PENDING_CHAT_ACTION);
    sessionStorage.removeItem(PENDING_CHAT_ACTION);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAllowedUiAction(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
