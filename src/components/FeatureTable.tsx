import { type Combo, featuresOf } from "@/lib/lotto/features";
import { type NumericFeature, type Rule, type RuleContext, FEATURE_LABEL, describeRule, evaluate, featureValue } from "@/lib/lotto/rules";

const SHOWN: NumericFeature[] = ["sum", "oddCount", "lowCount", "consecutivePairs", "ac", "maxSameEnding", "maxSection", "sectionCount", "primeCount", "carryover"];

/** 조합의 조건값과 규칙 충족 여부 */
export function FeatureTable({ combo, rules, ctx }: { combo: Combo; rules: readonly Rule[]; ctx: RuleContext }) {
  const ev = evaluate(combo, rules, ctx);
  const f = featuresOf(combo);
  const ruleFor = (feature: NumericFeature) => rules.find((r) => r.kind === "range" && r.feature === feature);
  return (
    <table className="rule-table">
      <thead>
        <tr>
          <th>조건</th>
          <th className="num">값</th>
          <th>규칙</th>
        </tr>
      </thead>
      <tbody>
        {SHOWN.map((feat) => {
          const v = featureValue(combo, f, feat, ctx);
          if (v === undefined) return null;
          const r = ruleFor(feat);
          const ok = r ? !ev.failed.includes(r) : null;
          return (
            <tr key={feat}>
              <td>{FEATURE_LABEL[feat]}</td>
              <td className="num">{v}</td>
              <td>{r ? <span className={`tag ${ok ? "ok" : "no"}`}>{describeRule(r)}</span> : <span className="hint">—</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** OMR 용지 모양 (7열 × 7행, 1~45) */
export function Omr({ combo }: { combo: Combo }) {
  return (
    <div className="omr" aria-label={`OMR 표시: ${combo.join(", ")}`}>
      {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => (
        <span key={n} className={combo.includes(n) ? "on" : ""}>{n}</span>
      ))}
    </div>
  );
}
