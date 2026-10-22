"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type CtxJson, fromCtxJson } from "@/lib/lotto/ctxJson";
import { MAX } from "@/lib/lotto/features";
import { GenerateError, MAX_GAMES, MAX_INCLUDE, generate, weightsFor } from "@/lib/lotto/generate";
import { pickParamsToSearch } from "@/lib/lotto/pickParams";
import { PRESETS, type PresetId, presetById } from "@/lib/lotto/presets";
import { describeRule } from "@/lib/lotto/rules";

interface Props {
  initial: { preset: PresetId; count: number; include: number[]; exclude: number[] };
  ctx: CtxJson;
  /** 타입별 전체 조합 비율 문구 */
  rates: Record<PresetId, string>;
}

const ALL = Array.from({ length: MAX }, (_, i) => i + 1);

/** 번호 만들기 폼. 생성은 브라우저에서 암호학적 난수로 하고, 결과는 URL에 담아 /pick/result 로 간다 */
export function PickForm({ initial, ctx, rates }: Props) {
  const router = useRouter();
  const [preset, setPreset] = useState<PresetId>(initial.preset);
  const [count, setCount] = useState(initial.count);
  const [include, setInclude] = useState<number[]>(initial.include);
  const [exclude, setExclude] = useState<number[]>(initial.exclude);
  const [spread, setSpread] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const p = presetById(preset)!;
  const showInclude = p.acceptsInclude;

  const toggle = (n: number, list: number[], set: (v: number[]) => void, max: number) => {
    if (list.includes(n)) set(list.filter((x) => x !== n));
    else if (list.length < max) set([...list, n].sort((a, b) => a - b));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const rctx = fromCtxJson(ctx);
      const r = generate({
        preset: p,
        count,
        include: showInclude ? include : [],
        exclude,
        ctx: rctx,
        weights: weightsFor(p.weighting === "hot" ? rctx.hot : p.weighting === "cold" ? rctx.cold : p.weighting === "absent" ? rctx.absent : undefined),
        spreadAcrossGames: spread,
      });
      const q = pickParamsToSearch({ preset, count, include: showInclude ? include : [], exclude, games: r.games });
      router.push(`/pick/result?${q.toString()}`);
    } catch (err) {
      setError(err instanceof GenerateError ? err.message : "번호를 만들지 못했습니다.");
      setBusy(false);
    }
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="field">
        <span className="label">타입</span>
        <div className="presets" role="radiogroup" aria-label="조건 타입">
          {PRESETS.map((x) => (
            <button
              key={x.id}
              type="button"
              className="preset"
              role="radio"
              aria-checked={x.id === preset}
              aria-current={x.id === preset ? "true" : undefined}
              onClick={() => setPreset(x.id)}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <h3>{x.name}</h3>
              <p>{x.short}</p>
              <span className="rate">전체 조합의 {rates[x.id]}</span>
            </button>
          ))}
        </div>
        <p className="small muted">{p.description}</p>
        {p.rules.length > 0 && (
          <div className="tags" aria-label="적용 규칙">
            {p.rules.map((r, i) => (
              <span className="tag" key={i}>{describeRule(r)}</span>
            ))}
            {p.weighting === "absent" && <span className="tag">오래 안 나온 기준: {ctx.absentThreshold}회 이상 ({ctx.absent.length}개)</span>}
          </div>
        )}
      </div>

      <div className="field">
        <span className="label">게임 수</span>
        <div className="segmented">
          {Array.from({ length: MAX_GAMES }, (_, i) => i + 1).map((n) => (
            <label key={n}>
              <input type="radio" name="n" value={n} checked={count === n} onChange={() => setCount(n)} />
              {n}게임
            </label>
          ))}
        </div>
        <label className="small">
          <input type="checkbox" checked={spread} onChange={(e) => setSpread(e.target.checked)} /> 게임끼리 겹치는 번호 줄이기
        </label>
      </div>

      {showInclude && (
        <div className="field">
          <span className="label">고정수 (최대 {MAX_INCLUDE}개, 지금 {include.length}개)</span>
          <div className="numgrid" aria-label="고정수 선택">
            {ALL.map((n) => (
              <button key={n} type="button" aria-pressed={include.includes(n)} disabled={exclude.includes(n)} onClick={() => toggle(n, include, setInclude, MAX_INCLUDE)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <details>
        <summary className="small">제외수 {exclude.length ? `(${exclude.length}개)` : ""}</summary>
        <div className="field" style={{ marginTop: 10 }}>
          <div className="numgrid" aria-label="제외수 선택">
            {ALL.map((n) => (
              <button key={n} type="button" className="ex" aria-pressed={exclude.includes(n)} disabled={include.includes(n)} onClick={() => toggle(n, exclude, setExclude, 39)}>
                {n}
              </button>
            ))}
          </div>
          {exclude.length > 0 && (
            <button type="button" className="btn ghost sm" onClick={() => setExclude([])}>제외수 지우기</button>
          )}
        </div>
      </details>

      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="cta-row">
        <button type="submit" className="btn" disabled={busy}>{busy ? "만드는 중…" : "번호 만들기"}</button>
        <span className="hint">만든 번호는 주소에 담겨 그대로 공유할 수 있습니다. 어떤 타입이든 당첨 확률은 같습니다.</span>
      </div>
    </form>
  );
}
