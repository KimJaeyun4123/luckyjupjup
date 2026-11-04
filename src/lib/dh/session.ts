import { randomBytes } from "node:crypto";
import { Dhlottery } from "./client";

/**
 * 로그인한 동행복권 세션을 서버 메모리에 잠깐 둔다. 비밀번호는 로그인 요청에만 쓰고 바로 지우며,
 * 남는 것은 동행복권 세션 쿠키뿐이다. 토큰은 사용자 브라우저의 httpOnly 쿠키에 담긴다. 30분 뒤 사라진다.
 * 인스턴스가 아니라 쿠키만 저장하므로 개발 서버가 모듈을 다시 읽어도(HMR) 최신 클라이언트 코드로 이어진다.
 */
export const SESSION_COOKIE = "lj_dh";
const TTL = 30 * 60 * 1000;

interface Entry {
  userId: string;
  cookies: [string, string][];
  expires: number;
  /** 예전 형식(인스턴스 저장) 호환 */
  client?: Dhlottery;
}

// 개발 서버의 HMR 로 모듈이 다시 로드돼도 세션이 남게 globalThis 에 둔다
const g = globalThis as unknown as { __ljDhSessions?: Map<string, Entry> };
const store: Map<string, Entry> = (g.__ljDhSessions ??= new Map());

function sweep() {
  const now = Date.now();
  for (const [k, v] of store) if (v.expires < now) store.delete(k);
}

export function putSession(client: Dhlottery): string {
  sweep();
  const token = randomBytes(32).toString("base64url");
  store.set(token, { userId: client.userId, cookies: client.http.jar.entries(), expires: Date.now() + TTL });
  return token;
}

export function getSession(token: string | undefined): Dhlottery | null {
  if (!token) return null;
  const e = store.get(token);
  if (!e) return null;
  if (e.expires < Date.now()) {
    store.delete(token);
    return null;
  }
  e.expires = Date.now() + TTL;
  if (e.client && !e.cookies?.length) {
    // 예전 형식에서 쿠키를 꺼내 온다
    e.cookies = e.client.http.jar.header().split("; ").filter(Boolean).map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i), kv.slice(i + 1)] as [string, string];
    });
    e.userId = e.client.userId;
    delete e.client;
  }
  const client = new Dhlottery(e.userId, "");
  client.http.jar.load(e.cookies);
  return client;
}

/** 요청 중에 바뀐 쿠키를 세션에 되돌려 둔다 */
export function syncSession(token: string | undefined, client: Dhlottery) {
  const e = token ? store.get(token) : undefined;
  if (e) e.cookies = client.http.jar.entries();
}

export function dropSession(token: string | undefined) {
  if (token) store.delete(token);
}

export const maskId = (id: string) => (id.length <= 3 ? id[0] + "**" : id.slice(0, 3) + "*".repeat(Math.min(6, id.length - 3)));
