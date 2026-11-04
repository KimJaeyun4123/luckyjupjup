import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DhlotteryError, ymdKst } from "@/lib/dh/client";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { SESSION_COOKIE, getSession, syncSession } from "@/lib/dh/session";

/** 구매내역 한 건의 티켓(게임별 번호·등수). ntslOrdrNo·barcd 는 /api/dh/me 의 ledger 항목에서 온다 */
export async function GET(req: Request) {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const client = getSession(token);
  if (!client) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const u = new URL(req.url);
  const ntslOrdrNo = u.searchParams.get("ntslOrdrNo") ?? "";
  const barcd = u.searchParams.get("barcd") ?? "";
  const days = Math.min(90, Math.max(1, Number(u.searchParams.get("days") ?? 90) || 90));
  if (!/^\d{6,30}$/.test(ntslOrdrNo) || !/^\d{30}$/.test(barcd)) return NextResponse.json({ error: "주문번호·바코드가 올바르지 않습니다." }, { status: 400 });
  const now = new Date();
  try {
    const ticket = await client.ticket(ntslOrdrNo, barcd, ymdKst(new Date(now.getTime() - days * 86400000)), ymdKst(now));
    syncSession(token, client);
    return NextResponse.json({ ticket });
  } catch (e) {
    const status = e instanceof DhlotteryError && e.kind === "login" ? 401 : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : "티켓을 불러오지 못했습니다." }, { status });
  }
}
