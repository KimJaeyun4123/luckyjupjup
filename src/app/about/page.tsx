import type { Metadata } from "next";
import Link from "next/link";
import { DRAWS } from "@/lib/lotto/draws";
import { pct, presetRate } from "@/lib/lotto/rates";

export const metadata: Metadata = { title: "서비스 안내", description: "행운줍줍이 하는 일과 하지 않는 일, 조건이 확률을 바꾸지 않는 이유, 데이터 출처." };

export default function AboutPage() {
  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">서비스 안내</div>
        <h1>행운줍줍은 번호를 만들고, 구매는 당신이 합니다</h1>
      </header>
      <section className="section">
        <h2>조건은 확률을 바꾸지 않습니다</h2>
        <p>
          로또 6/45의 한 게임이 1등일 확률은 8,145,060분의 1이고, 어떤 여섯 개를 고르든 같습니다. 역대 {DRAWS.length}회 당첨 조합에 ‘균형형’ 조건(합계 100~175, 홀수 2~4개, 저수 2~4개, 연속 1쌍 이하, AC값 7 이상, 같은 끝수 2개 이하, 한 구간 3개 이하)을 적용하면 약 42.6%가 통과합니다. 전체 조합 8,145,060개에 같은 조건을 적용해도 {pct(presetRate("balanced"))}가 통과합니다. 두 수치가 같다는 것은 조건이 당첨 조합을 골라내는 힘이 없다는 뜻입니다. 그래서 이 서비스는 조건을 ‘예측’이 아니라 ‘모양 취향’으로 소개하고, 모든 타입 옆에 전체 조합 비율을 붙입니다. 자세한 분포는 <Link href="/stats">통계</Link>에 있습니다.
        </p>
      </section>
      <section className="section">
        <h2>하지 않는 일</h2>
        <p>
          복권을 팔거나 구매를 대신하지 않습니다. 「복권 및 복권기금법」은 영리 목적의 온라인복권 구매 대행을 금지합니다. 동행복권 계정이나 비밀번호를 묻지 않고, 당첨을 예측한다거나 적중했다고 홍보하지 않으며, 번호를 돈 받고 팔지 않고, 광고도 없습니다. 구매는 <a href="https://www.dhlottery.co.kr/" target="_blank" rel="noreferrer">동행복권</a>(회차당 5,000원 한도, 모바일은 평일 06~24시)이나 판매점에서 직접 하세요. 만 19세 미만은 복권을 살 수 없습니다.
        </p>
      </section>
      <section className="section">
        <h2>데이터 출처</h2>
        <p>
          당첨번호·당첨금·판매액은 동행복권이 공개한 회차별 추첨 결과입니다. 1회(2002-12-07)부터 최신 회차까지 담고 있으며, 매주 토요일 추첨 뒤 자동으로 새 회차를 받아 옵니다. 공개 데이터셋(smok95/lotto)과 대조해 번호와 날짜가 모두 일치함을 확인했습니다. 이 서비스는 동행복권·복권위원회와 아무 관계가 없습니다.
        </p>
      </section>
      <section className="section">
        <h2>과몰입이 걱정될 때</h2>
        <p>복권은 오락이고 수입원이 아닙니다. 구매가 생활에 부담이 되면 사행산업통합감독위원회 도박문제 상담전화 1336으로 연락하세요.</p>
      </section>
      <p className="small muted">
        <Link href="/privacy">개인정보 안내</Link> · 결과결의 자매 서비스입니다.
      </p>
    </div>
  );
}
