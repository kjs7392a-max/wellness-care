import { PARQ_REST_ITEM, PROGRAMS, ROLES, slotForHour, type Role, type StretchItem } from "./data";
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
 *   2026-09-17 ③ **해제**(사용자 지시 "제안도 접속 시간에 맞게 다양하게") — `null`. 아침·점심·퇴근 전이 실제 시각을 따른다.
 *              ⚠ 아침·점심 항목엔 가이드 영상이 없어(퇴근 전만 있다) 그 시간대엔 타이머 화면이 뜬다.
 *
 * 상세·복원 절차 = docs/decisions/2026-09-12-mvp-fixed-suggestion.md
 */

/**
 * 시연용으로 못박은 시간대. `2` = 퇴근 전(16:30~17:30 대) · `null` 이면 실제 시각·요일을 따른다.
 *
 * 🚫 직군은 여기서 고정하지 않는다 — 고정하면 직군 선택이 화면에서 아무 일도 하지 않는다(2026-09-13 실측).
 * ⚠ 고정 중에는 **주말이어도 평일로 본다** — 「퇴근 전」 제목과 「오늘은 쉬는 날이네요」 문구가 부딪히기 때문.
 */
export const DEMO_PINNED_SLOT: number | null = null;

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

/** 「지금 바로 시작하기」의 한 줄. `part` 가 있으면 부위 프로세스 항목(버튼에 「목 ·」처럼 앞에 붙인다), 없으면 시간대 항목. */
export interface Choice { item: StretchItem; part?: "목" | "어깨" | "자세" }

/**
 * 부위 프로세스 — 목 → 어깨 → 자세 순(2026-09-17 사용자 지시 "목에 좋은 것 1 어깨에 좋은 것 1 자세에 좋은 것 1 이런 식으로 프로세스로").
 *   라이브러리(PROGRAMS) 항목 id 를 가리킨다 — 시간대 이름이 없는 것만(아침에 「퇴근 전」이 뜨는 모순이 이 작업의 발단).
 *   낮은 강도(1단계)는 `low: true` 인 것만. 셋 다 가이드 영상이 있다(테스트가 못박는다).
 */
const PART_PROCESS: ReadonlyArray<{ part: Choice["part"]; normal: string; low: string }> = [
  { part: "목", normal: "p3", low: "p2" },   // 거북목 되돌리기 / 앉은 채로 목 천천히 풀기
  { part: "어깨", normal: "p1", low: "p1" }, // 목·어깨 긴장 이완(저강도 가능)
  { part: "자세", normal: "p15", low: "p5" }, // 전신 1분 기지개 / 앉은 자리 허리 부담 덜기
];

/**
 * 「지금 바로 시작하기」에서 고를 수 있는 항목들.
 *   0·1단계 = **시간대 항목 1**(resolveSuggestion 과 같은 것 · 진하게) + **부위 3**(목·어깨·자세) = 4개.
 *     이력: 처음엔 직군의 세 시간대 항목을 늘어놓았다가 아침에 「4교시 후…」「퇴근 전…」이 같이 떠 말이 안 됐다(사용자 지적)
 *     → 부위 프로세스로, 단 시간대 항목은 남긴다(사용자 "시간대도 포함이 되어야지").
 *   2단계 = 숨 고르기 하나뿐(직군·부위 항목을 섞지 않는다 — 「지금 움직여도 되느냐」가 먼저다).
 */
export function suggestionChoices(args: { role: Role; tier: SafetyTier; hour: number; dow: number }, pinnedSlot: number | null = DEMO_PINNED_SLOT): Choice[] {
  const first = resolveSuggestion(args, pinnedSlot);
  if (args.tier === 2) return [{ item: PARQ_REST_ITEM }];
  const byId = (id: string) => {
    const pg = PROGRAMS.find((p) => p.id === id);
    if (!pg) throw new Error(`PART_PROCESS 가 가리키는 라이브러리 항목이 없다: ${id}`);
    return pg;
  };
  return [{ item: first.item }, ...PART_PROCESS.map((r) => ({ part: r.part, item: byId(args.tier === 1 ? r.low : r.normal) }))];
}
