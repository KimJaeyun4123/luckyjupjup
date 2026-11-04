import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { WWW } from "@/lib/dh/client";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { SESSION_COOKIE, getSession } from "@/lib/dh/session";

/**
 * 개발 전용: 로그인 세션으로 동행복권 페이지를 받아 그 안의 엔드포인트 목록과 키워드 주변 코드만 돌려준다
 * (사이트 구조를 파악할 때 쓴다. 본문·개인정보는 돌려주지 않는다). 프로덕션에서는 없다.
 */
export async function GET(req: Request) {
  if (!DH_ENABLED || process.env.NODE_ENV === "production") return NextResponse.json({ error: "not found" }, { status: 404 });
  const client = getSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!client) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const u = new URL(req.url);
  const path = u.searchParams.get("path") ?? "/mypage/mylotteryledger";
  const keys = (u.searchParams.get("keys") ?? "ntslOrdrNo,Detail,detail,gmInfo,barCode,winQr").split(",");
  if (!path.startsWith("/")) return NextResponse.json({ error: "path" }, { status: 400 });
  const res = await client.http.get(`${WWW}${path}`, { Referer: `${WWW}/mypage/home` });
  const endpoints = [...new Set(res.text.match(/["'](\/[A-Za-z0-9_/.-]+\.(?:do|json))["']/g) ?? [])].map((s) => s.slice(1, -1));
  const snippets: Record<string, string[]> = {};
  for (const k of keys) {
    const out: string[] = [];
    let i = -1;
    while ((i = res.text.indexOf(k, i + 1)) >= 0 && out.length < 6) out.push(res.text.slice(Math.max(0, i - 220), i + 220).replace(/\s+/g, " "));
    if (out.length) snippets[k] = out;
  }
  return NextResponse.json({ status: res.status, url: res.url, length: res.text.length, endpoints, snippets });
}
