import type { Metadata } from "next";
import { Suspense } from "react";
import { PickForm } from "@/components/PickForm";
import { toCtxJson } from "@/lib/lotto/ctxJson";
import { buildContext } from "@/lib/lotto/draws";
import { parsePickParams } from "@/lib/lotto/pickParams";
import { PRESETS, type PresetId } from "@/lib/lotto/presets";
import { pct, presetRate } from "@/lib/lotto/rates";

export const metadata: Metadata = { title: "번호 만들기", description: "조건 타입을 골라 로또 6/45 번호를 만듭니다. 어떤 타입이든 당첨 확률은 같습니다." };

type Search = Promise<Record<string, string | string[] | undefined>>;

async function Form({ searchParams }: { searchParams: Search }) {
  const p = parsePickParams(await searchParams);
  const rates = Object.fromEntries(PRESETS.map((x) => [x.id, pct(presetRate(x.id))])) as Record<PresetId, string>;
  return <PickForm initial={{ preset: p.preset, count: p.count, include: p.include, exclude: p.exclude }} ctx={toCtxJson(buildContext())} rates={rates} />;
}

export default function PickPage({ searchParams }: PageProps<"/pick">) {
  return (
    <div className="stack">
      <header className="page-head">
        <div className="eyebrow">번호 만들기</div>
        <h1>조건 타입을 고르세요</h1>
        <p>타입은 번호의 모양을 정할 뿐 당첨 확률을 바꾸지 않습니다. 생성은 이 브라우저에서 암호학적 난수로 이뤄지고 서버에는 아무것도 남지 않습니다.</p>
      </header>
      <Suspense fallback={<div className="form-card">불러오는 중…</div>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
