import type { Combo } from "./features";
import type { Draw } from "./draws";

export type Rank = 1 | 2 | 3 | 4 | 5;

export interface CheckResult {
  matched: number[];
  bonusMatched: boolean;
  rank: Rank | null;
  /** 1인당 당첨금 (회차 데이터 기준). 등수 밖이면 0 */
  amount: number;
}

export const RANK_LABEL: Record<Rank, string> = { 1: "1등", 2: "2등", 3: "3등", 4: "4등", 5: "5등" };
export const RANK_RULE: Record<Rank, string> = { 1: "6개 일치", 2: "5개 + 보너스", 3: "5개 일치", 4: "4개 일치", 5: "3개 일치" };

export function check(game: Combo, draw: Pick<Draw, "numbers" | "bonus" | "prizes">): CheckResult {
  const matched = game.filter((n) => draw.numbers.includes(n));
  const bonusMatched = game.includes(draw.bonus);
  let rank: Rank | null = null;
  if (matched.length === 6) rank = 1;
  else if (matched.length === 5) rank = bonusMatched ? 2 : 3;
  else if (matched.length === 4) rank = 4;
  else if (matched.length === 3) rank = 5;
  const amount = rank ? (draw.prizes.find((p) => p.rank === rank)?.amount ?? 0) : 0;
  return { matched, bonusMatched, rank, amount };
}
