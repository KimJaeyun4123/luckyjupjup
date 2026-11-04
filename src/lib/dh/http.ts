/**
 * 쿠키를 기억하는 작은 HTTP 클라이언트. www.dhlottery.co.kr 과 ol.dhlottery.co.kr 이 세션 쿠키를 나눠 쓰므로
 * 호스트를 가리지 않고 *.dhlottery.co.kr 에 같은 쿠키를 보낸다. 리다이렉트는 직접 따라가며 중간 응답의 쿠키도 모은다.
 *
 * fetch(undici) 대신 node:https 를 쓴다. Next 개발 서버 안의 fetch 는 동행복권에 새 연결을 열 때 간헐적으로
 * 10초 연결 시간 초과(UND_ERR_CONNECT_TIMEOUT)를 냈고, 같은 기계에서 https 모듈은 100% 붙었다(2026-10-22).
 * 호스트마다 keep-alive 소켓 하나만 써서 요청을 직렬화하면 동행복권 WAF 가 새 연결을 잡는 일도 줄어든다.
 */
import https from "node:https";
import { gunzipSync, brotliDecompressSync, inflateSync } from "node:zlib";

export const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = 30_000;

export interface HttpResponse {
  status: number;
  url: string;
  headers: Headers;
  text: string;
  json<T>(): T;
}

export class CookieJar {
  private cookies = new Map<string, string>();
  take(headers: Headers) {
    for (const raw of headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const i = pair.indexOf("=");
      if (i <= 0) continue;
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (value === "" || /^deleted$/i.test(value)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  names() {
    return [...this.cookies.keys()];
  }
  entries(): [string, string][] {
    return [...this.cookies];
  }
  load(entries: readonly (readonly [string, string])[]) {
    this.cookies = new Map(entries);
  }
}

// 프로세스(개발 서버 HMR 포함)에서 호스트마다 소켓 하나를 돌려쓴다
const g = globalThis as unknown as { __ljDhAgent?: https.Agent };
const agent = (g.__ljDhAgent ??= new https.Agent({ keepAlive: true, maxSockets: 1, maxFreeSockets: 1, timeout: REQUEST_TIMEOUT }));

interface RawResponse {
  status: number;
  headers: Headers;
  text: string;
}

function rawRequest(url: string, method: string, headers: Record<string, string>, body?: string): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { host: u.hostname, port: 443, path: u.pathname + u.search, method, headers: { ...headers, ...(body !== undefined ? { "Content-Length": Buffer.byteLength(body) } : {}) }, agent },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          let buf = Buffer.concat(chunks);
          const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
          try {
            if (enc.includes("br")) buf = brotliDecompressSync(buf);
            else if (enc.includes("gzip")) buf = gunzipSync(buf);
            else if (enc.includes("deflate")) buf = inflateSync(buf);
          } catch {
            // 압축 해제에 실패하면 원문을 그대로 쓴다
          }
          const h = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (v === undefined) continue;
            if (Array.isArray(v)) v.forEach((x) => h.append(k, x));
            else h.set(k, v);
          }
          resolve({ status: res.statusCode ?? 0, headers: h, text: buf.toString("utf8") });
        });
        res.on("error", reject);
      },
    );
    req.setTimeout(REQUEST_TIMEOUT, () => req.destroy(Object.assign(new Error("요청 시간 초과"), { code: "ETIMEDOUT" })));
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

const RETRYABLE = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|EAI_AGAIN|ENOTFOUND|socket hang up/;

/** 연결 단계 오류만 짧게 재시도한다 (keep-alive 소켓이 서버 쪽에서 끊긴 경우 포함) */
async function requestWithRetry(url: string, method: string, headers: Record<string, string>, body?: string, tries = 3): Promise<RawResponse> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await rawRequest(url, method, headers, body);
    } catch (e) {
      last = e;
      const text = `${(e as { code?: string })?.code ?? ""} ${(e as Error)?.message ?? ""}`;
      if (!RETRYABLE.test(text) || i === tries - 1) break;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  const code = (last as { code?: string })?.code ?? (last as Error)?.message ?? "unknown";
  throw new Error(`동행복권에 연결하지 못했습니다 (${code}). 잠시 뒤 다시 시도하세요.`, { cause: last });
}

export class HttpClient {
  readonly jar = new CookieJar();
  constructor(private readonly defaultHeaders: Record<string, string> = {}) {}

  async request(url: string, init: { method?: string; headers?: Record<string, string>; body?: string; maxRedirects?: number } = {}): Promise<HttpResponse> {
    let current = url;
    let method = init.method ?? "GET";
    let body = init.body;
    for (let hop = 0; hop <= (init.maxRedirects ?? 5); hop++) {
      const headers: Record<string, string> = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        ...this.defaultHeaders,
        ...(hop === 0 ? init.headers ?? {} : {}),
      };
      const cookie = this.jar.header();
      if (cookie) headers.Cookie = cookie;
      const res = await requestWithRetry(current, method, headers, body);
      this.jar.take(res.headers);
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        if (!loc) break;
        current = new URL(loc, current).toString();
        if (res.status !== 307 && res.status !== 308) {
          method = "GET";
          body = undefined;
        }
        continue;
      }
      const text = res.text;
      return {
        status: res.status,
        url: current,
        headers: res.headers,
        text,
        json: <T>() => {
          if (text.trim().startsWith("<")) throw new Error(`JSON 대신 HTML 이 왔습니다 (${current}). 로그인이 풀렸거나 접근이 차단된 것일 수 있습니다.`);
          return JSON.parse(text) as T;
        },
      };
    }
    throw new Error(`리다이렉트가 너무 많습니다: ${url}`);
  }

  get(url: string, headers?: Record<string, string>) {
    return this.request(url, { headers });
  }
  postForm(url: string, form: Record<string, string>, headers?: Record<string, string>) {
    return this.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", ...headers },
      body: new URLSearchParams(form).toString(),
    });
  }
}
