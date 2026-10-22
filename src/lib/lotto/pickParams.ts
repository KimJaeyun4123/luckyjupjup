import { decodeGames, encodeGames, formatNumberList, parseNumberList } from "./encode";
import type { Combo } from "./features";
import { MAX_GAMES, MAX_INCLUDE } from "./generate";
import { DEFAULT_PRESET, type PresetId, isPresetId } from "./presets";

/** /pick 과 /pick/result 가 URL로 주고받는 값 */
export interface PickParams {
  preset: PresetId;
  count: number;
  include: number[];
  exclude: number[];
  /** 결과에만 있다 */
  games: Combo[];
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parsePickParams(sp: Search): PickParams {
  const t = one(sp.t);
  const n = Number(one(sp.n));
  const include = parseNumberList(one(sp.fix), MAX_INCLUDE);
  const exclude = parseNumberList(one(sp.ex)).filter((x) => !include.includes(x));
  return {
    preset: t && isPresetId(t) ? t : DEFAULT_PRESET,
    count: Number.isInteger(n) && n >= 1 && n <= MAX_GAMES ? n : MAX_GAMES,
    include,
    exclude,
    games: decodeGames(one(sp.g), MAX_GAMES),
  };
}

export function pickParamsToSearch(p: Omit<PickParams, "games"> & { games?: readonly Combo[] }): URLSearchParams {
  const q = new URLSearchParams();
  q.set("t", p.preset);
  q.set("n", String(p.count));
  if (p.include.length) q.set("fix", formatNumberList(p.include));
  if (p.exclude.length) q.set("ex", formatNumberList(p.exclude));
  if (p.games?.length) q.set("g", encodeGames(p.games));
  return q;
}
