import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Balls } from "@/components/Balls";
import { FeatureTable, Omr } from "@/components/FeatureTable";
import { RANK_LABEL, RANK_RULE } from "@/lib/lotto/check";
import { DRAWS, drawByRound, formatWon } from "@/lib/lotto/draws";
import { BALANCED_RULES, PRESETS } from "@/lib/lotto/presets";
import { pct, presetRate } from "@/lib/lotto/rates";
import { type RuleContext, evaluate } from "@/lib/lotto/rules";
import { formatKstDate } from "@/lib/lotto/schedule";

export function generateStaticParams() {
  return DRAWS.map((d) => ({ round: String(d.round) }));
}

export async function generateMetadata({ params }: PageProps<"/results/[round]">): Promise<Metadata> {
  const d = drawByRound(Number((await params).round));
  if (!d) return {};
  return {
    title: `${d.round}회 당첨번호 ${d.numbers.join(" ")} + ${d.bonus}`,
    description: `${d.date} 추첨 로또 6/45 ${d.round}회 당첨번호 ${d.numbers.join(", ")} 보너스 ${d.bonus}. 1등 ${d.prizes[0].winners}명 각 ${formatWon(d.prizes[0].amount)}.`,
  };
}

export default async function RoundPage({ params }: PageProps<"/results/[round]">) {
  const round = Number((await params).round);
  const d = drawByRound(round);
  if (!d) notFound();
  const prev = drawByRound(round - 1);
  const next = drawByRound(round + 1);
  const ctx: RuleContext = { previous: prev?.numbers };
  const sum = d.numbers.reduce((a, b) => a + b, 0);
  const matchedPresets = PRESETS.filter((p) => p.id !== "random" && p.id !== "mine" && !p.weighting && evaluate(d.numbers, p.rules, ctx).pass);
  const fb = d.firstBy;
  const fbTotal = fb.auto + fb.manual + fb.semiAuto;
  return (
    <div className="stack">
      <header className="result-head">
        <div className="eyebrow">회차 결과</div>
        <h1>{d.round}회 당첨번호</h1>
        <p className="sub">{formatKstDate(d.date)} 추첨 · 합계 {sum}{d.sales ? ` · 총판매 ${formatWon(d.sales)}` : ""}</p>
        <Balls numbers={d.numbers} bonus={d.bonus} size="lg" />
      </header>

      <table className="table">
        <thead>
          <tr>
            <th>등수</th>
            <th>조건</th>
            <th className="num">당첨자</th>
            <th className="num">1인당 당첨금</th>
          </tr>
        </thead>
        <tbody>
          {d.prizes.map((p) => (
            <tr key={p.rank}>
              <td>{RANK_LABEL[p.rank]}</td>
              <td className="small">{RANK_RULE[p.rank]}</td>
              <td className="num">{p.winners.toLocaleString("ko-KR")}명</td>
              <td className="num">{formatWon(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {fbTotal > 0 && (
        <p className="small muted">
          1등 선택 방식: 자동 {fb.auto}명 · 수동 {fb.manual}명 · 반자동 {fb.semiAuto}명
        </p>
      )}

      <section className="section">
        <h2>이 조합의 모양</h2>
        <p className="section-lede">
          균형 규칙 기준으로 본 조건값입니다. {matchedPresets.length ? `이 조합은 ${matchedPresets.map((p) => p.name).join("·")} 타입의 조건에 들어맞습니다.` : "이 조합은 균형형·골고루형·나눠 갖기 회피형 조건 가운데 어느 것에도 들어맞지 않습니다."} 균형 규칙을 통과하는 조합은 전체의 {pct(presetRate("balanced"))}인데, 당첨 조합도 비슷한 비율로 통과하거나 떨어집니다.
        </p>
        <div className="two-col">
          <div className="card">
            <Omr combo={d.numbers} />
          </div>
          <div className="card">
            <FeatureTable combo={d.numbers} rules={BALANCED_RULES} ctx={ctx} />
          </div>
        </div>
      </section>

      <nav className="pager" aria-label="회차 이동">
        {prev ? <Link href={`/results/${prev.round}`}>← {prev.round}회</Link> : <span />}
        <Link href="/results">목록</Link>
        {next ? <Link href={`/results/${next.round}`}>{next.round}회 →</Link> : <span />}
      </nav>
    </div>
  );
}
