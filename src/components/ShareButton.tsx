"use client";

import { useState } from "react";

/** 지금 주소를 공유하거나 복사한다 */
export function ShareButton({ title, label = "링크 공유" }: { title: string; label?: string }) {
  const [msg, setMsg] = useState("");
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMsg("링크를 복사했습니다.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setMsg("복사하지 못했습니다. 주소창의 링크를 직접 복사해 주세요.");
    }
  };
  return (
    <span className="row">
      <button type="button" className="btn ghost" onClick={share}>{label}</button>
      {msg && <span className="hint" role="status">{msg}</span>}
    </span>
  );
}
