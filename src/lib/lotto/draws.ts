import rawDraws from "../../../data/draws.json";
import { type Combo, MAX, MIN, comboKey, featuresOf } from "./features";
import { ABSENT_ROUNDS, HOT_TOP, HOT_WINDOW, type Preset } from "./presets";
import type { RuleContext } from "./rules";
import { evaluate } from "./rules";

export interface Prize {
  rank: 1 | 2 | 3 | 4 | 5;
  winners: number;
  amount: number;
}
export interface Draw {
  round: number;
  /** YYYY-MM-DD */
  date: string;
  numbers: number[];
  bonus: number;
  prizes: Prize[];
  /** 회차 총판매액 (초기 회차는 0일 수 있음) */
  sales: number;
  /** 1등 당첨자의 선택 유형 수 */
  firstBy: { auto: number; manual: number; semiAuto: number };
}

/** 회차 오름차순 전체 */
export const DRAWS: readonly Draw[] = rawDraws as Draw[];
export const LATEST: Draw = DRAWS[DRAWS.length - 1];

const byRound = new Map(DRAWS.map((d) => [d.round, d]));
export const drawByRound = (round: number) => byRound.get(round);

/** 최근 window회(없으면 전체)의 번호별 출현 횟수. index 1~45 */
export function frequency(window?: number, draws: readonly Draw[] = DRAWS): number[] {
  const freq = new Array<number>(MAX + 1).fill(0);
  const slice = window ? draws.slice(-window) : draws;
  for (const d of slice) for (const n of d.numbers) freq[n]++;
  return freq;
}

/** 번호별 마지막 출현 이후 지난 회차 수 (최신 회차에 나왔으면 0). index 1~45 */
export function absentRounds(draws: readonly Draw[] = DRAWS): number[] {
  const last = new Array<number>(MAX + 1).fill(-1);
  for (const d of draws) for (const n of d.numbers) last[n] = d.round;
  const latest = draws[draws.length - 1].round;
  return last.map((r, n) => (n === 0 ? 0 : r < 0 ? latest : latest - r));
}

function topN(freq: number[], n: number, asc = false): Set<number> {
  const idx: number[] = [];
  for (let i = MIN; i <= MAX; i++) idx.push(i);
  idx.sort((a, b) => (asc ? freq[a] - freq[b] : freq[b] - freq[a]) || a - b);
  return new Set(idx.slice(0, n));
}

export const hotSet = (window = HOT_WINDOW, top = HOT_TOP, draws: readonly Draw[] = DRAWS) => topN(frequency(window, draws), top);
export const coldSet = (window = HOT_WINDOW, top = HOT_TOP, draws: readonly Draw[] = DRAWS) => topN(frequency(window, draws), top, true);

/** minRounds회 이상 미출현 번호. 너무 적으면(8개 미만) 기준을 낮춰 최소 8개는 되게 한다 */
export function absentSet(minRounds = ABSENT_ROUNDS, draws: readonly Draw[] = DRAWS): { numbers: Set<number>; threshold: number } {
  const gaps = absentRounds(draws);
  let threshold = minRounds;
  for (; threshold > 3; threshold--) {
    const set = new Set<number>();
    for (let n = MIN; n <= MAX; n++) if (gaps[n] >= threshold) set.add(n);
    if (set.size >= 8) return { numbers: set, threshold };
  }
  const set = new Set<number>();
  for (let n = MIN; n <= MAX; n++) if (gaps[n] >= threshold) set.add(n);
  return { numbers: set, threshold };
}

let pastWinnersCache: Set<string> | null = null;
export function pastWinners(draws: readonly Draw[] = DRAWS): Set<string> {
  if (draws === DRAWS && pastWinnersCache) return pastWinnersCache;
  const s = new Set(draws.map((d) => comboKey([...d.numbers].sort((a, b) => a - b))));
  if (draws === DRAWS) pastWinnersCache = s;
  return s;
}

/** 생성·판정에 쓰는 맥락 */
export function buildContext(draws: readonly Draw[] = DRAWS): RuleContext & { absentThreshold: number } {
  const absent = absentSet(ABSENT_ROUNDS, draws);
  return {
    previous: draws[draws.length - 1].numbers,
    hot: hotSet(HOT_WINDOW, HOT_TOP, draws),
    cold: coldSet(HOT_WINDOW, HOT_TOP, draws),
    absent: absent.numbers,
    absentThreshold: absent.threshold,
    pastWinners: pastWinners(draws),
  };
}

/** 가중치용 집합 */
export function weightSetFor(preset: Preset, ctx: RuleContext): ReadonlySet<number> | undefined {
  if (preset.weighting === "hot") return ctx.hot;
  if (preset.weighting === "cold") return ctx.cold;
  if (preset.weighting === "absent") return ctx.absent;
  return undefined;
}

/** 역대 당첨 조합 가운데 타입 규칙을 통과한 비율. 직전 회차 의존 규칙은 각 회차의 직전 회차로 판정한다 */
export function historicalPassRate(preset: Preset, draws: readonly Draw[] = DRAWS): { pass: number; total: number } {
  let pass = 0;
  for (let i = 0; i < draws.length; i++) {
    const prefix = draws.slice(0, i);
    const ctx: RuleContext =
      preset.weighting || preset.rules.some((r) => r.kind === "range" && r.feature === "carryover")
        ? prefix.length
          ? { previous: prefix[prefix.length - 1].numbers, hot: hotSet(HOT_WINDOW, HOT_TOP, prefix), cold: coldSet(HOT_WINDOW, HOT_TOP, prefix), absent: absentSet(ABSENT_ROUNDS, prefix).numbers }
          : {}
        : {};
    if (evaluate(draws[i].numbers, preset.rules, ctx).pass) pass++;
  }
  return { pass, total: draws.length };
}

/** 합계 히스토그램 (10 단위 구간) */
export function sumHistogram(draws: readonly Draw[] = DRAWS): { from: number; to: number; count: number }[] {
  const bins = new Map<number, number>();
  for (const d of draws) {
    const s = featuresOf(d.numbers).sum;
    const b = Math.floor(s / 10) * 10;
    bins.set(b, (bins.get(b) ?? 0) + 1);
  }
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([from, count]) => ({ from, to: from + 9, count }));
}

/** 특정 번호와 함께 나온 번호 상위 */
export function companions(n: number, top = 6, draws: readonly Draw[] = DRAWS): { number: number; count: number }[] {
  const c = new Array<number>(MAX + 1).fill(0);
  for (const d of draws) if (d.numbers.includes(n)) for (const m of d.numbers) if (m !== n) c[m]++;
  return c
    .map((count, number) => ({ number, count }))
    .filter((x) => x.number >= MIN)
    .sort((a, b) => b.count - a.count || a.number - b.number)
    .slice(0, top);
}

export const formatWon = (n: number) => `${n.toLocaleString("ko-KR")}원`;
export const asCombo = (d: Draw): Combo => d.numbers;
