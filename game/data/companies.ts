import type { Company } from '../src/types';

/**
 * 종목 16 — 8섹터 × 2 (기획서 §7.1).
 *
 * 전부 익명 가상 회사다. 실존 기업명·티커·상표 연상 네이밍 금지 (game/AGENTS.md).
 * 시작가는 5,000~100,000원 — 시드 100만원으로 최저가 ~120주, 최고가 ~11주가 잡히는 스케일.
 * 소개 문구는 아이 눈높이 편집 텍스트라 검수 대상이다. 문구 확장은 트랙 ③ 공급 · 트랙 ① 승인.
 */
export const COMPANIES: readonly Company[] = [
  // 반도체/IT
  {
    id: 'hanbit-semi',
    name: '한빛반도체',
    sector: 'semi',
    basePrice: 86_000,
    blurb: '컴퓨터와 스마트폰의 두뇌가 되는 메모리칩을 만들어요.',
  },
  {
    id: 'mir-chips',
    name: '미르칩스',
    sector: 'semi',
    basePrice: 41_000,
    blurb: '게임기와 서버에 들어가는 특수 칩을 설계해요.',
  },
  // 자동차
  {
    id: 'dallim-motors',
    name: '달림모터스',
    sector: 'auto',
    basePrice: 62_000,
    blurb: '국민 승용차부터 전기차까지 만드는 완성차 회사예요.',
  },
  {
    id: 'burung-auto',
    name: '부릉오토',
    sector: 'auto',
    basePrice: 23_500,
    blurb: '자동차 부품을 만들어 완성차 회사에 납품해요.',
  },
  // 정유/화학
  {
    id: 'bulkkot-oil',
    name: '불꽃정유',
    sector: 'chem',
    basePrice: 54_000,
    blurb: '원유를 들여와 휘발유·경유로 정제해서 팔아요.',
  },
  {
    id: 'mujigae-chem',
    name: '무지개화학',
    sector: 'chem',
    basePrice: 33_000,
    blurb: '플라스틱과 배터리 소재의 원료를 만들어요.',
  },
  // 바이오/제약
  {
    id: 'tuntun-pharm',
    name: '튼튼제약',
    sector: 'bio',
    basePrice: 28_000,
    blurb: '감기약부터 백신까지 만드는 제약 회사예요.',
  },
  {
    id: 'saessak-bio',
    name: '새싹바이오',
    sector: 'bio',
    basePrice: 11_500,
    blurb: '새로운 치료제 개발에 도전하는 바이오 벤처예요.',
  },
  // 항공/여행
  {
    id: 'gureum-air',
    name: '구름항공',
    sector: 'travel',
    basePrice: 17_500,
    blurb: '해외 여러 도시로 비행기를 띄우는 항공사예요.',
  },
  {
    id: 'sopung-tour',
    name: '소풍여행',
    sector: 'travel',
    basePrice: 8_200,
    blurb: '패키지 여행 상품을 파는 여행사예요.',
  },
  // 엔터/콘텐츠
  {
    id: 'dudung-ent',
    name: '두둥엔터',
    sector: 'enter',
    basePrice: 36_000,
    blurb: '아이돌 그룹을 키우고 콘서트를 여는 기획사예요.',
  },
  {
    id: 'kkumnamu-studio',
    name: '꿈나무스튜디오',
    sector: 'enter',
    basePrice: 14_000,
    blurb: '드라마와 예능을 만드는 제작사예요.',
  },
  // 방산
  {
    id: 'bangpae-heavy',
    name: '방패중공업',
    sector: 'defense',
    basePrice: 47_000,
    blurb: '나라를 지키는 미사일과 장갑차를 만들어요.',
  },
  {
    id: 'maeeye-precision',
    name: '매의눈정밀',
    sector: 'defense',
    basePrice: 31_500,
    blurb: '하늘과 바다를 살피는 레이더와 감시 장비를 만들어요.',
  },
  // 은행/금융
  {
    id: 'deundeun-bank',
    name: '든든은행',
    sector: 'finance',
    basePrice: 9_900,
    blurb: '예금을 받고 대출을 해주는 시중은행이에요.',
  },
  {
    id: 'hwaljjak-sec',
    name: '활짝증권',
    sector: 'finance',
    basePrice: 15_500,
    blurb: '사람들이 주식을 사고팔 수 있게 도와주는 증권사예요.',
  },
] as const;

export function getCompany(id: string): Company {
  const company = COMPANIES.find((c) => c.id === id);
  if (!company) throw new Error(`없는 종목이다: ${id}`);
  return company;
}
