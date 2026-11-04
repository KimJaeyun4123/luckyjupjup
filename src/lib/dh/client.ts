/**
 * 동행복권 비공식 HTTP 흐름 (2026-10 기준, 공개 오픈소스 구현들과 같은 경로).
 * - 로그인: /login/selectRsaModulus.do 로 RSA 공개키 → 아이디·비밀번호를 PKCS#1 v1.5 로 암호화 → /login/securityLoginCheck.do
 * - 예치금: /mypage/selectUserMndp.do
 * - 구매: ol.dhlottery.co.kr /olotto/game/egovUserReadySocket.json → game645.do 숨은 값 → execBuy.do
 * - 구매내역·당첨: /mypage/selectMyLotteryledger.do
 * 사이트가 바뀌면 깨질 수 있으므로 응답을 꼼꼼히 검증하고 원문을 남긴다.
 */
import { constants as cryptoConstants, createPublicKey, publicEncrypt } from "node:crypto";
import { HttpClient } from "./http";

export const WWW = "https://www.dhlottery.co.kr";
export const OL = "https://ol.dhlottery.co.kr";
const SLOTS = ["A", "B", "C", "D", "E"] as const;

export class DhlotteryError extends Error {
  constructor(
    message: string,
    public readonly kind: "blocked" | "login" | "balance" | "purchase" | "limit" | "parse" | "ledger",
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = "DhlotteryError";
  }
}

const AJAX = { "X-Requested-With": "XMLHttpRequest", Accept: "application/json, text/javascript, */*; q=0.01", AJAX: "true" };

function assertNotBlocked(url: string, text: string) {
  // 홈 HTML 에는 항상 숨은 안티봇 안내 레이어("서비스 접속이 차단", "접근 대기")가 들어 있으므로 본문 글자로는 판정하지 않는다.
  // 차단은 /errorPage 로 보내지거나, JSON 을 기대한 곳에 HTML 이 오는 것으로 드러난다.
  if (url.includes("/errorPage")) {
    throw new DhlotteryError("동행복권이 이 실행 환경(IP)의 접근을 막았거나 주소가 바뀌었습니다. 다른 네트워크(집 PC 등)에서 실행해 보세요.", "blocked", { url, snippet: text.slice(0, 300) });
  }
  if (/시스템\s*(정기\s*)?점검/.test(text) && text.length < 20000) {
    throw new DhlotteryError("동행복권 시스템 점검 중입니다. 잠시 뒤 다시 시도하세요.", "blocked", { url, snippet: text.slice(0, 300) });
  }
}

const hexToB64url = (hex: string) => {
  const h = hex.trim().replace(/^0x/i, "").replace(/[^0-9a-f]/gi, "").replace(/^00+/, "");
  return Buffer.from(h.length % 2 ? "0" + h : h, "hex").toString("base64url");
};

export function rsaEncryptHex(plain: string, modulusHex: string, exponentHex: string): string {
  const key = createPublicKey({ key: { kty: "RSA", n: hexToB64url(modulusHex), e: hexToB64url(exponentHex) }, format: "jwk" });
  return publicEncrypt({ key, padding: cryptoConstants.RSA_PKCS1_PADDING }, Buffer.from(plain, "utf8")).toString("hex");
}

export function parseRsaKey(text: string): { modulus: string; exponent: string } {
  const t = text.trim();
  if (t.startsWith("<")) throw new DhlotteryError("RSA 키 응답이 HTML 입니다.", "parse", t.slice(0, 300));
  const p = JSON.parse(t) as { data?: { rsaModulus?: string; publicExponent?: string }; rsaModulus?: string; publicExponent?: string };
  const modulus = p.data?.rsaModulus ?? p.rsaModulus;
  const exponent = p.data?.publicExponent ?? p.publicExponent;
  if (!modulus || !exponent) throw new DhlotteryError("RSA 키를 찾지 못했습니다.", "parse", p);
  return { modulus, exponent };
}

/** 로그인 응답 HTML 의 `const errorMessage = '...'` */
export const loginErrorOf = (html: string) => html.match(/const\s+errorMessage\s*=\s*'([^']*)'/)?.[1] || null;

/** 숨은 input 값. 속성 순서가 바뀌어도 읽는다 */
export function hiddenInput(html: string, id: string): string | null {
  const a = html.match(new RegExp(`id=["']${id}["'][^>]*value=["']([^"']*)["']`, "i"));
  if (a?.[1]) return a[1];
  const b = html.match(new RegExp(`value=["']([^"']*)["'][^>]*id=["']${id}["']`, "i"));
  return b?.[1] ?? null;
}

export interface BuyResult {
  round: number;
  games: number[][];
  amount: number;
  raw: unknown;
}

/** 수동 번호 구매 파라미터 (genType 1 = 수동). 자동은 genType 0 */
export function buildManualParam(games: readonly (readonly number[])[]): string {
  return JSON.stringify(games.map((g, i) => ({ genType: "1", arrGameChoiceNum: [...g].sort((a, b) => a - b).join(","), alpabet: SLOTS[i] })));
}

export class Dhlottery {
  readonly http = new HttpClient();
  private password: string;
  constructor(
    readonly userId: string,
    password: string,
  ) {
    this.password = password;
  }

  /** 로그인 뒤 비밀번호를 메모리에서 지운다. 세션 쿠키만 남는다 */
  forgetPassword() {
    this.password = "";
  }

  async login(): Promise<void> {
    const home = await this.http.get(`${WWW}/`);
    assertNotBlocked(home.url, home.text);
    // 리뉴얼 사이트의 로그인 페이지는 /login 이다 (옛 /user.do?method=login 은 /errorPage 로 간다, 2026-10-22 확인)
    const loginPage = await this.http.get(`${WWW}/login`, { Referer: `${WWW}/` });
    if (!/inpUserId/.test(loginPage.text)) {
      throw new DhlotteryError(`로그인 페이지를 찾지 못했습니다 (${loginPage.url}). 사이트 구조가 바뀐 것 같습니다.`, "parse", loginPage.text.slice(0, 300));
    }
    const keyRes = await this.http.get(`${WWW}/login/selectRsaModulus.do`, { ...AJAX, Referer: `${WWW}/login` });
    assertNotBlocked(keyRes.url, keyRes.text);
    const { modulus, exponent } = parseRsaKey(keyRes.text);
    const res = await this.http.postForm(
      `${WWW}/login/securityLoginCheck.do`,
      { userId: rsaEncryptHex(this.userId, modulus, exponent), userPswdEncn: rsaEncryptHex(this.password, modulus, exponent), inpUserId: this.userId },
      { Origin: WWW, Referer: `${WWW}/login` },
    );
    assertNotBlocked(res.url, res.text);
    const err = loginErrorOf(res.text);
    if (err) throw new DhlotteryError(`로그인 실패: ${err}`, "login");
    if (/5회 이상 로그인에 실패/.test(res.text)) throw new DhlotteryError("로그인 5회 이상 실패로 계정이 잠겼습니다.", "login");
    if (!this.http.jar.names().some((n) => /SESSIONID/i.test(n))) throw new DhlotteryError("로그인 뒤 세션 쿠키가 없습니다.", "login", res.text.slice(0, 300));
    this.forgetPassword();
  }

  /** 예치금 잔액(원). 로그인 확인 겸용 */
  async balance(): Promise<number> {
    await this.http.get(`${WWW}/mypage/home`);
    const res = await this.http.get(`${WWW}/mypage/selectUserMndp.do?_=${Date.now()}`, { ...AJAX, Referer: `${WWW}/mypage/home`, requestMenuUri: "/mypage/home" });
    if (res.status === 401) throw new DhlotteryError("로그인 세션이 없습니다 (401).", "login");
    let p: { data?: { userMndp?: { totalAmt?: string | number } } };
    try {
      p = res.json();
    } catch (e) {
      throw new DhlotteryError((e as Error).message, "balance", res.text.slice(0, 300));
    }
    const raw = p.data?.userMndp?.totalAmt;
    if (raw === undefined || raw === null || raw === "") throw new DhlotteryError("예치금 필드(data.userMndp.totalAmt)를 찾지 못했습니다. 응답 구조가 바뀐 것 같습니다.", "balance", p);
    const n = Number(String(raw).replace(/,/g, ""));
    if (!Number.isFinite(n)) throw new DhlotteryError("예치금을 읽지 못했습니다.", "balance", p);
    return n;
  }

  /** 구매 페이지가 알려 주는 판매 회차·추첨일·결제 마감일과 소켓 토큰 */
  async buyRequirements(): Promise<{ direct: string; round: number | null; drawDate: string | null; payDeadline: string | null }> {
    const ready = await this.http.postForm(`${OL}/olotto/game/egovUserReadySocket.json`, {}, { ...AJAX, Origin: OL, Referer: `${OL}/olotto/game/game645.do` });
    let direct: string | undefined;
    try {
      direct = ready.json<{ ready_ip?: string }>().ready_ip;
    } catch (e) {
      throw new DhlotteryError((e as Error).message, "purchase", ready.text.slice(0, 300));
    }
    if (!direct) throw new DhlotteryError("ready_ip 를 받지 못했습니다.", "purchase", ready.text.slice(0, 300));
    const page = await this.http.get(`${OL}/olotto/game/game645.do`, { Referer: `${WWW}/main` });
    assertNotBlocked(page.url, page.text);
    if (page.url.includes("/login") || /inpUserId/.test(page.text)) throw new DhlotteryError("구매 페이지가 로그인 화면으로 갔습니다.", "login");
    const round = hiddenInput(page.text, "curRound");
    return {
      direct,
      round: round && /^\d+$/.test(round) ? Number(round) : null,
      drawDate: hiddenInput(page.text, "ROUND_DRAW_DATE"),
      payDeadline: hiddenInput(page.text, "WAMT_PAY_TLMT_END_DT"),
    };
  }

  async buyManual(games: readonly (readonly number[])[], round: number, drawDate: string, payDeadline: string, direct: string): Promise<BuyResult> {
    const res = await this.http.postForm(
      `${OL}/olotto/game/execBuy.do`,
      {
        round: String(round),
        direct,
        nBuyAmount: String(games.length * 1000),
        param: buildManualParam(games),
        ROUND_DRAW_DATE: drawDate,
        WAMT_PAY_TLMT_END_DT: payDeadline,
        gameCnt: String(games.length),
        saleMdaDcd: "10",
      },
      { Origin: OL, Referer: `${OL}/olotto/game/game645.do`, "X-Requested-With": "XMLHttpRequest" },
    );
    let p: { loginYn?: string; result?: { resultMsg?: string; resultCode?: string; arrGameChoiceNum?: unknown; buyRound?: string; nBuyAmount?: number | string } & Record<string, unknown> };
    try {
      p = res.json();
    } catch (e) {
      throw new DhlotteryError((e as Error).message, "purchase", res.text.slice(0, 500));
    }
    const msg = String(p.result?.resultMsg ?? "");
    if (p.loginYn !== "Y") throw new DhlotteryError("구매 요청이 로그인 상태가 아니라고 응답했습니다.", "login", p);
    if (msg.toUpperCase() !== "SUCCESS") {
      const kind = /한도|limit/i.test(JSON.stringify(p)) ? "limit" : "purchase";
      throw new DhlotteryError(`구매 실패: ${msg || JSON.stringify(p.result ?? p).slice(0, 300)}`, kind, p);
    }
    return { round: Number(p.result?.buyRound ?? round), games: games.map((g) => [...g]), amount: Number(p.result?.nBuyAmount ?? games.length * 1000), raw: p };
  }

  /** 구매내역(당첨 결과 포함). 날짜는 YYYYMMDD */
  async ledger(fromYmd: string, toYmd: string): Promise<LedgerItem[]> {
    await this.http.get(`${WWW}/mypage/mylotteryledger`);
    const q = new URLSearchParams({ srchStrDt: fromYmd, srchEndDt: toYmd, sort: "", ltGdsCd: "LO40", winResult: "", lramSmam: "", pageNum: "1", recordCountPerPage: "100", _: String(Date.now()) });
    const res = await this.http.get(`${WWW}/mypage/selectMyLotteryledger.do?${q}`, { ...AJAX, Referer: `${WWW}/mypage/mylotteryledger` });
    if (res.status === 401) throw new DhlotteryError("구매내역 조회에 로그인 세션이 없습니다 (401).", "login");
    let p: { data?: { list?: LedgerItem[] } };
    try {
      p = res.json();
    } catch (e) {
      throw new DhlotteryError((e as Error).message, "ledger", res.text.slice(0, 300));
    }
    if (!Array.isArray(p.data?.list)) throw new DhlotteryError("구매내역 응답 형식이 다릅니다.", "ledger", p);
    return p.data!.list!;
  }

  /** 구매내역 한 건(주문)의 티켓 상세: 게임별 번호·선택 방식·등수. 동행복권 '티켓보기' 팝업이 쓰는 엔드포인트 */
  async ticket(ntslOrdrNo: string, barcd: string, fromYmd: string, toYmd: string): Promise<TicketRaw> {
    const q = new URLSearchParams({ ntslOrdrNo, srchStrDt: fromYmd, srchEndDt: toYmd, barcd });
    const res = await this.http.get(`${WWW}/mypage/lotto645TicketDetail.do?${q}`, { ...AJAX, Referer: `${WWW}/mypage/mylotteryledger` });
    if (res.status === 401) throw new DhlotteryError("티켓 조회에 로그인 세션이 없습니다 (401).", "login");
    let p: { data?: { ticket?: TicketRaw } };
    try {
      p = res.json();
    } catch (e) {
      throw new DhlotteryError((e as Error).message, "ledger", res.text.slice(0, 300));
    }
    if (!p.data?.ticket) throw new DhlotteryError("티켓 응답 형식이 다릅니다.", "ledger", p);
    return p.data.ticket;
  }
}

/** lotto645TicketDetail.do 의 data.ticket. game_dtl 항목의 번호 필드명은 실제 응답으로 확인한다 */
export interface TicketRaw {
  game_round?: string | number;
  sale_date?: string;
  draw_date?: string;
  pay_end_date?: string;
  drawed?: boolean;
  win_num?: unknown;
  game_dtl?: Record<string, unknown>[];
  [k: string]: unknown;
}

export interface LedgerItem {
  eltOrdrDt: string;
  ltGdsCd: string;
  ltGdsNm: string;
  ltEpsdView: string | number;
  gmInfo: string | null;
  prchsQty: number;
  /** '당첨' | '낙첨' | '미추첨' | '미확인' */
  ltWnResult: string;
  ltWnAmt: number | null;
  wnRnk: number | null;
  ntslOrdrNo: string | null;
}

export const ymdKst = (d: Date) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");

/** 온라인 판매 시간: 평일·일 06~24시, 토 06~20시 (KST) */
export function isSaleOpen(now = new Date()): boolean {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  const day = k.getUTCDay();
  const minutes = k.getUTCHours() * 60 + k.getUTCMinutes();
  if (minutes < 6 * 60) return false;
  return day === 6 ? minutes < 20 * 60 : true;
}
