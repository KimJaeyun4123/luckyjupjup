"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatWon } from "@/lib/lotto/draws";
import { savePick } from "@/lib/lotto/picks";
import type { PresetId } from "@/lib/lotto/presets";
import { drawDateOfRound, formatKstDate } from "@/lib/lotto/schedule";

type Status = { loggedIn: false } | { loggedIn: true; userId: string; balance: number };
interface Dry {
  round: number;
  drawDate: string;
  balance: number;
  need: number;
}
interface Done {
  round: number;
  games: number[][];
  amount: number;
  balanceAfter: number | null;
  receipt?: { buyRound?: string; issueDay?: string; issueTime?: string; barCode?: string };
}

/** 결과 화면의 '동행복권에서 바로 구매'. 드라이런으로 회차·금액을 보여 준 뒤, 한 번 더 눌러야 실제로 산다 */
export function DhBuyButton({ games, preset }: { games: number[][]; preset: PresetId }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [dry, setDry] = useState<Dry | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => fetch("/lotto/api/dh/status", { cache: "no-store" }))
      .then((r) => (r.ok ? r.json() : { loggedIn: false }))
      .then((s) => active && setStatus(s))
      .catch(() => active && setStatus({ loggedIn: false }));
    return () => {
      active = false;
    };
  }, []);

  const call = async (confirm: boolean) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/lotto/api/dh/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ games, confirm }) });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "구매하지 못했습니다.");
        setDry(null);
        return;
      }
      if (body.dryRun) setDry(body as Dry);
      else {
        const d = body as Done;
        setDone(d);
        setDry(null);
        savePick(d.round, d.games, preset, new Date(), true);
      }
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  if (!status.loggedIn) {
    return (
      <p className="hint">
        <Link href="/dh">내 동행복권</Link>에 로그인하면 이 번호를 여기서 바로 살 수 있습니다.
      </p>
    );
  }

  if (done) {
    return (
      <div className="callout" role="status">
        <b>{done.round}회 {done.games.length}게임 구매 완료</b> · {formatWon(done.amount)}
        {done.balanceAfter !== null && <> · 남은 예치금 {formatWon(done.balanceAfter)}</>}
        {done.receipt?.issueDay && <> · 발행 {done.receipt.issueDay} {done.receipt.issueTime}</>}
        <br />
        <span className="small">추첨 {formatKstDate(drawDateOfRound(done.round))} 20:35. 번호는 ‘내 번호’에 저장했고, 추첨 뒤 등수가 표시됩니다. <Link href="/dh">구매내역 보기</Link></span>
      </div>
    );
  }

  return (
    <div className="stack-sm">
      {!dry ? (
        <div className="row">
          <button type="button" className="btn" onClick={() => call(false)} disabled={busy}>
            {busy ? "확인 중…" : "동행복권에서 바로 구매"}
          </button>
          <span className="hint">{status.userId} · 예치금 {formatWon(status.balance)}. 누르면 먼저 회차와 금액을 확인합니다.</span>
        </div>
      ) : (
        <div className="callout warn">
          <b>{dry.round}회</b>(추첨 {formatKstDate(dry.drawDate)}) {games.length}게임 · <b>{formatWon(dry.need)}</b>가 예치금 {formatWon(dry.balance)}에서 빠집니다. 구매 뒤에는 취소할 수 없습니다.
          <div className="row" style={{ marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => call(true)} disabled={busy}>
              {busy ? "구매 중…" : `${formatWon(dry.need)} 결제하고 구매`}
            </button>
            <button type="button" className="btn ghost" onClick={() => setDry(null)} disabled={busy}>취소</button>
          </div>
        </div>
      )}
      {error && <div className="error-box" role="alert">{error}</div>}
    </div>
  );
}
