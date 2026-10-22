import type { Rule } from "./rules";

/** 사용자가 고르는 '조건 타입'. 규칙은 모두 직렬화 가능하고, 가중치는 뽑는 확률만 바꾸며 규칙 판정은 같다 */
export interface Preset {
  id: PresetId;
  name: string;
  /** 카드 한 줄 */
  short: string;
  /** 결과 화면 설명 */
  description: string;
  rules: Rule[];
  /** 번호별 추출 가중치 종류 */
  weighting?: "hot" | "cold" | "absent";
  /** 고정수를 받는 타입 */
  acceptsInclude?: boolean;
}

export type PresetId = "random" | "balanced" | "hot" | "cold" | "carry" | "spread" | "antiShare" | "mine";

/** 역대 당첨의 42.6%, 전체 조합의 42.7%가 통과하는 균형 규칙 */
export const BALANCED_RULES: Rule[] = [
  { kind: "range", feature: "sum", min: 100, max: 175 },
  { kind: "range", feature: "oddCount", min: 2, max: 4 },
  { kind: "range", feature: "lowCount", min: 2, max: 4 },
  { kind: "range", feature: "consecutivePairs", max: 1 },
  { kind: "range", feature: "ac", min: 7 },
  { kind: "range", feature: "maxSameEnding", max: 2 },
  { kind: "range", feature: "maxSection", max: 3 },
];

export const PRESETS: Preset[] = [
  {
    id: "random",
    name: "완전 랜덤",
    short: "조건 없이 무작위. 기계 자동과 같다",
    description: "아무 조건을 두지 않고 암호학적 난수로 6개를 뽑는다. 판매점의 자동 선택과 같은 방식이다.",
    rules: [],
  },
  {
    id: "balanced",
    name: "균형형",
    short: "합계·홀짝·고저·연속·끝수가 치우치지 않은 모양",
    description:
      "합계 100~175, 홀수 2~4개, 저수(1~22) 2~4개, 연속 쌍 1개 이하, AC값 7 이상, 같은 끝수 2개 이하, 한 구간 3개 이하. 역대 당첨 조합의 42.6%가 이 모양이고, 전체 조합의 42.7%도 이 모양이다.",
    rules: BALANCED_RULES,
  },
  {
    id: "hot",
    name: "최근 자주형",
    short: "최근 50회에 자주 나온 번호를 3~4개 넣는다",
    description: "최근 50회 출현 상위 15개 번호에서 3~4개를 고르고 나머지는 균형 규칙을 따른다. 번호별 출현 차이는 우연의 범위 안에 있어, '흐름'이 아니라 취향으로 고르는 타입이다.",
    rules: [...BALANCED_RULES, { kind: "range", feature: "hotCount", min: 3, max: 4 }],
    weighting: "hot",
  },
  {
    id: "cold",
    name: "오래 안 나온형",
    short: "한동안 안 나온 번호를 2~3개 넣는다",
    description: "최근 10회 이상 나오지 않은 번호를 2~3개 넣고 나머지는 균형 규칙을 따른다. 안 나온 번호가 다음에 더 잘 나오는 것은 아니다.",
    rules: [...BALANCED_RULES, { kind: "range", feature: "absentCount", min: 2, max: 3 }],
    weighting: "absent",
  },
  {
    id: "carry",
    name: "이월형",
    short: "직전 회차 번호 1~2개를 다시 넣는다",
    description: "직전 회차 당첨번호 가운데 1~2개를 넣고 나머지는 균형 규칙을 따른다. 역대 회차의 61%가 직전 회차 번호를 1개 이상 포함했는데, 이는 무작위일 때의 60%와 같다.",
    rules: [...BALANCED_RULES, { kind: "range", feature: "carryover", min: 1, max: 2 }],
  },
  {
    id: "spread",
    name: "골고루형",
    short: "다섯 구간에 넓게, 끝수도 모두 다르게",
    description: "10단위 구간 가운데 4개 이상에 번호가 들고, 한 구간에 2개를 넘지 않으며, 끝수가 모두 다르고, 연속한 번호가 없다. 용지에서 보기 좋게 퍼진 모양이다.",
    rules: [
      { kind: "range", feature: "sectionCount", min: 4 },
      { kind: "range", feature: "maxSection", max: 2 },
      { kind: "range", feature: "maxSameEnding", max: 1 },
      { kind: "range", feature: "consecutivePairs", max: 0 },
    ],
  },
  {
    id: "antiShare",
    name: "나눠 갖기 회피형",
    short: "남들이 덜 고르는 모양으로, 당첨되면 나눌 사람을 줄인다",
    description:
      "생일로 쓰이는 1~31을 벗어난 32 이상 번호를 3개 이상 넣고, 연속·규칙 패턴을 피하며, 역대 1등 조합을 제외한다. 당첨 확률은 다른 타입과 같고, 당첨됐을 때 같은 번호를 고른 사람이 적을 수 있다는 가설에 기댄 타입이다. 한국 판매 데이터로 검증된 것은 아니다.",
    rules: [
      { kind: "range", feature: "upperCount", min: 3 },
      { kind: "range", feature: "ac", min: 7 },
      { kind: "range", feature: "consecutivePairs", max: 1 },
      { kind: "range", feature: "maxSameEnding", max: 2 },
      { kind: "notPastWinner" },
    ],
  },
  {
    id: "mine",
    name: "내 번호형",
    short: "생일·기념일 같은 내 번호를 고정하고 나머지는 균형형으로",
    description: "고정수 1~5개를 반드시 넣고, 나머지는 균형 규칙으로 채운다.",
    rules: BALANCED_RULES,
    acceptsInclude: true,
  },
];

export const DEFAULT_PRESET: PresetId = "balanced";
export const presetById = (id: string | undefined): Preset | undefined => PRESETS.find((p) => p.id === id);
export const isPresetId = (id: string): id is PresetId => PRESETS.some((p) => p.id === id);

/** 핫·콜드 기준이 되는 최근 회차 수 */
export const HOT_WINDOW = 50;
export const HOT_TOP = 15;
/** '오래 안 나온' 기준 미출현 회차 */
export const ABSENT_ROUNDS = 10;
