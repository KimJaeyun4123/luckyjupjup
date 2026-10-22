"use client";

import { useState } from "react";

/** 게임 번호를 '1, 2, 3, 4, 5, 6' 줄 단위로 복사한다. 동행복권 구매 화면에 옮겨 넣을 때 쓴다 */
export function CopyNumbers({ games }: { games: readonly (readonly number[])[] }) {
  const [msg, setMsg] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(games.map((g) => g.join(", ")).join("\n"));
      setMsg("번호를 복사했습니다.");
    } catch {
      setMsg("복사하지 못했습니다.");
    }
  };
  return (
    <span className="row">
      <button type="button" className="btn ghost" onClick={copy}>번호 복사</button>
      {msg && <span className="hint" role="status">{msg}</span>}
    </span>
  );
}
