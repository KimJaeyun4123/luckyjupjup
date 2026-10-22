import { type Draw, DRAWS } from "./draws";

/** 클라이언트에 넘기는 최근 회차 요약. 전체 데이터(450KB)를 보내지 않으려고 최근 회차만 담는다 */
export interface CompactDraw {
  round: number;
  date: string;
  numbers: number[];
  bonus: number;
  /** 등수별 1인당 당첨금 (1~5등) */
  amounts: number[];
}

export const RECENT_ROUNDS = 60;

export const toCompact = (d: Draw): CompactDraw => ({ round: d.round, date: d.date, numbers: d.numbers, bonus: d.bonus, amounts: d.prizes.map((p) => p.amount) });

export const recentCompact = (n = RECENT_ROUNDS): CompactDraw[] => DRAWS.slice(-n).map(toCompact);

export const compactToDrawLike = (c: CompactDraw) => ({
  numbers: c.numbers,
  bonus: c.bonus,
  prizes: c.amounts.map((amount, i) => ({ rank: (i + 1) as 1 | 2 | 3 | 4 | 5, winners: 0, amount })),
});
