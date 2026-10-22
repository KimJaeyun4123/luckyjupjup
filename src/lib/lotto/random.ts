/** 암호학적 난수. 브라우저와 Node(19+) 모두 globalThis.crypto를 가진다 */
export type Rng = () => number;

const buf = new Uint32Array(1);

/** [0, 1) 균등 난수 */
export const cryptoRng: Rng = () => {
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
};

/** 0 이상 n 미만 정수. 나머지 편향을 피하려고 기각한다 */
export function randomInt(n: number, rng: Rng = cryptoRng): number {
  if (n <= 0 || !Number.isInteger(n)) throw new RangeError("n must be a positive integer");
  const limit = Math.floor(4294967296 / n) * n;
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (rng !== cryptoRng) return Math.floor(rng() * n);
    if (buf[0] < limit) return buf[0] % n;
  }
}

/** 가중치로 비복원 추출. weights[i]는 pool[i]의 상대 가중치(0이면 뽑지 않음) */
export function weightedSample(pool: readonly number[], weights: readonly number[], k: number, rng: Rng = cryptoRng): number[] {
  const items = pool.map((v, i) => ({ v, w: weights[i] }));
  const out: number[] = [];
  while (out.length < k && items.length) {
    const total = items.reduce((a, x) => a + x.w, 0);
    if (total <= 0) break;
    let r = rng() * total;
    let idx = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      r -= items[i].w;
      if (r < 0) {
        idx = i;
        break;
      }
    }
    out.push(items[idx].v);
    items.splice(idx, 1);
  }
  return out;
}

/** 테스트용 결정적 난수 (mulberry32) */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
