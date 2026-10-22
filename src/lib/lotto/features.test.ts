import { describe, expect, it } from "vitest";
import { featuresOf, normalize, overlap, sectionOf } from "./features";

describe("featuresOf", () => {
  it("1·2·3·4·5·6 은 AC 0, 연속 5쌍", () => {
    const f = featuresOf([1, 2, 3, 4, 5, 6]);
    expect(f.ac).toBe(0);
    expect(f.consecutivePairs).toBe(5);
    expect(f.maxRun).toBe(6);
    expect(f.sum).toBe(21);
    expect(f.oddCount).toBe(3);
    expect(f.lowCount).toBe(6);
    expect(f.maxSection).toBe(6);
    expect(f.sectionCount).toBe(1);
    expect(f.birthdayOnly).toBe(true);
  });
  it("등차수열 1·8·15·22·29·36 은 AC 0", () => {
    expect(featuresOf([1, 8, 15, 22, 29, 36]).ac).toBe(0);
  });
  it("1246회 16·22·23·24·27·28", () => {
    const f = featuresOf([16, 22, 23, 24, 27, 28]);
    expect(f.sum).toBe(140);
    expect(f.consecutivePairs).toBe(3);
    expect(f.maxRun).toBe(3);
    // 차이값: 6,7,8,11,12,1,2,5,6,1,4,5,3,4,1 → {1,2,3,4,5,6,7,8,11,12} = 10개 → AC 5
    expect(f.ac).toBe(5);
    expect(f.maxSameEnding).toBe(1); // 끝수 6·2·3·4·7·8 모두 다름
  });
  it("끝수·구간·소수·범위", () => {
    const f = featuresOf([3, 13, 23, 33, 43, 45]);
    expect(f.maxSameEnding).toBe(5);
    expect(f.endingSum).toBe(3 * 5 + 5);
    expect(f.sectionCounts).toEqual([1, 1, 1, 1, 2]);
    expect(f.sectionCount).toBe(5);
    expect(f.primeCount).toBe(4); // 3,13,23,43
    expect(f.multipleOf3Count).toBe(3); // 3·33·45
    expect(f.range).toBe(42);
    expect(f.upperCount).toBe(3);
    expect(f.birthdayOnly).toBe(false);
  });
});

describe("normalize / overlap / sectionOf", () => {
  it("정렬·중복·범위", () => {
    expect(normalize([45, 1, 7, 3, 20, 11])).toEqual([1, 3, 7, 11, 20, 45]);
    expect(normalize([1, 1, 2, 3, 4, 5])).toBeNull();
    expect(normalize([0, 2, 3, 4, 5, 6])).toBeNull();
    expect(normalize([1, 2, 3, 4, 5])).toBeNull();
  });
  it("overlap", () => {
    expect(overlap([1, 2, 3, 4, 5, 6], [4, 5, 6, 7, 8, 9])).toBe(3);
  });
  it("sectionOf", () => {
    expect([1, 10, 11, 20, 21, 30, 31, 40, 41, 45].map(sectionOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});
