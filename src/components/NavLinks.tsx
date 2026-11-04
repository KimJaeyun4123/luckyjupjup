"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/pick", label: "번호 만들기" },
  { href: "/my", label: "내 번호" },
  { href: "/results", label: "회차 결과" },
  { href: "/numbers", label: "번호별" },
  { href: "/stats", label: "통계" },
  { href: "/check", label: "당첨 확인" },
];

/** 상단 메뉴. 지금 보고 있는 갈래에 aria-current를 단다. dh 가 켜져 있으면 '내 동행복권'을 덧붙인다 */
export function NavLinks({ dh = false }: { dh?: boolean }) {
  const path = usePathname();
  const links = dh ? [...LINKS, { href: "/dh", label: "내 동행복권" }] : LINKS;
  return (
    <nav className="nav" aria-label="주요 메뉴">
      {links.map((l) => {
        const on = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
