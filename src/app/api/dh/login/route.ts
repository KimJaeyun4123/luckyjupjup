import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Dhlottery, DhlotteryError } from "@/lib/dh/client";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { SESSION_COOKIE, dropSession, putSession } from "@/lib/dh/session";

/** 같은 사이트에서 온 요청만 받는다 */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: { id?: string; pw?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 잘못되었습니다." }, { status: 400 });
  }
  const id = body.id?.trim();
  const pw = body.pw ?? "";
  if (!id || !pw) return NextResponse.json({ error: "아이디와 비밀번호를 입력하세요." }, { status: 400 });

  const jar = await cookies();
  dropSession(jar.get(SESSION_COOKIE)?.value);
  const client = new Dhlottery(id, pw);
  try {
    await client.login();
    const balance = await client.balance();
    const token = putSession(client);
    jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 60 });
    return NextResponse.json({ ok: true, balance });
  } catch (e) {
    // 네트워크 오류(fetch failed)는 원인을 서버 로그에 남긴다
    if (!(e instanceof DhlotteryError)) console.error("[dh/login]", e, (e as { cause?: unknown })?.cause);
    else if (e.raw) console.error("[dh/login]", e.kind, JSON.stringify(e.raw).slice(0, 1500));
    const status = e instanceof DhlotteryError && e.kind === "login" ? 401 : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : "로그인하지 못했습니다.", kind: e instanceof DhlotteryError ? e.kind : "unknown" }, { status });
  }
}
