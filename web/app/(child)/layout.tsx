import Link from 'next/link';
import { TabBar } from '@/components/ui/TabBar';

/**
 * 자녀 영웅문 셸.
 * ⚠ 공유 핫스팟 — 상단 바·탭바 변경은 통합 오너 PR로만 처리한다(team-git-policy.md).
 */
export default function ChildLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="phone-shell">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <Link href="/home" className="font-bold tracking-tight">
          키즈:키움
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <TabBar />
    </div>
  );
}
