import { type Combo, MAX, PICK, normalize } from "./features";

/**
 * 6개 조합 ↔ 0~8,145,059 정수(콜렉스 순위) ↔ base36 5자.
 * 결과 URL의 g 파라미터는 게임마다 5자를 이어 붙인 문자열이다.
 */
const C: number[][] = [];
for (let n = 0; n <= MAX; n++) {
  C[n] = [];
  for (let k = 0; k <= PICK; k++) C[n][k] = k === 0 ? 1 : n === 0 ? 0 : C[n - 1][k - 1] + C[n - 1][k];
}
export const choose = (n: number, k: number) => (k < 0 || k > n ? 0 : C[n][k]);

export const CHARS_PER_GAME = 5;

export function rankOf(combo: Combo): number {
  // 오름차순 c1<…<c6 에서 rank = Σ C(c_i − 1, i)
  let r = 0;
  for (let i = 0; i < PICK; i++) r += choose(combo[i] - 1, i + 1);
  return r;
}

export function unrank(rank: number): number[] {
  const out = new Array<number>(PICK);
  let r = rank;
  for (let i = PICK; i >= 1; i--) {
    // C(c−1, i) ≤ r 인 가장 큰 c
    let c = i;
    while (c + 1 <= MAX && choose(c, i) <= r) c++;
    out[i - 1] = c;
    r -= choose(c - 1, i);
  }
  return out;
}

export function encodeGame(combo: Combo): string {
  return rankOf(combo).toString(36).padStart(CHARS_PER_GAME, "0");
}

export function decodeGame(s: string): number[] | null {
  if (!/^[0-9a-z]{5}$/.test(s)) return null;
  const rank = parseInt(s, 36);
  if (rank < 0 || rank >= choose(MAX, PICK)) return null;
  return unrank(rank);
}

export const encodeGames = (games: readonly Combo[]) => games.map(encodeGame).join("");

/** 잘못된 조각은 버리고 유효한 게임만 돌려준다 */
export function decodeGames(s: string | undefined, max = 5): number[][] {
  if (!s) return [];
  const out: number[][] = [];
  for (let i = 0; i + CHARS_PER_GAME <= s.length && out.length < max; i += CHARS_PER_GAME) {
    const g = decodeGame(s.slice(i, i + CHARS_PER_GAME));
    if (g && normalize(g)) out.push(g);
  }
  return out;
}

/** '3-7-21' 꼴 숫자 목록 파라미터 */
export function parseNumberList(s: string | undefined, max = 45): number[] {
  if (!s) return [];
  const nums = s
    .split(/[-,.\s]+/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX);
  return [...new Set(nums)].sort((a, b) => a - b).slice(0, max);
}
export const formatNumberList = (nums: readonly number[]) => nums.join("-");
