# 행운줍줍 (luckyjupjup)

조건을 골라 로또 6/45 번호를 만들고, 이 기기에 저장해 두면 토요일 추첨 뒤 등수를 알려 주는 무료 웹 서비스의 초기 개발 버전(v0.1)입니다. [결과결](../gyulngyul)의 자매 서비스로, 같은 사이트의 `/lotto` 아래에서 동작합니다(`next.config.ts`의 `basePath`).

어떤 조건으로 만들어도 한 게임의 1등 확률은 8,145,060분의 1로 같습니다. 이 서비스는 번호를 만들고 결과를 보여 줄 뿐 **복권을 판매하거나 구매를 대행하지 않고**, 동행복권 계정 정보를 다루지 않으며, 유료·광고가 없습니다. 설계와 그 이유는 `DESIGN.md`에 있습니다.

## 실행

```bash
npm install
npm run dev            # http://localhost:3000/lotto
npm test               # 엔진 단위 테스트 (vitest)
npm run build && npm run start -- -p 3456
npm run e2e            # 브라우저 E2E (Playwright, 설치된 Google Chrome). 3456에 서버가 떠 있으면 그대로 쓰고 없으면 빌드해서 띄움
npm run draws:update   # 동행복권에서 새 회차를 받아 data/draws.json 에 붙임 (GitHub Action 이 토요일 밤에 돌림)
npm run rates:build    # 전체 조합 8,145,060개를 전수 열거해 타입별 비율·분포를 data/rates.json 에 씀 (약 15초)
npm run agent:buy -- --dry-run   # 자동 구매 에이전트 (개인용, agent/README.md). 번호 생성 → 내 동행복권 계정으로 구매 → 텔레그램
npm run agent:report             # 추첨 뒤 구매 번호 등수와 누적 수익을 텔레그램으로
```

배포: Vercel 프로젝트(루트는 이 저장소)에 연결하면 `main` 푸시마다 자동 배포됩니다. 결과결 쪽 `next.config.ts`에 `/lotto/:path*` → 이 배포로 가는 rewrite 를 추가하면 결과결 도메인의 `/lotto`에서 보입니다. 환경 변수는 필요 없고, 공유 미리보기 주소를 바꾸려면 `NEXT_PUBLIC_SITE_URL`(예: `https://gyulngyul.vercel.app/lotto`)을 둡니다.

## 화면

| 경로 | 내용 |
|---|---|
| `/` | 최신 회차 당첨번호·1등 당첨금, 다음 추첨까지 남은 시간(토 20:35 KST), 타입 카드 8개(각각 전체 조합 중 비율). 저장한 번호가 있으면 맨 위에 '내 번호 결과'(layout의 인라인 스크립트가 `html[data-returning]`을 먼저 표시) |
| `/pick` → `/pick/result` | 타입(`t`)·게임 수(`n`=1~5)·고정수(`fix`, 내 번호형)·제외수(`ex`) → 브라우저에서 암호학적 난수로 생성 → 결과는 `g`에 게임마다 5자(조합 순위의 base36)로 담겨 그대로 공유된다. 결과 화면: 번호 공(용지 구간색), 타입의 전체 조합 비율과 역대 당첨 통과율, 저장·다시 만들기·번호 복사·링크 공유, 게임별 OMR 모양과 조건값 표(규칙 충족 여부) |
| `/my` | 이 기기에 저장한 번호를 회차별로. 결과가 나온 회차는 등수·당첨금 표시, 추첨 전이면 '추첨 전'. localStorage `luckyjupjup:picks` |
| `/results` → `/results/[round]` | 최근 1년 당첨번호 표와 연도별 바로가기. 회차 페이지(정적 1,246+쪽): 등수별 당첨자·당첨금, 1등 자동/수동/반자동, OMR 모양, 균형 규칙 기준 조건값, 이전·다음 회차 |
| `/numbers` → `/numbers/[n]` | 번호별 출현 횟수·마지막 출현(정적 45쪽), 함께 자주 나온 번호, 최근 출현 회차, 고정수로 만들기 |
| `/stats` | 타입별 역대 통과율 vs 전체 조합 비율, 합계 분포(역대 vs 이론), 홀짝·고저·연속·AC·끝수·구간·소수 분포 |
| `/check` | 최근 60회차 중 하나와 번호 6개를 골라 등수 확인 |
| `/about`, `/privacy` | 하는 일과 하지 않는 일, 조건이 확률을 바꾸지 않는 이유, 데이터 출처, 저장값 지우기 |
| `/dh` (선택) | 내 동행복권: 아이디·비밀번호로 로그인해 예치금과 최근 30·60·90일 구매·당첨 내역(바코드, '번호 보기'로 게임별 번호·등수)을 보고, 카카오톡 '나에게 보내기'를 연결한다. 결과 화면의 '동행복권에서 바로 구매'(드라이런 → 확인 → 구매)도 이 로그인 세션을 쓴다. `LOTTO_DH_ENABLED=1`인 로컬·개인 배포에서만 열리고 공개 배포에는 메뉴·API(`/api/dh/*`)가 없다. 비밀번호는 로그인 요청에만 쓰고 지우며, 서버 메모리에 동행복권 세션 쿠키만 30분 남는다 |

## 조건 타입

| id | 이름 | 규칙 | 전체 조합 중 |
|---|---|---|---|
| `random` | 완전 랜덤 | 없음 | 100% |
| `balanced` | 균형형 | 합 100~175, 홀수 2~4, 저수(1~22) 2~4, 연속 쌍 ≤1, AC ≥7, 같은 끝수 ≤2, 한 구간 ≤3 | 42.7% (역대 당첨 42.6%) |
| `hot` | 최근 자주형 | 균형형 + 최근 50회 상위 15개 중 3~4개 (가중 추출) | 12.8% |
| `cold` | 오래 안 나온형 | 균형형 + 10회 이상 미출현 번호 2~3개 (가중 추출) | 약 22% |
| `carry` | 이월형 | 균형형 + 직전 회차 번호 1~2개 | 24.7% |
| `spread` | 골고루형 | 4구간 이상, 한 구간 ≤2, 끝수 모두 다름, 연속 없음 | 5.3% |
| `antiShare` | 나눠 갖기 회피형 | 32 이상 3개 이상, AC ≥7, 연속 ≤1, 같은 끝수 ≤2, 역대 1등 조합 제외 | 18.4% |
| `mine` | 내 번호형 | 고정수 1~5개 + 균형형 | 42.7% |

비율은 `scripts/rates/build.ts`가 전체 조합을 전수 열거해 계산한 값(`data/rates.json`)이다. 역대 당첨 통과율이 전체 조합 비율과 같다는 것이 "조건은 모양이고 확률이 아니다"의 근거이며, 모든 화면에 두 수치를 함께 보여 준다.

## 구조

```
src/lib/lotto/
  features.ts   조합 → 합계·홀짝·저수·연속·AC·끝수·구간·소수 등 수치 (순수 함수)
  rules.ts      Rule 타입(include/exclude/range/notPastWinner/notBirthdayOnly), evaluate, describeRule
  presets.ts    조건 타입 8개와 균형 규칙
  generate.ts   기각 샘플링 생성기 (CSPRNG, 가중 추출, 게임끼리 겹침 줄이기, 상한 초과 시 GenerateError 에 떨어진 규칙 집계)
  random.ts     crypto.getRandomValues 기반 난수, 가중 비복원 추출, 테스트용 시드 난수
  encode.ts     조합 ↔ 순위 정수(콜렉스) ↔ base36 5자, URL 직렬화
  draws.ts      data/draws.json 로드, 빈도·미출현·역대 1등 집합·합계 히스토그램·역대 통과율
  rates.ts      data/rates.json (전체 조합 통계) 로드
  check.ts      등수 판정 (1등 6개, 2등 5+보너스, 3등 5, 4등 4, 5등 3)
  schedule.ts   회차 ↔ 날짜(1회 2002-12-07), 추첨 20:35·마감 20:00 KST, 구매 대상 회차
  picks.ts      localStorage 저장
  compact.ts    클라이언트에 넘기는 최근 60회차 요약
src/lib/dh/      동행복권 비공식 HTTP 클라이언트(client.ts: RSA 로그인·예치금·구매·구매내역·티켓), node:https 단일 소켓 클라이언트(http.ts), 세션 메모리(session.ts), 켜기 플래그(enabled.ts), 티켓 파서(ticket.ts)
src/lib/kakao/   카카오톡 "나에게 보내기" 토큰 저장·갱신(token.ts), 200자 분할 전송(send.ts)
src/components/ Balls(번호 공), PickForm, ResultActions, MyPicks, CheckForm, FeatureTable·Omr, NextDraw, DhPanel(내 동행복권)
data/           draws.json (1~최신 회차, 동행복권 공개 결과), rates.json
scripts/        draws/update.ts (주간 갱신), rates/build.ts, 조사용 Python 스크립트
.github/workflows/update-draws.yml  토요일 21:00·22:00·00:00 KST 갱신 → 커밋 → Vercel 재배포
```

## 데이터

- 회차 결과는 동행복권 사이트(2025~26년 개편)의 내부 JSON 엔드포인트 `GET /lt645/selectPstLt645InfoNew.do?srchLtEpsd=N`(N회부터 10회차)과 `GET /lt645/selectLt645History.do`(최신 회차)에서 받는다. 공식 문서가 없는 비공식 엔드포인트라 주 1회 갱신기에서만 호출하고 사용자 요청 때는 외부 호출이 없다. 널리 알려진 옛 `common.do?method=getLottoNumber`는 더 이상 동작하지 않는다.
- 갱신기는 번호 6개·보너스·회차 공식과 날짜 일치·등수 데이터를 검증하고, 공개 데이터셋(smok95/lotto)의 최신 회차와 다르면 중단한다.
- 1~1246회 초기 데이터는 2026-10-22에 수집해 smok95 데이터와 대조했으며 번호·보너스·추첨일 불일치가 없었다.

## 자동 구매 에이전트 (개인용)

`scripts/agent/`는 웹 서비스와 분리된 개인용 스크립트다. 사용자 본인의 동행복권 계정으로, 본인이 관리하는 환경(GitHub Actions 또는 내 PC)에서 금요일에 번호를 만들어 구매하고 토요일에 결과를 텔레그램으로 보낸다. 서버는 관여하지 않고 계정 정보도 그 환경의 비밀 변수에만 있다. 설정·예약·주의사항은 `agent/README.md`.

## 법·정책 가드레일

「복권 및 복권기금법」 제6조제4항(영리 목적 온라인복권 구매 대행 금지)과 2025년 발의된 개정안(구매 중개·대행, 영리 목적 당첨 예상번호 제공·홍보 금지)을 고려해 서버 측 구매 대행, 유료 플랜, 광고, 동행복권 계정 입력, '예측·적중·추천' 표현을 두지 않는다. 모든 결과 화면에 확률 동일 고지, 만 19세 미만 구매 불가, 도박 문제 상담 1336을 표시한다.
