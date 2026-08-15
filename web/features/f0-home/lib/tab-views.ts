// 탭 유효 열람(10초 이상) 버퍼. `app.html` 의 `this.tabViews` + `flushTabViews()` 를
// React 로 가져온 것이다.
//
// 상세·차트·뉴스 열람은 매수 체결과 연결될 때만 서버(`/api/tab-view`)에 저장한다.
// 전에는 iframe 이 버퍼를 들고 있다가 iframe 안 매수 체결 때 보냈는데, 매수 화면이
// React 로 옮겨 가면서 그 방아쇠가 사라져 기록이 영영 버퍼에만 쌓였다. 버퍼를 화면과
// 같은 쪽(React)에 두면 방아쇠와 기록이 다시 한 집에 산다.
//
// 화면을 오가도 남아야 하므로 모듈 상태로 둔다. 10초 판정은 기록하는 쪽(상세 화면)이
// 먼저 하고 서버가 다시 한다 — iframe 시절과 같은 이중 판정이다.

export type TabView = { opened_at: string; closed_at: string };

const buffer: Record<string, TabView[]> = {};

export function recordTabView(code: string, openedAt: string, closedAt: string) {
  (buffer[code] ??= []).push({ opened_at: openedAt, closed_at: closedAt });
}

/** 버퍼를 비우면서 내용을 준다. 테스트가 fetch 없이 여기까지만 본다. */
export function takeTabViews(code: string): TabView[] {
  const views = buffer[code] ?? [];
  delete buffer[code];
  return views;
}

/**
 * 매수 체결 때 부른다. `app.html` 의 `flushTabViews` 와 같은 규칙이다 —
 * 로그인 역할이 맞지 않으면(`canPost=false`) 보내지 않고 **버리기만** 한다.
 * 남겨 두면 다음 로그인 사용자의 체결에 남의 열람이 딸려 간다.
 */
export function flushTabViews(code: string, canPost: boolean) {
  const views = takeTabViews(code);
  if (!canPost || views.length === 0) return;
  fetch("/api/tab-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock_code: code, views }),
  }).catch(() => {});
}
