import type { Metadata } from "next";
import Link from "next/link";
import { Balls } from "@/components/Balls";
import { DRAWS, formatWon } from "@/lib/lotto/draws";

export const metadata: Metadata = { title: "회차 결과", description: "로또 6/45 회차별 당첨번호와 1등 당첨금. 1회부터 최신 회차까지." };

const PAGE = 52;

export default function ResultsPage() {
  const recent = [...DRAWS].reverse().slice(0, PAGE);
  const years = [...new Set(DRAWS.map((d) => d.date.slice(0, 4)))].reverse();
  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">회차 결과</div>
        <h1>최근 1년 당첨번호</h1>
        <p>동행복권이 공개한 추첨 결과를 매주 토요일 추첨 뒤 받아 옵니다. 회차를 누르면 등수별 당첨금과 그 회차 조합의 조건값을 볼 수 있습니다.</p>
      </header>
      <table className="table">
        <thead>
          <tr>
            <th>회차</th>
            <th>추첨일</th>
            <th>당첨번호</th>
            <th className="num">1등</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((d) => (
            <tr key={d.round}>
              <td>
                <Link href={`/results/${d.round}`}>{d.round}회</Link>
              </td>
              <td className="small">{d.date}</td>
              <td>
                <Balls numbers={d.numbers} bonus={d.bonus} size="sm" />
              </td>
              <td className="num small">
                {d.prizes[0].winners}명 · {formatWon(d.prizes[0].amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="section">
        <h2>연도별로 찾기</h2>
        <div className="tags">
          {years.map((y) => {
            const first = DRAWS.find((d) => d.date.startsWith(y))!;
            return (
              <Link key={y} href={`/results/${first.round}`} className="tag">
                {y}년 ({first.round}회~)
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
