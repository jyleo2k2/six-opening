import { SECTORS, SECTOR_LABEL, MARKET_CURRENCY } from 'game';
import { STOCK_CARDS } from 'game/data';
import Link from 'next/link';
import { money } from '@/lib/format';

/**
 * 도감 — 게임 카드 = 실제 회사. 섹터별로 묶어 보여준다.
 * 게임·계좌·도감이 같은 카드 풀(game/data)을 쓰는 것이 이 제품의 연결고리다.
 */
export default function DexPage() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">회사 도감</h1>
        <p className="mt-1 text-sm text-neutral-500">
          같은 뉴스에도 섹터마다 다르게 반응해요. 어떤 회사가 어느 섹터인지 알아두세요.
        </p>
      </header>

      {SECTORS.map((sector) => {
        const cards = STOCK_CARDS.filter((c) => c.sector === sector);
        if (cards.length === 0) return null;

        return (
          <section key={sector} className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold text-neutral-500">
              {SECTOR_LABEL[sector]}
            </h2>
            {cards.map((card) => (
              <Link
                key={card.id}
                href={`/stock/${card.ticker}`}
                className="rounded-xl border border-neutral-200 p-4 transition active:scale-[0.99]"
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">{card.name}</p>
                  <p className="text-sm text-neutral-600">
                    {money(card.basePrice, MARKET_CURRENCY[card.market])}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">{card.blurb}</p>
              </Link>
            ))}
          </section>
        );
      })}
    </div>
  );
}
