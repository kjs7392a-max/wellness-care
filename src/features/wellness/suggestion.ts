import { ROLES, slotForHour, type Role, type StretchItem } from "./data";

/**
 * 홈 「AI 오늘의 제안」이 어느 항목을 내놓을지.
 *
 * 원래 설계(시간·요일·직군에 따라 달라짐):
 *   slot = 시각(11시 전 0 · 15시 전 1 · 그 뒤 2) → ROLES[직군].items[slot] (PAR-Q 에 걸리면 .low[slot])
 *   주말이면 제목의 "퇴근 전 " 을 떼고 제안 문구도 쉬는 날용.
 *
 * ★ MVP 시연 고정 (2026-09-12 사용자 지시):
 *   시연 시각이 평일 16:30~17:30 이라 「퇴근 전 어깨·목 풀기」(가이드 영상 있음) 하나로 통일한다.
 *   MVP_FIXED_SUGGESTION 을 false 로 돌리면 원래 설계로 돌아간다 — 코드는 지우지 않았다.
 *   상세·복원 절차 = docs/decisions/2026-09-12-mvp-fixed-suggestion.md
 */
export const MVP_FIXED_SUGGESTION = true;

/** 고정할 항목의 자리 — 교사 직군 세 번째(퇴근 전) */
const FIXED_ROLE: Role = "teacher";
const FIXED_SLOT = 2;

export interface Suggestion {
  slot: number;
  isWeekend: boolean;
  item: StretchItem;
}

export function resolveSuggestion(args: { role: Role; parqYes: boolean; hour: number; dow: number }, fixed: boolean = MVP_FIXED_SUGGESTION): Suggestion {
  if (fixed) {
    const r = ROLES[FIXED_ROLE];
    return { slot: FIXED_SLOT, isWeekend: false, item: (args.parqYes ? r.low : r.items)[FIXED_SLOT] };
  }
  const slot = slotForHour(args.hour);
  const r = ROLES[args.role];
  return { slot, isWeekend: args.dow === 0 || args.dow === 6, item: (args.parqYes ? r.low : r.items)[slot] };
}
