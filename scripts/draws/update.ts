/**
 * 동행복권의 (비공식) JSON 엔드포인트에서 새 회차를 받아 data/draws.json에 붙인다.
 * 실행: npm run draws:update  (GitHub Action이 토요일 21:00 KST에 돌린다)
 * 변경이 있으면 종료 코드 0과 함께 "updated" 를, 없으면 "no-change" 를 출력한다. 검증에 실패하면 1로 끝난다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { drawDateOfRound } from "../../src/lib/lotto/schedule";
import type { Draw } from "../../src/lib/lotto/draws";

const FILE = new URL("../../data/draws.json", import.meta.url);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 luckyjupjup-draws-updater";
const HEADERS = { "User-Agent": UA, Accept: "application/json", Referer: "https://www.dhlottery.co.kr/lt645/result" };

interface Official {
  ltEpsd: number;
  ltRflYmd: string;
  tm1WnNo: number; tm2WnNo: number; tm3WnNo: number; tm4WnNo: number; tm5WnNo: number; tm6WnNo: number;
  bnsWnNo: number;
  rnk1WnNope: number; rnk1WnAmt: number; rnk2WnNope: number; rnk2WnAmt: number; rnk3WnNope: number; rnk3WnAmt: number;
  rnk4WnNope: number; rnk4WnAmt: number; rnk5WnNope: number; rnk5WnAmt: number;
  wholEpsdSumNtslAmt: number;
  winType1: number; winType2: number; winType3: number;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) throw new Error(`${url} → not JSON (${ct})`);
  return (await res.json()) as T;
}

function toDraw(x: Official): Draw {
  const numbers = [x.tm1WnNo, x.tm2WnNo, x.tm3WnNo, x.tm4WnNo, x.tm5WnNo, x.tm6WnNo].sort((a, b) => a - b);
  const date = `${x.ltRflYmd.slice(0, 4)}-${x.ltRflYmd.slice(4, 6)}-${x.ltRflYmd.slice(6, 8)}`;
  const d: Draw = {
    round: x.ltEpsd,
    date,
    numbers,
    bonus: x.bnsWnNo,
    prizes: ([1, 2, 3, 4, 5] as const).map((r) => ({ rank: r, winners: x[`rnk${r}WnNope`], amount: x[`rnk${r}WnAmt`] })),
    sales: x.wholEpsdSumNtslAmt,
    firstBy: { auto: x.winType1, manual: x.winType2, semiAuto: x.winType3 },
  };
  // 검증: 번호 6개 서로 다름·범위, 보너스 미포함, 회차 공식과 날짜 일치
  if (new Set(numbers).size !== 6 || numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 45)) throw new Error(`bad numbers in ${x.ltEpsd}`);
  if (numbers.includes(d.bonus) || d.bonus < 1 || d.bonus > 45) throw new Error(`bad bonus in ${x.ltEpsd}`);
  if (drawDateOfRound(d.round) !== date) throw new Error(`date mismatch in ${x.ltEpsd}: ${date}`);
  if (!d.prizes.every((p) => Number.isInteger(p.winners) && Number.isInteger(p.amount) && p.amount >= 0)) throw new Error(`bad prizes in ${x.ltEpsd}`);
  return d;
}

async function main() {
  const draws = JSON.parse(readFileSync(FILE, "utf8")) as Draw[];
  const have = draws[draws.length - 1].round;
  const hist = await getJson<{ data: { lastLtEpsd: number } }>("https://www.dhlottery.co.kr/lt645/selectLt645History.do");
  const last = hist.data.lastLtEpsd;
  if (!Number.isInteger(last) || last < have) throw new Error(`unexpected lastLtEpsd ${last}`);
  if (last === have) {
    console.log("no-change");
    return;
  }
  const added: Draw[] = [];
  for (let center = last; center > have; center -= 10) {
    const res = await getJson<{ data: { list: Official[] } }>(`https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?srchLtEpsd=${center}`);
    for (const x of res.data.list) if (x.ltEpsd > have) added.push(toDraw(x));
    await new Promise((r) => setTimeout(r, 300));
  }
  added.sort((a, b) => a.round - b.round);
  const expected = Array.from({ length: last - have }, (_, i) => have + 1 + i);
  if (added.map((d) => d.round).join() !== expected.join()) throw new Error(`gap: got ${added.map((d) => d.round)} expected ${expected}`);
  // 폴백 대조: smok95 공개 데이터와 최신 회차 번호가 다르면 중단
  try {
    const s = await (await fetch("https://smok95.github.io/lotto/results/latest.json")).json();
    const mine = added[added.length - 1];
    if (s.draw_no === mine.round && (s.numbers.join() !== mine.numbers.join() || s.bonus_no !== mine.bonus)) throw new Error(`mismatch with smok95 for ${mine.round}`);
  } catch (e) {
    if ((e as Error).message.startsWith("mismatch")) throw e;
    console.error("smok95 cross-check skipped:", (e as Error).message);
  }
  writeFileSync(FILE, JSON.stringify([...draws, ...added]));
  console.log(`updated ${added.map((d) => d.round).join(",")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
