import type { TicketRaw } from "./client";

export interface TicketGame {
  numbers: number[] | null;
  /** 1 수동 · 2 반자동 · 3 자동 */
  type?: string;
  rank: number | null;
}

const TYPE_LABEL: Record<string, string> = { "1": "수동", "2": "반자동", "3": "자동" };
const inRange = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 45;

/** 한 게임 객체에서 번호 6개를 찾는다. 배열, '1,2,3,4,5,6' 문자열, num1~num6 같은 키 순서로 시도한다 */
export function numbersOf(item: Record<string, unknown>): number[] | null {
  for (const v of Object.values(item)) {
    if (Array.isArray(v) && v.length === 6 && v.map(Number).every(inRange)) return v.map(Number).sort((a, b) => a - b);
    if (typeof v === "string") {
      const m = v.match(/\d{1,2}/g)?.map(Number);
      if (m && m.length === 6 && m.every(inRange) && /^[\d,\s|/]+$/.test(v) && v.length >= 11) return [...m].sort((a, b) => a - b);
    }
  }
  const keyed = Object.entries(item)
    .filter(([k, v]) => /(num|no|ball|number)[_]?[1-6]$/i.test(k) && inRange(Number(v)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => Number(v));
  if (keyed.length === 6 && new Set(keyed).size === 6) return keyed.sort((a, b) => a - b);
  return null;
}

export function parseTicket(raw: TicketRaw): TicketGame[] {
  const list = Array.isArray(raw.game_dtl) ? raw.game_dtl : [];
  return list.map((item) => {
    const typeKey = Object.keys(item).find((k) => /type|gubun|sel|tp$|dcd$/i.test(k) && TYPE_LABEL[String(item[k])]);
    const rankRaw = item.rank ?? item.wnRnk ?? item.rnk;
    const rank = rankRaw === undefined || rankRaw === null || String(rankRaw) === "0" || String(rankRaw) === "" ? null : Number(rankRaw);
    return { numbers: numbersOf(item), type: typeKey ? TYPE_LABEL[String(item[typeKey])] : undefined, rank: Number.isFinite(rank as number) ? (rank as number) : null };
  });
}
