import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Balls } from "@/components/Balls";
import { FeatureTable, Omr } from "@/components/FeatureTable";
import { ResultActions } from "@/components/ResultActions";
import { toCtxJson } from "@/lib/lotto/ctxJson";
import { LATEST, buildContext, historicalPassRate } from "@/lib/lotto/draws";
import { effectiveRules } from "@/lib/lotto/generate";
import { parsePickParams } from "@/lib/lotto/pickParams";
import { presetById } from "@/lib/lotto/presets";
import { pct, presetRate } from "@/lib/lotto/rates";
import { evaluate } from "@/lib/lotto/rules";

export const metadata: Metadata = { title: "만든 번호", robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

async function Result({ searchParams }: { searchParams: Search }) {
  const p = parsePickParams(await searchParams);
  const preset = presetById(p.preset)!;
  if (!p.games.length) {
    return (
      <div className="error-box">
        주소에 번호가 없습니다. <Link href={`/pick?t=${p.preset}`}>번호 만들기</Link>에서 다시 만들어 주세요.
      </div>
    );
  }
  const ctx = buildContext();
  const rules = effectiveRules(preset, p.include, p.exclude);
  const hist = historicalPassRate(preset);
  const allPass = p.games.every((g) => evaluate(g, rules, ctx).pass);
  return (
    <div className="stack">
      <header className="result-head">
        <div className="eyebrow">만든 번호 · {preset.name}</div>
        <h1>{p.games.length}게임</h1>
        <p className="sub">
          이 타입을 만족하는 조합은 전체의 {pct(presetRate(preset.id))}, 역대 당첨 {hist.total}회 가운데 {pct(hist.pass / hist.total)}. 한 게임의 1등 확률은 어떤 타입이든 8,145,060분의 1입니다.
        </p>
        {!allPass && <div className="callout warn">이 주소의 번호는 지금 회차 기준으로는 타입 규칙을 모두 만족하지 않습니다. 직전 회차·최근 빈도가 바뀌면 그럴 수 있습니다.</div>}
      </header>

      <div className="games">
        {p.games.map((g, i) => (
          <div className="game" key={i}>
            <span className="idx">{String.fromCharCode(65 + i)}</span>
            <Balls numbers={g} />
            <span className="right">합 {g.reduce((a, b) => a + b, 0)}</span>
          </div>
        ))}
      </div>

      <ResultActions preset={p.preset} count={p.count} include={p.include} exclude={p.exclude} games={p.games.map((g) => [...g])} ctx={toCtxJson(ctx)} />

      <section className="section">
        <h2>게임별 조건값</h2>
        <p className="section-lede">직전 회차는 {LATEST.round}회({LATEST.numbers.join(", ")}) 기준입니다.</p>
        <div className="two-col">
          {p.games.map((g, i) => (
            <div className="card" key={i}>
              <h3>{String.fromCharCode(65 + i)} · {g.join(" ")}</h3>
              <Omr combo={g} />
              <FeatureTable combo={g} rules={rules} ctx={ctx} />
            </div>
          ))}
        </div>
      </section>

      <p className="small muted">
        <Link href={`/pick?t=${p.preset}&n=${p.count}${p.include.length ? `&fix=${p.include.join("-")}` : ""}${p.exclude.length ? `&ex=${p.exclude.join("-")}` : ""}`}>조건 바꾸기</Link> · <Link href="/my">내 번호</Link>
      </p>
    </div>
  );
}

export default function ResultPage({ searchParams }: PageProps<"/pick/result">) {
  return (
    <Suspense fallback={<div className="card">번호를 읽는 중…</div>}>
      <Result searchParams={searchParams} />
    </Suspense>
  );
}
