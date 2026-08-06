import { MARKET_CURRENCY, SECTOR_LABEL } from 'game';
import { STOCK_CARDS } from 'game/data';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { money } from '@/lib/format';

/**
 * 종목 상세 — 게임에서 만난 회사를 실제 종목으로 이어주는 화면.
 * TODO(제안서 트랙): 차트·기업정보 확장. 지금은 카드 데이터만 보여준다.
 */
export default async function StockPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = STOCK_CARDS.find((c) => c.ticker === code);
  if (!card) notFound();

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-xs text-neutral-500">
          {card.ticker} · {SECTOR_LABEL[card.sector]}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{card.name}</h1>
        <p className="mt-1 text-xl font-semibold">
          {money(card.basePrice, MARKET_CURRENCY[card.market])}
        </p>
      </header>

      <section className="rounded-xl bg-neutral-50 p-4">
        <p className="leading-relaxed">{card.blurb}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {card.keywords.map((k) => (
            <span key={k} className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">
              #{k}
            </span>
          ))}
        </div>
      </section>

      <Link
        href={`/proposal/new?ticker=${card.ticker}`}
        className="rounded-xl bg-amber-400 py-4 text-center font-semibold transition active:scale-[0.99]"
      >
        부모님께 제안하기
      </Link>
    </div>
  );
}
