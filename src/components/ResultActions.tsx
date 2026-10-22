"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyNumbers } from "./CopyNumbers";
import { ShareButton } from "./ShareButton";
import { type CtxJson, fromCtxJson } from "@/lib/lotto/ctxJson";
import { GenerateError, generate, weightsFor } from "@/lib/lotto/generate";
import { pickParamsToSearch } from "@/lib/lotto/pickParams";
import { savePick } from "@/lib/lotto/picks";
import { type PresetId, presetById } from "@/lib/lotto/presets";
import { roundForPurchase } from "@/lib/lotto/schedule";

interface Props {
  preset: PresetId;
  count: number;
  include: number[];
  exclude: number[];
  games: number[][];
  ctx: CtxJson;
}

/** 결과 화면의 저장·다시 만들기·공유·복사 */
export function ResultActions({ preset, count, include, exclude, games, ctx }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState("");

  const save = () => {
    const round = roundForPurchase(new Date());
    savePick(round, games, preset);
    setSaved(round);
  };

  const again = () => {
    setError("");
    try {
      const p = presetById(preset)!;
      const rctx = fromCtxJson(ctx);
      const r = generate({
        preset: p,
        count,
        include,
        exclude,
        ctx: rctx,
        weights: weightsFor(p.weighting === "hot" ? rctx.hot : p.weighting === "cold" ? rctx.cold : p.weighting === "absent" ? rctx.absent : undefined),
        spreadAcrossGames: true,
      });
      setSaved(null);
      router.replace(`/pick/result?${pickParamsToSearch({ preset, count, include, exclude, games: r.games }).toString()}`);
    } catch (e) {
      setError(e instanceof GenerateError ? e.message : "번호를 만들지 못했습니다.");
    }
  };

  return (
    <div className="stack-sm">
      <div className="cta-row">
        <button type="button" className="btn" onClick={save} disabled={saved !== null}>
          {saved ? `${saved}회 번호로 저장했습니다` : "이 기기에 저장"}
        </button>
        <button type="button" className="btn ghost" onClick={again}>다시 만들기</button>
        <CopyNumbers games={games} />
        <ShareButton title="행운줍줍 번호" />
      </div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <p className="hint">
        저장은 이 브라우저에만 남고 서버로 가지 않습니다. 저장 시점의 판매 마감(토요일 20:00) 기준으로 회차가 정해집니다. 구매는{" "}
        <a href="https://www.dhlottery.co.kr/lt645/intro" target="_blank" rel="noreferrer">동행복권</a>이나 판매점에서 직접 합니다.
      </p>
    </div>
  );
}
