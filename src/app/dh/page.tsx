import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DhPanel } from "@/components/DhPanel";
import { KakaoConnect } from "@/components/KakaoConnect";
import { DH_ENABLED } from "@/lib/dh/enabled";

export const metadata: Metadata = { title: "내 동행복권", robots: { index: false } };

/** 로컬·개인 배포에서만 열리는 화면 (LOTTO_DH_ENABLED=1) */
export default function DhPage() {
  if (!DH_ENABLED) notFound();
  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">내 동행복권</div>
        <h1>예치금과 구매내역</h1>
        <p>
          내 동행복권 계정에 로그인해 예치금 잔액과 최근 구매·당첨 내역을 봅니다. 이 화면은 개인 설정(<code className="mono">LOTTO_DH_ENABLED=1</code>)에서만 켜지며, 공개 배포에는 없습니다. 구매는 <Link href="/pick">번호 만들기</Link>에서 번호를 만든 뒤 동행복권에서 직접 하거나, 에이전트(<code className="mono">agent/README.md</code>)가 합니다.
        </p>
      </header>
      <DhPanel />
      <KakaoConnect />
    </div>
  );
}
