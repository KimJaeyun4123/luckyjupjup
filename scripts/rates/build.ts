/**
 * 8,145,060개 전체 조합을 전수 열거해 타입(프리셋)별 통과 수와 피처 분포를 data/rates.json에 쓴다.
 * 핫·미출현·이월 규칙은 지금 회차 데이터의 맥락으로 판정하지만, 어떤 번호가 핫이든 개수 조건의 비율은 같다.
 * 실행: npm run rates:build (약 1~3분)
 */
import { writeFileSync } from "node:fs";
import { buildContext } from "../../src/lib/lotto/draws";
import { featuresOf, MAX, TOTAL_COMBOS } from "../../src/lib/lotto/features";
import { PRESETS } from "../../src/lib/lotto/presets";
import { passes } from "../../src/lib/lotto/rules";

const ctx = buildContext();
const presetPass: Record<string, number> = Object.fromEntries(PRESETS.map((p) => [p.id, 0]));
const sumHist: Record<number, number> = {};
const dist = {
  ac: new Array<number>(11).fill(0),
  oddCount: new Array<number>(7).fill(0),
  lowCount: new Array<number>(7).fill(0),
  consecutivePairs: new Array<number>(6).fill(0),
  maxSameEnding: new Array<number>(7).fill(0),
  maxSection: new Array<number>(7).fill(0),
  sectionCount: new Array<number>(6).fill(0),
  primeCount: new Array<number>(7).fill(0),
  carryover: new Array<number>(7).fill(0),
};

const t0 = Date.now();
let total = 0;
const c = [0, 0, 0, 0, 0, 0];
for (c[0] = 1; c[0] <= MAX - 5; c[0]++)
  for (c[1] = c[0] + 1; c[1] <= MAX - 4; c[1]++)
    for (c[2] = c[1] + 1; c[2] <= MAX - 3; c[2]++)
      for (c[3] = c[2] + 1; c[3] <= MAX - 2; c[3]++)
        for (c[4] = c[3] + 1; c[4] <= MAX - 1; c[4]++)
          for (c[5] = c[4] + 1; c[5] <= MAX; c[5]++) {
            total++;
            const f = featuresOf(c);
            sumHist[f.sum] = (sumHist[f.sum] ?? 0) + 1;
            dist.ac[f.ac]++;
            dist.oddCount[f.oddCount]++;
            dist.lowCount[f.lowCount]++;
            dist.consecutivePairs[f.consecutivePairs]++;
            dist.maxSameEnding[f.maxSameEnding]++;
            dist.maxSection[f.maxSection]++;
            dist.sectionCount[f.sectionCount]++;
            dist.primeCount[f.primeCount]++;
            dist.carryover[c.filter((n) => ctx.previous!.includes(n)).length]++;
            for (const p of PRESETS) {
              let ok = true;
              for (const r of p.rules) {
                if (!passes(r, c, f, ctx)) {
                  ok = false;
                  break;
                }
              }
              if (ok) presetPass[p.id]++;
            }
          }
if (total !== TOTAL_COMBOS) throw new Error(`combos ${total} != ${TOTAL_COMBOS}`);

const out = {
  computedAt: new Date().toISOString().slice(0, 10),
  total,
  latestRound: ctx.previous ? undefined : undefined,
  presets: presetPass,
  sumHist,
  dist,
};
writeFileSync(new URL("../../data/rates.json", import.meta.url), JSON.stringify(out));
console.error(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`, presetPass);
