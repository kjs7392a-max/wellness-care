import { PARQ_REST_ITEM, ROLES, slotForHour, type Role, type StretchItem } from "./data";
import type { SafetyTier } from "./safety-screen";

/**
 * 홈 「AI 오늘의 제안」이 어느 항목을 내놓을지.
 *
 * 원래 설계: slot = 시각(11시 전 0 · 15시 전 1 · 그 뒤 2) → ROLES[직군].items[slot]
 *            (PAR-Q 에 걸리면 .low[slot]) · 주말이면 제목의 "퇴근 전 "을 떼고 문구도 쉬는 날용.
 *
 * ★ 시연 고정의 역사 (한 줄로 고칠 수 있게 코드는 계속 남겨 둔다)
 *   2026-09-12 — 시연 시각이 평일 16:30~17:30 이라 **항목 하나**(교사 퇴근 전)로 통일했다.
 *   2026-09-13 ① 해제 — 직군을 골라도 제안이 안 바뀌어 「어떤 일을 하고 계신가요?」가 값을 하지 않았다.
 *   2026-09-13 ② **시간대만 다시 고정**(사용자 지시) — 시연은 그 시간대에 하니 언제 열어도 「퇴근 전」으로 보이되,
 *              직군은 고정하지 않아 교사·행정·영양/보건/조리가 **각자 다른 퇴근 전 제안**을 받는다.
 *
 * 상세·복원 절차 = docs/decisions/2026-09-12-mvp-fixed-suggestion.md
 */

/**
 * 시연용으로 못박은 시간대. `2` = 퇴근 전(16:30~17:30 대) · `null` 이면 실제 시각·요일을 따른다.
 *
 * 🚫 직군은 여기서 고정하지 않는다 — 고정하면 직군 선택이 화면에서 아무 일도 하지 않는다(2026-09-13 실측).
 * ⚠ 고정 중에는 **주말이어도 평일로 본다** — 「퇴근 전」 제목과 「오늘은 쉬는 날이네요」 문구가 부딪히기 때문.
 */
export const DEMO_PINNED_SLOT: number | null = 2;

export interface Suggestion {
  slot: number;
  isWeekend: boolean;
  item: StretchItem;
}

/**
 * ★ `tier` 는 안전 확인 **단계**(0 평소 · 1 낮은 강도 · 2 숨 고르기)다.
 *   이력: boolean(예 유무) → 개수(2026-09-13, "예가 2개 3개 4개 이상이면 다른 제안이 나와야") → 문항 성격으로 정한 단계(2026-09-16).
 *   단계는 `safetyTier`(safety-screen.ts) 한 곳에서 정한다 — 여기는 받기만 하고 개수를 세지 않는다.
 */
export function resolveSuggestion(
  args: { role: Role; tier: SafetyTier; hour: number; dow: number },
  pinnedSlot: number | null = DEMO_PINNED_SLOT,
): Suggestion {
  const slot = pinnedSlot ?? slotForHour(args.hour);
  // 시간대를 못박은 동안은 요일도 평일로 본다(위 주석).
  const isWeekend = pinnedSlot === null && (args.dow === 0 || args.dow === 6);
  const tier = args.tier;
  const r = ROLES[args.role];
  // 3단계는 직군을 보지 않는다 — 「어느 직군이냐」보다 「지금 움직여도 되느냐」가 먼저다.
  const item = tier === 2 ? PARQ_REST_ITEM : (tier === 1 ? r.low : r.items)[slot];
  return { slot, isWeekend, item };
}
