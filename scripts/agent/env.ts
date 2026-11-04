import { existsSync, readFileSync } from "node:fs";
import { MAX_GAMES } from "../../src/lib/lotto/generate";
import { DEFAULT_PRESET, type PresetId, isPresetId } from "../../src/lib/lotto/presets";
import { parseNumberList } from "../../src/lib/lotto/encode";

/** .env 가 있으면 읽는다 (의존성 없이). 이미 있는 환경 변수는 덮어쓰지 않는다 */
export function loadDotEnv(path = new URL("../../.env", import.meta.url)) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

export interface AgentConfig {
  userId: string;
  password: string;
  telegramToken?: string;
  telegramChatId?: string;
  preset: PresetId;
  games: number;
  include: number[];
  exclude: number[];
  dryRun: boolean;
  /** 결과 링크에 쓰는 행운줍줍 주소 */
  siteUrl: string;
  statePath: URL;
}

const truthy = (v: string | undefined) => !!v && /^(1|true|yes|on)$/i.test(v);

export function readConfig(argv: string[] = process.argv.slice(2)): AgentConfig {
  loadDotEnv();
  const env = process.env;
  const userId = env.DHLOTTERY_ID?.trim();
  const password = env.DHLOTTERY_PASSWORD?.trim();
  if (!userId || !password) throw new Error("DHLOTTERY_ID, DHLOTTERY_PASSWORD 환경 변수가 필요합니다.");
  const games = Number(env.LOTTO_GAMES ?? MAX_GAMES);
  if (!Number.isInteger(games) || games < 1 || games > MAX_GAMES) throw new Error(`LOTTO_GAMES 는 1~${MAX_GAMES} 사이여야 합니다.`);
  const presetRaw = env.LOTTO_PRESET ?? DEFAULT_PRESET;
  if (!isPresetId(presetRaw)) throw new Error(`LOTTO_PRESET 값이 올바르지 않습니다: ${presetRaw}`);
  return {
    userId,
    password,
    telegramToken: env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
    telegramChatId: env.TELEGRAM_CHAT_ID?.trim() || undefined,
    preset: presetRaw,
    games,
    include: parseNumberList(env.LOTTO_FIXED, 5),
    exclude: parseNumberList(env.LOTTO_EXCLUDE),
    dryRun: truthy(env.LOTTO_DRY_RUN) || argv.includes("--dry-run"),
    siteUrl: (env.LOTTO_SITE_URL ?? "https://gyulngyul.vercel.app/lotto").replace(/\/$/, ""),
    statePath: new URL("../../agent/state.json", import.meta.url),
  };
}
