import { describe, expect, it } from "vitest";
import { buildManualParam, hiddenInput, isSaleOpen, loginErrorOf, parseRsaKey, rsaEncryptHex, ymdKst } from "../../src/lib/dh/client";
import { gameResults, purchaseMessage, resultMessage, resultUrl } from "./format";
import { CookieJar } from "../../src/lib/dh/http";
import { totals } from "./state";

const kst = (s: string) => new Date(`${s}+09:00`);

describe("dhlottery 파서", () => {
  it("RSA 키 응답 두 형식", () => {
    expect(parseRsaKey('{"data":{"rsaModulus":"abc","publicExponent":"10001"}}')).toEqual({ modulus: "abc", exponent: "10001" });
    expect(parseRsaKey('{"rsaModulus":"abc","publicExponent":"10001"}')).toEqual({ modulus: "abc", exponent: "10001" });
    expect(() => parseRsaKey("<html>")).toThrow();
  });
  it("RSA 암호문은 모듈러스 길이의 16진수", () => {
    // 테스트용 512비트 모듈러스 (실서비스 키 아님)
    const mod = "c4f8e9e15dcadf2b96c763d981006a644ffb4415030a16ed1283883340f2aa0e2be2be8fa60150b9046965837c3e7d151b7de237ebb957c20663898250703b3f";
    const hex = rsaEncryptHex("hello", mod, "10001");
    expect(hex).toMatch(/^[0-9a-f]{128}$/);
    expect(rsaEncryptHex("hello", mod, "10001")).not.toBe(hex); // 패딩이 랜덤
  });
  it("로그인 오류 문구와 숨은 input", () => {
    expect(loginErrorOf("<script>const errorMessage = '아이디 또는 비밀번호가 일치하지 않습니다.';</script>")).toBe("아이디 또는 비밀번호가 일치하지 않습니다.");
    expect(loginErrorOf("<script>const errorMessage = '';</script>")).toBeNull();
    expect(hiddenInput('<input type="hidden" id="curRound" value="1247">', "curRound")).toBe("1247");
    expect(hiddenInput('<input value="2026-10-24" type="hidden" id="ROUND_DRAW_DATE">', "ROUND_DRAW_DATE")).toBe("2026-10-24");
    expect(hiddenInput("<div></div>", "curRound")).toBeNull();
  });
  it("수동 구매 파라미터", () => {
    const p = JSON.parse(buildManualParam([[7, 1, 45, 21, 13, 30], [2, 3, 4, 5, 6, 8]]));
    expect(p).toEqual([
      { genType: "1", arrGameChoiceNum: "1,7,13,21,30,45", alpabet: "A" },
      { genType: "1", arrGameChoiceNum: "2,3,4,5,6,8", alpabet: "B" },
    ]);
  });
  it("판매 시간", () => {
    expect(isSaleOpen(kst("2026-10-23T09:10:00"))).toBe(true); // 금 09:10
    expect(isSaleOpen(kst("2026-10-23T05:59:00"))).toBe(false);
    expect(isSaleOpen(kst("2026-10-24T19:59:00"))).toBe(true); // 토 마감 전
    expect(isSaleOpen(kst("2026-10-24T20:00:00"))).toBe(false);
    expect(isSaleOpen(kst("2026-10-25T10:00:00"))).toBe(true); // 일
    expect(ymdKst(kst("2026-10-24T23:30:00"))).toBe("20261024");
  });
});

describe("쿠키 통", () => {
  it("Set-Cookie 를 모아 Cookie 헤더로", () => {
    const jar = new CookieJar();
    const h = new Headers();
    h.append("set-cookie", "JSESSIONID=abc; Path=/; HttpOnly");
    h.append("set-cookie", "WMONID=xyz; Domain=.dhlottery.co.kr");
    jar.take(h);
    expect(jar.header()).toBe("JSESSIONID=abc; WMONID=xyz");
    const h2 = new Headers();
    h2.append("set-cookie", "JSESSIONID=def; Path=/");
    jar.take(h2);
    expect(jar.header()).toBe("JSESSIONID=def; WMONID=xyz");
  });
});

describe("메시지", () => {
  const draw = {
    round: 1246,
    date: "2026-10-17",
    numbers: [16, 22, 23, 24, 27, 28],
    bonus: 6,
    prizes: [
      { rank: 1 as const, winners: 16, amount: 1881025430 },
      { rank: 2 as const, winners: 64, amount: 78376060 },
      { rank: 3 as const, winners: 3350, amount: 1497334 },
      { rank: 4 as const, winners: 155108, amount: 50000 },
      { rank: 5 as const, winners: 2608922, amount: 5000 },
    ],
    sales: 0,
    firstBy: { auto: 0, manual: 0, semiAuto: 0 },
  };
  const games = [
    [16, 22, 23, 24, 27, 28],
    [1, 2, 3, 24, 27, 28],
    [1, 2, 3, 4, 5, 6],
  ];
  it("결과 URL 은 행운줍줍 결과 화면", () => {
    expect(resultUrl("https://x/lotto", "balanced", games)).toMatch(/^https:\/\/x\/lotto\/pick\/result\?t=balanced&n=3&g=[0-9a-z]{15}$/);
  });
  it("구매·결과 메시지", () => {
    const p = { round: 1246, boughtAt: "2026-10-16T00:10:00Z", preset: "balanced" as const, games, amount: 3000, balanceAfter: 2000, resultUrl: "https://x/lotto/pick/result?g=1" };
    const m = purchaseMessage(p, 5000);
    expect(m).toContain("1246회 로또 구매 완료");
    expect(m).toContain("5,000원 → 2,000원");
    const results = gameResults(games, draw);
    expect(results.map((r) => r.rank)).toEqual([1, 5, null]);
    const r = resultMessage({ ...p, result: { checkedAt: "", numbers: draw.numbers, bonus: draw.bonus, games: results } }, draw, { spent: 3000, won: 1881030430, rounds: 1, checked: 1 });
    expect(r).toContain("🥇 1등 당첨!");
    expect(r).toContain("3,000원 쓰고 1,881,030,430원 당첨");
    expect(r).toContain("농협은행");
  });
  it("누적 집계는 드라이런을 뺀다", () => {
    const t = totals({
      purchases: [
        { round: 1, boughtAt: "", preset: "random", games: [], amount: 5000, balanceAfter: null, resultUrl: "", result: { checkedAt: "", numbers: [], bonus: 0, games: [{ matched: 3, bonus: false, rank: 5, amount: 5000 }] } },
        { round: 2, boughtAt: "", preset: "random", games: [], amount: 5000, balanceAfter: null, resultUrl: "", dryRun: true },
        { round: 3, boughtAt: "", preset: "random", games: [], amount: 2000, balanceAfter: null, resultUrl: "" },
      ],
    });
    expect(t).toEqual({ spent: 7000, won: 5000, rounds: 2, checked: 1 });
  });
});
