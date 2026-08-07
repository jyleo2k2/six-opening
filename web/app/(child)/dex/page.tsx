import { SECTORS, SECTOR_LABEL } from 'game';
import { COMPANIES } from 'game/data';
import { won } from '@/lib/format';

/**
 * 도감 — 게임 속 회사들 (익명 가상 회사, 기획서 §7.1).
 * 어떤 회사가 어느 섹터인지 아는 것이 곧 게임 실력이다.
 * 실제 종목 정보는 계좌 홈 → 종목 상세에서 본다.
 */
export default function DexPage() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">회사 도감</h1>
        <p className="mt-1 text-sm text-neutral-500">
          게임 속 회사들이에요. 같은 사건에도 섹터마다 다르게 반응해요 — 어떤 회사가 어느
          섹터인지 알아두면 게임이 쉬워져요.
        </p>
      </header>

      {SECTORS.map((sector) => {
        const companies = COMPANIES.filter((c) => c.sector === sector);
        if (companies.length === 0) return null;

        return (
          <section key={sector} className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold text-neutral-500">
              {SECTOR_LABEL[sector]}
            </h2>
            {companies.map((company) => (
              <div key={company.id} className="rounded-xl border border-neutral-200 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">{company.name}</p>
                  <p className="text-sm text-neutral-600">{won(company.basePrice)}</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">{company.blurb}</p>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
