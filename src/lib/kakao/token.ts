/**
 * 카카오톡 "나에게 보내기"용 토큰. 카카오 디벨로퍼스 앱의 REST API 키로 본인 계정에 한 번 로그인(OAuth)하면
 * access/refresh 토큰을 파일(agent/kakao-token.json, git 제외)에 둔다. access 토큰은 6시간, refresh 토큰은 2개월이며
 * refresh 토큰도 만료 1개월 전부터 갱신되므로 주 1회 돌면 재로그인 없이 이어진다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const KAKAO_AUTH = "https://kauth.kakao.com";
export const KAKAO_API = "https://kapi.kakao.com";
// Next(Turbopack)는 new URL(…, import.meta.url) 을 정적 자산으로 해석하므로 작업 디렉터리 기준 경로를 쓴다 (Next·tsx 모두 프로젝트 루트)
export const TOKEN_FILE = path.join(process.cwd(), "agent", "kakao-token.json");

export interface KakaoToken {
  access_token: string;
  refresh_token: string;
  /** ms epoch */
  access_expires_at: number;
  refresh_expires_at: number;
  /** 연결한 시각 */
  connected_at: string;
}

export interface KakaoConfig {
  restApiKey: string;
  clientSecret?: string;
  redirectUri: string;
}

export function kakaoConfig(env = process.env): KakaoConfig | null {
  const restApiKey = env.KAKAO_REST_API_KEY?.trim();
  if (!restApiKey) return null;
  return {
    restApiKey,
    clientSecret: env.KAKAO_CLIENT_SECRET?.trim() || undefined,
    redirectUri: env.KAKAO_REDIRECT_URI?.trim() || "http://localhost:3000/lotto/api/kakao/callback",
  };
}

export function authorizeUrl(cfg: KakaoConfig, state: string): string {
  const q = new URLSearchParams({ client_id: cfg.restApiKey, redirect_uri: cfg.redirectUri, response_type: "code", scope: "talk_message", state });
  return `${KAKAO_AUTH}/oauth/authorize?${q}`;
}

export function loadToken(file: string = TOKEN_FILE): KakaoToken | null {
  if (!existsSync(file)) return null;
  try {
    const t = JSON.parse(readFileSync(file, "utf8")) as KakaoToken;
    return t.access_token && t.refresh_token ? t : null;
  } catch {
    return null;
  }
}

export function saveToken(t: KakaoToken, file: string = TOKEN_FILE) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(t, null, 2) + "\n", { mode: 0o600 });
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
}

async function tokenRequest(cfg: KakaoConfig, form: Record<string, string>): Promise<TokenResponse> {
  const body = new URLSearchParams({ client_id: cfg.restApiKey, ...(cfg.clientSecret ? { client_secret: cfg.clientSecret } : {}), ...form });
  const res = await fetch(`${KAKAO_AUTH}/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) throw new Error(`카카오 토큰 요청 실패: ${json.error ?? res.status} ${json.error_description ?? ""}`.trim());
  return json;
}

function merge(prev: KakaoToken | null, r: TokenResponse, now = Date.now()): KakaoToken {
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token ?? prev?.refresh_token ?? "",
    access_expires_at: now + r.expires_in * 1000,
    refresh_expires_at: r.refresh_token_expires_in ? now + r.refresh_token_expires_in * 1000 : (prev?.refresh_expires_at ?? now + 60 * 86400000),
    connected_at: prev?.connected_at ?? new Date(now).toISOString(),
  };
}

/** 인가 코드 → 토큰 (연결 때 한 번) */
export async function exchangeCode(cfg: KakaoConfig, code: string, file: string = TOKEN_FILE): Promise<KakaoToken> {
  const t = merge(null, await tokenRequest(cfg, { grant_type: "authorization_code", redirect_uri: cfg.redirectUri, code }));
  saveToken(t, file);
  return t;
}

/** 유효한 access 토큰. 만료가 가까우면 refresh 토큰으로 갱신해 저장한다 */
export async function freshToken(cfg: KakaoConfig, file: string = TOKEN_FILE, now = Date.now()): Promise<KakaoToken> {
  const t = loadToken(file);
  if (!t) throw new Error("카카오톡이 연결되어 있지 않습니다. 행운줍줍 /dh 화면에서 '카카오톡 연결'을 먼저 하세요.");
  if (t.refresh_expires_at <= now) throw new Error("카카오 refresh 토큰이 만료됐습니다. /dh 에서 다시 연결하세요.");
  const accessOk = t.access_expires_at - now > 10 * 60 * 1000;
  const refreshSoon = t.refresh_expires_at - now < 30 * 86400000;
  if (accessOk && !refreshSoon) return t;
  const r = await tokenRequest(cfg, { grant_type: "refresh_token", refresh_token: t.refresh_token });
  const next = merge(t, r, now);
  saveToken(next, file);
  return next;
}
