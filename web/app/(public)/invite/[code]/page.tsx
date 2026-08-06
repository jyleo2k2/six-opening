import { Placeholder } from '@/components/ui/Placeholder';

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return (
    <div className="phone-shell">
      <Placeholder
        title={`초대코드 ${code}`}
        owner="통합 오너 (이재용)"
        todo={[
          '코드 검증 → 자녀 세션 생성 → 닉네임 입력 → /home',
          '이메일·전화번호를 묻지 않는다 (기술스택 §7.1)',
          '유효하지 않은 코드 · 만료 처리',
        ]}
      />
    </div>
  );
}
