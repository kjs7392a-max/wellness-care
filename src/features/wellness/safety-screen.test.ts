import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FOLLOW_UPS, SAFETY_QUESTIONS, followUpGroupsFor, safetyComplete, safetyTier,
  type FollowUpAnswers, type SafetyAnswers,
} from "./safety-screen";

// 2026-09-16: 오리지널 PAR-Q+ 의 **2단 논리**를 우리 문항으로 옮겼다(문항 자체는 약관상 못 옮긴다).
//   1단 = 「질환이 있는가 / 증상이 있는가」 · 2단 = 「예」한 질환 묶음만 「지금 통제되는가」.
//   판정(오리지널 4쪽): 1단 전부 아니오 → 0 · 질환 예 + 후속 전부 아니오 → 1 · 후속 하나라도 예 → 2.
//   증상·의사 지시(7·8·9)는 후속 없이 바로 2(ACSM — 증상은 의학적 확인 대상. 사용자 확정).

const idx = (kind: string) => SAFETY_QUESTIONS.map((q, i) => (q.kind === kind ? i : -1)).filter((i) => i >= 0);
const groupOf = (i: number) => SAFETY_QUESTIONS[i].group!;
const a1 = (yes: number[]): SafetyAnswers => { const a: SafetyAnswers = {}; SAFETY_QUESTIONS.forEach((_, i) => { a[i] = yes.includes(i); }); return a; };
/** 묶음 g 의 후속 전부에 답. yesAt 인덱스만 예. */
const a2 = (groups: string[], yesAt: Record<string, number[]> = {}): FollowUpAnswers => {
  const a: FollowUpAnswers = {};
  for (const g of groups) FOLLOW_UPS[g].items.forEach((_, j) => { a[`${g}.${j}`] = (yesAt[g] ?? []).includes(j); });
  return a;
};

describe("SAFETY_QUESTIONS — 1단 구성", () => {
  it("종류는 condition(질환) / symptom(증상·지시) 둘이고 둘 다 있다", () => {
    for (const q of SAFETY_QUESTIONS) expect(["condition", "symptom"]).toContain(q.kind);
    expect(idx("condition").length).toBeGreaterThan(0);
    expect(idx("symptom").length).toBeGreaterThan(0);
  });
  it("질환 문항은 후속 묶음을 하나씩 가리키고, 그 묶음은 실재하며 2~3문항이다", () => {
    for (const i of idx("condition")) {
      const g = SAFETY_QUESTIONS[i].group;
      expect(g, `#${i}`).toBeTruthy();
      expect(FOLLOW_UPS[g!], g).toBeDefined();
      expect(FOLLOW_UPS[g!].items.length).toBeGreaterThanOrEqual(2);
      expect(FOLLOW_UPS[g!].items.length).toBeLessThanOrEqual(3);
    }
    // 증상 문항은 후속이 없다
    for (const i of idx("symptom")) expect(SAFETY_QUESTIONS[i].group).toBeUndefined();
  });
  it("모든 후속 묶음은 어떤 1단 문항이 가리킨다(고아 묶음 없음)", () => {
    const pointed = new Set(idx("condition").map(groupOf));
    for (const g of Object.keys(FOLLOW_UPS)) expect(pointed.has(g), g).toBe(true);
  });
  it("문구는 비어 있지 않고 서로 다르며 PAR-Q 이름이 없다", () => {
    const texts = [...SAFETY_QUESTIONS.map((q) => q.text), ...Object.values(FOLLOW_UPS).flatMap((g) => [g.title, ...g.items])];
    expect(texts.every((t) => t.trim().length > 0)).toBe(true);
    expect(new Set(texts).size).toBe(texts.length);
    for (const t of texts) expect(t).not.toMatch(/PAR-?Q/i);
  });
});

describe("followUpGroupsFor — 「예」한 질환 묶음만", () => {
  it("1단 전부 아니오 → 후속 없음", () => { expect(followUpGroupsFor(a1([]))).toEqual([]); });
  it("증상만 예 → 후속 없음(바로 2단계라 물을 게 없다)", () => { expect(followUpGroupsFor(a1(idx("symptom")))).toEqual([]); });
  it("질환 하나 예 → 그 묶음 하나, 1단 순서대로", () => {
    const c = idx("condition");
    expect(followUpGroupsFor(a1([c[0]]))).toEqual([groupOf(c[0])]);
    expect(followUpGroupsFor(a1([c[1], c[0]]))).toEqual([groupOf(c[0]), groupOf(c[1])]);
  });
});

describe("safetyTier — 오리지널 4쪽 판정", () => {
  const c = idx("condition"); const s = idx("symptom");
  it("1단 전부 아니오 → 0", () => { expect(safetyTier(a1([]), {})).toBe(0); });
  it("미답 → 0", () => { expect(safetyTier({}, {})).toBe(0); });
  it("증상·지시 하나라도 예 → 후속과 무관하게 2", () => {
    for (const i of s) expect(safetyTier(a1([i]), {}), `symptom #${i}`).toBe(2);
  });
  it("질환 예 + 그 후속 전부 아니오 → 1", () => {
    for (const i of c) expect(safetyTier(a1([i]), a2([groupOf(i)])), `condition #${i}`).toBe(1);
  });
  it("질환 둘 예 + 후속 전부 아니오 → 여전히 1(합산 없음)", () => {
    const two = [c[0], c[1]];
    expect(safetyTier(a1(two), a2(two.map(groupOf)))).toBe(1);
  });
  it("후속 하나라도 예 → 2 (모든 묶음·모든 하위 문항)", () => {
    for (const i of c) {
      const g = groupOf(i);
      FOLLOW_UPS[g].items.forEach((_, j) => {
        expect(safetyTier(a1([i]), a2([g], { [g]: [j] })), `${g}.${j}`).toBe(2);
      });
    }
  });
  it("뜨지 않은 묶음의 옛 답은 무시한다 — 1단에서 아니오로 바꾸면 그 후속 예가 남아 있어도 영향 없음", () => {
    const g = groupOf(c[0]);
    const stale = a2([g], { [g]: [0] }); // 예전에 예라고 답해 둔 후속
    expect(safetyTier(a1([]), stale)).toBe(0);
    expect(safetyTier(a1([c[1]]), { ...stale, ...a2([groupOf(c[1])]) })).toBe(1);
  });
});

describe("safetyComplete — 판정을 내놓아도 되는가", () => {
  const c = idx("condition");
  it("1단이 다 안 찼으면 미완료", () => { expect(safetyComplete({ 0: false }, {})).toBe(false); });
  it("1단 전부 아니오면 완료(후속 없음)", () => { expect(safetyComplete(a1([]), {})).toBe(true); });
  it("질환 예인데 그 후속을 아직 안 답했으면 미완료", () => { expect(safetyComplete(a1([c[0]]), {})).toBe(false); });
  it("필요한 후속까지 다 답하면 완료", () => { expect(safetyComplete(a1([c[0]]), a2([groupOf(c[0])]))).toBe(true); });
  it("안 뜬 묶음의 답은 완료 판정에 필요 없다", () => {
    expect(safetyComplete(a1([c[0]]), a2([groupOf(c[0])]))).toBe(true); // 다른 묶음은 비어 있어도 됨
  });
});

// 소스 가드 — 이 저장소엔 jsdom 이 없어 화면 문구는 이것이 유일한 방어선이다.
describe("소스 가드 — 화면 문자열에 PAR-Q+ 표기가 없다", () => {
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const f of ["WellnessApp.tsx", "data.ts"]) {
    it(`${f} 의 코드(주석 제외)에 PAR-Q·캐나다운동생리학회 문자열이 없다`, () => {
      const code = stripComments(readFileSync(join(__dirname, f), "utf8"));
      expect(code).not.toMatch(/캐나다운동생리학회/);
      expect(code).not.toMatch(/PAR-Q/);
    });
  }
});

// 2026-09-16: 오리지널 4쪽 「Delay becoming more active if」(일시 질환 · 임신 · 상태 변화)를 홈의 하루 한 번 확인으로.
//   잠그지 않는다(사용자 확정 "굳이 잠글 필요까지는 없어") — 안내 한 줄만, 프로그램·버튼은 그대로.
import { DELAY_QUESTIONS, delayNotice, delayAnswersForToday, type DelayAnswers } from "./safety-screen";

describe("DELAY_QUESTIONS — 오늘 몸 상태 3가지", () => {
  it("문항 3개, 문구 비어 있지 않고 서로 다름, PAR-Q 이름 없음", () => {
    expect(DELAY_QUESTIONS.length).toBe(3);
    const t = DELAY_QUESTIONS.map((q) => q.text);
    expect(new Set(t).size).toBe(3);
    for (const x of t) { expect(x.trim().length).toBeGreaterThan(0); expect(x).not.toMatch(/PAR-?Q/i); }
  });
});

describe("delayNotice — 안내 한 줄", () => {
  const ans = (yes: number[]): DelayAnswers => ({ date: "2026-09-16", yes: Object.fromEntries(DELAY_QUESTIONS.map((_, i) => [i, yes.includes(i)])) });
  it("셋 다 아니오 → 안내 없음", () => { expect(delayNotice(ans([]))).toBeNull(); });
  it("아직 안 답함 → 안내 없음", () => { expect(delayNotice({ date: "2026-09-16", yes: {} })).toBeNull(); });
  it("일시 질환(0)만 예 → 쉬어도 좋다는 안내, 주치의 언급 없음", () => {
    const t = delayNotice(ans([0]))!;
    expect(t).toContain("쉬");
    expect(t).not.toContain("주치의");
  });
  it("임신(1) 또는 상태 변화(2) 예 → 주치의 상의를 덧붙인다", () => {
    for (const i of [1, 2]) expect(delayNotice(ans([i])), `#${i}`).toContain("주치의");
  });
  it("안내에 「하지 마세요」류 금지어가 없다 — 잠그지 않는다", () => {
    for (const i of [0, 1, 2]) expect(delayNotice(ans([i]))!).not.toMatch(/하지 마|금지|멈추/);
  });
});

describe("delayAnswersForToday — 날짜가 바뀌면 초기화", () => {
  const saved: DelayAnswers = { date: "2026-09-15", yes: { 0: true, 1: false, 2: false } };
  it("같은 날이면 그대로", () => { expect(delayAnswersForToday(saved, "2026-09-15")).toBe(saved); });
  it("다음 날이면 빈 답(어제의 「예」가 오늘까지 안 남는다)", () => {
    const r = delayAnswersForToday(saved, "2026-09-16");
    expect(r.date).toBe("2026-09-16");
    expect(r.yes).toEqual({});
  });
  it("저장된 게 없으면 오늘 날짜의 빈 답", () => { expect(delayAnswersForToday(undefined, "2026-09-16")).toEqual({ date: "2026-09-16", yes: {} }); });
});
