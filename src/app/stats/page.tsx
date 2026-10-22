import type { Metadata } from "next";
import Link from "next/link";
import { DRAWS, historicalPassRate, sumHistogram } from "@/lib/lotto/draws";
import { featuresOf } from "@/lib/lotto/features";
import { PRESETS } from "@/lib/lotto/presets";
import { RATES, pct, presetRate, theoreticalSumHist } from "@/lib/lotto/rates";
import { FEATURE_LABEL } from "@/lib/lotto/rules";

export const metadata: Metadata = { title: "통계", description: "로또 6/45 역대 당첨 조합의 합계·홀짝·AC값 분포를 전체 조합의 이론 분포와 나란히 봅니다." };

const DIST_KEYS = ["oddCount", "lowCount", "consecutivePairs", "ac", "maxSameEnding", "maxSection", "sectionCount", "primeCount"] as const;

export default function StatsPage() {
  const n = DRAWS.length;
  const actualSum = sumHistogram();
  const theorySum = theoreticalSumHist();
  const bins = theorySum.map((b) => b.from);
  const actualBy = new Map(actualSum.map((b) => [b.from, b.count]));
  const maxRate = Math.max(...theorySum.map((b) => b.count / RATES.total), ...actualSum.map((b) => b.count / n));

  const actualDist: Record<string, number[]> = {};
  for (const k of DIST_KEYS) actualDist[k] = new Array(RATES.dist[k].length).fill(0);
  for (const d of DRAWS) {
    const f = featuresOf(d.numbers);
    for (const k of DIST_KEYS) actualDist[k][f[k]]++;
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">통계</div>
        <h1>역대 당첨과 전체 조합을 나란히</h1>
        <p>
          왼쪽 막대는 {n}회의 실제 당첨 조합, 오른쪽 회색 막대는 8,145,060개 전체 조합을 전수 계산한 이론값입니다. 두 분포가 거의 같다는 것이 이 페이지의 결론입니다. 조건은 모양을 고르는 것이고, 확률을 고르는 것은 아닙니다.
        </p>
      </header>

      <section className="section">
        <h2>타입별 통과 비율</h2>
        <table className="table">
          <thead>
            <tr>
              <th>타입</th>
              <th className="num">역대 당첨 {n}회</th>
              <th className="num">전체 조합</th>
            </tr>
          </thead>
          <tbody>
            {PRESETS.filter((p) => p.id !== "mine").map((p) => {
              const h = historicalPassRate(p);
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/pick?t=${p.id}`}>{p.name}</Link>
                  </td>
                  <td className="num">{pct(h.pass / h.total)}</td>
                  <td className="num">{pct(presetRate(p.id))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="hint">최근 자주형·오래 안 나온형·이월형은 각 회차의 직전 회차와 그때까지의 빈도로 판정했습니다.</p>
      </section>

      <section className="section">
        <h2>합계 분포</h2>
        <p className="section-lede">6개 번호의 합은 21~255 사이이고 평균은 138입니다. 10 단위로 묶었습니다.</p>
        <div className="hist" role="img" aria-label="합계 구간별 역대 당첨 비율과 전체 조합 비율">
          {bins.map((from) => {
            const a = (actualBy.get(from) ?? 0) / n;
            const t = (theorySum.find((b) => b.from === from)?.count ?? 0) / RATES.total;
            return (
              <div className="col" key={from} title={`${from}~${from + 9}: 역대 ${pct(a)} · 전체 ${pct(t)}`}>
                <i style={{ height: `${(a / maxRate) * 100}%` }} />
                <i className="alt" style={{ height: `${(t / maxRate) * 100}%` }} />
              </div>
            );
          })}
        </div>
        <div className="hist-x">
          {bins.map((from) => (
            <span key={from}>{from % 30 === 0 ? from : ""}</span>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>조건별 분포</h2>
        <div className="two-col">
          {DIST_KEYS.map((k) => (
            <div className="card" key={k}>
              <h3>{FEATURE_LABEL[k]}</h3>
              <table className="rule-table">
                <thead>
                  <tr>
                    <th>값</th>
                    <th className="num">역대</th>
                    <th className="num">전체</th>
                  </tr>
                </thead>
                <tbody>
                  {RATES.dist[k].map((c, v) =>
                    c === 0 && actualDist[k][v] === 0 ? null : (
                      <tr key={v}>
                        <td>{v}</td>
                        <td className="num">{pct(actualDist[k][v] / n)}</td>
                        <td className="num">{pct(c / RATES.total)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
      <p className="small muted">전체 조합 통계는 {RATES.computedAt}에 계산했습니다. 번호별 출현 횟수는 <Link href="/numbers">번호별</Link>에서 봅니다.</p>
    </div>
  );
}
