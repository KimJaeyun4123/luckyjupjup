import type { Metadata } from "next";
import Link from "next/link";
import { MyPicks } from "@/components/MyPicks";
import { recentCompact } from "@/lib/lotto/compact";

export const metadata: Metadata = { title: "내 번호", robots: { index: false } };

export default function MyPage() {
  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">내 번호</div>
        <h1>이 기기에 저장한 번호</h1>
        <p>
          회차별로 모아 두고, 추첨이 끝나면 등수를 표시합니다. 저장값은 이 브라우저에만 있고 서버로 가지 않습니다. 지우려면 각 묶음의 ‘지우기’나 <Link href="/privacy">개인정보 안내</Link>의 전체 지우기를 쓰세요.
        </p>
      </header>
      <MyPicks recent={recentCompact()} />
    </div>
  );
}
