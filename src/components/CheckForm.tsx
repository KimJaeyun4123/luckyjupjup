"use client";

import { useState } from "react";
import { Balls } from "./Balls";
import { check, RANK_LABEL } from "@/lib/lotto/check";
import { type CompactDraw, compactToDrawLike } from "@/lib/lotto/compact";
import { formatWon } from "@/lib/lotto/draws";
import { MAX } from "@/lib/lotto/features";

const ALL = Array.from({ length: MAX }, (_, i) => i + 1);

/** 번호 6개와 회차를 골라 등수를 본다 */
export function CheckForm({ recent }: { recent: CompactDraw[] }) {
  const latest = recent[recent.length - 1];
  const [round, setRound] = useState(latest.round);
  const [nums, setNums] = useState<number[]>([]);
  const draw = recent.find((d) => d.round === round)!;
  const toggle = (n: number) => setNums(nums.includes(n) ? nums.filter((x) => x !== n) : nums.length < 6 ? [...nums, n].sort((a, b) => a - b) : nums);
  const result = nums.length === 6 ? check(nums, compactToDrawLike(draw)) : null;
  return (
    <div className="form-card">
      <div className="field">
        <label htmlFor="round">회차</label>
        <select id="round" value={round} onChange={(e) => setRound(Number(e.target.value))}>
          {[...recent].reverse().map((d) => (
            <option key={d.round} value={d.round}>
              {d.round}회 · {d.date}
            </option>
          ))}
        </select>
        <Balls numbers={draw.numbers} bonus={draw.bonus} size="sm" />
      </div>
      <div className="field">
        <span className="label">내 번호 6개 ({nums.length}/6)</span>
        <div className="numgrid" aria-label="번호 선택">
          {ALL.map((n) => (
            <button key={n} type="button" aria-pressed={nums.includes(n)} onClick={() => toggle(n)}>
              {n}
            </button>
          ))}
        </div>
        {nums.length > 0 && (
          <button type="button" className="btn ghost sm" onClick={() => setNums([])}>지우기</button>
        )}
      </div>
      {result && (
        <div className="callout" role="status">
          <Balls numbers={nums} highlight={[...result.matched]} size="sm" /> — {result.matched.length}개 일치{result.bonusMatched ? " + 보너스" : ""}.{" "}
          {result.rank ? (
            <b>
              {RANK_LABEL[result.rank]} · {formatWon(result.amount)}
            </b>
          ) : (
            "등수 밖입니다."
          )}
        </div>
      )}
      <p className="hint">최근 {recent.length}회차만 고를 수 있습니다. 공식 확인은 동행복권 사이트나 판매점에서 합니다.</p>
    </div>
  );
}
