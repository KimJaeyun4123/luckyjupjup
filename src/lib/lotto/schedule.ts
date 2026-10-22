/**
 * 회차와 날짜. 1회는 2002-12-07(토)이고 매주 토요일 20:35 KST에 추첨, 20:00에 판매를 마감한다.
 * 모든 계산은 KST(UTC+9, 서머타임 없음) 기준이다.
 */
export const ROUND1_DATE = "2002-12-07";
export const DRAW_HOUR = 20;
export const DRAW_MINUTE = 35;
export const CLOSE_HOUR = 20;
export const CLOSE_MINUTE = 0;
const KST = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const ROUND1_UTC = Date.UTC(2002, 11, 7);

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** n회 추첨일 (YYYY-MM-DD) */
export const drawDateOfRound = (round: number) => ymd(ROUND1_UTC + (round - 1) * 7 * DAY);

/** 추첨일(YYYY-MM-DD) → 회차. 토요일이 아니면 null */
export function roundOfDrawDate(date: string): number | null {
  const [y, m, d] = date.split("-").map(Number);
  const diff = Date.UTC(y, m - 1, d) - ROUND1_UTC;
  if (diff < 0 || diff % (7 * DAY) !== 0) return null;
  return diff / (7 * DAY) + 1;
}

/** n회 추첨 시각 (UTC ms) */
export const drawTimeOfRound = (round: number) => ROUND1_UTC + (round - 1) * 7 * DAY + (DRAW_HOUR * 60 + DRAW_MINUTE) * 60 * 1000 - KST;
/** n회 판매 마감 시각 (UTC ms) */
export const closeTimeOfRound = (round: number) => ROUND1_UTC + (round - 1) * 7 * DAY + (CLOSE_HOUR * 60 + CLOSE_MINUTE) * 60 * 1000 - KST;

/** 지금 번호를 사면 들어가는 회차: 판매 마감 전인 가장 가까운 토요일 */
export function roundForPurchase(now: Date = new Date()): number {
  const t = now.getTime();
  const weeks = Math.floor((t + KST - ROUND1_UTC) / (7 * DAY));
  const candidate = weeks + 1; // 이번 주(KST 기준 토요일로 끝나는 주)의 회차
  return t < closeTimeOfRound(candidate) ? candidate : candidate + 1;
}

/** 다음 추첨(아직 추첨 전인 가장 가까운 회차)의 회차와 시각 */
export function nextDraw(now: Date = new Date()): { round: number; at: Date } {
  const t = now.getTime();
  const weeks = Math.floor((t + KST - ROUND1_UTC) / (7 * DAY));
  let round = weeks + 1;
  if (t >= drawTimeOfRound(round)) round++;
  return { round, at: new Date(drawTimeOfRound(round)) };
}

/** '2일 3시간 뒤' 같은 남은 시간 문구 */
export function remainingText(from: Date, to: Date): string {
  let ms = to.getTime() - from.getTime();
  if (ms <= 0) return "곧";
  const d = Math.floor(ms / DAY);
  ms -= d * DAY;
  const h = Math.floor(ms / 3600000);
  ms -= h * 3600000;
  const m = Math.floor(ms / 60000);
  if (d > 0) return `${d}일 ${h}시간 뒤`;
  if (h > 0) return `${h}시간 ${m}분 뒤`;
  return `${m}분 뒤`;
}

export const formatKstDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const wd = "일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} (${wd})`;
};
