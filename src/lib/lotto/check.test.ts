import { describe, expect, it } from "vitest";
import { check } from "./check";

const draw = {
  numbers: [16, 22, 23, 24, 27, 28],
  bonus: 6,
  prizes: [
    { rank: 1 as const, winners: 16, amount: 1881025430 },
    { rank: 2 as const, winners: 64, amount: 78376060 },
    { rank: 3 as const, winners: 3350, amount: 1497334 },
    { rank: 4 as const, winners: 155108, amount: 50000 },
    { rank: 5 as const, winners: 2608922, amount: 5000 },
  ],
};

describe("check", () => {
  it("등수 판정", () => {
    expect(check([16, 22, 23, 24, 27, 28], draw)).toMatchObject({ rank: 1, amount: 1881025430 });
    expect(check([6, 22, 23, 24, 27, 28], draw)).toMatchObject({ rank: 2, bonusMatched: true, amount: 78376060 });
    expect(check([1, 22, 23, 24, 27, 28], draw)).toMatchObject({ rank: 3, amount: 1497334 });
    expect(check([1, 2, 23, 24, 27, 28], draw)).toMatchObject({ rank: 4, amount: 50000 });
    expect(check([1, 2, 3, 24, 27, 28], draw)).toMatchObject({ rank: 5, amount: 5000 });
    expect(check([1, 2, 3, 4, 27, 28], draw)).toMatchObject({ rank: null, amount: 0 });
    expect(check([1, 2, 3, 4, 5, 6], draw)).toMatchObject({ rank: null, bonusMatched: true });
  });
});
