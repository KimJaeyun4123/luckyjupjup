import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gyulngyul.vercel.app/lotto";

/** 결과·내 번호 화면은 각 페이지의 noindex 로 뺀다. API 가 생기면 여기서 막는다 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
