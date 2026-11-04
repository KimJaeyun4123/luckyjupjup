import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DhlotteryError, isSaleOpen } from "@/lib/dh/client";
import { DH_ENABLED } from "@/lib/dh/enabled";
import { SESSION_COOKIE, dropSession, getSession, syncSession } from "@/lib/dh/session";
import { normalize } from "@/lib/lotto/features";
import { MAX_GAMES } from "@/lib/lotto/generate";
import { drawDateOfRound, roundForPurchase } from "@/lib/lotto/schedule";

/** '20261024' · '2026/10/24' · '2026.10.24' · '2026-10-24' → '2026-10-24'. 못 읽으면 null */
function toYmdDash(v: string): string | null {
  const m = v.match(/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  try {
    return !!origin && !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * 로그인 세션으로 번호를 산다.
 * confirm 이 없으면 드라이런: 회차·추첨일·예치금·필요 금액만 돌려주고 구매 요청은 보내지 않는다.
 * confirm: true 면 실제로 execBuy 를 보낸다. 돈이 나가는 요청이므로 화면에서 두 번 누르게 되어 있다.
 */
export async function POST(req: Request) {
  if (!DH_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const client = getSession(token);
  if (!client) return NextResponse.json({ error: "동행복권 로그인이 필요합니다." }, { status: 401 });

  let body: { games?: unknown; confirm?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 잘못되었습니다." }, { status: 400 });
  }
  const games = Array.isArray(body.games) ? body.games.map((g) => (Array.isArray(g) ? normalize(g as number[]) : null)) : [];
  if (!games.length || games.length > MAX_GAMES || games.some((g) => g === null)) {
    return NextResponse.json({ error: `1~${MAX_GAMES}게임, 게임마다 1~45 사이 서로 다른 번호 6개여야 합니다.` }, { status: 400 });
  }
  const keys = new Set(games.map((g) => g!.join("-")));
  if (keys.size !== games.length) return NextResponse.json({ error: "같은 번호 조합이 두 번 들어 있습니다." }, { status: 400 });
  const need = games.length * 1000;
  const now = new Date();

  try {
    const balance = await client.balance();
    if (!isSaleOpen(now)) return NextResponse.json({ error: "온라인 판매 시간이 아닙니다 (평일·일 06~24시, 토 06~20시)." }, { status: 409 });
    if (balance < need) return NextResponse.json({ error: `예치금이 부족합니다. 현재 ${balance.toLocaleString("ko-KR")}원, 필요 ${need.toLocaleString("ko-KR")}원.`, balance, need }, { status: 409 });
    const reqs = await client.buyRequirements();
    syncSession(token, client);
    const round = reqs.round ?? roundForPurchase(now);
    // 구매 요청에는 사이트가 준 값을 그대로 보내고, 화면에는 YYYY-MM-DD 로 바꿔 보여 준다
    const drawDateRaw = reqs.drawDate ?? drawDateOfRound(round);
    const drawDate = toYmdDash(drawDateRaw) ?? drawDateOfRound(round);
    const payDeadline = reqs.payDeadline ?? (() => {
      const d = new Date(drawDate);
      d.setUTCDate(d.getUTCDate() + 366);
      return d.toISOString().slice(0, 10);
    })();
    if (drawDate !== drawDateOfRound(round)) console.warn("[dh/buy] 추첨일 불일치", { round, drawDateRaw, expected: drawDateOfRound(round) });

    if (!body.confirm) {
      return NextResponse.json({ dryRun: true, round, drawDate, balance, need, games });
    }

    const bought = await client.buyManual(games as number[][], round, drawDateRaw, payDeadline, reqs.direct);
    let balanceAfter: number | null = null;
    try {
      balanceAfter = await client.balance();
    } catch {
      // 잔액 재조회 실패는 구매 성공을 바꾸지 않는다
    }
    const result = (bought.raw as { result?: Record<string, unknown> })?.result ?? {};
    const receipt = { buyRound: result.buyRound, issueDay: result.issueDay, issueTime: result.issueTime, barCode: [1, 2, 3, 4, 5, 6].map((i) => result[`barCode${i}`]).filter(Boolean).join(" ") || undefined };
    console.log("[dh/buy] 구매 완료", { round: bought.round, games: bought.games.length, amount: bought.amount });
    return NextResponse.json({ ok: true, round: bought.round, games: bought.games, amount: bought.amount, balanceAfter, receipt });
  } catch (e) {
    if (e instanceof DhlotteryError) {
      if (e.kind === "login") {
        dropSession(token);
        jar.delete(SESSION_COOKIE);
        return NextResponse.json({ error: "동행복권 세션이 끝났습니다. 다시 로그인하세요." }, { status: 401 });
      }
      console.error("[dh/buy]", e.kind, e.message, e.raw ? JSON.stringify(e.raw).slice(0, 1500) : "");
      return NextResponse.json({ error: e.message, kind: e.kind }, { status: e.kind === "limit" ? 409 : 502 });
    }
    console.error("[dh/buy]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "구매하지 못했습니다." }, { status: 502 });
  }
}
