import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * game 워크스페이스는 빌드된 dist가 아니라 TS 소스를 그대로 export한다.
   * 룰을 한 줄 고치면 web에 즉시 반영되게 하려는 의도적 선택이다(빌드 단계 제거).
   */
  transpilePackages: ['game'],
};

export default nextConfig;
