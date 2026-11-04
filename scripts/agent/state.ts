import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { PresetId } from "../../src/lib/lotto/presets";

export interface GameResult {
  matched: number;
  bonus: boolean;
  rank: number | null;
  amount: number;
}
export interface Purchase {
  round: number;
  boughtAt: string;
  preset: PresetId;
  games: number[][];
  amount: number;
  balanceAfter: number | null;
  dryRun?: boolean;
  resultUrl: string;
  receipt?: unknown;
  result?: {
    checkedAt: string;
    numbers: number[];
    bonus: number;
    games: GameResult[];
    /** 동행복권 구매내역에서 읽은 결과 ('당첨'/'낙첨' 등) */
    ledger?: { result: string; amount: number | null; rank: number | null }[];
  };
}
export interface AgentState {
  purchases: Purchase[];
}

export function loadState(path: URL): AgentState {
  const file = fileURLToPath(path);
  if (!existsSync(file)) return { purchases: [] };
  const s = JSON.parse(readFileSync(file, "utf8")) as AgentState;
  return { purchases: Array.isArray(s.purchases) ? s.purchases : [] };
}

export function saveState(path: URL, state: AgentState) {
  const file = fileURLToPath(path);
  mkdirSync(fileURLToPath(new URL(".", path)), { recursive: true });
  writeFileSync(file, JSON.stringify(state, null, 2) + "\n");
}

/** 실제 구매(드라이런 제외)의 누적 지출·당첨 */
export function totals(state: AgentState) {
  const real = state.purchases.filter((p) => !p.dryRun);
  const spent = real.reduce((a, p) => a + p.amount, 0);
  const won = real.reduce((a, p) => a + (p.result?.games.reduce((x, g) => x + g.amount, 0) ?? 0), 0);
  const checked = real.filter((p) => p.result).length;
  return { spent, won, rounds: real.length, checked };
}
