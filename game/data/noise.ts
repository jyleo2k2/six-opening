import type { NoiseNews } from '../src/types';

/**
 * 배경 노이즈 뉴스 — 사실이지만 사건과 무관 (기획서 §3.1).
 * 진짜 전조 2명 외의 플레이어가 받는다. 사건의 clueSector와 같은 섹터는 배달에서 제외된다.
 */
export const NOISE_NEWS: readonly NoiseNews[] = [
  { sector: 'semi', text: '반도체 학회에서 신기술 논문이 대거 발표됐습니다.' },
  { sector: 'ent', text: '대형 아이돌 그룹의 컴백 일정이 공개됐습니다.' },
  { sector: 'net', text: '게임사들이 잇따라 신작 발표회를 열었습니다.' },
  { sector: 'trv', text: '대규모 여행 박람회가 다음 달 열립니다.' },
  { sector: 'bio', text: '제약사들이 연구 인력을 크게 늘리고 있습니다.' },
  { sector: 'cos', text: '백화점마다 신상 화장품 라인이 출시됐습니다.' },
  { sector: 'car', text: '자동차 부품 전시회가 성황리에 개막했습니다.' },
  { sector: 'bat', text: '배터리 공장 견학 프로그램이 인기라고 합니다.' },
] as const;
