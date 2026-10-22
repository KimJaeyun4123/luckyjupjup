import { type Combo, MAX, MIN, PICK, comboKey } from "./features";
import type { Preset } from "./presets";
import { type Rule, type RuleContext, evaluate, fixedNumbers, ruleKey } from "./rules";
import { type Rng, cryptoRng, weightedSample } from "./random";

export interface GenerateOptions {
  preset: Preset;
  /** 게임 수 1~5 */
  count: number;
  include?: readonly number[];
  exclude?: readonly number[];
  ctx?: RuleContext;
  /** 번호별 가중치 (index 1~45). 없으면 균등 */
  weights?: readonly number[];
  /** 게임끼리 겹치는 번호를 줄인다 */
  spreadAcrossGames?: boolean;
  maxAttempts?: number;
  rng?: Rng;
}

export interface GenerateResult {
  games: Combo[];
  rules: Rule[];
  /** 시도 횟수 (게임 전체) */
  attempts: number;
  /** 규칙별로 떨어진 횟수 */
  failures: Record<string, number>;
}

export class GenerateError extends Error {
  constructor(
    message: string,
    public readonly failures: Record<string, number>,
    public readonly attempts: number,
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

export const MAX_GAMES = 5;
export const MAX_INCLUDE = 5;

/** 타입 규칙에 고정수·제외수를 합친 최종 규칙 */
export function effectiveRules(preset: Preset, include: readonly number[] = [], exclude: readonly number[] = []): Rule[] {
  const rules: Rule[] = preset.rules.filter((r) => r.kind !== "include" && r.kind !== "exclude");
  const inc = [...new Set(include)].filter((n) => n >= MIN && n <= MAX).sort((a, b) => a - b);
  const exc = [...new Set(exclude)].filter((n) => n >= MIN && n <= MAX && !inc.includes(n)).sort((a, b) => a - b);
  if (inc.length) rules.unshift({ kind: "include", numbers: inc.slice(0, MAX_INCLUDE) });
  if (exc.length) rules.unshift({ kind: "exclude", numbers: exc });
  return rules;
}

/** 조건을 만족하는 조합을 기각 샘플링으로 만든다 */
export function generate(opts: GenerateOptions): GenerateResult {
  const count = Math.min(MAX_GAMES, Math.max(1, Math.floor(opts.count)));
  const rules = effectiveRules(opts.preset, opts.include, opts.exclude);
  const { include, exclude } = fixedNumbers(rules);
  const ctx = opts.ctx ?? {};
  const rng = opts.rng ?? cryptoRng;
  const maxAttempts = opts.maxAttempts ?? 20_000;

  const pool: number[] = [];
  for (let n = MIN; n <= MAX; n++) if (!include.includes(n) && !exclude.includes(n)) pool.push(n);
  const need = PICK - include.length;
  if (need < 0 || pool.length < need) throw new GenerateError("고정수와 제외수가 너무 많아 6개를 채울 수 없습니다.", {}, 0);

  const base = pool.map((n) => opts.weights?.[n] ?? 1);
  const used = new Map<number, number>();
  const games: Combo[] = [];
  const seen = new Set<string>();
  const failures: Record<string, number> = {};
  let attempts = 0;

  while (games.length < count) {
    if (attempts >= maxAttempts) {
      throw new GenerateError("조건이 너무 좁아 번호를 만들지 못했습니다. 조건을 조금 풀어 보세요.", failures, attempts);
    }
    attempts++;
    // 이미 쓴 번호는 가중치를 낮춰 게임끼리 겹침을 줄인다
    const weights = opts.spreadAcrossGames ? base.map((w, i) => w / (1 + 2 * (used.get(pool[i]) ?? 0))) : base;
    const picked = weightedSample(pool, weights, need, rng);
    const combo = [...include, ...picked].sort((a, b) => a - b);
    const key = comboKey(combo);
    if (seen.has(key)) continue;
    const ev = evaluate(combo, rules, ctx);
    if (!ev.pass) {
      for (const r of ev.failed) failures[ruleKey(r)] = (failures[ruleKey(r)] ?? 0) + 1;
      continue;
    }
    seen.add(key);
    games.push(combo);
    combo.forEach((n) => used.set(n, (used.get(n) ?? 0) + 1));
  }
  return { games, rules, attempts, failures };
}

/** 가중치 표(index 1~45). 집합에 든 번호는 boost배, 나머지는 1 */
export function weightsFor(set: ReadonlySet<number> | undefined, boost = 3): number[] | undefined {
  if (!set) return undefined;
  const w = new Array<number>(MAX + 1).fill(1);
  for (const n of set) w[n] = boost;
  return w;
}
