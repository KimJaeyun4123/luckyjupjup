import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { DhMe } from "@/lib/dh/api";
import { DhlotteryError, ymdKst } from "@/lib/dh/client";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { SESSION_COOKIE, dropSession, getSession, maskId, syncSession } from "@/lib/dh/session";

const dash = (ymd: string) => `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;

/** 예치금과 최근 구매내역. 로그인 세션이 없으면 401 */
export async function GET(req: Request) {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const client = getSession(token);
  if (!client) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days") ?? 30) || 30));
  const now = new Date();
  const from = ymdKst(new Date(now.getTime() - days * 86400000));
  const to = ymdKst(now);
  try {
    const [balance, ledger] = await Promise.all([client.balance(), client.ledger(from, to)]);
    syncSession(token, client);
    if (process.env.NODE_ENV !== "production") {
      // 개발 중 응답 구조 확인용. 금액·번호는 찍지 않는다
      console.log("[dh/me]", { balanceType: typeof balance, ledgerCount: ledger.length, ledgerKeys: ledger[0] ? Object.keys(ledger[0]) : [], from, to });
    }
    const body: DhMe = { userId: maskId(client.userId), balance, ledger, from: dash(from), to: dash(to) };
    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof DhlotteryError && e.kind === "login") {
      dropSession(token);
      jar.delete(SESSION_COOKIE);
      return NextResponse.json({ error: "동행복권 세션이 끝났습니다. 다시 로그인하세요." }, { status: 401 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "불러오지 못했습니다." }, { status: 502 });
  }
}
