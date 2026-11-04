/**
 * 금요일 아침에 돈다: 번호 생성 → 로그인 → 예치금 확인 → 수동 번호로 구매 → 텔레그램 → agent/state.json 기록.
 * 같은 회차를 이미 샀으면 다시 사지 않는다. LOTTO_DRY_RUN=1 이면 구매 요청만 보내지 않는다.
 * 실행: npm run agent:buy [-- --dry-run]
 */
import { buildContext, weightSetFor } from "../../src/lib/lotto/draws";
import { generate, weightsFor } from "../../src/lib/lotto/generate";
import { presetById } from "../../src/lib/lotto/presets";
import { drawDateOfRound, roundForPurchase } from "../../src/lib/lotto/schedule";
import { Dhlottery, DhlotteryError, isSaleOpen } from "../../src/lib/dh/client";
import { readConfig } from "./env";
import { failureMessage, purchaseMessage, resultUrl } from "./format";
import { type Purchase, loadState, saveState } from "./state";
import { buildNotifier } from "./notify";

const payDeadlineFallback = (drawDate: string) => {
  const d = new Date(drawDate);
  d.setUTCDate(d.getUTCDate() + 366);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const cfg = readConfig();
  const notify = buildNotifier();
  const state = loadState(cfg.statePath);
  const now = new Date();
  const targetRound = roundForPurchase(now);

  const already = state.purchases.find((p) => p.round === targetRound && !p.dryRun);
  if (already) {
    console.log(`skip: ${targetRound}회는 ${already.boughtAt} 에 이미 구매했습니다.`);
    return;
  }
  if (!cfg.dryRun && !isSaleOpen(now)) {
    await notify.send(failureMessage(`${targetRound}회 구매 건너뜀`, new Error("온라인 판매 시간이 아닙니다 (평일·일 06~24시, 토 06~20시)."), "다음 실행 때 다시 시도합니다."));
    process.exitCode = 3;
    return;
  }

  // 1. 번호 생성 (행운줍줍 엔진, 최신 회차 맥락)
  const preset = presetById(cfg.preset)!;
  const ctx = buildContext();
  const gen = generate({
    preset,
    count: cfg.games,
    include: preset.acceptsInclude ? cfg.include : [],
    exclude: cfg.exclude,
    ctx,
    weights: weightsFor(weightSetFor(preset, ctx)),
    spreadAcrossGames: true,
  });
  const games = gen.games.map((g) => [...g]);
  const url = resultUrl(cfg.siteUrl, cfg.preset, games);
  console.log(`${targetRound}회 ${preset.name} ${games.length}게임:`, games.map((g) => g.join(",")).join(" / "));

  const dh = new Dhlottery(cfg.userId, cfg.password);
  let balanceBefore: number | null = null;
  try {
    // 2. 로그인·예치금
    await dh.login();
    balanceBefore = await dh.balance();
    const need = games.length * 1000;
    console.log(`로그인 성공, 예치금 ${balanceBefore.toLocaleString("ko-KR")}원`);
    if (balanceBefore < need) {
      await notify.send(
        failureMessage(
          `${targetRound}회 구매 실패: 예치금 부족`,
          new Error(`현재 ${balanceBefore.toLocaleString("ko-KR")}원, 필요 ${need.toLocaleString("ko-KR")}원`),
          "동행복권에서 예치금을 충전하면 다음 실행 때 구매합니다. 토요일 20:00 전에 직접 npm run agent:buy 를 실행해도 됩니다.",
        ),
      );
      process.exitCode = 2;
      return;
    }

    // 3. 구매 요구값
    const req = await dh.buyRequirements();
    const round = req.round ?? targetRound;
    if (req.round && req.round !== targetRound) console.warn(`주의: 구매 페이지 회차 ${req.round} ≠ 계산 회차 ${targetRound}. 페이지 값을 씁니다.`);
    const drawDate = req.drawDate ?? drawDateOfRound(round);
    const payDeadline = req.payDeadline ?? payDeadlineFallback(drawDate);

    // 4. 구매
    let purchase: Purchase;
    if (cfg.dryRun) {
      purchase = { round, boughtAt: now.toISOString(), preset: cfg.preset, games, amount: need, balanceAfter: balanceBefore, dryRun: true, resultUrl: url };
      console.log("드라이런: 구매 요청은 보내지 않았습니다.", { round, drawDate, payDeadline, direct: req.direct.slice(0, 6) + "…" });
    } else {
      const bought = await dh.buyManual(games, round, drawDate, payDeadline, req.direct);
      let balanceAfter: number | null = null;
      try {
        balanceAfter = await dh.balance();
      } catch {
        // 잔액 재조회 실패는 구매 성공을 바꾸지 않는다
      }
      purchase = { round: bought.round, boughtAt: now.toISOString(), preset: cfg.preset, games: bought.games, amount: bought.amount, balanceAfter, resultUrl: url, receipt: bought.raw };
    }

    // 5. 기록·알림
    state.purchases = state.purchases.filter((p) => !(p.dryRun && p.round === purchase.round));
    state.purchases.push(purchase);
    saveState(cfg.statePath, state);
    await notify.send(purchaseMessage(purchase, balanceBefore));
    console.log(cfg.dryRun ? "dry-run" : "updated");
  } catch (e) {
    const hint =
      e instanceof DhlotteryError && e.kind === "blocked"
        ? "GitHub Actions 등 해외 IP 가 막힌 것일 수 있습니다. 집 PC(launchd/cron)에서 실행하세요."
        : e instanceof DhlotteryError && e.kind === "login"
          ? "아이디·비밀번호를 확인하세요. 5회 실패하면 계정이 잠기므로 자동 재시도는 하지 않습니다."
          : e instanceof DhlotteryError && e.kind === "limit"
            ? "이번 회차 온라인 구매 한도(5,000원)를 이미 채웠습니다."
            : undefined;
    await notify.send(failureMessage(`${targetRound}회 구매 실패`, e, hint));
    if (e instanceof DhlotteryError && e.raw) console.error("raw:", typeof e.raw === "string" ? e.raw : JSON.stringify(e.raw).slice(0, 1000));
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = process.exitCode || 1;
});
