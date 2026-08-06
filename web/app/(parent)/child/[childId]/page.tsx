import { Placeholder } from '@/components/ui/Placeholder';

export default async function ChildReportPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;

  return (
    <Placeholder
      title={`자녀 활동 · ${childId}`}
      owner="제안서 트랙 (김설빈·박혜준)"
      todo={[
        '제안서 상세 + 승인/반려 (brokerage.decideProposal)',
        '게임 전적 · 배운 개념 진도',
        '아이가 쓴 이유를 그대로 보여준다 — 요약하거나 대신 판단하지 않는다',
        '승인해도 주문은 나가지 않는다는 점을 화면에서 계속 알린다',
      ]}
    />
  );
}
