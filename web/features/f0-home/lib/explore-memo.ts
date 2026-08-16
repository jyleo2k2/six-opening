/**
 * 탐색 화면을 떠났다 돌아올 때 **보던 자리로 되돌리기 위한 기억.**
 *
 * 종목 상세로 들어가면 오버레이가 갈리면서 `ExploreScreen` 이 언마운트된다. 그러면 화면
 * 임시값(스크롤 위치)이 사라지고, 뒤로가기가 늘 `/explore` 로 보내 섹터까지 풀렸다.
 * 카드가 세로로 한 장씩 넘어가는 화면이라 스무 장쯤 내려가 고른 종목을 보고 나오면
 * 맨 위로 돌아가 처음부터 다시 내려가야 했다.
 *
 * 문서를 갈아끼우지 않으므로(`screen-state-handoff.test.ts`) 모듈 변수면 충분하다.
 * 저장소에 넣으면 탭을 다시 열어도 살아남는데, 그건 "직전 화면"이 아니라 다른 약속이다.
 *
 * 정렬은 여기 없다 — `오늘 많이 오른 순` 이 카테고리가 된 뒤로 줄 세우는 차례는 고른
 * 칩이 정하고, 그 칩은 주소(`/explore/rank`)에 적혀 자리와 함께 되돌아온다.
 */

type ExploreSpot = { path: string; scrollTop: number; cardIndex: number };

let spot: ExploreSpot | null = null;

export function rememberExploreSpot(next: ExploreSpot) {
  spot = next;
}

/** 같은 목록으로 돌아왔을 때만 자리를 되살린다. 다른 섹터면 처음부터 본다. */
export function exploreSpotFor(path: string) {
  return spot && spot.path === path ? spot : null;
}

/** 뒤로가기가 돌아갈 곳. 탐색을 한 번도 안 봤으면 기본 목록이다. */
export function lastExplorePath() {
  return spot?.path ?? "/explore";
}
