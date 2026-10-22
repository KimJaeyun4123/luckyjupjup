import Link from "next/link";
import { Balls } from "@/components/Balls";
import { MyPicksHome } from "@/components/MyPicksHome";
import { NextDraw } from "@/components/NextDraw";
import { recentCompact } from "@/lib/lotto/compact";
import { LATEST, formatWon } from "@/lib/lotto/draws";
import { PRESETS } from "@/lib/lotto/presets";
import { pct, presetRate } from "@/lib/lotto/rates";
import { formatKstDate } from "@/lib/lotto/schedule";

export default function Home() {
  const first = LATEST.prizes[0];
  return (
    <div className="stack">
      <MyPicksHome recent={recentCompact(3)} />
      <section className="hero hero-first">
        <div className="eyebrow">행운줍줍 · 로또 6/45</div>
        <h1>조건을 골라 번호를 만들고, 토요일에 결과를 받으세요</h1>
        <p className="lede">
          합계·홀짝·구간처럼 눈에 보이는 조건으로 번호 모양을 고릅니다. 어떤 조건이든 1등 확률은 8,145,060분의 1로 같으니, 조건은 취향입니다. 만든 번호는 이 기기에 저장되고 추첨 뒤 등수를 알려 줍니다.
        </p>
        <div className="cta-row">
          <Link href="/pick" className="btn">번호 만들기</Link>
          <Link href="/about" className="btn ghost">어떻게 다른가요</Link>
        </div>
      </section>

      <section className="card latest" aria-label="최신 회차 결과">
        <div className="stack-sm">
          <div className="pick-head">
            <h2>{LATEST.round}회 당첨번호</h2>
            <span className="meta">{formatKstDate(LATEST.date)} 추첨</span>
          </div>
          <Balls numbers={LATEST.numbers} bonus={LATEST.bonus} size="lg" />
          <p className="prize">
            1등 {first.winners}명 · 각 <b>{formatWon(first.amount)}</b>
          </p>
          <div className="row small">
            <Link href={`/results/${LATEST.round}`}>이 회차 자세히</Link>
            <span aria-hidden="true">·</span>
            <Link href="/results">지난 회차</Link>
          </div>
        </div>
        <NextDraw />
      </section>

      <section className="section">
        <h2>조건 타입</h2>
        <p className="section-lede">각 타입 아래의 비율은 전체 조합 가운데 그 조건을 만족하는 조합의 비율입니다. 비율이 작아도 당첨 확률은 달라지지 않습니다.</p>
        <div className="presets">
          {PRESETS.map((p) => (
            <Link key={p.id} href={`/pick?t=${p.id}`} className="preset">
              <h3>{p.name}</h3>
              <p>{p.short}</p>
              <span className="rate">전체 조합의 {pct(presetRate(p.id))}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>이 서비스가 하는 일과 하지 않는 일</h2>
        <div className="two-col">
          <div className="card">
            <h3>합니다</h3>
            <p className="small">조건으로 번호 만들기, 결과 링크 공유, 이 기기에 저장, 추첨 뒤 등수 확인, 회차·번호별 통계, 조건마다 전체 조합 비율 표시.</p>
          </div>
          <div className="card">
            <h3>하지 않습니다</h3>
            <p className="small">복권 판매, 구매 대행, 동행복권 계정 정보 입력, 당첨 예측·적중 홍보, 유료 번호 판매, 광고. 구매는 동행복권 사이트나 판매점에서 직접 합니다.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
