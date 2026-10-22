import { describe, expect, it } from "vitest";
import { GenerateError, generate, weightsFor } from "./generate";
import { BALANCED_RULES, PRESETS, presetById } from "./presets";
import { seededRng } from "./random";
import { type RuleContext, evaluate } from "./rules";

const ctx: RuleContext = {
  previous: [16, 22, 23, 24, 27, 28],
  hot: new Set([34, 13, 27, 12, 18, 33, 1, 3, 7, 14, 17, 19, 20, 37, 38]),
  cold: new Set([9, 22, 32, 23, 41, 5, 2, 8, 28, 30, 25, 29, 6, 26, 36]),
  absent: new Set([45, 17, 30, 3, 8, 14, 10, 40, 2]),
  pastWinners: new Set(["1-2-3-4-5-6"]),
};

describe("generate", () => {
  for (const preset of PRESETS) {
    it(`${preset.id}: 만든 게임은 전부 규칙을 통과하고 중복·정렬 조건을 지킨다`, () => {
      const rng = seededRng(42);
      const include = preset.acceptsInclude ? [7, 21] : [];
      for (let k = 0; k < 40; k++) {
        const r = generate({ preset, count: 5, include, ctx, rng, weights: weightsFor(preset.weighting === "hot" ? ctx.hot : preset.weighting === "absent" ? ctx.absent : undefined) });
        expect(r.games).toHaveLength(5);
        const keys = new Set(r.games.map((g) => g.join("-")));
        expect(keys.size).toBe(5);
        for (const g of r.games) {
          expect([...g].sort((a, b) => a - b)).toEqual([...g]);
          expect(new Set(g).size).toBe(6);
          expect(evaluate(g, r.rules, ctx).pass).toBe(true);
          include.forEach((n) => expect(g).toContain(n));
        }
      }
    });
  }

  it("제외수는 절대 들어가지 않는다", () => {
    const r = generate({ preset: presetById("random")!, count: 5, exclude: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], rng: seededRng(1) });
    for (const g of r.games) for (const n of g) expect(n).toBeGreaterThan(20);
  });

  it("고정수·제외수로 6개를 채울 수 없으면 오류", () => {
    const exclude = Array.from({ length: 41 }, (_, i) => i + 1); // 1~41 제외 → 남는 수 4개
    expect(() => generate({ preset: presetById("random")!, count: 1, exclude })).toThrow(GenerateError);
  });

  it("조건이 모순이면 GenerateError 에 떨어진 규칙이 담긴다", () => {
    const preset = { ...presetById("balanced")!, rules: [...BALANCED_RULES, { kind: "range" as const, feature: "sum" as const, min: 250 }] };
    try {
      generate({ preset, count: 1, rng: seededRng(3), maxAttempts: 500 });
      throw new Error("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(GenerateError);
      expect(Object.keys((e as GenerateError).failures)).toContain("sum:250-");
    }
  });

  it("완전 랜덤 20만 개 중 균형 규칙 통과율은 42.7% ± 1%p", () => {
    const rng = seededRng(7);
    const preset = presetById("random")!;
    let pass = 0;
    const N = 40_000;
    for (let i = 0; i < N; i += 5) {
      const r = generate({ preset, count: 5, rng });
      for (const g of r.games) if (evaluate(g, BALANCED_RULES).pass) pass++;
    }
    const rate = pass / N;
    expect(rate).toBeGreaterThan(0.417);
    expect(rate).toBeLessThan(0.437);
  });

  it("spreadAcrossGames 는 5게임의 겹침을 줄인다", () => {
    const preset = presetById("random")!;
    const distinct = (spread: boolean) => {
      let total = 0;
      for (let s = 0; s < 50; s++) {
        const r = generate({ preset, count: 5, rng: seededRng(100 + s), spreadAcrossGames: spread });
        total += new Set(r.games.flat()).size;
      }
      return total / 50;
    };
    expect(distinct(true)).toBeGreaterThan(distinct(false));
  });
});
