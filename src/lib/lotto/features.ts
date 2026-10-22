/**
 * 조합(6개 번호) 하나에서 조건 판정에 쓰는 수치를 뽑는다. 모두 순수 함수.
 * 번호는 1~45, 오름차순 정렬·중복 없음을 전제한다 (normalize로 맞춘다).
 */
export type Combo = readonly number[];

export const MIN = 1;
export const MAX = 45;
export const PICK = 6;
/** 45개 중 6개 조합 수 */
export const TOTAL_COMBOS = 8_145_060;

export const PRIMES: ReadonlySet<number> = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]);

/** 10단위 구간. 로또 용지의 번호 색과 같다 */
export const SECTIONS = [
  { label: "1~10", color: "yellow", from: 1, to: 10 },
  { label: "11~20", color: "blue", from: 11, to: 20 },
  { label: "21~30", color: "red", from: 21, to: 30 },
  { label: "31~40", color: "gray", from: 31, to: 40 },
  { label: "41~45", color: "green", from: 41, to: 45 },
] as const;
export const sectionOf = (n: number) => Math.min(4, Math.floor((n - 1) / 10));

/** 저수는 1~22, 고수는 23~45 (업계 관행) */
export const LOW_MAX = 22;
/** '나눠 갖기 회피형'에서 생일(1~31)을 벗어난 번호의 기준 */
export const UPPER_MIN = 32;

export interface Features {
  sum: number;
  oddCount: number;
  lowCount: number;
  /** 32~45 개수 */
  upperCount: number;
  /** 연속한 두 수의 쌍 개수 (1·2·3은 2쌍) */
  consecutivePairs: number;
  /** 가장 긴 연속 길이 (연속이 없으면 1) */
  maxRun: number;
  /** 산술적 복합도: 15개 쌍 차이의 서로 다른 개수 − 5 (0~10) */
  ac: number;
  maxSameEnding: number;
  endingSum: number;
  sectionCounts: number[];
  maxSection: number;
  /** 번호가 든 구간 수 (1~5) */
  sectionCount: number;
  primeCount: number;
  multipleOf3Count: number;
  range: number;
  birthdayOnly: boolean;
}

export const isValidNumber = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= MIN && (n as number) <= MAX;

/** 정렬·중복 제거. 유효하지 않으면 null */
export function normalize(nums: readonly number[]): number[] | null {
  if (nums.length !== PICK || !nums.every(isValidNumber)) return null;
  const s = [...new Set(nums)].sort((a, b) => a - b);
  return s.length === PICK ? s : null;
}

export const comboKey = (c: Combo) => c.join("-");

export function featuresOf(c: Combo): Features {
  const sectionCounts = [0, 0, 0, 0, 0];
  const endings = new Map<number, number>();
  const diffs = new Set<number>();
  let consecutivePairs = 0;
  let maxRun = 1;
  let run = 1;
  for (let i = 0; i < c.length; i++) {
    sectionCounts[sectionOf(c[i])]++;
    endings.set(c[i] % 10, (endings.get(c[i] % 10) ?? 0) + 1);
    for (let j = i + 1; j < c.length; j++) diffs.add(c[j] - c[i]);
    if (i > 0) {
      if (c[i] - c[i - 1] === 1) {
        consecutivePairs++;
        run++;
        maxRun = Math.max(maxRun, run);
      } else run = 1;
    }
  }
  return {
    sum: c.reduce((a, b) => a + b, 0),
    oddCount: c.filter((n) => n % 2 === 1).length,
    lowCount: c.filter((n) => n <= LOW_MAX).length,
    upperCount: c.filter((n) => n >= UPPER_MIN).length,
    consecutivePairs,
    maxRun,
    ac: diffs.size - 5,
    maxSameEnding: Math.max(...endings.values()),
    endingSum: c.reduce((a, b) => a + (b % 10), 0),
    sectionCounts,
    maxSection: Math.max(...sectionCounts),
    sectionCount: sectionCounts.filter((x) => x > 0).length,
    primeCount: c.filter((n) => PRIMES.has(n)).length,
    multipleOf3Count: c.filter((n) => n % 3 === 0).length,
    range: c[c.length - 1] - c[0],
    birthdayOnly: c.every((n) => n <= 31),
  };
}

/** 두 조합이 겹치는 번호 수 */
export const overlap = (a: Combo, b: Combo) => a.filter((n) => b.includes(n)).length;
