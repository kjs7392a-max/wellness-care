# 웰니스 케어 — 교직원 통합 웰니스 앱 (MVP)

교사·행정·영양/보건/조리 직군을 위한 웰니스 앱. 신체 활동·마음 상태를 기록하고 하루 단위 제안을 제공합니다.
**병원 ERP(dash-erp)와 완전히 분리된 독립 Next.js 프로젝트입니다.**

## 실행

```bash
npm install
npm run dev      # http://localhost:3010
npm run build && npm start
npm test         # 위험어 판정 회귀 테스트
```

앱은 루트(`/`)에서 바로 열립니다. 로그인은 프로토타입 기준 — 아무 값이나 넣거나 「계정 없이 둘러보기」로 진입.

## 화면

로그인 → 온보딩 5단계(5대 원칙 · 수집 고지 · 동의+권한 · 직군 · PAR-Q+ 7문항) →
홈(AI 제안 · 날씨 · 2단 타일 · 오늘의 기록) / 기록(몸·마음) / 설정,
그리고 시트: 신체건강 라이브러리 · 타이머/가이드 영상 · 마음건강 · 마음과 대화 · 오늘의 그림.

## 「마음과 대화」 챗봇

- `POST /api/wellness/chat` `{ history, message, character }` → `{ reply }` | `{ risk, reply }` | `{ fallback: true }`
- 캐릭터 4명(옆반 동료·수석교사·동기·상담교사, `src/features/wellness/characters.ts`). 공통 규칙 `SYSTEM_CORE` + 인물 설정으로 프롬프트를 조합. 서버가 `character` 를 허용 목록으로 검증.
- **API 키는 서버 환경변수 `ANTHROPIC_API_KEY`에서만 읽습니다.** 클라이언트 미노출. 대화 미저장.
- 위험어 판정을 **클라이언트·서버 양쪽**에서 수행. L2(위험)이면 LLM 미호출, 고정 안내 문구만 반환.
- 키 미설정/실패 시 시나리오 응답으로 폴백(앱은 그대로 동작).
- 모델: `claude-sonnet-5`.

## 배포 (Vercel — 별도 프로젝트)

1. 이 폴더를 새 GitHub 저장소(예: `wellness-care`)에 올립니다.
   ```bash
   git remote add origin git@github.com:<owner>/wellness-care.git
   git push -u origin main
   ```
2. [vercel.com/new](https://vercel.com/new)에서 그 저장소를 **새 프로젝트**로 import (Framework: Next.js 자동 감지).
3. 환경변수 `ANTHROPIC_API_KEY` 추가 (Production/Preview). 없으면 챗봇은 시나리오 폴백으로 동작.
4. Deploy. 배포 후 도메인 루트(`/`)가 앱입니다.

> 병원 ERP와 무관한 독립 프로젝트이므로 Supabase 등 다른 환경변수는 필요 없습니다.

## 구조

```
src/app/layout.tsx            루트 레이아웃(Pretendard·폰 프레임·키프레임)
src/app/page.tsx              루트에서 WellnessApp 렌더
src/app/api/wellness/chat/    챗봇 서버 중계(API 키 보관·위험어 서버 판정)
src/features/wellness/
  WellnessApp.tsx             전체 화면 상태머신
  data.ts                     프로그램·문항·직군·날씨·넛지 상수(감수값)
  risk.ts                     위험어 판정·고정 응답·시스템 프롬프트(클라/서버 공용)
  risk.test.ts                위험어 회귀 테스트
  sx.ts                       인라인 CSS 문자열 → style 헬퍼(디자인 픽셀 재현)
public/wellness/images/       아이콘·마스코트·자극 이미지
public/wellness/video/        스트레칭 가이드 영상(1분 1편 + 20초 12편)
```

## 설계 원칙 (디자인 핸드오프 준수)

- 점수·등급·순위·달성률 없음. 목표 대비 % 표기 없음.
- 「검사」·「진단」·「상담」·「우울」 등 임상 어감 표현을 UI에 쓰지 않음.
- 개인 기록은 학교·교육청에 전달되지 않음.
- 지시하지 않고 제안. 하지 않은 날에 실패 표시를 하지 않음.

## Phase 2 (미구현)

걸음·활동 실데이터(Health Connect/HealthKit) · 미세먼지(에어코리아) · 교육청 통합인증 · 대화 비용 관리(하이브리드).
현재 걸음·활동은 목 데이터, 날씨는 Open-Meteo 실연동(키 불필요).
