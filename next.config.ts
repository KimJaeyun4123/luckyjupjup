import type { NextConfig } from "next";

// 결과결(gyulngyul)과 같은 사이트의 /lotto 아래에서 서비스한다. 결과결 쪽 next.config의 rewrites가 /lotto/* 를 이 배포로 넘긴다
const nextConfig: NextConfig = {
  basePath: "/lotto",
  cacheComponents: true,
  partialPrefetching: true,
  // 이 배포를 단독 주소로 열면 /lotto 로 보낸다
  redirects: async () => [{ source: "/", destination: "/lotto", basePath: false, permanent: false }],
};

export default nextConfig;
