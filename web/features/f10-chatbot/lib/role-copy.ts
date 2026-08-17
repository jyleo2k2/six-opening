import type { ChatSession } from "./session";
import type { ChatReply } from "./routing";

/**
 * SPEC §12.3 (아직 역할을 안 보는 남은 문장은 §12.2-1). 고정 응답은 거의 다
 * **아이가 읽는다**를 전제로 쓰여 있다. 세션에는
 * 역할이 들어오는데(`session.ts`) 읽는 곳이 없어서 부모도 같은 문장을 받는다 —
 * 부모에게 "보호자와 함께 확인해 줘"라고 말하고, 아이에게는 자기가 켤 수 없는
 * 보호자 토글로 가는 버튼을 준다.
 *
 * 라우터(`routeMessage`)는 세션을 받지 않는다. 요청 본문이 역할을 지정하지 못하게
 * 하는 경계라 일부러 그렇게 뒀고, 역할을 `ChatContext` 에 얹으면 클라이언트가
 * 부모라고 주장할 수 있다. 그래서 라우팅이 끝난 뒤 오케스트레이터가 문장만 바꾼다.
 */
export type RoleCopyKey =
  | "tradingLock"
  | "personalInfoOfficialScreen"
  | "giftScam"
  | "familyInvite";

type RoleOverride = {
  /**
   * 이 역할이 읽을 문장. **이미 해요체로 적는다** — `reply()` 의 `toPoliteKorean`
   * 변환이 끝난 뒤에 갈아끼우므로 여기 적은 문장은 그대로 나간다.
   */
  text: string;
  /** 이 역할이 누를 수 없는 화면이면 버튼을 뗀다. */
  dropUiAction?: boolean;
};

/**
 * 기본 문장은 `routing.ts` 에 그대로 두고, **그 문장이 틀리는 역할만** 여기 적는다.
 * 양쪽을 다 적지 않는다 — 두 벌을 두면 어느 쪽이 원문인지 알 수 없고, 한쪽만 고치는
 * 실수가 조용히 지나간다.
 */
const ROLE_COPY: Record<RoleCopyKey, Partial<Record<ChatSession["role"], RoleOverride>>> = {
  // 원문은 보호자용이다. 아이에게는 자기가 못 켜는 기능을 자기 기능처럼 설명하고,
  // 홈의 보호자 토글로 보내는 버튼까지 붙는다.
  tradingLock: {
    child: {
      text:
        "학교 시간엔 매매 쉬기는 보호자가 켜 두는 기능이라, 켜져 있는 동안에는 주문이 잠시 멈춰요. 켜고 끄는 건 보호자만 할 수 있어요.",
      dropUiAction: true,
    },
  },
  // 아래 셋의 원문은 "보호자와 함께" 다. 부모에게는 그 보호자가 자기 자신이다.
  personalInfoOfficialScreen: {
    parent: {
      text:
        "계좌번호나 집 주소 같은 개인정보는 채팅에 쓰지 않아도 돼요. 앱의 공식 화면에서만 확인해 주세요.",
    },
  },
  giftScam: {
    parent: {
      text:
        "주소나 계좌번호를 채팅에 적어도 선물이나 모의투자금을 주지 않아요. 공식 이벤트인지는 앱 안내에서 확인해 주세요.",
    },
  },
  familyInvite: {
    parent: {
      text: "주소나 학교 이름으로 가족 팀을 찾지 않아요. 가족 초대는 앱의 공식 화면에서 확인해 주세요.",
    },
  },
};

/** 역할에 맞는 문장이 따로 있으면 갈아끼운다. 없으면 원래 응답을 그대로 돌려준다. */
export function applyRoleCopy<T extends ChatReply>(reply: T, role: ChatSession["role"]): T {
  const override = reply.roleCopy ? ROLE_COPY[reply.roleCopy][role] : undefined;
  if (!override) return reply;
  const next: T = { ...reply, text: override.text };
  if (override.dropUiAction) delete next.uiAction;
  return next;
}
