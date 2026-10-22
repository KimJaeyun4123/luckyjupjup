/** 네잎클로버 한 잎을 집어 올리는 손 모양을 단순화한 마크 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 15c-3-5-9-5-9 0 0 3 4 4 9 5" />
      <path d="M16 15c3-5 9-5 9 0 0 3-4 4-9 5" />
      <path d="M16 15c-5-3-5-9 0-9 3 0 4 4 5 9" />
      <path d="M16 15c5-3 5-9 0-9" />
      <path d="M16 20v7" />
    </svg>
  );
}
