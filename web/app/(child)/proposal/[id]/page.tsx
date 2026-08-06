import { notFound } from 'next/navigation';
import { brokerage } from '@/lib/brokerage/mock/adapter';
import { CHILD_ACCOUNT } from '@/lib/brokerage/mock/fixtures';
import { StatusBadge } from '@/features/proposal/StatusBadge';

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposal = (await brokerage.listProposals(CHILD_ACCOUNT.id)).find((p) => p.id === id);
  if (!proposal) notFound();

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500">{proposal.ticker}</p>
          <h1 className="text-xl font-bold tracking-tight">
            {proposal.name} {proposal.qty}주
          </h1>
        </div>
        <StatusBadge status={proposal.status} />
      </header>

      <section className="rounded-xl bg-neutral-50 p-4">
        <h2 className="text-xs font-semibold text-neutral-500">내가 쓴 이유</h2>
        <p className="mt-2 leading-relaxed">{proposal.reason}</p>
      </section>

      {proposal.parentNote && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-xs font-semibold text-amber-700">부모님 한마디</h2>
          <p className="mt-2 leading-relaxed">{proposal.parentNote}</p>
        </section>
      )}

      <p className="px-1 text-[11px] text-neutral-400">
        승인되면 부모님이 직접 주문하세요. 이 앱은 주문을 실행하지 않아요.
      </p>
    </div>
  );
}
