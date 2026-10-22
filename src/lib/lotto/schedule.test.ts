import { describe, expect, it } from "vitest";
import { drawDateOfRound, drawTimeOfRound, nextDraw, remainingText, roundForPurchase, roundOfDrawDate } from "./schedule";

const kst = (s: string) => new Date(`${s}+09:00`);

describe("schedule", () => {
  it("회차 ↔ 날짜", () => {
    expect(drawDateOfRound(1)).toBe("2002-12-07");
    expect(drawDateOfRound(1246)).toBe("2026-10-17");
    expect(roundOfDrawDate("2026-10-17")).toBe(1246);
    expect(roundOfDrawDate("2026-10-18")).toBeNull();
  });
  it("추첨 시각은 토요일 20:35 KST", () => {
    expect(new Date(drawTimeOfRound(1246)).toISOString()).toBe("2026-10-17T11:35:00.000Z");
  });
  it("구매 회차: 토요일 20:00 마감 전후", () => {
    expect(roundForPurchase(kst("2026-10-22T16:00:00"))).toBe(1247); // 목요일
    expect(roundForPurchase(kst("2026-10-24T19:59:00"))).toBe(1247); // 마감 1분 전
    expect(roundForPurchase(kst("2026-10-24T20:00:00"))).toBe(1248); // 마감
    expect(roundForPurchase(kst("2026-10-25T03:00:00"))).toBe(1248); // 일요일
  });
  it("다음 추첨", () => {
    expect(nextDraw(kst("2026-10-24T20:34:00"))).toMatchObject({ round: 1247 });
    expect(nextDraw(kst("2026-10-24T20:36:00"))).toMatchObject({ round: 1248 });
    expect(nextDraw(kst("2026-10-24T20:36:00")).at.toISOString()).toBe("2026-10-31T11:35:00.000Z");
  });
  it("남은 시간 문구", () => {
    expect(remainingText(kst("2026-10-22T16:00:00"), kst("2026-10-24T20:35:00"))).toBe("2일 4시간 뒤");
    expect(remainingText(kst("2026-10-24T18:00:00"), kst("2026-10-24T20:35:00"))).toBe("2시간 35분 뒤");
    expect(remainingText(kst("2026-10-24T20:30:00"), kst("2026-10-24T20:35:00"))).toBe("5분 뒤");
    expect(remainingText(kst("2026-10-24T20:36:00"), kst("2026-10-24T20:35:00"))).toBe("곧");
  });
});
