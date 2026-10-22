import Link from "next/link";

export default function NotFound() {
  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">404</div>
        <h1>그런 페이지가 없습니다</h1>
        <p>회차 번호나 주소를 확인해 주세요.</p>
      </header>
      <div className="cta-row">
        <Link href="/" className="btn">홈으로</Link>
        <Link href="/results" className="btn ghost">회차 결과</Link>
      </div>
    </div>
  );
}
