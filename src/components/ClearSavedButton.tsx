"use client";

import { useState } from "react";
import { clearSaved } from "@/lib/lotto/picks";

export function ClearSavedButton() {
  const [msg, setMsg] = useState("");
  return (
    <span className="row">
      <button type="button" className="btn danger sm" onClick={() => setMsg(`${clearSaved()}개 항목을 지웠습니다.`)}>이 기기의 저장값 모두 지우기</button>
      {msg && <span className="hint" role="status">{msg}</span>}
    </span>
  );
}
