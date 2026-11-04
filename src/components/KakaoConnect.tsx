"use client";

import { useEffect, useState } from "react";

interface Status {
  configured: boolean;
  redirectUri?: string;
  connected: boolean;
  connectedAt?: string;
  refreshExpiresAt?: string;
}

/** 카카오톡 '나에게 보내기' 연결 상태와 연결·테스트 버튼 */
export function KakaoConnect() {
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => fetch("/lotto/api/kakao/status", { cache: "no-store" }))
      .then((r) => r.json())
      .then((s) => {
        if (!active) return;
        setStatus(s);
        // 카카오 콜백이 돌아오며 붙인 결과 문구
        const note = new URLSearchParams(window.location.search).get("kakao");
        if (note) setMsg(note === "연결됨" ? "카카오톡이 연결됐습니다. 테스트 메시지를 보내 보세요." : `카카오톡 연결 ${note}`);
      })
      .catch(() => active && setStatus({ configured: false, connected: false }));
    return () => {
      active = false;
    };
  }, []);

  const test = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/lotto/api/kakao/test", { method: "POST" });
      const body = await res.json();
      setMsg(res.ok ? "카카오톡으로 테스트 메시지를 보냈습니다. '나와의 채팅'을 확인하세요." : body.error ?? "보내지 못했습니다.");
    } catch {
      setMsg("서버에 연결하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  return (
    <section className="card">
      <h2>카카오톡 알림</h2>
      {!status.configured ? (
        <p className="small muted">
          카카오 디벨로퍼스(developers.kakao.com)에서 앱을 만들고 REST API 키를 <code className="mono">KAKAO_REST_API_KEY</code>에, 카카오 로그인 Redirect URI 에 <code className="mono">http://localhost:3000/lotto/api/kakao/callback</code>을 등록한 뒤 서버를 다시 켜면 여기에 연결 버튼이 생깁니다. 동의 항목에서 ‘카카오톡 메시지 전송(talk_message)’을 켜 두세요.
        </p>
      ) : status.connected ? (
        <div className="stack-sm">
          <p className="small">
            <span className="tag ok">연결됨</span> {status.connectedAt?.slice(0, 10)}부터 · 토큰은 {status.refreshExpiresAt?.slice(0, 10)}까지이며 에이전트가 돌 때마다 자동 갱신됩니다.
          </p>
          <div className="row">
            <button type="button" className="btn ghost sm" onClick={test} disabled={busy}>{busy ? "보내는 중…" : "테스트 메시지 보내기"}</button>
            <a className="btn ghost sm" href="/lotto/api/kakao/connect">다시 연결</a>
          </div>
        </div>
      ) : (
        <div className="stack-sm">
          <p className="small muted">내 카카오 계정으로 한 번 로그인하면 금요일 구매 내역과 토요일 결과가 ‘나와의 채팅’으로 옵니다. 토큰은 이 PC의 <code className="mono">agent/kakao-token.json</code>에만 저장됩니다.</p>
          <a className="btn" href="/lotto/api/kakao/connect">카카오톡 연결</a>
        </div>
      )}
      {msg && <p className="hint" role="status">{msg}</p>}
    </section>
  );
}
