import { MARKET_CURRENCY } from 'game';
import Link from 'next/link';
import { brokerage } from '@/lib/brokerage/mock/adapter';
import { CHILD_ACCOUNT } from '@/lib/brokerage/mock/fixtures';
import { money, pnlClass, rate, won } from '@/lib/format';

/**
 * 계좌 홈 — 자녀 실계좌 (b) 시나리오의 얼굴.
 * 조회만 한다. 주문 버튼은 없고, 대신 '부모님께 제안하기'로 빠진다(lib/brokerage/port.ts).
 */
export default async function HomePage() {
  const account = await brokerage.getAccount(CHILD_ACCOUNT.id);

  const holdingsKRW = account.holdings.reduce((sum, h) => {
    const value = h.price * h.qty;
    return sum + (h.market === 'KR' ? value : value * account.fxRate);
  }, 0);
  const total = account.cash.KRW + account.cash.USD * account.fxRate + holdingsKRW;

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className="rounded-2xl bg-neutral-900 p-5 text-white">
        <p className="text-sm text-neutral-300">{account.ownerName}님의 총자산</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{won(total)}</p>
        <p className="mt-3 text-xs text-neutral-400">
          현금 {won(account.cash.KRW)} · ${account.cash.USD.toLocaleString()}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-neutral-500">내가 가진 회사</h2>

        {account.holdings.map((h) => {
          const currency = MARKET_CURRENCY[h.market];
          return (
            <Link
              key={h.ticker}
              href={`/stock/${h.ticker}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 transition active:scale-[0.99]"
            >
              <div>
                <p className="font-semibold">{h.name}</p>
                <p className="text-xs text-neutral-500">
                  {h.qty}주 · 평균 {money(h.avgCost, currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{money(h.price * h.qty, currency)}</p>
                <p className={`text-xs font-medium ${pnlClass(h.price, h.avgCost)}`}>
                  {rate(h.price, h.avgCost)}
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      <Link
        href="/proposal/new"
        className="rounded-xl bg-amber-400 py-4 text-center font-semibold text-neutral-900 transition active:scale-[0.99]"
      >
        부모님께 제안하기
      </Link>

      <p className="px-1 text-[11px] leading-relaxed text-neutral-400">
        이 화면은 조회 전용이에요. 사고파는 건 부모님이 직접 하세요.
      </p>
    </div>
  );
}
