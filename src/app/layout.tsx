import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

const DESCRIPTION = "조건을 골라 로또 6/45 번호를 만들고, 저장해 두면 토요일 추첨 뒤 결과를 알려 주는 무료 서비스";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://gyulngyul.vercel.app/lotto"),
  title: { default: "행운줍줍 — 조건으로 만드는 로또 번호", template: "%s · 행운줍줍" },
  description: DESCRIPTION,
  applicationName: "행운줍줍",
  openGraph: { type: "website", locale: "ko_KR", siteName: "행운줍줍", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#15171d" },
  ],
};

// 이 기기에 저장한 번호가 있으면 그리기 전에 표시해, 홈의 '내 번호 결과'가 맨 위에 자리를 잡게 한다. 값은 읽기만 한다
const RETURNING_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("luckyjupjup:picks")||"[]");if(Array.isArray(p)&&p.length)document.documentElement.dataset.returning="1"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: RETURNING_SCRIPT }} />
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand" aria-label="행운줍줍 홈">
              <BrandMark className="brand-mark" />
              <span className="brand-name">행운줍줍</span>
            </Link>
            <NavLinks />
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="container">
            <p>
              행운줍줍 · 초기 개발 버전 (v0.1) · <Link href="/my">내 번호</Link> · <Link href="/results">회차 결과</Link> · <Link href="/stats">통계</Link> · <Link href="/about">서비스 안내</Link> · <Link href="/privacy">개인정보 안내</Link>
            </p>
            <p>
              어떤 조건으로 만들어도 한 게임의 1등 확률은 8,145,060분의 1로 같습니다. 이 서비스는 번호를 만들고 결과를 보여 줄 뿐 복권을 판매하거나 구매를 대행하지 않으며, 동행복권·복권위원회와 관계가 없습니다. 복권 구매는 만 19세 이상만 할 수 있습니다. 도박 문제 상담 1336.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
