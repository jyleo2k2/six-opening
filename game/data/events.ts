import type { GameEvent } from '../src/types';

/**
 * 2011~2020 사건 팩 12종 (기획서 §8).
 *
 * - imp = 사건 전후 실제 관찰 등락률(원값). 발동 시 종목마다 × 밴드 0.7~1.3.
 *   **부호(방향)는 역사를 따른다** — 바꾸는 PR은 사료 근거 첨부 (game/AGENTS.md).
 * - window = 관찰 구간 표기 (사건 카드에 "실제 등락률 × 변동 밴드"와 함께 노출).
 * - clueText = 진짜 전조 뉴스(라운드마다 2명에게만). 사실만, 주가 얘기 없음.
 * - 수치 사료 검증·보강은 트랙 ③ 【미정】.
 */
export const EVENTS: readonly GameEvent[] = [
  {
    id: 'quake',
    name: '동일본 대지진',
    subtitle: '일본 공장 가동 중단, 부품 공급 차질',
    window: '5거래일',
    imp: { car: 0.06, semi: 0.04, trv: -0.1 },
    clueSector: 'car',
    clueText: '일본 부품 공장들이 가동을 멈췄다는 이야기가 들어왔습니다.',
  },
  {
    id: 'smart',
    name: '스마트폰 대중화',
    subtitle: '모두의 손에 스마트폰이 들어온다',
    window: '20거래일',
    imp: { semi: 0.09, net: 0.07 },
    clueSector: 'semi',
    clueText: '스마트폰 신제품 예약 판매가 사상 최대치를 기록 중입니다.',
  },
  {
    id: 'oil',
    name: '국제유가 대폭락',
    subtitle: '기름값이 반토막 났다',
    window: '10거래일',
    imp: { trv: 0.08, bat: -0.06, car: -0.03 },
    clueSector: 'trv',
    clueText: '산유국들이 원유 증산 경쟁에 들어갔다는 소식입니다.',
  },
  {
    id: 'mers',
    name: '메르스 유행',
    subtitle: '낯선 감염병의 상륙',
    window: '15거래일',
    imp: { bio: 0.12, trv: -0.11, cos: -0.06 },
    clueSector: 'bio',
    clueText: '중동에서 신종 호흡기 질환 환자가 늘고 있습니다.',
  },
  {
    id: 'thaad',
    name: '사드 배치·한한령',
    subtitle: '중국, 한류 제한 조치 시작',
    window: '20거래일',
    imp: { cos: -0.18, ent: -0.12, trv: -0.08 },
    clueSector: 'cos',
    clueText: '중국 정부가 자국민의 한국 단체관광을 제한하기로 했습니다.',
  },
  {
    id: 'cycle',
    name: '반도체 슈퍼사이클',
    subtitle: '메모리가 없어서 못 판다',
    window: '20거래일',
    imp: { semi: 0.15 },
    clueSector: 'semi',
    clueText: '데이터센터들이 메모리 주문을 크게 늘리고 있습니다.',
  },
  {
    id: 'trade',
    name: '미중 무역전쟁',
    subtitle: '관세 폭탄이 오간다',
    window: '20거래일',
    imp: { semi: -0.08, car: -0.07 },
    clueSector: 'car',
    clueText: '미국이 수입차 관세를 검토 중이라는 보도가 나왔습니다.',
  },
  {
    id: 'exreg',
    name: '일본 수출규제',
    subtitle: '반도체 소재 수출 제한',
    window: '10거래일',
    imp: { semi: -0.07 },
    clueSector: 'semi',
    clueText: '일본이 반도체 소재 수출 절차를 강화한다는 이야기가 나옵니다.',
  },
  {
    id: 'kpop',
    name: 'K팝 빌보드 진출',
    subtitle: '한국 가수, 세계 차트 1위',
    window: '15거래일',
    imp: { ent: 0.16 },
    clueSector: 'ent',
    clueText: '한국 아이돌의 해외 공연 티켓이 연일 매진되고 있습니다.',
  },
  {
    id: 'ev',
    name: '전기차 붐',
    subtitle: '거리를 바꾸는 전기차',
    window: '20거래일',
    imp: { bat: 0.18, car: 0.05 },
    clueSector: 'bat',
    clueText: '완성차 업체들이 전기차 생산 목표를 올려 잡았습니다.',
  },
  {
    id: 'covid',
    name: '코로나 확산',
    subtitle: '전 세계가 멈춘 날',
    window: '20거래일',
    imp: { bio: 0.14, net: 0.1, trv: -0.2, cos: -0.09 },
    clueSector: 'trv',
    clueText: '해외에서 원인 불명 폐렴 환자가 보고되고 있습니다.',
  },
  {
    id: 'ants',
    name: '동학개미 대반등',
    subtitle: '개인 투자자의 반격',
    window: '20거래일',
    imp: { semi: 0.06, ent: 0.04, net: 0.07, trv: 0.03, bio: 0.05, cos: 0.03, car: 0.04, bat: 0.08 },
    clueSector: 'net',
    clueText: '신규 증권 계좌 개설이 급증하고 있습니다.',
  },
] as const;

export function getEvent(id: string): GameEvent {
  const event = EVENTS.find((e) => e.id === id);
  if (!event) throw new Error(`없는 사건이다: ${id}`);
  return event;
}
