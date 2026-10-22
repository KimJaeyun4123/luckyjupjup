import { describe, expect, it } from "vitest";
import { choose, decodeGame, decodeGames, encodeGame, encodeGames, parseNumberList, rankOf, unrank } from "./encode";
import { TOTAL_COMBOS } from "./features";

describe("encode", () => {
  it("조합 수", () => {
    expect(choose(45, 6)).toBe(TOTAL_COMBOS);
  });
  it("첫 조합과 마지막 조합", () => {
    expect(rankOf([1, 2, 3, 4, 5, 6])).toBe(0);
    expect(rankOf([40, 41, 42, 43, 44, 45])).toBe(TOTAL_COMBOS - 1);
    expect(unrank(0)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(unrank(TOTAL_COMBOS - 1)).toEqual([40, 41, 42, 43, 44, 45]);
  });
  it("왕복 변환", () => {
    const samples = [
      [1, 2, 3, 4, 5, 45],
      [16, 22, 23, 24, 27, 28],
      [3, 19, 21, 25, 37, 45],
      [10, 23, 29, 33, 37, 40],
      [2, 11, 20, 29, 38, 44],
    ];
    for (const s of samples) {
      expect(unrank(rankOf(s))).toEqual(s);
      expect(decodeGame(encodeGame(s))).toEqual(s);
      expect(encodeGame(s)).toHaveLength(5);
    }
  });
  it("순위는 단조롭고 1:1 (앞쪽 1만 개)", () => {
    const seen = new Set<number>();
    for (let r = 0; r < 10_000; r++) {
      const c = unrank(r);
      expect(rankOf(c)).toBe(r);
      seen.add(rankOf(c));
    }
    expect(seen.size).toBe(10_000);
  });
  it("여러 게임을 이어 붙이고 잘못된 조각은 버린다", () => {
    const games = [
      [1, 2, 3, 4, 5, 6],
      [16, 22, 23, 24, 27, 28],
    ];
    const s = encodeGames(games);
    expect(s).toHaveLength(10);
    expect(decodeGames(s)).toEqual(games);
    expect(decodeGames(s + "zzzzz")).toEqual(games); // 범위 밖
    expect(decodeGames("abc")).toEqual([]);
    expect(decodeGames(undefined)).toEqual([]);
  });
  it("숫자 목록 파라미터", () => {
    expect(parseNumberList("7-21-3-7-99-0")).toEqual([3, 7, 21]);
    expect(parseNumberList("1,2.3 4")).toEqual([1, 2, 3, 4]);
    expect(parseNumberList(undefined)).toEqual([]);
  });
});
