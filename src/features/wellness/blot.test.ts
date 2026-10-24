import { describe, expect, it } from "vitest";
import { BLOT_CHOICES, BLOT_COUNT, BLOT_QUESTIONS, BLOT_UNSURE, blotClause, blotText, dealBlots } from "./blot";
import { directing, type Quadrant, type SamScore } from "./sam";

const QUADS: Quadrant[] = ["HP", "LP", "HN", "LN"];
const two = (v: SamScore, a: SamScore) => ({ valence: v, arousal: a });

describe("blot — 색 얼룩 둘 · 상태에 접목", () => {
  it("보기 다섯 · 보기×사분면 20덩어리가 전부 있고 서로 다르다", () => {
    expect(BLOT_CHOICES).toHaveLength(5);
    const all = new Set<string>();
    for (const c of BLOT_CHOICES) for (const q of QUADS) {
      const t = blotClause(c.id, q);
      expect(t, `${c.label} ${q}`).toBeTruthy();
      all.add(t!);
    }
    expect(all.size).toBe(20);
  });
  it("보기 이름을 되풀이하지 않는다 · 진단 말투 없음 · 열어 둔 말끝", () => {
    for (const c of BLOT_CHOICES) for (const q of QUADS) {
      const t = blotClause(c.id, q)!;
      expect(t).not.toContain(c.label);
      expect(t).not.toMatch(/진단|장애|증상|병|우울증/);
    }
  });
  it("건너뛰기·없음 = 덩어리 없음", () => {
    expect(blotClause(BLOT_UNSURE, "HN")).toBeNull();
    expect(blotClause(null, "HN")).toBeNull();
    expect(blotText([BLOT_UNSURE, null], "HN")).toBeNull();
    expect(blotText(undefined, "HN")).toBeNull();
  });
  it("두 답 → 한 덩어리: 같으면 한 번만 · 다르면 「또」로 잇고 리드는 한 번", () => {
    const same = blotText([2, 2], "LN")!;
    expect(same.match(/얼룩에서 떠올린 걸 보면/g)).toHaveLength(1);
    expect(same).toBe(`얼룩에서 떠올린 걸 보면 ${blotClause(2, "LN")}`);
    const diff = blotText([0, 3], "HN")!;
    expect(diff).toContain(" 또 ");
    expect(diff.match(/얼룩에서 떠올린 걸 보면/g)).toHaveLength(1);
    expect(blotText([0, BLOT_UNSURE], "HN")).toBe(`얼룩에서 떠올린 걸 보면 ${blotClause(0, "HN")}`);
  });
  it("dealBlots — 서로 다른 그림 둘 · 질문 문구 둘 · 직전 첫 장 피함 · 범위", () => {
    for (let t = 0; t < 200; t++) {
      const r = Math.random;
      const d = dealBlots(5, r);
      expect(d.images[0]).not.toBe(d.images[1]);
      expect(d.images[0]).not.toBe(5);
      for (const n of d.images) { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(BLOT_COUNT); }
      expect(d.questions[0]).not.toBe(d.questions[1]);
      for (const q of d.questions) expect(BLOT_QUESTIONS[q]).toBeTruthy();
    }
    expect(dealBlots(null, () => 0).images).toEqual([1, 2]);
  });
  it("디렉팅 — 기분·긴장 둘만으로도 나오고 얼룩 덩어리는 한 문단 안에 녹는다", () => {
    const base = directing(two(2, 5), 3, 1).text;
    expect(base).not.toMatch(/undefined|null/);
    const withBlot = directing(two(2, 5), 3, 1, [2, 4]).text;
    expect(withBlot).toContain("얼룩에서 떠올린 걸 보면");
    expect(withBlot).not.toMatch(/\n\s*\n/);
    expect(withBlot.length).toBeGreaterThan(base.length);
    expect(directing(two(2, 5), 3, 1, [BLOT_UNSURE, BLOT_UNSURE]).text).toBe(base);
    expect(directing(two(2, 5), 3, 1, [null, null]).text).toBe(base);
  });
});
