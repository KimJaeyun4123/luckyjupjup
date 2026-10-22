# scripts/draws

회차 데이터 수집·검증용 스크립트(Python 3, 표준 라이브러리만 사용).

- `harvest_all.py <최신회차> <출력.json> <대조용 smok95 all.json>` — 동행복권 `/lt645/selectPstLt645InfoNew.do`를 10회차 단위로 내려가며 1회까지 수집해 `data/draws.json` 형식으로 저장하고 smok95 데이터와 번호·날짜를 대조한다. 0.25초 간격, 약 3분.
- `filter_stats.py <draws.json>` — 역대 당첨 조합에 대한 조건별 통과율, 빈도, 미출현, 1등 선택 유형 집계.
- `filter_theory.py` — 8,145,060개 전체 조합을 전수 열거해 조건별 이론 비율 계산(약 36초).

TS로 옮긴 뒤에는 참고용으로만 남긴다.
