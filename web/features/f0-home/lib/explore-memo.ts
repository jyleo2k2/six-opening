import type { ExploreSort } from "./explore-cards";

/**
 * 탐색 화면을 떠났다 돌아올 때 **보던 자리로 되돌리기 위한 기억.**
 *
 * 종목 상세로 들어가면 오버레이가 갈리면서 `ExploreScreen` 이 언마운트된다. 그러면 화면
 * 임시값(스크롤 위치·정렬)이 사라지고, 뒤로가기가 늘 `/explore` 로 보내 섹터까지 풀렸다.
 * 카드가 세로로 한 장씩 넘어가는 화면이라 스무 장쯤 내려가 고른 종목을 보고 나오면
 * 맨 위로 돌아가 처음부터 다시 내려가야 했다.
 *
 * 문서를 갈아끼우지 않으므로(`screen-state-handoff.test.ts`) 모듈 변수면 충분하다.
 * 저장소에 넣으면 탭을 다시 열어도 살아남는데, 그건 "직전 화면"이 아니라 다른 약속이다.
 *
 * 정렬을 자리와 따로 두는 이유: 자리는 섹터가 바뀌면 버려야 하지만(다른 목록이다) 정렬은
 * 섹터를 옮겨도 따라가야 한다. 한 덩어리로 묶으면 섹터를 바꿀 때마다 정렬이 풀린다.
 */

type ExploreSpot = { path: string; scrollTop: number; cardIndex: number };

let spot: ExploreSpot | null = null;
let sort: ExploreSort = "sector";

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

export function rememberExploreSort(next: ExploreSort) {
  sort = next;
}

export function lastExploreSort() {
  return sort;
}
