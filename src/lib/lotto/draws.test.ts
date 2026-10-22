import { describe, expect, it } from "vitest";
import { DRAWS, LATEST, absentRounds, absentSet, buildContext, frequency, historicalPassRate, hotSet, pastWinners } from "./draws";
import { presetById } from "./presets";
import { drawDateOfRound, roundOfDrawDate } from "./schedule";

describe("draws.json", () => {
  it("1회부터 빠짐없이 오름차순이고 번호가 올바르다", () => {
    expect(DRAWS[0].round).toBe(1);
    DRAWS.forEach((d, i) => {
      expect(d.round).toBe(i + 1);
      expect(d.numbers).toHaveLength(6);
      expect(new Set(d.numbers).size).toBe(6);
      expect([...d.numbers].sort((a, b) => a - b)).toEqual(d.numbers);
      d.numbers.forEach((n) => expect(n >= 1 && n <= 45).toBe(true));
      expect(d.numbers).not.toContain(d.bonus);
      expect(d.prizes.map((p) => p.rank)).toEqual([1, 2, 3, 4, 5]);
    });
  });
  it("추첨일은 회차 공식과 맞는다 (매주 토요일)", () => {
    for (const d of DRAWS) {
      expect(d.date).toBe(drawDateOfRound(d.round));
      expect(roundOfDrawDate(d.date)).toBe(d.round);
    }
  });
  it("알려진 회차", () => {
    expect(DRAWS[0]).toMatchObject({ date: "2002-12-07", numbers: [10, 23, 29, 33, 37, 40], bonus: 16 });
    const r1246 = DRAWS.find((d) => d.round === 1246)!;
    expect(r1246).toMatchObject({ date: "2026-10-17", numbers: [16, 22, 23, 24, 27, 28], bonus: 6 });
    expect(r1246.prizes[0]).toEqual({ rank: 1, winners: 16, amount: 1881025430 });
    expect(LATEST.round).toBeGreaterThanOrEqual(1246);
  });
});

describe("파생 통계", () => {
  it("빈도 합은 회차 수 × 6", () => {
    const f = frequency();
    expect(f.slice(1).reduce((a, b) => a + b, 0)).toBe(DRAWS.length * 6);
    expect(frequency(10).slice(1).reduce((a, b) => a + b, 0)).toBe(60);
  });
  it("최신 회차 번호의 미출현은 0", () => {
    const gaps = absentRounds();
    for (const n of LATEST.numbers) expect(gaps[n]).toBe(0);
  });
  it("핫 15개·미출현 집합·역대 1등", () => {
    expect(hotSet().size).toBe(15);
    expect(absentSet().numbers.size).toBeGreaterThanOrEqual(8);
    expect(pastWinners().has("16-22-23-24-27-28")).toBe(true);
    const ctx = buildContext();
    expect(ctx.previous).toEqual(LATEST.numbers);
  });
  it("균형형의 역대 통과율은 약 42~43%", () => {
    const r = historicalPassRate(presetById("balanced")!);
    expect(r.total).toBe(DRAWS.length);
    expect(r.pass / r.total).toBeGreaterThan(0.40);
    expect(r.pass / r.total).toBeLessThan(0.45);
  });
});
