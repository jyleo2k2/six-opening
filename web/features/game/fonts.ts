import { Noto_Sans_KR, Rajdhani } from 'next/font/google';

/** 영웅키움 게임 화면 전용 폰트 — 숫자는 Rajdhani, 본문은 Noto Sans KR (컴프 사양) */
export const rajdhani = Rajdhani({ weight: ['600', '700'], subsets: ['latin'], variable: '--font-num' });
export const notoKr = Noto_Sans_KR({ weight: ['400', '500', '700', '900'], subsets: ['latin'], variable: '--font-kr' });
