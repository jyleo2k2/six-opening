import type { GameEvent } from '../src/types';

/**
 * 2011~2020 이벤트 풀 13종 (기획서 §7.3). 판마다 5개 비복원 추첨.
 *
 * - effects의 **부호(방향)는 실제 역사를 따른다** — 부호를 바꾸는 PR은 사료 근거 첨부
 *   (game/AGENTS.md). 폭 범위는 게임 밸런스 영역이라 시뮬로 조정한다.
 *   (첫 초안 대비 폭 ×1.6~2 확대: 정보 추종이 이기고 순위가 뒤집히려면 사건이 화끈해야
 *   한다 — sim 3000판 근거, PR 전후표 참조.)
 * - 방향 초안 중 사료 검증 대기: 동일본 대지진의 반도체(+), 일본 수출규제의 반도체(+)
 *   — 구현계획 §5, 트랙 ③ 과제.
 * - blurb는 사건 배너에 반드시 병기하는 실제 역사 설명 — 재난 희화화 금지 (기획서 §8).
 */
export const EVENTS: readonly GameEvent[] = [
  {
    id: 'jp-earthquake',
    name: '동일본 대지진',
    year: '2011',
    tone: 'mixed',
    blurb:
      '2011년 3월, 일본 동북부에서 큰 지진과 해일이 일어나 많은 사람이 피해를 입었어요. 일본의 공장들이 멈추자 세계 공급망이 크게 흔들렸어요.',
    effects: {
      chem: [0.12, 0.28],
      auto: [0.08, 0.2],
      semi: [0.05, 0.15],
      travel: [-0.28, -0.12],
    },
  },
  {
    id: 'euro-crisis',
    name: '유럽 재정위기',
    year: '2011~2012',
    tone: 'bad',
    blurb:
      '그리스를 비롯한 유럽 나라들이 나랏빚을 갚기 어려워지면서 전 세계 금융시장이 불안에 떨었어요.',
    effects: {
      finance: [-0.35, -0.18],
      semi: [-0.22, -0.1],
      auto: [-0.18, -0.08],
      chem: [-0.18, -0.08],
      travel: [-0.15, -0.06],
      enter: [-0.12, -0.05],
      bio: [-0.12, -0.05],
    },
  },
  {
    id: 'nk-provocation',
    name: '북한 도발',
    year: '2013~2017',
    tone: 'bad',
    blurb: '북한이 핵실험과 미사일 발사를 이어가면서 한반도의 긴장이 높아졌어요.',
    effects: {
      defense: [0.18, 0.35],
      finance: [-0.12, -0.05],
      travel: [-0.12, -0.05],
      enter: [-0.08, -0.03],
    },
  },
  {
    id: 'youke-boom',
    name: '유커 관광 붐',
    year: '2014~2016',
    tone: 'good',
    blurb:
      '한국 드라마와 화장품이 인기를 끌면서 중국인 관광객이 몰려와 서울 거리가 북적였어요.',
    effects: {
      travel: [0.2, 0.4],
      enter: [0.15, 0.32],
    },
  },
  {
    id: 'mers',
    name: '메르스',
    year: '2015',
    tone: 'bad',
    blurb: '중동에서 온 낯선 감염병 메르스가 퍼지자 사람들이 외출과 여행을 줄였어요.',
    effects: {
      bio: [0.18, 0.4],
      travel: [-0.3, -0.15],
      enter: [-0.12, -0.05],
      finance: [-0.08, -0.03],
    },
  },
  {
    id: 'thaad',
    name: '사드 갈등·한한령',
    year: '2016~2017',
    tone: 'bad',
    blurb:
      '사드 배치를 둘러싸고 중국과 갈등이 생겨, 한국의 연예·관광·자동차 산업이 중국에서 어려움을 겪었어요.',
    effects: {
      enter: [-0.38, -0.18],
      travel: [-0.28, -0.12],
      auto: [-0.18, -0.08],
    },
  },
  {
    id: 'chip-supercycle',
    name: '반도체 슈퍼사이클',
    year: '2017~2018',
    tone: 'good',
    blurb:
      '전 세계 데이터센터와 스마트폰이 메모리칩을 쓸어 담으면서 반도체 값이 치솟았어요.',
    effects: {
      semi: [0.35, 0.6],
      finance: [0.05, 0.12],
    },
  },
  {
    id: 'peace-summit',
    name: '남북·북미 정상회담',
    year: '2018',
    tone: 'mixed',
    blurb:
      '남북 정상이 판문점에서 만나고 북미 정상회담까지 이어지면서 평화에 대한 기대가 커졌어요.',
    effects: {
      defense: [-0.28, -0.12],
      travel: [0.08, 0.2],
      finance: [0.04, 0.1],
    },
  },
  {
    id: 'hallyu-wave',
    name: '한류 열풍',
    year: '2018~2020',
    tone: 'good',
    blurb: '한국 가수가 빌보드 1위에 오르고, 한국 영화가 세계 최고 영화제를 휩쓸었어요.',
    effects: {
      enter: [0.25, 0.5],
    },
  },
  {
    id: 'trade-war',
    name: '미중 무역전쟁',
    year: '2018~2019',
    tone: 'bad',
    blurb:
      '미국과 중국이 서로 관세를 올리며 맞서자, 수출로 먹고사는 나라들의 기업이 힘들어졌어요.',
    effects: {
      semi: [-0.28, -0.12],
      auto: [-0.18, -0.08],
      chem: [-0.12, -0.05],
      finance: [-0.12, -0.05],
    },
  },
  {
    id: 'jp-export-curb',
    name: '일본 수출규제',
    year: '2019',
    tone: 'mixed',
    blurb:
      '일본이 반도체 핵심 소재의 수출을 막자, 한국 기업들이 소재를 직접 만드는 국산화에 뛰어들었어요.',
    effects: {
      semi: [0.08, 0.25],
    },
  },
  {
    id: 'covid',
    name: '코로나19',
    year: '2020',
    tone: 'bad',
    blurb:
      '새로운 감염병이 전 세계로 퍼져 하늘길이 막히고 일상이 멈췄어요. 많은 사람들이 서로를 지키기 위해 애썼어요.',
    effects: {
      bio: [0.35, 0.7],
      semi: [0.05, 0.15],
      travel: [-0.5, -0.3],
      chem: [-0.32, -0.15],
      enter: [-0.25, -0.12],
      finance: [-0.22, -0.12],
      auto: [-0.18, -0.08],
    },
  },
  {
    id: 'ant-rally',
    name: '동학개미·제로금리',
    year: '2020',
    tone: 'good',
    blurb:
      '금리가 거의 0이 되자, 개인 투자자들이 역사상 가장 뜨겁게 주식시장으로 몰려들었어요.',
    effects: {
      finance: [0.18, 0.35],
      semi: [0.12, 0.25],
      auto: [0.08, 0.2],
      bio: [0.08, 0.2],
      enter: [0.08, 0.2],
      chem: [0.05, 0.12],
      travel: [0.05, 0.12],
      defense: [0.03, 0.08],
    },
  },
] as const;

export function getEvent(id: string): GameEvent {
  const event = EVENTS.find((e) => e.id === id);
  if (!event) throw new Error(`없는 이벤트다: ${id}`);
  return event;
}
