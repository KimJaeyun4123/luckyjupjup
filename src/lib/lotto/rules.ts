import { type Combo, type Features, featuresOf, overlap } from "./features";

/** 회차 데이터에서 오는 판정 맥락. 없으면 해당 규칙은 판정할 수 없어 통과로 본다 */
export interface RuleContext {
  /** 직전 회차 당첨번호 */
  previous?: Combo;
  /** 최근 N회 상위 빈도 번호 */
  hot?: ReadonlySet<number>;
  /** 최근 N회 하위 빈도 번호 */
  cold?: ReadonlySet<number>;
  /** K회 이상 미출현 번호 */
  absent?: ReadonlySet<number>;
  /** 역대 1등 조합 ('1-2-3-4-5-6' 키) */
  pastWinners?: ReadonlySet<string>;
}

export type NumericFeature =
  | keyof Omit<Features, "sectionCounts" | "birthdayOnly">
  | "carryover"
  | "hotCount"
  | "coldCount"
  | "absentCount";

export type Rule =
  | { kind: "include"; numbers: number[] }
  | { kind: "exclude"; numbers: number[] }
  | { kind: "range"; feature: NumericFeature; min?: number; max?: number }
  | { kind: "notPastWinner" }
  | { kind: "notBirthdayOnly" };

export const FEATURE_LABEL: Record<NumericFeature, string> = {
  sum: "합계",
  oddCount: "홀수 개수",
  lowCount: "저수(1~22) 개수",
  upperCount: "32 이상 개수",
  consecutivePairs: "연속 쌍",
  maxRun: "가장 긴 연속",
  ac: "AC값",
  maxSameEnding: "같은 끝수 최대",
  endingSum: "끝수 합",
  maxSection: "한 구간 최대",
  sectionCount: "번호가 든 구간 수",
  primeCount: "소수 개수",
  multipleOf3Count: "3의 배수 개수",
  range: "최대−최소",
  carryover: "직전 회차와 겹침",
  hotCount: "최근 자주 나온 번호",
  coldCount: "최근 드문 번호",
  absentCount: "오래 안 나온 번호",
};

export function featureValue(c: Combo, f: Features, feature: NumericFeature, ctx: RuleContext): number | undefined {
  switch (feature) {
    case "carryover":
      return ctx.previous ? overlap(c, ctx.previous) : undefined;
    case "hotCount":
      return ctx.hot ? c.filter((n) => ctx.hot!.has(n)).length : undefined;
    case "coldCount":
      return ctx.cold ? c.filter((n) => ctx.cold!.has(n)).length : undefined;
    case "absentCount":
      return ctx.absent ? c.filter((n) => ctx.absent!.has(n)).length : undefined;
    default:
      return f[feature];
  }
}

export function ruleKey(r: Rule): string {
  switch (r.kind) {
    case "range":
      return `${r.feature}:${r.min ?? ""}-${r.max ?? ""}`;
    case "include":
    case "exclude":
      return `${r.kind}:${r.numbers.join(".")}`;
    default:
      return r.kind;
  }
}

/** 사람이 읽는 규칙 설명 ('합계 100~175', '연속 쌍 1 이하') */
export function describeRule(r: Rule): string {
  switch (r.kind) {
    case "include":
      return `${r.numbers.join(", ")} 포함`;
    case "exclude":
      return `${r.numbers.join(", ")} 제외`;
    case "notPastWinner":
      return "역대 1등 조합 제외";
    case "notBirthdayOnly":
      return "모두 31 이하인 조합 제외";
    case "range": {
      const label = FEATURE_LABEL[r.feature];
      if (r.min !== undefined && r.max !== undefined) return r.min === r.max ? `${label} ${r.min}` : `${label} ${r.min}~${r.max}`;
      if (r.min !== undefined) return `${label} ${r.min} 이상`;
      if (r.max !== undefined) return `${label} ${r.max} 이하`;
      return label;
    }
  }
}

export function passes(r: Rule, c: Combo, f: Features, ctx: RuleContext): boolean {
  switch (r.kind) {
    case "include":
      return r.numbers.every((n) => c.includes(n));
    case "exclude":
      return !r.numbers.some((n) => c.includes(n));
    case "notPastWinner":
      return !ctx.pastWinners?.has(c.join("-"));
    case "notBirthdayOnly":
      return !f.birthdayOnly;
    case "range": {
      const v = featureValue(c, f, r.feature, ctx);
      if (v === undefined) return true;
      return (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max);
    }
  }
}

export interface Evaluation {
  pass: boolean;
  failed: Rule[];
  features: Features;
}

export function evaluate(c: Combo, rules: readonly Rule[], ctx: RuleContext = {}): Evaluation {
  const features = featuresOf(c);
  const failed = rules.filter((r) => !passes(r, c, features, ctx));
  return { pass: failed.length === 0, failed, features };
}

/** 규칙 묶음의 고정수·제외수를 모은다 (생성기가 풀을 만들 때 쓴다) */
export function fixedNumbers(rules: readonly Rule[]) {
  const include = new Set<number>();
  const exclude = new Set<number>();
  for (const r of rules) {
    if (r.kind === "include") r.numbers.forEach((n) => include.add(n));
    if (r.kind === "exclude") r.numbers.forEach((n) => exclude.add(n));
  }
  return { include: [...include].sort((a, b) => a - b), exclude: [...exclude].sort((a, b) => a - b) };
}
