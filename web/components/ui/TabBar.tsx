'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 자녀 영웅문 하단 탭바 — 이 앱이 "자녀가 쓰는 MTS"임을 만드는 장치다.
 * 게임은 별도 앱이 아니라 탭 하나다(기술스택 §2.1).
 *
 * ⚠ 공유 핫스팟. 탭 추가·순서 변경은 통합 오너 PR로만 처리한다.
 */
const TABS = [
  { href: '/home', label: '홈' },
  { href: '/game', label: '게임' },
  { href: '/dex', label: '도감' },
  { href: '/news', label: '뉴스' },
  { href: '/proposal/new', label: '제안' },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 grid grid-cols-5 border-t border-neutral-200 bg-white/95 backdrop-blur">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href.split('/').slice(0, 2).join('/'));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`py-3 text-center text-xs font-medium transition ${
              active ? 'text-neutral-900' : 'text-neutral-400'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
