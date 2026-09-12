/**
 * 신체·마음 「컨디션 단계」 — 홈 카드 2장 + 상세 시트가 같이 쓰는 순수 계산.
 *
 * 사용자 확정(2026-09-12): 단계 5개(휴식 필요·조금 지침·보통·좋음·매우 좋음), 숫자는 노출하지 않고
 * 단계와 변화만 보여준다. 점수·순위 없음. 대화 「내용」은 절대 재료로 쓰지 않는다(횟수만).
 *
 * 재료 → 신호(−1/0/+1) → 합계 → 단계. 문턱값은 임의 설정이고 실데이터가 쌓이면 손볼 자리(한 곳).
 */

export type Level = 1 | 2 | 3 | 4 | 5;
export type Signal = -1 | 0 | 1;

export const LEVEL_LABEL: Record<Level, string> = { 1: "휴식 필요", 2: "조금 지침", 3: "보통", 4: "좋음", 5: "매우 좋음" };
/** 카드 배경/글자색 — 낮은 단계에 경고색(빨강)을 쓰지 않는다. 평가가 아니라 상태다. */
export const LEVEL_COLOR: Record<Level, { bg: string; fg: string }> = {
  1: { bg: "#fbe7dc", fg: "#8a4a3c" },
  2: { bg: "#fbf1d6", fg: "#7a5a1e" },
  3: { bg: "#e8eff3", fg: "#3f6272" },
  4: { bg: "#dff2e6", fg: "#2f6a4a" },
  5: { bg: "#c9ead6", fg: "#1f5a3a" },
};

/** 신호 합계(−3~+3)를 5단계로. −2 이하 = 휴식 필요 … +2 이상 = 매우 좋음 */
export function levelFromSum(sum: number): Level {
  if (sum <= -2) return 1;
  if (sum === -1) return 2;
  if (sum === 0) return 3;
  if (sum === 1) return 4;
  return 5;
}

export interface BodyInput {
  /** 이번 주 몸풀기(앱에서 함께한 스트레칭) 횟수 */
  stretchCount: number;
  /** 움직인 시간이 평소 대비 어떤지(실데이터 연동 전엔 0 = 평소 수준) */
  moveVsUsual: Signal;
  /** 걸음이 평소 대비 어떤지 */
  stepsVsUsual: Signal;
}

export interface MindInput {
  /** 이번 주 「오늘의 그림」을 기록한 날 수 */
  pictureDays: number;
  /** 그중 무거운 결(엉킨 결·강렬한 감정·조용한 정지·눈부신 소란)을 고른 날 수 */
  heavyDays: number;
  /** 「마음과 대화」 횟수 — 내용이 아니라 횟수만 */
  chatCount: number;
  /** 이번 주 위험어 안내가 한 번이라도 떴는지 */
  riskFlagged: boolean;
}

/** 「오늘의 그림」 선택지 중 무거운 결로 보는 것 — PROBES 의 label 과 글자가 같아야 한다 */
export const HEAVY_PICKS = ["엉킨 결", "강렬한 감정", "조용한 정지", "눈부신 소란"];

export function stretchSignal(n: number): Signal { return n >= 3 ? 1 : n >= 1 ? 0 : -1; }
export function bodyLevel(b: BodyInput): Level {
  return levelFromSum(stretchSignal(b.stretchCount) + b.moveVsUsual + b.stepsVsUsual);
}

export function heavySignal(pictureDays: number, heavyDays: number): Signal {
  if (pictureDays <= 0) return 0;
  const r = heavyDays / pictureDays;
  return r >= 0.4 ? -1 : r >= 0.2 ? 0 : 1;
}
export function recordSignal(pictureDays: number): Signal { return pictureDays >= 4 ? 1 : pictureDays >= 2 ? 0 : -1; }

/** 기록이 없으면 단계를 매기지 않는다(null) — 「아직 기록이 적어요」 */
export function mindLevel(m: MindInput): Level | null {
  if (m.riskFlagged) return 1;
  if (m.pictureDays <= 0 && m.chatCount <= 0) return null;
  // 대화 횟수는 단계를 올리지도 내리지도 않는다 — 털어놓은 횟수로 마음을 재지 않는다. 근거 줄에만 적는다.
  return levelFromSum(heavySignal(m.pictureDays, m.heavyDays) + recordSignal(m.pictureDays));
}

export interface Change {
  prev: Level | null;
  now: Level | null;
  dir: "up" | "down" | "same" | "none";
  text: string;
}
export function change(prev: Level | null, now: Level | null): Change {
  if (now === null) return { prev, now, dir: "none", text: "아직 기록이 적어요" };
  if (prev === null) return { prev, now, dir: "none", text: "이번 주부터 기록을 시작했어요" };
  const dir = now > prev ? "up" : now < prev ? "down" : "same";
  const text = dir === "same" ? "지난주와 같아요" : `지난주 ${LEVEL_LABEL[prev]} → 이번 주 ${LEVEL_LABEL[now]}`;
  return { prev, now, dir, text };
}

type Bucket = "low" | "mid" | "high";
const bucket = (l: Level | null): Bucket => (l === null || l === 3 ? "mid" : l <= 2 ? "low" : "high");

/** 홈 카드 아래 한 줄 — 몸×마음 9조합. 지시가 아니라 제안, 하나만. */
export function suggestion(body: Level | null, mind: Level | null): string {
  const key = `${bucket(body)}-${bucket(mind)}`;
  const T: Record<string, string> = {
    "high-high": "좋은 흐름이에요. 지금 하던 대로만 이어가 보세요.",
    "high-mid": "가볍게 몸을 풀며 유지해 보세요.",
    "high-low": "몸은 괜찮은데 마음이 먼저 지쳤어요. 오늘은 마음과 대화에 잠깐 들러 보세요.",
    "mid-high": "마음이 편한 주예요. 1분 기지개로 몸도 따라가게 해 보세요.",
    "mid-mid": "무난한 한 주예요. 퇴근 전 1분 몸풀기 하나만 더해 보세요.",
    "mid-low": "마음이 조금 무거운 주예요. 오늘은 숨 고르기 3분이면 충분해요.",
    "low-high": "마음은 괜찮은데 몸이 지쳤어요. 앉은 자리에서 하는 낮은 강도로만 풀어 주세요.",
    "low-mid": "몸이 먼저 쉬고 싶어 하는 주예요. 오늘은 잠들기 전 이완 호흡만 해도 돼요.",
    "low-low": "몸도 마음도 쉬어가야 하는 주예요. 아무것도 안 해도 괜찮아요.",
  };
  return T[key];
}

/** 근거 줄 — 숫자는 횟수·일수 같은 '한 일'만 적고, 점수는 안 적는다 */
export function bodyEvidence(b: BodyInput, prevStretch: number | null): string[] {
  const usual = (s: Signal, what: string) => (s === 0 ? `${what} 평소 수준` : s > 0 ? `${what} 평소보다 많음` : `${what} 평소보다 조금 적음`);
  return [
    `몸풀기 ${b.stretchCount}회` + (prevStretch !== null ? ` (지난주 ${prevStretch}회)` : ""),
    usual(b.moveVsUsual, "움직인 시간"),
    usual(b.stepsVsUsual, "걸음"),
  ];
}
export function mindEvidence(m: MindInput): string[] {
  if (m.riskFlagged) return ["이번 주는 쉬어가도 되는 주예요."];
  return [
    `오늘의 그림 ${m.pictureDays}일 기록`,
    `무거운 결 ${m.heavyDays}일`,
    `마음과 대화 ${m.chatCount}번`,
  ];
}
