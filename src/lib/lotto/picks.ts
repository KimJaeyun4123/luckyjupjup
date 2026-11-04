import type { Combo } from "./features";
import type { PresetId } from "./presets";

/** 이 기기에 저장한 번호. 서버로 보내지 않는다 */
export interface SavedPick {
  id: string;
  /** 구매 대상 회차 */
  round: number;
  games: number[][];
  presetId: PresetId | "custom";
  /** ISO 시각 */
  savedAt: string;
  /** 동행복권에서 실제로 구매한 번호 */
  bought?: boolean;
}

export const PICKS_KEY = "luckyjupjup:picks";
const MAX = 200;
const newId = () => Math.random().toString(36).slice(2, 10);

export function loadPicks(): SavedPick[] {
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    const list = raw ? (JSON.parse(raw) as SavedPick[]) : [];
    return Array.isArray(list) ? list.filter((p) => p && Array.isArray(p.games) && Number.isInteger(p.round)) : [];
  } catch {
    return [];
  }
}

function write(list: SavedPick[]) {
  try {
    localStorage.setItem(PICKS_KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new Event("luckyjupjup:picks-changed"));
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 저장하지 않는다
  }
}

export function savePick(round: number, games: readonly Combo[], presetId: SavedPick["presetId"], now = new Date(), bought = false): SavedPick[] {
  const list = loadPicks();
  list.unshift({ id: newId(), round, games: games.map((g) => [...g]), presetId, savedAt: now.toISOString(), ...(bought ? { bought: true } : {}) });
  write(list);
  return list;
}

export function removePick(id: string): SavedPick[] {
  const list = loadPicks().filter((p) => p.id !== id);
  write(list);
  return list;
}

/** 이 기기에 남긴 행운줍줍 값을 모두 지운다. 지운 개수를 돌려준다 */
export function clearSaved(): number {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("luckyjupjup:"));
    keys.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("luckyjupjup:picks-changed"));
    return keys.length;
  } catch {
    return 0;
  }
}
