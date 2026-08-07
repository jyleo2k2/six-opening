import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * game 워크스페이스는 빌드된 dist가 아니라 TS 소스를 그대로 export한다.
   * 룰을 한 줄 고치면 web에 즉시 반영되게 하려는 의도적 선택이다(빌드 단계 제거).
   */
  transpilePackages: ['game'],
  /**
   * next dev가 AGENTS.md에 자동 블록을 덧붙이는 기능 차단.
   * web/AGENTS.md는 하네스 파일이고 통합 오너만 수정한다 (루트 AGENTS.md §동기화) —
   * 팀원 dev 실행마다 워킹트리가 더러워지면 세션 관제(클린 검사)가 깨진다.
   */
  agentRules: false,
};

export default nextConfig;
