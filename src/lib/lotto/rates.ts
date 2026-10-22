import raw from "../../../data/rates.json";
import { TOTAL_COMBOS } from "./features";
import type { PresetId } from "./presets";

/** scripts/rates/build.ts 가 전수 열거해 만든 전체 조합 통계 */
export interface Rates {
  computedAt: string;
  total: number;
  presets: Record<PresetId, number>;
  /** 합계 → 조합 수 */
  sumHist: Record<string, number>;
  dist: Record<"ac" | "oddCount" | "lowCount" | "consecutivePairs" | "maxSameEnding" | "maxSection" | "sectionCount" | "primeCount" | "carryover", number[]>;
}

export const RATES = raw as Rates;

/** 타입을 통과하는 전체 조합 비율 (0~1) */
export const presetRate = (id: PresetId) => RATES.presets[id] / RATES.total;

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

/** 합계 히스토그램을 10단위로 묶는다 */
export function theoreticalSumHist(): { from: number; to: number; count: number }[] {
  const bins = new Map<number, number>();
  for (const [s, c] of Object.entries(RATES.sumHist)) {
    const b = Math.floor(Number(s) / 10) * 10;
    bins.set(b, (bins.get(b) ?? 0) + c);
  }
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([from, count]) => ({ from, to: from + 9, count }));
}

export { TOTAL_COMBOS };
