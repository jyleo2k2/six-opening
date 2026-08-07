import type { Company } from '../src/types';

/**
 * 실명 16종목 — 8섹터 × 2 (기획서 §7, v2에서 실명 확정).
 * 시작가는 시연 시점 근사가(정적 팩) — 게임은 실시세를 호출하지 않는다.
 * 소개는 사실 서술만. 추천·전망·수익 보장 표현 금지 (콘텐츠 정책).
 */
export const COMPANIES: readonly Company[] = [
  { id: 'sec1', name: '삼성전자', sector: 'semi', basePrice: 71_000, blurb: '반도체와 스마트폰을 만드는 국내 최대 전자 기업' },
  { id: 'sec2', name: 'SK하이닉스', sector: 'semi', basePrice: 178_000, blurb: '메모리 반도체 전문 기업' },
  { id: 'ent1', name: '하이브', sector: 'ent', basePrice: 205_000, blurb: 'BTS가 소속된 엔터테인먼트 회사' },
  { id: 'ent2', name: 'JYP', sector: 'ent', basePrice: 68_000, blurb: '트와이스·스트레이키즈의 소속사' },
  { id: 'net1', name: '네이버', sector: 'net', basePrice: 195_000, blurb: '검색·쇼핑·웹툰을 운영하는 인터넷 회사' },
  { id: 'net2', name: '카카오', sector: 'net', basePrice: 48_000, blurb: '카카오톡을 만드는 회사' },
  { id: 'trv1', name: '대한항공', sector: 'trv', basePrice: 23_000, blurb: '우리나라 대표 항공사' },
  { id: 'trv2', name: '하나투어', sector: 'trv', basePrice: 58_000, blurb: '해외 패키지 여행 1위 여행사' },
  { id: 'bio1', name: '셀트리온', sector: 'bio', basePrice: 182_000, blurb: '바이오 의약품을 개발하는 회사' },
  { id: 'bio2', name: '삼성바이오로직스', sector: 'bio', basePrice: 780_000, blurb: '의약품을 대신 생산해 주는 회사' },
  { id: 'cos1', name: '아모레퍼시픽', sector: 'cos', basePrice: 82_000, blurb: '설화수 등을 만드는 화장품 회사' },
  { id: 'cos2', name: 'LG생활건강', sector: 'cos', basePrice: 310_000, blurb: '화장품과 생활용품을 만드는 회사' },
  { id: 'car1', name: '현대차', sector: 'car', basePrice: 210_000, blurb: '우리나라 대표 자동차 회사' },
  { id: 'car2', name: '기아', sector: 'car', basePrice: 95_000, blurb: '현대차그룹의 자동차 회사' },
  { id: 'bat1', name: 'LG화학', sector: 'bat', basePrice: 320_000, blurb: '전기차 배터리 소재를 만드는 회사' },
  { id: 'bat2', name: '삼성SDI', sector: 'bat', basePrice: 250_000, blurb: '전기차·전자기기용 배터리 회사' },
] as const;

export function getCompany(id: string): Company {
  const company = COMPANIES.find((c) => c.id === id);
  if (!company) throw new Error(`없는 종목이다: ${id}`);
  return company;
}
