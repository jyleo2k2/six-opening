import Link from 'next/link';
import { brokerage } from '@/lib/brokerage/mock/adapter';
import { StatusBadge } from '@/features/proposal/StatusBadge';

/**
 * 제안서 인박스 — 부모 뷰의 메인.
 * 승인/반려 액션은 제안서 트랙이 구현한다(brokerage.decideProposal).
 */
export default async function InboxPage() {
  const proposals = await brokerage.listInbox('parent-001');
  const pending = proposals.filter((p) => p.status === 'pending');

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">자녀가 보낸 제안서</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {pending.length > 0 ? `${pending.length}건이 기다리고 있어요` : '새 제안서가 없어요'}
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {proposals.map((proposal) => (
          <li key={proposal.id}>
            <Link
              href={`/child/${proposal.childId}`}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {proposal.name} {proposal.qty}주
                  </p>
                  <p className="text-xs text-neutral-500">{proposal.ticker}</p>
                </div>
                <StatusBadge status={proposal.status} />
              </div>
              <p className="line-clamp-2 text-sm leading-relaxed text-neutral-600">
                “{proposal.reason}”
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="px-1 text-[11px] leading-relaxed text-neutral-400">
        승인해도 주문이 자동으로 나가지 않습니다. 주문은 영웅문에서 직접 하세요.
      </p>
    </div>
  );
}
