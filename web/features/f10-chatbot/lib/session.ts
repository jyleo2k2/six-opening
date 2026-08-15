export type ChatSession = {
  userId: string;
  familyId: string;
  role: "child" | "parent";
  source: "server_session" | "server_demo";
};

/**
 * 로그인 프로필 중 세션이 쓰는 열만 받는다. Supabase 조회는 app 계층이 하고
 * (`app/api/chat/route.ts`), 이 폴더는 순수 변환만 맡는다 — `app/api/supabase.ts` 의
 * `Profile` 을 그대로 넘겨도 구조가 맞는다.
 */
export type ChatSessionProfile = {
  id: number;
  parent_child: "parent" | "child" | null;
  family_tag: string | null;
};

/** 로그인 쿠키가 없거나 프로필 조회가 실패했을 때 쓰는 데모 세션. */
const DEMO_SESSION: ChatSession = {
  userId: "demo-child",
  familyId: "demo-family",
  role: "child",
  source: "server_demo",
};

/**
 * 요청 프로필로 챗봇 세션을 만든다. 프로필이 없으면 데모 세션으로 폴백한다.
 *
 * 요청 본문의 식별자는 `contracts.ts` 가 거부하므로 조회 대상은 서버만 정한다.
 * 역할이 비어 있는 계정은 `child` 로 본다. 스쿨락 안내나 보호 문구처럼 역할로 갈리는
 * 응답은 자녀 쪽이 더 좁으므로, 모르는 값을 부모로 열어 주지 않는다.
 */
export function resolveChatSession(profile?: ChatSessionProfile | null): ChatSession {
  if (!profile) return DEMO_SESSION;
  return {
    userId: String(profile.id),
    familyId: profile.family_tag ?? DEMO_SESSION.familyId,
    role: profile.parent_child === "parent" ? "parent" : "child",
    source: "server_session",
  };
}
