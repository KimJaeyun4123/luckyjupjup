import type { Metadata } from "next";
import { ClearSavedButton } from "@/components/ClearSavedButton";

export const metadata: Metadata = { title: "개인정보 안내" };

export default function PrivacyPage() {
  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">개인정보 안내</div>
        <h1>서버에 저장하는 것이 없습니다</h1>
      </header>
      <section className="section">
        <h2>결과 주소</h2>
        <p>만든 번호는 결과 화면의 주소(쿼리 파라미터 <code className="mono">g</code>)에 담깁니다. 주소를 공유하면 받는 사람도 같은 번호를 봅니다. 번호 생성은 브라우저 안에서 이뤄지며 서버는 주소를 읽어 화면을 그릴 뿐 기록하지 않습니다.</p>
      </section>
      <section className="section">
        <h2>이 기기에 저장되는 것</h2>
        <p>‘이 기기에 저장’을 누르면 번호·회차·타입·저장 시각이 브라우저의 localStorage(<code className="mono">luckyjupjup:picks</code>)에 남습니다. 서버로 전송되지 않고, 다른 기기와 동기화되지 않습니다. 아래 버튼으로 모두 지울 수 있습니다.</p>
        <ClearSavedButton />
      </section>
      <section className="section">
        <h2>쿠키·분석·광고</h2>
        <p>쿠키를 쓰지 않고, 방문 분석 도구와 광고가 없습니다. 호스팅(Vercel)의 기본 접속 로그만 남습니다.</p>
      </section>
    </div>
  );
}
