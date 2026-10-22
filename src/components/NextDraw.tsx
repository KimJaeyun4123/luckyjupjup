"use client";

import { useEffect, useState } from "react";
import { closeTimeOfRound, nextDraw, remainingText } from "@/lib/lotto/schedule";

/** 다음 추첨까지 남은 시간. 브라우저 시계로 계산하므로 마운트 뒤에 그린다 */
export function NextDraw() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const { round, at } = nextDraw(now);
      const closed = now.getTime() >= closeTimeOfRound(round);
      setText(`${round}회 추첨 ${remainingText(now, at)}${closed ? " · 이번 회차 판매는 마감" : ""}`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return <span className="meta" role="status">{text ?? "다음 추첨은 토요일 20:35"}</span>;
}
