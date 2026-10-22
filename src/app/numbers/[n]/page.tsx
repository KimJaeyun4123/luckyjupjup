import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ball, Balls } from "@/components/Balls";
import { DRAWS, absentRounds, companions, frequency } from "@/lib/lotto/draws";
import { SECTIONS, isValidNumber, sectionOf } from "@/lib/lotto/features";

export function generateStaticParams() {
  return Array.from({ length: 45 }, (_, i) => ({ n: String(i + 1) }));
}

export async function generateMetadata({ params }: PageProps<"/numbers/[n]">): Promise<Metadata> {
  const n = Number((await params).n);
  return { title: `${n}번`, description: `로또 6/45 ${n}번의 출현 횟수, 최근 출현 회차, 함께 자주 나온 번호.` };
}

export default async function NumberPage({ params }: PageProps<"/numbers/[n]">) {
  const n = Number((await params).n);
  if (!isValidNumber(n)) notFound();
  const freq = frequency();
  const f50 = frequency(50);
  const gaps = absentRounds();
  const expected = (DRAWS.length * 6) / 45;
  const appearances = DRAWS.filter((d) => d.numbers.includes(n));
  const recent = appearances.slice(-8).reverse();
  const bonusCount = DRAWS.filter((d) => d.bonus === n).length;
  const rank = [...Array(45)].map((_, i) => i + 1).sort((a, b) => freq[b] - freq[a] || a - b).indexOf(n) + 1;
  const sec = SECTIONS[sectionOf(n)];
  return (
    <div className="stack">
      <header className="result-head">
        <div className="eyebrow">번호별</div>
        <h1 className="row">
          <Ball n={n} size="lg" /> {n}번
        </h1>
        <p className="sub">
          {sec.label} 구간 · {DRAWS.length}회 중 {freq[n]}회 출현(기대 {expected.toFixed(1)}회, 출현 순위 {rank}위) · 보너스로 {bonusCount}회 · 최근 50회에 {f50[n]}회 ·{" "}
          {gaps[n] === 0 ? "직전 회차에 나옴" : `${gaps[n]}회 전 마지막 출현`}
        </p>
      </header>
      <div className="two-col">
        <div className="card">
          <h3>함께 자주 나온 번호</h3>
          <div className="tags">
            {companions(n).map((c) => (
              <Link key={c.number} href={`/numbers/${c.number}`} className="tag">
                {c.number}번 · {c.count}회
              </Link>
            ))}
          </div>
          <p className="hint">함께 나온 횟수의 차이도 우연의 범위입니다.</p>
        </div>
        <div className="card">
          <h3>최근 출현</h3>
          <div className="stack-sm">
            {recent.map((d) => (
              <div className="row small" key={d.round}>
                <Link href={`/results/${d.round}`}>{d.round}회</Link>
                <Balls numbers={d.numbers} bonus={d.bonus} highlight={[n]} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="cta-row">
        <Link href={`/pick?t=mine&fix=${n}`} className="btn">{n}번을 고정수로 번호 만들기</Link>
        <Link href="/numbers" className="btn ghost">번호별 목록</Link>
      </div>
    </div>
  );
}
