import type { RuleContext } from "./rules";

/** RuleContext 를 클라이언트에 넘길 수 있는 JSON 으로 (Set → 배열). 역대 1등 집합은 크므로 빼고, 클라이언트는 notPastWinner 를 판정하지 않는다 */
export interface CtxJson {
  previous: number[];
  hot: number[];
  cold: number[];
  absent: number[];
  absentThreshold: number;
}

export const toCtxJson = (ctx: RuleContext & { absentThreshold: number }): CtxJson => ({
  previous: [...(ctx.previous ?? [])],
  hot: [...(ctx.hot ?? [])],
  cold: [...(ctx.cold ?? [])],
  absent: [...(ctx.absent ?? [])],
  absentThreshold: ctx.absentThreshold,
});

export const fromCtxJson = (j: CtxJson): RuleContext => ({ previous: j.previous, hot: new Set(j.hot), cold: new Set(j.cold), absent: new Set(j.absent) });
