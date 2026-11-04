import { check } from "../../src/lib/lotto/check";
import type { Draw } from "../../src/lib/lotto/draws";
import { encodeGames } from "../../src/lib/lotto/encode";
import { presetById } from "../../src/lib/lotto/presets";
import { drawDateOfRound, formatKstDate } from "../../src/lib/lotto/schedule";
import { esc } from "./telegram";
import type { GameResult, Purchase } from "./state";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const slot = (i: number) => String.fromCharCode(65 + i);
const nums = (g: readonly number[]) => g.map((n) => String(n).padStart(2, " ")).join(" ");

export const resultUrl = (siteUrl: string, preset: string, games: readonly (readonly number[])[]) => `${siteUrl}/pick/result?t=${preset}&n=${games.length}&g=${encodeGames(games)}`;

export function purchaseMessage(p: Purchase, balanceBefore: number | null): string {
  const lines = [
    `🍀 <b>${p.round}회 로또 ${p.dryRun ? "구매 예행연습(드라이런)" : "구매 완료"}</b>`,
    `추첨 ${esc(formatKstDate(drawDateOfRound(p.round)))} 20:35 · ${presetById(p.preset)?.name ?? p.preset} ${p.games.length}게임 · ${won(p.amount)}`,
    "",
    ...p.games.map((g, i) => `<code>${slot(i)}  ${esc(nums(g))}</code>`),
    "",
  ];
  if (balanceBefore !== null) lines.push(`예치금 ${won(balanceBefore)} → ${p.balanceAfter !== null ? won(p.balanceAfter) : "확인 못 함"}`);
  lines.push(`<a href="${esc(p.resultUrl)}">행운줍줍에서 보기</a> · <a href="https://www.dhlottery.co.kr/mypage/mylotteryledger">동행복권 구매내역</a>`);
  return lines.join("\n");
}

export function gameResults(games: readonly (readonly number[])[], draw: Pick<Draw, "numbers" | "bonus" | "prizes">): GameResult[] {
  return games.map((g) => {
    const r = check(g, draw);
    return { matched: r.matched.length, bonus: r.bonusMatched, rank: r.rank, amount: r.amount };
  });
}

const RANK = ["", "🥇 1등", "🥈 2등", "🥉 3등", "4등", "5등"];

export function resultMessage(p: Purchase, draw: Draw, totalsNow: { spent: number; won: number; rounds: number; checked: number }, ledgerNote?: string): string {
  const results = p.result!.games;
  const weekWon = results.reduce((a, g) => a + g.amount, 0);
  const best = results.filter((g) => g.rank).sort((a, b) => a.rank! - b.rank!)[0];
  const head = best ? `🎉 <b>${p.round}회 ${RANK[best.rank!]} 당첨!</b>` : `📋 <b>${p.round}회 결과 · 이번 주는 낙첨</b>`;
  const lines = [
    head,
    `당첨번호 <code>${esc(nums(draw.numbers))}</code> + 보너스 <code>${draw.bonus}</code>`,
    `1등 ${draw.prizes[0].winners}명 · 각 ${won(draw.prizes[0].amount)}`,
    "",
    ...p.games.map((g, i) => {
      const r = results[i];
      const mark = g.map((n) => (draw.numbers.includes(n) ? `<b>${String(n).padStart(2, " ")}</b>` : String(n).padStart(2, " "))).join(" ");
      const tail = r.rank ? `${RANK[r.rank]} ${won(r.amount)}` : `${r.matched}개${r.bonus ? "+보너스" : ""}`;
      return `<code>${slot(i)}  </code>${mark}  ${esc(tail)}`;
    }),
    "",
    `이번 주 ${won(p.amount)} 쓰고 ${won(weekWon)} 당첨`,
    `누적 ${totalsNow.rounds}회차 · ${won(totalsNow.spent)} 쓰고 ${won(totalsNow.won)} 당첨 (${totalsNow.spent ? Math.round((totalsNow.won / totalsNow.spent) * 100) : 0}%)`,
  ];
  if (ledgerNote) lines.push(esc(ledgerNote));
  if (best && best.rank! <= 3) lines.push("", "⚠️ 200만원 초과 당첨금은 농협은행에서 직접 수령합니다. 200만원 이하는 일요일 새벽 예치금으로 들어옵니다.");
  lines.push(`<a href="${esc(p.resultUrl)}">행운줍줍에서 보기</a>`);
  return lines.join("\n");
}

export function failureMessage(title: string, err: unknown, hint?: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  return [`⚠️ <b>${esc(title)}</b>`, esc(msg), hint ? esc(hint) : ""].filter(Boolean).join("\n");
}
