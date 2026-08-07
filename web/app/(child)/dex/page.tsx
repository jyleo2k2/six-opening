import { COMPANIES, SECTOR_INFOS } from 'game/data';
import { won } from '@/lib/format';

/**
 * 도감 — 게임에 나오는 8섹터 × 실명 16종목 (기획서 §7).
 * 어떤 섹터가 언제 웃고 우는지 아는 것이 곧 게임 실력이다.
 */
export default function DexPage() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">회사 도감</h1>
        <p className="mt-1 text-sm text-neutral-500">
          같은 사건에도 섹터마다 다르게 반응해요. 게임 전에 예습하면 이길 확률이 올라가요.
        </p>
      </header>

      {SECTOR_INFOS.map((sector) => {
        const companies = COMPANIES.filter((c) => c.sector === sector.id);
        return (
          <section key={sector.id} className="flex flex-col gap-2">
            <div className="px-1">
              <h2 className="text-sm font-semibold">
                {sector.emoji} {sector.name}
              </h2>
              <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                <span className="text-red-500">▲ {sector.up}</span>
                {' · '}
                <span className="text-blue-500">▼ {sector.down}</span>
              </p>
            </div>
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
