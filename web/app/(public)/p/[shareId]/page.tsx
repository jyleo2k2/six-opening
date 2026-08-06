import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { brokerage } from '@/lib/brokerage/mock/adapter';
import { CHILD_ACCOUNT } from '@/lib/brokerage/mock/fixtures';

/**
 * 제안서 공유 링크 — 자녀가 메신저로 부모에게 보낸다.
 *
 * **이 페이지가 Next.js를 고른 이유다.** 링크 미리보기(OG)를 만들려면 서버에서
 * 메타 태그를 렌더해야 하고, CSR SPA로는 불가능하다(기술스택 §5).
 */
async function findProposal(shareId: string) {
  const proposals = await brokerage.listProposals(CHILD_ACCOUNT.id);
  return proposals.find((p) => p.id === shareId);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const proposal = await findProposal(shareId);
  if (!proposal) return { title: '키즈:키움' };

  const title = `${proposal.name} ${proposal.qty}주를 사고 싶어요`;
  return {
    title,
    description: proposal.reason,
    openGraph: { title, description: proposal.reason, type: 'article' },
  };
}

export default async function SharedProposalPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const proposal = await findProposal(shareId);
  if (!proposal) notFound();

  return (
    <div className="phone-shell justify-center gap-4 p-6">
      <p className="text-sm text-neutral-500">자녀가 보낸 투자 제안서</p>
      <h1 className="text-2xl font-bold tracking-tight">
        {proposal.name} {proposal.qty}주를 사고 싶어요
      </h1>

      <section className="rounded-xl bg-neutral-50 p-4">
        <p className="leading-relaxed">{proposal.reason}</p>
      </section>

      <a
        href="/inbox"
        className="rounded-xl bg-neutral-900 py-4 text-center font-semibold text-white"
      >
        앱에서 확인하기
      </a>

      <p className="text-[11px] leading-relaxed text-neutral-400">
        이 앱은 종목을 추천하지 않으며 주문을 실행하지 않습니다. 제안한 사람은 자녀입니다.
      </p>
    </div>
  );
}
