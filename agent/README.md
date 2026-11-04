# 자동 구매 에이전트

행운줍줍 엔진으로 번호를 만들어 **내 동행복권 계정**으로 로또 6/45를 사고, 텔레그램으로 구매 내역과 토요일 결과를 보내 주는 개인용 스크립트다. 웹 서비스(행운줍줍)와는 분리되어 있고, 서버가 아니라 **사용자가 관리하는 환경**(GitHub Actions 또는 내 PC)에서만 돈다. 계정 정보는 그 환경의 비밀 변수에만 있다.

## 흐름

| 때 (KST) | 스크립트 | 하는 일 |
|---|---|---|
| 금 09:10 (실패 시 토 10:10 재시도) | `npm run agent:buy` | 타입에 맞게 번호 생성 → 로그인 → 예치금 확인 → 구매 페이지 값 읽기 → 수동 번호로 구매 → `agent/state.json` 기록 → 텔레그램 "구매 완료"(회차·번호·금액·예치금·행운줍줍 링크) |
| 토 21:40 (22:40, 일 00:40 재시도) | `npm run draws:update` → `npm run agent:report` | 새 회차 받기 → 구매 번호 등수 계산 → 동행복권 구매내역의 당첨 결과와 대조 → 텔레그램 "결과"(당첨번호·게임별 일치·당첨금·누적 수익) |

- 같은 회차를 이미 샀으면 다시 사지 않는다(`state.json` 기준). 동행복권도 회차당 5,000원을 넘기면 거절한다.
- 예치금이 모자라면 사지 않고 텔레그램으로 알린다. 충전 뒤 토요일 재시도에서 산다.
- 온라인 판매 시간(평일·일 06~24시, 토 06~20시) 밖이면 건너뛴다.
- 로그인은 한 번만 시도한다. 5회 실패하면 계정이 잠기기 때문이다.
- `LOTTO_DRY_RUN=1`이면 로그인·예치금·구매 페이지 확인까지만 하고 구매 요청은 보내지 않는다. **처음에는 반드시 드라이런부터.**

## 알림 채널

텔레그램과 카카오톡 중 설정된 쪽 모두로 보낸다. 둘 다 없으면 콘솔에만 찍는다.

- **텔레그램**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- **카카오톡 "나에게 보내기"**: developers.kakao.com 에서 앱을 만들고 ① 앱 키의 **REST API 키**를 `KAKAO_REST_API_KEY`에, ② 카카오 로그인을 켜고 Redirect URI 에 `http://localhost:3000/lotto/api/kakao/callback`을 등록, ③ 동의 항목에서 **카카오톡 메시지 전송(talk_message)** 을 켠다. 그 뒤 개발 서버를 켜고 `/lotto/dh` 맨 아래 **카카오톡 연결**을 누르면 토큰이 `agent/kakao-token.json`(git 제외)에 저장되고, '테스트 메시지 보내기'로 확인한다. access 토큰(6시간)·refresh 토큰(2개월)은 에이전트가 돌 때마다 자동 갱신되므로 주 1회만 돌면 재로그인이 필요 없다. 한 달 넘게 안 돌리면 다시 연결한다. 텍스트 템플릿 한도(200자) 때문에 긴 메시지는 몇 개로 나뉘어 온다. GitHub Actions 에서 쓰려면 `agent/kakao-token.json`을 Secrets 로 넘겨 체크아웃 뒤 파일로 써 주는 단계를 추가해야 한다(아직 워크플로에는 없음).

## 설정

```
DHLOTTERY_ID=               동행복권 아이디
DHLOTTERY_PASSWORD=         동행복권 비밀번호
TELEGRAM_BOT_TOKEN=         @BotFather 로 만든 봇 토큰
TELEGRAM_CHAT_ID=           봇에게 아무 말이나 보낸 뒤 https://api.telegram.org/bot<토큰>/getUpdates 의 chat.id
KAKAO_REST_API_KEY=         (선택) 카카오 디벨로퍼스 앱 REST API 키. /lotto/dh 에서 연결
KAKAO_CLIENT_SECRET=        (선택) 앱에서 Client Secret 을 켰을 때만
KAKAO_REDIRECT_URI=         기본 http://localhost:3000/lotto/api/kakao/callback
LOTTO_PRESET=balanced       random | balanced | hot | cold | carry | spread | antiShare | mine
LOTTO_GAMES=5               1~5
LOTTO_FIXED=                mine 타입의 고정수 ('7-21')
LOTTO_EXCLUDE=              제외수 ('4-13')
LOTTO_SITE_URL=https://gyulngyul.vercel.app/lotto
LOTTO_DRY_RUN=1             구매 요청 생략
```

### 방법 A. GitHub Actions (PC 를 켜 둘 필요 없음)

1. 이 저장소를 **private** 으로 올린다(`agent/state.json`에 구매 번호가 남는다).
2. Settings → Secrets and variables → Actions: Secrets 에 `DHLOTTERY_ID`, `DHLOTTERY_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, Variables 에 `LOTTO_PRESET`, `LOTTO_GAMES` 등.
3. Actions 탭에서 `agent-buy`를 **Run workflow** (dry_run 체크) 로 한 번 돌려 텔레그램에 "구매 예행연습" 메시지가 오는지 본다.
4. 그 뒤부터는 예약대로 돈다. 로그에 "동행복권이 이 실행 환경(IP)의 접근을 막았습니다"가 나오면 해외 IP 차단이므로 방법 B 로 간다.

### 방법 B. 내 Mac (launchd)

`.env` 파일에 위 값을 적고(`.gitignore` 에 들어 있다) 아래 두 plist 를 `~/Library/LaunchAgents/` 에 넣은 뒤 `launchctl load` 한다. Mac 이 잠들어 있으면 깨어난 뒤 실행된다.

```xml
<!-- ~/Library/LaunchAgents/com.luckyjupjup.buy.plist : 금요일 09:10 -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.luckyjupjup.buy</string>
  <key>ProgramArguments</key><array><string>/bin/zsh</string><string>-lc</string><string>cd /Users/jaeyunkim/Documents/luckyjupjup && npm run -s agent:buy >> agent/buy.log 2>&1</string></array>
  <key>StartCalendarInterval</key><dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>10</integer></dict>
</dict></plist>
```

```xml
<!-- ~/Library/LaunchAgents/com.luckyjupjup.report.plist : 토요일 21:40 -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.luckyjupjup.report</string>
  <key>ProgramArguments</key><array><string>/bin/zsh</string><string>-lc</string><string>cd /Users/jaeyunkim/Documents/luckyjupjup && npm run -s draws:update && npm run -s agent:report >> agent/report.log 2>&1</string></array>
  <key>StartCalendarInterval</key><dict><key>Weekday</key><integer>6</integer><key>Hour</key><integer>21</integer><key>Minute</key><integer>40</integer></dict>
</dict></plist>
```

처음에는 터미널에서 `npm run agent:buy -- --dry-run` 으로 확인한다.

## 알아 둘 것

- **약관·법.** 복권법은 영리 목적 구매 **대행**을 금지한다. 이 스크립트는 본인이 본인 계정으로 사는 것이라 대행이 아니지만, 동행복권 약관은 "특정 기능의 반복·규칙적 호출"을 금지행위로 두어 **계정 이용 제한 위험은 본인이 진다.** 회차당 5,000원 한도 안에서 주 1회만 호출하도록 만들었다.
- **비공식 흐름.** 로그인(RSA 암호화 폼)·예치금·구매(`execBuy.do`)·구매내역 엔드포인트는 공개 문서가 없고 공개 오픈소스 구현들과 같은 경로를 쓴다. 사이트가 바뀌면 깨지며, 그때는 실패 메시지가 텔레그램으로 온다. 수동 번호 파라미터(`genType: "1"`, `arrGameChoiceNum: "1,2,3,4,5,6"`)는 2026-10-22 실구매(1247회 1게임)로 확인했다. 구매내역의 `gmInfo`는 번호가 아니라 복권 바코드(5자리×6)다.
- **돈.** 예치금은 동행복권에서 직접 충전한다(케이뱅크 간편충전·가상계좌, 1일 15만원). 당첨금 200만원 이하는 일요일 새벽 예치금으로 자동 입금되고, 그 이상은 농협은행에서 직접 받는다.
- **기록.** `agent/state.json` 에 회차·번호·금액·영수증 응답·결과가 쌓인다. 행운줍줍 결과 링크(`/pick/result?...&g=`)로 웹에서도 볼 수 있다.
