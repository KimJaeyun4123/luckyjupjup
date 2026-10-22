import type { MetadataRoute } from "next";
import { DRAWS } from "@/lib/lotto/draws";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gyulngyul.vercel.app/lotto";

export default function sitemap(): MetadataRoute.Sitemap {
  const main = ["", "/pick", "/results", "/numbers", "/stats", "/check", "/about", "/privacy"].map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const rounds = DRAWS.map((d) => ({ url: `${SITE}/results/${d.round}`, changeFrequency: "yearly" as const, priority: 0.4 }));
  const numbers = Array.from({ length: 45 }, (_, i) => ({ url: `${SITE}/numbers/${i + 1}`, changeFrequency: "weekly" as const, priority: 0.5 }));
  return [...main, ...numbers, ...rounds];
}
