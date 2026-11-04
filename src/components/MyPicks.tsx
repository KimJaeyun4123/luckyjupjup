"use client";

import Link from "next/link";
import { Balls } from "./Balls";
import { check, RANK_LABEL } from "@/lib/lotto/check";
import { type CompactDraw, compactToDrawLike } from "@/lib/lotto/compact";
import { formatWon } from "@/lib/lotto/draws";
import { removePick } from "@/lib/lotto/picks";
import { usePicks } from "@/lib/lotto/usePicks";
import { presetById } from "@/lib/lotto/presets";
import { drawDateOfRound } from "@/lib/lotto/schedule";

/** 이 기기에 저장한 번호. 회차 결과가 있으면 등수를 보여 준다 */
export function MyPicks({ recent }: { recent: CompactDraw[] }) {
  const picks = usePicks();
  if (picks === null) return <div className="card">불러오는 중…</div>;
  if (!picks.length)
    return (
      <div className="empty">
        저장한 번호가 없습니다. <Link href="/pick">번호를 만들고</Link> ‘이 기기에 저장’을 누르면 여기에 모입니다.
      </div>
    );
  const byRound = new Map(recent.map((d) => [d.round, d]));
  const oldest = recent[0]?.round ?? 0;
  const rounds = [...new Set(picks.map((p) => p.round))].sort((a, b) => b - a);
  return (
    <div className="pick-list">
      {rounds.map((round) => {
        const draw = byRound.get(round);
        const list = picks.filter((p) => p.round === round);
        return (
          <section className="card" key={round}>
            <div className="pick-head">
              <h3>
                {round}회 · {drawDateOfRound(round)} 추첨
              </h3>
              {draw ? (
                <span className="small">
                  <Balls numbers={draw.numbers} bonus={draw.bonus} size="sm" />
                </span>
              ) : round < oldest ? (
                <Link href={`/results/${round}`} className="small">결과 보기</Link>
              ) : (
                <span className="small muted">추첨 전</span>
              )}
            </div>
            {list.map((p) => (
              <div className="stack-sm" key={p.id}>
                <div className="pick-head">
                  <span className="small muted">
                    {presetById(p.presetId)?.name ?? "직접 조건"} · {new Date(p.savedAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })} {p.bought ? "구매" : "저장"}
                    {p.bought && <span className="tag ok" style={{ marginLeft: 6 }}>동행복권 구매</span>}
                  </span>
                  <button type="button" className="btn ghost sm" onClick={() => removePick(p.id)}>지우기</button>
                </div>
                <div className="games">
                  {p.games.map((g, i) => {
                    const r = draw ? check(g, compactToDrawLike(draw)) : null;
                    return (
                      <div className="game" key={i}>
                        <span className="idx">{String.fromCharCode(65 + i)}</span>
                        <Balls numbers={g} highlight={r ? [...r.matched] : undefined} size="sm" />
                        <span className="right">
                          {r ? r.rank ? <span className="rank">{RANK_LABEL[r.rank]} · {formatWon(r.amount)}</span> : `${r.matched.length}개 일치` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
