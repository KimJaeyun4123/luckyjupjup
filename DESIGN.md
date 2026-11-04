# 행운줍줍 (luckyjupjup) 설계 v0.1

작성 2026-10-22. 조사 근거는 `~/Documents/reports/행운줍줍 로또 번호 생성 서비스 조사.md`와 `~/Documents/research_notes/행운줍줍 로또 조사/`에 있다.

## 1. 한 줄 정의

**조건을 골라 로또 6/45 번호를 만들고, 저장해 두면 토요일 추첨 뒤 당첨을 알려 주는 무료 웹 서비스.** 번호를 대신 사 주지는 않는다. 대신 사용자가 자기 계정·자기 컴퓨터에서 돌리는 자동 구매 에이전트가 가져갈 수 있도록 번호 목록을 열어 준다.

### 설계 원칙 (조사에서 나온 제약)

1. **확률은 바꾸지 않는다고 먼저 말한다.** 모든 필터는 역대 당첨 통과율과 전체 조합 통과율이 1~2%p 안에서 같다(균형 필터 7개 동시 통과: 역대 42.6% vs 전체 42.7%). 화면마다 "이 조건을 만족하는 조합은 전체의 N%"를 보여 준다. '예측·적중·추천·분석 결과' 대신 **'조건', '타입', '만들기'** 라는 말을 쓴다.
2. **대신 사지 않는다.** 복권법 제6조제4항은 영리 목적 온라인복권 구매 대행을 금지하고(1년 이하 징역/500만원 이하 벌금, 양벌규정), 계류 개정안은 구매 중개·대행과 영리 목적 당첨 예상번호 제공·홍보까지 금지한다. 서비스 서버는 동행복권 계정·비밀번호·예치금을 **절대 보관하지도, 대신 로그인하지도 않는다.**
3. **완전 무료·무광고.** 개정안이 통과되면 광고도 '영리 목적'으로 해석될 수 있다. 2026-10-22 사용자 동의로 확정. 수익화는 개정안 결과를 본 뒤 다시 논의한다.
4. **DB 없이 시작한다.** gyulngyul과 같이 결과는 URL 파라미터, 내 번호는 localStorage. 회차 데이터는 저장소에 내장한 JSON(`data/draws.json`, 1~1246회, 공식 엔드포인트 수집·smok95 대조 완료)과 주 1회 GitHub Action 갱신.
5. **동행복권 비공식 엔드포인트는 수집기만 쓴다.** 사용자 요청마다 호출하지 않는다. 사이트에 접속 차단 안내가 있다.

## 2. 이름·저장소·배포

- 표시명 **행운줍줍**, 영문·패키지·저장소·폴더 **`luckyjupjup`** (gyulngyul처럼 한 단어 소문자).
- **결과결과 같은 사이트의 `/lotto` 아래**에서 서비스한다(2026-10-22 결정). 별도 도메인은 두지 않는다. 구현은 Next.js 멀티존: 이 프로젝트는 `basePath: "/lotto"`로 따로 빌드·배포(Vercel 프로젝트 1개 추가)하고, 결과결 `next.config.ts`에 `rewrites: [{ source: "/lotto", destination: "https://<luckyjupjup 배포>/lotto" }, { source: "/lotto/:path*", destination: "https://<luckyjupjup 배포>/lotto/:path*" }]`를 넣는다. 결과결 저장소는 그 한 줄 외에 바뀌지 않는다. 단독 주소로 열면 `/` → `/lotto`로 보낸다.
- 문체는 gyulngyul README처럼 '~한다'체 한국어. 코드·식별자는 영어.

## 3. 범위

| 단계 | 내용 |
|---|---|
| **MVP (v0.1)** | 타입 선택 → 5게임 생성 → URL 공유·저장 → 최신 회차 결과 → 저장 번호 당첨 확인 → 회차별·번호별 정적 페이지 → 통계(조건별 비율) → 개인정보·고지 |
| v0.2 | 규칙 편집기(커스텀 타입), 에이전트용 번호 목록 URL(`/api/picks/[token]`), 추첨 알림 .ics, 공유 미리보기 OG 이미지, QR 스캔 당첨 확인(용지 QR → 번호 파싱) |
| v0.3 | 결과결(gyulngyul) 연계 '결 번호' 타입(사주 보탬 오행 → 하도낙서 수 1·6水, 2·7火, 3·8木, 4·9金, 5·10土), 1등 판매점 지도(smok95 winning-stores 262회~) |
| 보류 | 서버 측 자동 구매(위법 소지), 유료 플랜·광고(개정안 대기), 웹푸시(가치 대비 운영 부담), 회원가입 |

## 4. 화면

| 경로 | 내용 |
|---|---|
| `/` | 최신 회차 결과(번호·보너스·1등 인원·금액), 다음 추첨까지 남은 시간(토 20:35), 판매 마감(토 20:00) 안내, 타입 카드 8개 → 바로 만들기. 저장한 번호가 있으면 상단에 '내 번호 결과' (gyulngyul의 '오늘의 결' 패턴, `html[data-returning]`) |
| `/pick` → `/pick/result` | 타입 선택(`t`), 게임 수(`n`=1~5), 고정수(`fix`)·제외수(`ex`), 최근 N회(`w`, 핫·콜드용) → 결과는 `g`에 게임 인코딩. 결과 화면: 번호 공(색은 용지 구간색), 게임별 조건 충족 표, "이 조합들이 속한 범위는 전체의 N%", 다시 만들기, 저장, 공유, 'OMR에 옮기기' 체크 안내, '동행복권에서 사기' 바로가기(`https://www.dhlottery.co.kr/lt645/intro`에 번호를 넘길 방법은 없으니 복사 버튼) |
| `/pick/custom` | 규칙 편집기(v0.2): 규칙 켜고 끄기·범위 조절, 오른쪽에 통과 비율이 실시간으로 바뀜 |
| `/my` | 저장한 게임 목록(회차별 묶음), 회차 결과가 나오면 등수 자동 표시, 삭제, 에이전트용 목록 URL 만들기(v0.2) |
| `/results` → `/results/[round]` | 회차 결과 정적 페이지 1,246+쪽(검색 노출): 번호, 등수별 인원·금액, 총판매액, 1등 자동/수동/반자동, 이 회차 조합의 조건값(합계·홀짝·AC…) 과 "전체의 몇 %에 드는 모양"인지, 이전/다음 회차 |
| `/numbers/[n]` | 1~45 번호별 정적 45쪽: 출현 횟수·기대값 대비, 최근 출현, 최장 미출현, 함께 자주 나온 번호, 이 번호를 고정수로 만들기 |
| `/stats` | 번호 빈도(기간 선택), 합계 분포 히스토그램(역대 vs 이론), 조건별 통과율 표, 홀짝·고저·AC 분포 |
| `/check` | 번호 6개 입력(또는 QR, v0.2) + 회차 → 등수 |
| `/agent` | 자동 구매 에이전트 안내(v0.2): 원리, 위험 고지(약관 금지행위·계정 제한·5,000원 한도·예치금), 오픈소스 선택지, 내 목록 URL 연결법 |
| `/about`, `/privacy` | 서비스 설명, "확률 동일" 고지, 동행복권과 무관함, 저장 데이터(localStorage `luckyjupjup:picks`)와 지우기 버튼, 데이터 출처 |

URL 파라미터: `t`=타입 id, `n`=게임 수, `g`=게임 목록(각 게임을 조합 순위 정수 0~8,145,059로 바꿔 base36 5자, 쉼표 없이 이어 붙임), `fix`/`ex`=숫자 하이픈 목록, `w`=최근 회차 수, `r`=회차. 결과 URL만 공유해도 같은 번호를 그대로 볼 수 있다.

## 5. 번호 생성 엔진 (`src/lib/lotto/`)

### 5.1 피처 (`features.ts`) — 순수 함수, 조합 1개 → 수치

| 피처 | 정의 |
|---|---|
| `sum` | 합계 (21~255, 평균 138) |
| `oddCount` | 홀수 개수 |
| `lowCount` | 1~22 개수 |
| `consecutivePairs` / `maxRun` | 연속 쌍 수 / 가장 긴 연속 길이 |
| `ac` | 15개 쌍 차이값의 서로 다른 개수 − 5 (0~10) |
| `maxSameEnding` / `endingSum` | 같은 끝수 최대 개수 / 끝수 합 |
| `sectionCounts` | 10단위 5구간 개수(= 용지 색) |
| `primeCount`, `multipleOf3Count` | 소수 개수(14개 중), 3의 배수 개수 |
| `range` | 최대−최소 |
| `carryover(prev)` | 직전 회차와 겹치는 개수 |
| `hotCount(window)`, `coldCount(window)`, `absentCount(k)` | 최근 N회 상위/하위 빈도 번호 개수, k회 이상 미출현 번호 개수 |
| `birthdayOnly` | 모두 1~31인지 |

### 5.2 규칙 (`rules.ts`) — 판정 가능한 조건의 합집합 타입

```ts
type Rule =
  | { kind: 'include'; numbers: number[] }          // 고정수 (최대 5)
  | { kind: 'exclude'; numbers: number[] }          // 제외수 (최대 39)
  | { kind: 'range'; feature: NumericFeature; min?: number; max?: number }
  | { kind: 'sectionMax'; max: number }             // 구간당 최대
  | { kind: 'sectionMin'; min: number }             // 최소 구간 수
  | { kind: 'notPastWinner' }                       // 역대 1등 조합 제외
  | { kind: 'notBirthdayOnly' };
```

`evaluate(combo, rules, ctx): { pass: boolean; failed: Rule[] }`. `ctx`에는 직전 회차, 빈도표, 역대 1등 집합이 들어간다. 규칙은 모두 **직렬화 가능**해 커스텀 타입을 URL에 담을 수 있다.

### 5.3 타입(프리셋, `presets.ts`) — 사용자가 고르는 "조건 타입"

| id | 이름 | 규칙 | 전체 조합 중 비율 | 설명 문구 |
|---|---|---|---|---|
| `random` | 완전 랜덤 | 없음 | 100% | 기계 자동과 같은 무작위 |
| `balanced` | 균형형 | 합 100~175, 홀 2~4, 저 2~4, 연속 ≤1쌍, AC ≥7, 같은 끝수 ≤2, 구간 ≤3 | 42.7% | 역대 당첨의 42.6%가 이 모양 |
| `hot` | 최근 자주형 | 균형형 + 최근 `w`회(기본 50) 상위 15개 중 3~4개 포함 | 계산해 표시 | 가중 추출. "최근 흐름"일 뿐 신호 아님 고지 |
| `cold` | 오래 안 나온형 | 균형형 + 10회 이상 미출현 번호 2~3개 | 계산해 표시 | |
| `carry` | 이월형 | 균형형 + 직전 회차 번호 1~2개 포함 | 계산해 표시 | 역대 61%가 이월 1개 이상 |
| `spread` | 골고루형 | 5구간 중 4구간 이상, 구간 ≤2, 끝수 모두 다름, 연속 없음 | 계산해 표시 | |
| `antiShare` | 나눠 갖기 회피형 | 32 이상 3개 이상, 연속·배수·대각선 패턴 금지, 생일 전용 금지, 역대 1등 조합 제외 | 계산해 표시 | 당첨 확률은 같고, 당첨 시 나눌 사람이 적을 수 있다는 가설 |
| `mine` | 내 번호형 | 고정수 1~5개 + 균형형 | 계산해 표시 | 생일·기념일 넣기 |
| `custom` | 직접 조건 | 편집기 | 실시간 | v0.2 |

비율은 빌드 시 전수 열거(8,145,060개, TS로 약 수십 초)해 `data/preset-rates.json`에 넣고, 커스텀 규칙은 10만 개 표본으로 근사한 뒤 "약 N%"로 표시한다.

### 5.4 생성 알고리즘 (`generate.ts`)

1. 난수는 `crypto.getRandomValues` (CSPRNG). `Math.random` 금지. 서버·클라이언트 모두 Web Crypto.
2. **기각 샘플링**: 고정수를 넣고, 제외수를 뺀 풀에서 나머지를 뽑아 규칙 평가. 통과할 때까지 반복, 상한 20,000회. 상한을 넘으면 "조건이 너무 좁다"며 어떤 규칙에서 가장 많이 떨어졌는지(`failed` 집계) 보여 준다. 균형형은 통과율 42.7%라 평균 2.3회면 끝난다.
3. **가중 추출**(핫·콜드): 번호별 가중치(빈도 기반, 기본 1 + 0.5×표준화 점수)로 비복원 가중 샘플링 후 같은 규칙 평가.
4. **세트 규칙**(5게임 묶음): 같은 조합 금지, 옵션으로 "게임끼리 겹치는 번호 최소화"(30칸에 서로 다른 번호 최대화 — 탐욕적으로 이미 쓴 번호 가중치를 낮춤).
5. 결과는 항상 오름차순 정렬, `g` 파라미터로 직렬화.

### 5.5 테스트 (Vitest)

- 피처 함수 고정값 테스트(AC: 1·2·3·4·5·6 → 0, 1·8·15·22·29·36 → 0, 1246회 16·22·23·24·27·28 → 계산값).
- 속성 테스트: 어떤 타입으로 10,000개 만들어도 전부 규칙 통과, 중복 없음, 정렬됨.
- 비율 테스트: `random`으로 20만 개 만들어 균형형 통과율이 42.7% ± 1%p (난수 편향 감지).
- 데이터 테스트: `draws.json` 회차 연속·날짜 토요일·번호 6개 서로 다름·보너스 미포함.
- 당첨 판정: 등수별 고정 사례(2등은 5개+보너스).

## 6. 회차 데이터

### 6.1 형식 (`data/draws.json`, 배열, 회차 오름차순)

```json
{"round":1246,"date":"2026-10-17","numbers":[16,22,23,24,27,28],"bonus":6,
 "prizes":[{"rank":1,"winners":16,"amount":1881025430}, …5개],
 "sales":121857105000,"firstBy":{"auto":11,"manual":4,"semiAuto":1}}
```

### 6.2 수집기 (`src/lib/lotto/dhlottery.ts` + `scripts/draws/update.ts`)

- 최신 회차 확인: `GET https://www.dhlottery.co.kr/lt645/selectLt645History.do` → `data.lastLtEpsd`.
- 새 회차 있으면 `GET /lt645/selectPstLt645InfoNew.do?srchLtEpsd=<최신>` → `data.list`(10회차)에서 없는 회차만 추가. 필드 매핑은 `research_notes/…/data_sources.md`. 번호는 `tm1~6WnNo`를 정렬해 넣는다.
- 검증: 번호 6개 1~45 서로 다름, 보너스 미포함, 날짜가 직전 회차 +7일(토요일), `rlvtEpsdSumNtslAmt ≈ sales × 0.5`.
- 폴백: 실패 시 `https://smok95.github.io/lotto/results/latest.json`과 대조해 둘이 일치하면 채택, 아니면 실패로 두고 알림(Action 실패 메일).
- **GitHub Actions** `cron: '0 12 * * 6'`(토 21:00 KST) + 재시도 `0 13,15 * * 6`. 변경이 있으면 `data/draws.json` 커밋·푸시 → Vercel 자동 배포. 서버 런타임에서는 외부 호출 없음.
- 요청은 UA·Referer 지정, 1회 실행에 최대 3번 호출. 비공식 엔드포인트라 **응답 스키마 검증 실패 시 즉시 중단**하고 파서만 고친다.

### 6.3 파생 데이터 (빌드 시 계산, `src/lib/lotto/draws.ts`)

번호별 누적·최근 N회 빈도, 미출현 회차, 역대 1등 조합 집합(Set<string>), 합계 히스토그램, 조건별 역대 통과율. 정적 페이지 1,246+45쪽은 `generateStaticParams`.

## 7. '자동 구매'를 다루는 방식

| 단계 | 방식 | 법·약관 | 결정 |
|---|---|---|---|
| 0 | 번호 만들기 → 저장 → OMR 체크 안내 / 동행복권 모바일(평일 06~24시, 회차 5,000원)에서 직접 입력 | 문제 없음 | **MVP** |
| 1 | 사용자가 **자기 계정·자기 환경**(GitHub Actions 또는 내 PC launchd)에서 이 저장소의 `scripts/agent/`(`agent:buy`·`agent:report`)를 돌린다. 엔진으로 번호 생성 → HTTP 로그인(RSA) → 예치금 확인 → `execBuy.do` 수동 구매 → 텔레그램 → 토요일 결과 통보. 설계 당시의 '내 목록 URL' 대신 **엔진을 직접 import** 하므로 서버 API 가 필요 없다 | 영리 대행 아님(사용자 스스로 구매). 동행복권 약관 금지행위(기능 반복 호출)로 **계정 이용 제한 위험**은 사용자 부담 → `agent/README.md`에 명시 | **구현 완료 (2026-10-22)** |
| 2 | 행운줍줍 서버가 사용자 계정으로 로그인해 대신 구매 | 복권법 제6조제4항 위반 소지, 개정안 통과 시 더 강화, 계정·예치금 보관 책임 | **하지 않음** |

Tier 1 세부 (`scripts/agent/`, 상세는 `agent/README.md`):
- 동행복권 비공식 HTTP 흐름(2026-10 공개 오픈소스 구현들과 같은 경로): `/login/selectRsaModulus.do` → PKCS#1 RSA 로 아이디·비밀번호 암호화 → `/login/securityLoginCheck.do`; 예치금 `/mypage/selectUserMndp.do`; 구매는 `ol.dhlottery.co.kr/olotto/game/egovUserReadySocket.json`(direct) + `game645.do` 숨은 값(curRound·ROUND_DRAW_DATE·WAMT_PAY_TLMT_END_DT) + `execBuy.do`(param = `[{genType:"1", arrGameChoiceNum:"1,2,3,4,5,6", alpabet:"A"}…]`, saleMdaDcd 10); 구매내역·당첨 `/mypage/selectMyLotteryledger.do`(ltGdsCd LO40).
- 브라우저 없이 Node `https` + 자체 쿠키 통(단일 keep-alive 소켓으로 직렬화; Next 서버 안의 fetch/undici 는 간헐적 연결 시간 초과가 있었다). 응답은 모두 검증하고 원문을 `agent/state.json`에 남긴다. 수동 파라미터는 2026-10-22 실구매(1247회 1게임, 웹 `/api/dh/buy`)로 확정했다. 구매내역 `gmInfo`는 바코드(5자리×6)다.
- 안전장치: 같은 회차 중복 구매 금지, 판매 시간 검사, 예치금 부족 시 알림만, 로그인 1회 시도(5회 실패 잠금), 드라이런 모드, `/errorPage`·"접속 차단" 감지 시 IP 차단 안내.
- 예약: GitHub Actions `agent-buy`(금 09:10 KST, 토 10:10 재시도)·`agent-report`(토 21:40·22:40·일 00:40), 또는 Mac launchd. 알림은 텔레그램(HTML). 카카오톡 '나에게 보내기'는 토큰 갱신이 필요해 뒤로 미룸.

## 8. 당첨 확인·알림

- 저장한 게임은 `{round, games, savedAt, presetId}`로 localStorage. 회차는 저장 시점의 "다음 추첨 회차"(토 20:00 마감 전이면 이번 토요일, 지나면 다음 주).
- 결과가 나오면(`draws.json`에 해당 회차 존재) 등수 판정: 6개=1등, 5개+보너스=2등, 5개=3등, 4개=4등(5만원), 3개=5등(5천원). 금액은 회차 데이터의 `prizes`.
- 알림은 `.ics`(gyulngyul `src/lib/ics.ts` 재사용): "토 20:35 추첨, 행운줍줍에서 확인" 반복 일정. 웹푸시는 보류.

## 9. 법·정책 가드레일 체크리스트

- [ ] 모든 생성 결과 화면에 "어떤 조건으로 만들어도 1게임 당첨 확률은 8,145,060분의 1로 같다" 문장.
- [ ] '예측', '적중', '당첨 확률 상승', 'AI 분석' 표현 금지. 조건 이름도 '추천수' 대신 '고정수'.
- [ ] 동행복권·복권위원회와 무관함, 데이터 출처(동행복권 공개 추첨 결과) 명시.
- [ ] 동행복권 계정 정보 입력란 없음. 에이전트 안내는 외부 도구 소개로 한정.
- [ ] 만 19세 미만 구매 불가 안내(복권법 제5조제3항) — 서비스가 판매하진 않지만 고지.
- [ ] 과몰입 안내 문구와 사행산업통합감독위원회 상담 전화(1336) 링크.
- [ ] 무료·무광고 유지, 개정안(구자근 의원안) 통과 여부 분기별 확인.
- [ ] 수집기 호출 빈도 주 3회 이하, 차단 시 폴백.

## 10. 기술 구조

- Next.js 16 App Router, React 19, TypeScript, Vitest, Playwright, Vercel. gyulngyul과 같은 설정(`eslint.config.mjs`, `playwright.config.ts`, `vitest.config.mts`)을 복사해 시작.
- 재사용: `SummaryCard`(결과 한눈에 보기), `people.ts`의 localStorage 패턴 → `picks.ts`, `ics.ts`, `/og` 공유 이미지 라우트, E2E 스펙 구조(데스크톱·모바일 크롬, 가로 스크롤 없음).

```
src/lib/lotto/
  features.ts    조합 → 피처
  rules.ts       Rule 타입, evaluate, 직렬화
  presets.ts     타입 8개
  generate.ts    CSPRNG, 기각 샘플링, 가중 추출, 세트 규칙
  encode.ts      조합 ↔ 순위 정수 ↔ base36, URL 직렬화
  draws.ts       draws.json 로드, 빈도·미출현·1등 집합·히스토그램
  check.ts       등수 판정
  dhlottery.ts   비공식 엔드포인트 클라이언트·파서·검증 (수집기 전용)
  picks.ts       localStorage 저장
src/app/         / pick pick/result pick/custom my results/[round] numbers/[n] stats check agent about privacy og api/picks/[token]
data/            draws.json preset-rates.json
scripts/draws/   update.ts (Action), harvest_all.py filter_stats.py filter_theory.py (참고)
.github/workflows/update-draws.yml
```

## 11. 마일스톤

1. **주 1**: 프로젝트 생성, 엔진(피처·규칙·프리셋·생성·인코딩) + 테스트, `draws.json` 로더, 전수 열거로 `preset-rates.json`.
2. **주 2**: `/`, `/pick`, `/pick/result`, `/my`, `/check`, 저장·공유, 당첨 판정. E2E.
3. **주 3**: `/results/[round]`, `/numbers/[n]`, `/stats`, OG 이미지, `/about`·`/privacy`, 수집 Action. 배포.
4. **v0.2**: 규칙 편집기, 에이전트 목록 URL·`/agent`, QR 파싱, .ics.

## 12. 결정 기록과 남은 것

- 결정(2026-10-22): 결과결과 같은 사이트 `/lotto`에 배포(도메인 불필요), 무료·무광고 유지.
- 남은 것: 결과결 연계 '결 번호' 타입을 v0.3에 둘지, 에이전트 목록 URL을 서명 URL(무상태)로 시작할지 Vercel KV를 둘지, 결과결 메뉴에 '행운줍줍' 링크를 어디에 넣을지.

## 13. 구현 현황 (v0.1, 2026-10-22)

- 엔진 전부(`features`·`rules`·`presets`·`generate`·`random`·`encode`·`draws`·`rates`·`check`·`schedule`·`picks`)와 단위 테스트 39개, 전체 조합 전수 열거 스크립트(`rates:build`, 약 15초), 주간 갱신 스크립트와 GitHub Action.
- 화면 `/`, `/pick`, `/pick/result`, `/my`, `/results`, `/results/[round]`(1,246쪽), `/numbers`, `/numbers/[n]`(45쪽), `/stats`, `/check`, `/about`, `/privacy`, 404, robots, sitemap. 빌드 결과 정적 1,308쪽.
- 설계와 다른 점: 생성은 서버가 아니라 **브라우저에서** 하고 결과를 URL `g`에 담아 `/pick/result`로 이동한다(공유 가능·서버 무기록). `dynamicParams=false`는 Cache Components와 호환되지 않아 뺐고, 없는 회차는 not-found 화면을 200으로 내려 준다(소프트 404).
- 자동 구매 에이전트(`scripts/agent/`, 7절 Tier 1) 구현. 웹의 `/api/dh/buy`(드라이런 → 확인 → 구매)로 2026-10-22 첫 실구매 성공.
- `/dh` 내 동행복권(예치금·구매내역) 화면과 `/api/dh/login|me|logout`. 원칙 2("서버가 계정 정보를 보관하지 않는다")와의 절충: `LOTTO_DH_ENABLED=1`인 로컬·개인 배포에서만 켜지고, 비밀번호는 요청 처리 중에만 존재하며 세션 쿠키만 메모리에 30분 남는다. 공개 배포에서는 켜지 않는다.
- 미구현(v0.2): 규칙 편집기(`/pick/custom`), QR 파싱, .ics, OG 이미지, 카카오톡 알림.
