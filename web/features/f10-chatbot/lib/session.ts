export type ChatSession = {
  userId: string;
  familyId: string;
  role: "child" | "parent";
  source: "server_demo";
};

/**
 * 데모에는 아직 인증 서비스가 없으므로 서버가 고정 세션을 주입한다.
 * 요청 본문의 식별자는 contracts.ts에서 거부하며, 실제 인증 도입 시 이 함수만 교체한다.
 */
export function resolveChatSession(): ChatSession {
  return {
    userId: "demo-child",
    familyId: "demo-family",
    role: "child",
    source: "server_demo",
  };
}
