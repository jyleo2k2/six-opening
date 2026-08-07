/** 게임 화면 전용 포맷터 — 컴프 사양(만 단위 축약) */
export const fmtW = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`;

export const fmtM = (v: number) => {
  const man = v / 10_000;
  return `${man >= 100 ? Math.round(man).toLocaleString('ko-KR') : man.toFixed(1)}만`;
};

export const pctStr = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

/** 상승 빨강 · 하락 파랑 (국내 관습) — 컴프 팔레트 */
export const pctColor = (v: number) => (v > 0.005 ? '#ff5c6e' : v < -0.005 ? '#5aa9ff' : '#8b93a7');
