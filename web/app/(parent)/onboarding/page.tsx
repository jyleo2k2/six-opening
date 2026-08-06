import { Placeholder } from '@/components/ui/Placeholder';

/**
 * 자녀 프로필 생성 · 초대코드 발급.
 * 만 14세 미만 개인정보 수집은 법정대리인 동의가 필수다(개인정보보호법 §22-2).
 * 자녀가 스스로 계정을 만드는 흐름은 만들지 않는다 — 기술스택 §7.1.
 */
export default function OnboardingPage() {
  return (
    <Placeholder
      title="자녀 등록"
      owner="통합 오너 (이재용)"
      todo={[
        '부모 본인인증 → 자녀 프로필 생성 → 법정대리인 동의 → 초대코드 발급',
        '자녀에게서 이메일·전화번호를 수집하지 않는다. 닉네임 + 부모 FK만 저장',
        '자녀는 /invite/<코드> 로 진입해 닉네임만 입력하고 시작',
        '이 동의 흐름 자체가 시연 포인트다 — 규제 대응을 화면으로 보여준다',
      ]}
    />
  );
}
