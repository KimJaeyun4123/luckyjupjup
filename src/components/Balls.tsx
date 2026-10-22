import { sectionOf } from "@/lib/lotto/features";

/** 번호 공. 색은 용지 구간색(1~10 노랑, 11~20 파랑, 21~30 빨강, 31~40 회색, 41~45 초록) */
export function Ball({ n, dim, bonus, size = "md" }: { n: number; dim?: boolean; bonus?: boolean; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`ball s${sectionOf(n)} ${size} ${dim ? "dim" : ""} ${bonus ? "bonus" : ""}`} aria-label={bonus ? `보너스 ${n}` : String(n)}>
      {n}
    </span>
  );
}

export function Balls({ numbers, bonus, highlight, size = "md" }: { numbers: readonly number[]; bonus?: number; highlight?: readonly number[]; size?: "sm" | "md" | "lg" }) {
  return (
    <span className="balls">
      {numbers.map((n) => (
        <Ball key={n} n={n} size={size} dim={highlight ? !highlight.includes(n) : false} />
      ))}
      {bonus !== undefined && (
        <>
          <span className="plus" aria-hidden="true">+</span>
          <Ball n={bonus} bonus size={size} dim={highlight ? !highlight.includes(bonus) : false} />
        </>
      )}
    </span>
  );
}
