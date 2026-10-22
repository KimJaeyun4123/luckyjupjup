"use client";

import Link from "next/link";
import { Balls } from "./Balls";
import { check, RANK_LABEL } from "@/lib/lotto/check";
import { type CompactDraw, compactToDrawLike } from "@/lib/lotto/compact";
import { usePicks } from "@/lib/lotto/usePicks";

/** 홈 상단 '내 번호 결과'. 저장한 번호가 있을 때만 보인다 (layout의 data-returning 으로 자리를 먼저 잡는다) */
export function MyPicksHome({ recent }: { recent: CompactDraw[] }) {
  const picks = usePicks();
  if (!picks?.length) return null;
  const latest = recent[recent.length - 1];
  const byRound = new Map(recent.map((d) => [d.round, d]));
  const latestPicks = picks.filter((p) => p.round === latest.round);
  const pending = picks.filter((p) => p.round > latest.round);
  return (
    <section className="card returning" aria-label="내 번호 결과">
      <div className="pick-head">
        <h2>내 번호</h2>
        <Link href="/my" className="small">전체 보기</Link>
      </div>
      {latestPicks.length > 0 && (
        <div className="stack-sm">
          <p className="small muted">{latest.round}회 ({latest.date}) 결과</p>
          <div className="games">
            {latestPicks.flatMap((p) =>
              p.games.map((g, i) => {
                const r = check(g, compactToDrawLike(byRound.get(p.round)!));
                return (
                  <div className="game" key={p.id + i}>
                    <span className="idx">{String.fromCharCode(65 + i)}</span>
                    <Balls numbers={g} highlight={[...r.matched, ...(r.bonusMatched ? [latest.bonus] : [])]} size="sm" />
                    <span className="right">{r.rank ? <span className="rank">{RANK_LABEL[r.rank]}</span> : `${r.matched.length}개 일치`}</span>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      )}
      {pending.length > 0 && (
        <p className="small muted">
          {pending[0].round}회에 넣을 번호 {pending.reduce((a, p) => a + p.games.length, 0)}게임을 저장해 두었습니다. 추첨 뒤 여기서 결과를 볼 수 있습니다.
        </p>
      )}
      {latestPicks.length === 0 && pending.length === 0 && <p className="small muted">저장한 번호가 {picks.length}묶음 있습니다.</p>}
    </section>
  );
}
