# 웰니스 케어 — 교직원 통합 웰니스 앱 (MVP)

디자인 핸드오프(`design_handoff_wellness_care`)를 Next.js(App Router) + React로 재구현한 MVP.
교사·행정·영양/보건/조리 직군을 위한 웰니스 앱. 신체 활동·마음 상태를 기록하고 하루 단위 제안을 준다.

## 접속

- 화면: `/wellness` — 로그인 → 온보딩 5단계 → 홈(홈/기록/설정 탭 + 마음·신체 시트)
- 로그인은 프로토타입 기준: 아무 값이나 넣거나 「계정 없이 둘러보기」로 진입.

## 구조

| 파일 | 역할 |
|---|---|
| `src/app/wellness/{layout,page}.tsx` | 라우트·폰 프레임·키프레임(웰니스 전용, ERP와 격리) |
| `src/features/wellness/WellnessApp.tsx` | 전체 화면 상태머신 (로그인·온보딩·홈·기록·설정·라이브러리·타이머·마음·대화·오늘의 그림) |
| `src/features/wellness/data.ts` | 프로그램·문항·직군·날씨·넛지 등 상수 (임상/디자인 감수값, 임의 수정 금지) |
| `src/features/wellness/risk.ts` | 위험어 판정(`riskLevel`)·고정 응답(`RISK_REPLY`)·시스템 프롬프트(`SYSTEM`) — 클라/서버 공용 |
| `src/features/wellness/sx.ts` | 인라인 CSS 문자열 → React style 객체 (디자인 픽셀 재현용) |
| `src/app/api/wellness/chat/route.ts` | 챗봇 '소연' 서버 중계 (API 키 서버 보관, 위험어 서버 이중 판정) |

## 챗봇 '소연'

- `POST /api/wellness/chat` `{ history, message }` → `{ reply }` | `{ risk, reply }` | `{ fallback: true }`
- **API 키는 서버 환경변수 `ANTHROPIC_API_KEY`에서만 읽는다.** 클라이언트에 노출하지 않음.
- **위험어 판정을 클라이언트와 서버 양쪽에서 수행.** L2(위험)이면 LLM을 건너뛰고 고정 응답만 반환.
- 키 미설정/호출 실패 시 `{ fallback: true }` → 클라이언트가 시나리오 응답(`CHAT_BEATS`)으로 폴백.
- 대화는 처리만 하고 저장하지 않는다(개인정보 원칙).
- 모델: `claude-sonnet-5` (ERP 공용 SDK 설정과 동일).

## 외부 연동

- **날씨**: Open-Meteo (`api.open-meteo.com`), 브라우저 Geolocation, 실패 시 서울 폴백. 키 불필요.
- **걸음·활동**: 현재 목 데이터. Health Connect/HealthKit 연동은 Phase 2.

## 설계 원칙 (핸드오프 준수)

- 점수·등급·순위·달성률 없음. 목표 대비 % 표기 없음.
- 「검사」·「진단」·「상담」·「우울」 등 임상 어감 표현을 UI에 쓰지 않음.
- 개인 기록은 학교·교육청에 전달되지 않음.
- 지시하지 않고 제안. 하지 않은 날에 실패 표시를 하지 않음.
