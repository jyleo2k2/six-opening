import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findStock } from '@/lib/brokerage/mock/fixtures';
import { won } from '@/lib/format';

/**
 * 종목 상세 — 실제 종목(mock 카탈로그)을 보여주고 제안서로 이어주는 화면.
 * TODO(제안서 트랙): 차트·기업정보 확장. 지금은 mock 데이터만 보여준다.
 */
export default async function StockPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const stock = findStock(code);
  if (!stock) notFound();

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-xs text-neutral-500">
          {stock.ticker} · {stock.sector}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{stock.name}</h1>
        <p className="mt-1 text-xl font-semibold">{won(stock.price)}</p>
      </header>

      <section className="rounded-xl bg-neutral-50 p-4">
        <p className="leading-relaxed">{stock.blurb}</p>
      </section>

      <Link
        href={`/proposal/new?ticker=${stock.ticker}`}
        className="rounded-xl bg-amber-400 py-4 text-center font-semibold transition active:scale-[0.99]"
      >
        부모님께 제안하기
      </Link>
    </div>
  );
}
