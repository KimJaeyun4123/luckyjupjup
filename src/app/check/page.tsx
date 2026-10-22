import type { Metadata } from "next";
import { CheckForm } from "@/components/CheckForm";
import { recentCompact } from "@/lib/lotto/compact";

export const metadata: Metadata = { title: "당첨 확인", description: "번호 6개와 회차를 골라 로또 6/45 등수를 확인합니다." };

export default function CheckPage() {
  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">당첨 확인</div>
        <h1>번호를 골라 등수를 보세요</h1>
        <p>저장해 둔 번호는 ‘내 번호’에서 자동으로 확인됩니다. 여기서는 용지의 번호를 직접 골라 봅니다.</p>
      </header>
      <CheckForm recent={recentCompact()} />
    </div>
  );
}
