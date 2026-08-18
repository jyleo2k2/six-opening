import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
  },
  // public 정적 파일은 기본이 max-age=0이라 터널 시연에서 접속자마다 로고·폰트
  // 전체가 원본 회선을 다시 탄다. 하루 캐시로 브라우저·엣지가 재사용하게 한다.
  // 화면이 쓰는 유니버스 데이터는 /api/universe 라우트라 이 캐시의 영향이 없다.
  async headers() {
    return [
      {
        source: "/ui/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
