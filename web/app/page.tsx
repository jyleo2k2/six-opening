import Link from 'next/link';

/**
 * 진입점 — 시연에서 브라우저 2창(자녀 / 부모)을 띄우는 출발점이다.
 *
 * TODO(T3): 실제로는 로그인 세션의 role로 자동 분기한다.
 *   시연에서 세션이 섞이지 않도록 부모 창은 시크릿 창으로 여는 것을 전제로 한다.
 */
export default function Home() {
  return (
    <main className="phone-shell justify-center gap-4 p-6">
      <div className="mb-2">
        <p className="text-sm font-medium text-neutral-500">키움증권</p>
        <h1 className="text-3xl font-bold tracking-tight">키즈:키움</h1>
        <p className="mt-2 text-neutral-600">
          게임으로 배우고, 부모님께 제안하는 자녀용 증권 앱
        </p>
      </div>

      <Link
        href="/home"
        className="rounded-2xl bg-neutral-900 px-5 py-4 text-white transition active:scale-[0.98]"
      >
        <span className="block text-lg font-semibold">자녀로 시작하기</span>
        <span className="block text-sm text-neutral-300">내 계좌 · 게임 · 도감 · 제안서</span>
      </Link>

      <Link
        href="/inbox"
        className="rounded-2xl border border-neutral-300 px-5 py-4 transition active:scale-[0.98]"
      >
        <span className="block text-lg font-semibold">부모로 시작하기</span>
        <span className="block text-sm text-neutral-500">제안서 확인 · 자녀 활동 보기</span>
      </Link>

      <p className="mt-4 text-xs leading-relaxed text-neutral-400">
        시연용 빌드입니다. 계좌 정보는 실제 잔고가 아니며, 이 앱은 주문을 실행하지 않습니다.
      </p>
    </main>
  );
}
