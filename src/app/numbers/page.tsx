import type { Metadata } from "next";
import Link from "next/link";
import { Ball } from "@/components/Balls";
import { DRAWS, absentRounds, frequency } from "@/lib/lotto/draws";

export const metadata: Metadata = { title: "번호별 통계", description: "로또 6/45 번호 1~45의 출현 횟수와 마지막 출현. 모든 번호의 기대 출현 횟수는 같습니다." };

export default function NumbersPage() {
  const freq = frequency();
  const gaps = absentRounds();
  const expected = (DRAWS.length * 6) / 45;
  const max = Math.max(...freq.slice(1));
  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">번호별</div>
        <h1>1부터 45까지, 번호마다</h1>
        <p>
          {DRAWS.length}회 동안 번호마다 평균 {expected.toFixed(1)}회 나왔습니다. 가장 많이 나온 번호와 가장 적게 나온 번호의 차이는 우연으로 생기는 범위(표준편차 약 {Math.sqrt(expected * (39 / 45)).toFixed(1)}회) 안에 있습니다.
        </p>
      </header>
      <div className="freq-grid">
        {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => (
          <Link key={n} href={`/numbers/${n}`} className="freq-cell">
            <Ball n={n} size="sm" />
            <span className="bar"><i style={{ width: `${(freq[n] / max) * 100}%` }} /></span>
            <span className="n">{freq[n]}회 · {gaps[n] === 0 ? "직전 회차" : `${gaps[n]}회 전`}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
