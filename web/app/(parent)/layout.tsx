import Link from 'next/link';

/**
 * 부모 뷰.
 * 실서비스에서는 진짜 영웅문 안에서 열린다. 시연에서는 브라우저 시크릿 창으로 띄운다.
 *
 * TODO(T3): 자녀 세션과 섞이지 않게 role 분리 방식 확정.
 */
export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="phone-shell">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <Link href="/inbox" className="font-bold tracking-tight">
          키즈:키움 <span className="text-neutral-400">부모</span>
        </Link>
        <Link href="/onboarding" className="text-xs text-neutral-500">
          자녀 관리
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
