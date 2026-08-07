import type { NewsItem } from '../src/types';

/**
 * 준비 페이즈 무료 뉴스 풀 (기획서 §3.1·§7.4).
 *
 * - 전부 **사실**이고 주가 얘기가 없다. eventId가 있으면 그 사건의 단서, null이면 시대 배경.
 * - 같은 턴 안에서 중복 배달되지 않으므로 (단서 2 + 배경 12) ≥ 8인이 성립한다.
 * - 아이 노출 편집 텍스트 — 검수 대상. 풀 확장은 트랙 ③ 공급 · 트랙 ① 승인 (기획서 §7.4).
 */
export const NEWS: readonly NewsItem[] = [
  // ── 단서 뉴스 (사건당 2) ──────────────────────────────────────────────
  { id: 'clue-jp-earthquake-1', eventId: 'jp-earthquake', text: '바다 건너 이웃 나라에서 큰 지진이 나서 세계의 공장들이 대신 물건을 만들 곳을 찾고 있대.' },
  { id: 'clue-jp-earthquake-2', eventId: 'jp-earthquake', text: '이웃 나라 공장들이 멈춰서 부품과 기름을 구하기 어려워졌다는 소식이야.' },
  { id: 'clue-euro-crisis-1', eventId: 'euro-crisis', text: '유럽의 여러 나라가 나랏빚을 갚기 힘들어한다는 소식이 들려와.' },
  { id: 'clue-euro-crisis-2', eventId: 'euro-crisis', text: '큰 은행들이 서로 돈을 빌려주기를 무서워하기 시작했대.' },
  { id: 'clue-nk-provocation-1', eventId: 'nk-provocation', text: '휴전선 근처에서 긴장이 높아지고 있다는 뉴스가 나왔어.' },
  { id: 'clue-nk-provocation-2', eventId: 'nk-provocation', text: '이웃 나라들이 나라를 지키는 장비를 더 사들일지 고민 중이래.' },
  { id: 'clue-youke-boom-1', eventId: 'youke-boom', text: '우리나라로 여행 오는 외국인 관광객이 부쩍 늘고 있대.' },
  { id: 'clue-youke-boom-2', eventId: 'youke-boom', text: '외국 관광객들이 우리나라 드라마와 화장품에 푹 빠졌다는 기사가 나왔어.' },
  { id: 'clue-mers-1', eventId: 'mers', text: '낯선 감염병에 걸린 사람이 큰 병원에 다녀갔다는 뉴스가 나왔어.' },
  { id: 'clue-mers-2', eventId: 'mers', text: '사람 많은 곳에 가지 말라는 안내문이 붙기 시작했대.' },
  { id: 'clue-thaad-1', eventId: 'thaad', text: '이웃 큰 나라가 우리나라 연예인의 방송 출연을 막기 시작했대.' },
  { id: 'clue-thaad-2', eventId: 'thaad', text: '이웃 큰 나라의 단체 관광객이 한국 여행을 취소하고 있다는 얘기가 있어.' },
  { id: 'clue-chip-supercycle-1', eventId: 'chip-supercycle', text: '전 세계 데이터센터가 메모리칩을 사려고 줄을 섰대.' },
  { id: 'clue-chip-supercycle-2', eventId: 'chip-supercycle', text: '칩 공장들이 주문이 밀려서 24시간 돌아가고 있다는 소식이야.' },
  { id: 'clue-peace-summit-1', eventId: 'peace-summit', text: '남과 북의 지도자가 곧 만난다는 소식이 있어.' },
  { id: 'clue-peace-summit-2', eventId: 'peace-summit', text: '휴전선의 확성기 방송이 멈췄다는 뉴스가 나왔어.' },
  { id: 'clue-hallyu-wave-1', eventId: 'hallyu-wave', text: '우리나라 가수가 세계에서 제일 유명한 차트 1위에 올랐대!' },
  { id: 'clue-hallyu-wave-2', eventId: 'hallyu-wave', text: '우리나라 영화가 세계 영화제에서 큰 상을 받을 거라는 소문이 자자해.' },
  { id: 'clue-trade-war-1', eventId: 'trade-war', text: '세계에서 제일 큰 두 나라가 서로 관세를 올리겠다며 다투고 있어.' },
  { id: 'clue-trade-war-2', eventId: 'trade-war', text: '두 큰 나라의 다툼에 수출 기업들이 눈치를 보고 있다는 기사가 나왔어.' },
  { id: 'clue-jp-export-curb-1', eventId: 'jp-export-curb', text: '이웃 나라가 칩을 만들 때 꼭 필요한 재료를 안 팔겠다고 했대.' },
  { id: 'clue-jp-export-curb-2', eventId: 'jp-export-curb', text: '우리나라 기업들이 핵심 재료를 직접 만들어보겠다고 나섰다는 소식이야.' },
  { id: 'clue-covid-1', eventId: 'covid', text: '먼 나라에서 원인을 알 수 없는 폐렴 환자가 늘고 있다는 소식이야.' },
  { id: 'clue-covid-2', eventId: 'covid', text: '공항 검역대가 갑자기 바빠졌다는 뉴스가 나왔어.' },
  { id: 'clue-ant-rally-1', eventId: 'ant-rally', text: '은행 이자가 거의 0이 되어서 사람들이 다른 곳에 돈 둘 데를 찾고 있대.' },
  { id: 'clue-ant-rally-2', eventId: 'ant-rally', text: '주식 계좌를 새로 만드는 사람이 폭발적으로 늘었다는 기사가 나왔어.' },

  // ── 배경 뉴스 (시대 사실, 이벤트 무관) ────────────────────────────────
  { id: 'bg-1', eventId: null, text: '요즘은 스마트폰으로 은행 일까지 다 본대.' },
  { id: 'bg-2', eventId: null, text: '새로운 아이돌 그룹이 데뷔했는데 반응이 뜨겁대.' },
  { id: 'bg-3', eventId: null, text: '올해 김장 배추 값이 작년보다 싸다는 소식이야.' },
  { id: 'bg-4', eventId: null, text: '프로야구 관중이 역대 최다를 기록했대.' },
  { id: 'bg-5', eventId: null, text: '전기차라는 게 곧 나온다는데, 아직은 낯설다는 사람이 많아.' },
  { id: 'bg-6', eventId: null, text: '해외 직구로 물건을 사는 사람이 점점 늘고 있대.' },
  { id: 'bg-7', eventId: null, text: '새 고속철도 노선이 뚫려서 지방 가기가 편해졌대.' },
  { id: 'bg-8', eventId: null, text: '인터넷 방송을 보는 사람이 TV 보는 사람보다 많아질 거래.' },
  { id: 'bg-9', eventId: null, text: '골목마다 치킨집이 또 늘었다는 기사가 나왔어.' },
  { id: 'bg-10', eventId: null, text: '올여름이 기록적으로 덥대. 에어컨이 불티나게 팔린다더라.' },
  { id: 'bg-11', eventId: null, text: '커피를 마시는 사람이 늘어서 카페가 골목마다 생기고 있대.' },
  { id: 'bg-12', eventId: null, text: '반려동물을 키우는 집이 다섯 집 중 한 집이래.' },
] as const;
