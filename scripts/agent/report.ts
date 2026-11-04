/**
 * 토요일 추첨 뒤에 돈다: data/draws.json 에 그 회차가 있으면 저장한 구매 번호의 등수를 계산하고,
 * 동행복권 구매내역(당첨 결과)과 대조해 텔레그램으로 보낸다. 아직 결과가 없으면 종료 코드 3 (다음 예약에서 재시도).
 * 실행: npm run agent:report   (앞서 npm run draws:update 로 새 회차를 받아 둔다)
 */
import { drawByRound } from "../../src/lib/lotto/draws";
import { Dhlottery, type LedgerItem, ymdKst } from "../../src/lib/dh/client";
import { readConfig } from "./env";
import { failureMessage, gameResults, resultMessage } from "./format";
import { loadState, saveState, totals } from "./state";
import { buildNotifier } from "./notify";

function ledgerSummary(items: LedgerItem[], round: number): string {
  const mine = items.filter((it) => Number(it.ltEpsdView) === round);
  if (!mine.length) return "동행복권 구매내역에서 이 회차 주문을 찾지 못했습니다.";
  const won = mine.filter((it) => it.ltWnResult === "당첨");
  const pending = mine.filter((it) => /미추첨|미확인/.test(it.ltWnResult));
  if (pending.length) return `동행복권 구매내역: ${pending.length}건 아직 미확인`;
  const amt = won.reduce((a, it) => a + (it.ltWnAmt ?? 0), 0);
  return `동행복권 구매내역 대조: ${mine.length}건 중 당첨 ${won.length}건${won.length ? `, ${amt.toLocaleString("ko-KR")}원` : ""}`;
}

async function main() {
  const cfg = readConfig();
  const notify = buildNotifier();
  const state = loadState(cfg.statePath);
  const pending = state.purchases.filter((p) => !p.result && !p.dryRun).sort((a, b) => a.round - b.round);
  if (!pending.length) {
    console.log("결과를 확인할 구매가 없습니다.");
    return;
  }

  let ledger: LedgerItem[] | null = null;
  try {
    const dh = new Dhlottery(cfg.userId, cfg.password);
    await dh.login();
    const now = new Date();
    ledger = await dh.ledger(ymdKst(new Date(now.getTime() - 14 * 86400000)), ymdKst(now));
  } catch (e) {
    console.warn("구매내역 대조는 건너뜁니다:", (e as Error).message);
  }

  let reported = 0;
  for (const p of pending) {
    const draw = drawByRound(p.round);
    if (!draw) {
      console.log(`${p.round}회 결과가 아직 data/draws.json 에 없습니다.`);
      continue;
    }
    const games = gameResults(p.games, draw);
    const mine = ledger?.filter((it) => Number(it.ltEpsdView) === p.round) ?? [];
    p.result = {
      checkedAt: new Date().toISOString(),
      numbers: draw.numbers,
      bonus: draw.bonus,
      games,
      ledger: mine.map((it) => ({ result: it.ltWnResult, amount: it.ltWnAmt, rank: it.wnRnk })),
    };
    saveState(cfg.statePath, state);
    await notify.send(resultMessage(p, draw, totals(state), ledger ? ledgerSummary(ledger, p.round) : "동행복권 구매내역 대조는 로그인 실패로 건너뜀"));
    reported++;
  }
  if (!reported) {
    process.exitCode = 3;
    return;
  }
  console.log(`updated ${reported}`);
}

main().catch(async (e) => {
  console.error(e);
  try {
    await buildNotifier().send(failureMessage("결과 확인 실패", e));
  } catch {
    // 설정 자체가 없으면 콘솔 로그로 충분하다
  }
  process.exitCode = process.exitCode || 1;
});
