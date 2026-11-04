"use client";

import { useCallback, useEffect, useState } from "react";
import { Balls } from "./Balls";
import type { DhMe, LedgerItem } from "@/lib/dh/api";
import { type TicketGame, parseTicket } from "@/lib/dh/ticket";
import { formatWon } from "@/lib/lotto/draws";

type Status = "loading" | "anon" | "ready";

/** gmInfo 문자열에서 6개 번호 묶음을 뽑는다. 형식이 다르면 null */
function parseGames(info: string | null): number[][] | null {
  if (!info || /^\d{20,}$/.test(info)) return null;
  const chunks = info.split(/[|/;\n]+|\s{2,}/).map((c) => c.match(/\d{1,2}/g)?.map(Number) ?? []).filter((c) => c.length === 6 && c.every((n) => n >= 1 && n <= 45));
  return chunks.length ? chunks : null;
}

/** 동행복권 구매내역의 gmInfo 는 복권 바코드(5자리 × 6)다 (2026-10-22 실구매로 확인). 읽기 좋게 띄운다 */
const formatBarcode = (info: string) => (/^\d{30}$/.test(info) ? info.match(/.{5}/g)!.join(" ") : info);

/** 바코드와 '번호 보기'. 번호는 동행복권 티켓 상세에서 불러온다 */
function TicketCell({ item }: { item: LedgerItem }) {
  const [games, setGames] = useState<TicketGame[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const load = async () => {
    if (!item.ntslOrdrNo || !item.gmInfo) return;
    setState("loading");
    try {
      const res = await fetch(`/lotto/api/dh/ticket?ntslOrdrNo=${encodeURIComponent(item.ntslOrdrNo)}&barcd=${encodeURIComponent(item.gmInfo)}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      const parsed = parseTicket(body.ticket);
      if (parsed.some((g) => !g.numbers)) console.warn("[ticket] 번호를 못 읽은 게임:", body.ticket);
      setGames(parsed);
      setState("idle");
    } catch {
      setState("error");
    }
  };
  if (games) {
    return (
      <div className="stack-sm">
        {games.map((g, j) => (
          <div className="row" key={j}>
            <span className="idx small muted">{String.fromCharCode(65 + j)}</span>
            {g.numbers ? <Balls numbers={g.numbers} size="sm" /> : <span className="small muted">번호 형식을 읽지 못함</span>}
            {g.type && <span className="tag">{g.type}</span>}
            {g.rank && <span className="tag ok">{g.rank}등</span>}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="stack-sm">
      <span className="small muted mono" title="복권 바코드">{item.gmInfo ? formatBarcode(item.gmInfo) : "—"}</span>
      {item.ntslOrdrNo && item.gmInfo && (
        <button type="button" className="btn ghost sm" onClick={load} disabled={state === "loading"}>
          {state === "loading" ? "불러오는 중…" : state === "error" ? "다시 시도" : "번호 보기"}
        </button>
      )}
    </div>
  );
}

/** 내 동행복권: 로그인 → 예치금·최근 구매내역 */
export function DhPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<DhMe | null>(null);
  const [days, setDays] = useState(30);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (d = days) => {
    const res = await fetch(`/lotto/api/dh/me?days=${d}`, { cache: "no-store" });
    if (res.status === 401) {
      setStatus("anon");
      setMe(null);
      return;
    }
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "불러오지 못했습니다.");
      setStatus("anon");
      return;
    }
    setMe(body as DhMe);
    setStatus("ready");
  }, [days]);

  useEffect(() => {
    // 마운트 뒤 마이크로태스크에서 불러온다 (effect 본문에서 바로 상태를 바꾸지 않는다)
    let active = true;
    Promise.resolve()
      .then(() => (active ? load() : undefined))
      .catch(() => active && setStatus("anon"));
    return () => {
      active = false;
    };
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/lotto/api/dh/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, pw }) });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "로그인하지 못했습니다.");
        return;
      }
      setPw("");
      await load();
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/lotto/api/dh/logout", { method: "POST" });
    setMe(null);
    setStatus("anon");
  };

  if (status === "loading") return <div className="card">불러오는 중…</div>;

  if (status === "anon" || !me) {
    return (
      <form className="form-card" onSubmit={login}>
        <h2>동행복권 로그인</h2>
        <div className="callout warn">
          아이디와 비밀번호는 동행복권 로그인 요청에만 쓰고 바로 지웁니다. 서버에는 동행복권 세션 쿠키만 30분 동안 메모리에 남고, 어디에도 저장되지 않습니다. 5회 틀리면 동행복권이 계정을 잠그니 비밀번호를 확인하고 입력하세요.
        </div>
        <div className="field">
          <label htmlFor="dh-id">아이디</label>
          <input id="dh-id" className="input" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="dh-pw">비밀번호</label>
          <input id="dh-pw" className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </div>
        {error && <div className="error-box" role="alert">{error}</div>}
        <div className="cta-row">
          <button type="submit" className="btn" disabled={busy}>{busy ? "로그인 중…" : "로그인"}</button>
          <span className="hint">동행복권 회원이 아니면 <a href="https://www.dhlottery.co.kr/" target="_blank" rel="noreferrer">동행복권</a>에서 먼저 가입합니다.</span>
        </div>
      </form>
    );
  }

  const won = me.ledger.filter((it) => it.ltWnResult === "당첨");
  const spent = me.ledger.reduce((a, it) => a + (Number(it.prchsQty) || 0) * 1000, 0);
  const wonAmt = won.reduce((a, it) => a + (it.ltWnAmt ?? 0), 0);

  return (
    <div className="stack">
      <div className="card latest">
        <div className="stack-sm">
          <div className="pick-head">
            <h2>{me.userId} 님의 예치금</h2>
            <button type="button" className="btn ghost sm" onClick={logout}>로그아웃</button>
          </div>
          <p className="prize">
            <b>{formatWon(me.balance)}</b>
          </p>
          <p className="small muted">
            충전은 <a href="https://www.dhlottery.co.kr/mypage/mndpChrg" target="_blank" rel="noreferrer">동행복권 예치금 충전</a>에서 합니다(1일 15만원). 로또 1게임 1,000원, 회차당 5게임까지.
          </p>
        </div>
        <div className="kv">
          <dt>최근 {days}일 구매</dt>
          <dd>{me.ledger.length}건 · {formatWon(spent)}</dd>
          <dt>당첨</dt>
          <dd>{won.length}건 · {formatWon(wonAmt)}</dd>
        </div>
      </div>

      <section className="section">
        <div className="pick-head">
          <h2>구매내역</h2>
          <div className="segmented">
            {[30, 60, 90].map((d) => (
              <label key={d}>
                <input type="radio" name="days" checked={days === d} onChange={() => { setDays(d); load(d); }} />
                {d}일
              </label>
            ))}
          </div>
        </div>
        <p className="section-lede">
          {me.from} ~ {me.to} 사이 로또 6/45 주문입니다. 동행복권 구매내역을 그대로 가져온 것이며, 당첨금 수령은 동행복권에서 합니다.
        </p>
        {me.ledger.length === 0 ? (
          <div className="empty">이 기간에 구매한 로또가 없습니다.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>구입일</th>
                <th>회차</th>
                <th className="num">게임</th>
                <th>번호</th>
                <th>결과</th>
                <th className="num">당첨금</th>
              </tr>
            </thead>
            <tbody>
              {me.ledger.map((it: LedgerItem, i) => {
                const games = parseGames(it.gmInfo);
                return (
                  <tr key={it.ntslOrdrNo ?? i}>
                    <td className="small">{it.eltOrdrDt}</td>
                    <td>{it.ltEpsdView}회</td>
                    <td className="num">{it.prchsQty}</td>
                    <td>
                      {games ? (
                        <div className="stack-sm">
                          {games.map((g, j) => (
                            <Balls key={j} numbers={g} size="sm" />
                          ))}
                        </div>
                      ) : (
                        <TicketCell item={it} />
                      )}
                    </td>
                    <td>
                      <span className={`tag ${it.ltWnResult === "당첨" ? "ok" : ""}`}>{it.ltWnResult}{it.wnRnk ? ` ${it.wnRnk}등` : ""}</span>
                    </td>
                    <td className="num">{it.ltWnAmt ? formatWon(it.ltWnAmt) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
