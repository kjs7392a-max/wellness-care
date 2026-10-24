import { describe, expect, it } from "vitest";
import { COLOR_CHOICES, COLOR_SKIP, colorText } from "./color";
import { directing, type Quadrant, type SamScore } from "./sam";

const QUADS: Quadrant[] = ["HP", "LP", "HN", "LN"];
const two = (v: SamScore, a: SamScore) => ({ valence: v, arousal: a });

describe("color — 지금 끌리는 색 · 상태에 접목", () => {
  it("색 여섯 · 색×사분면 24덩어리가 전부 있고 서로 다르다", () => {
    expect(COLOR_CHOICES).toHaveLength(6);
    const all = new Set<string>();
    for (const c of COLOR_CHOICES) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
      for (const q of QUADS) { const t = colorText(c.id, q); expect(t, `${c.label} ${q}`).toBeTruthy(); all.add(t!); }
    }
    expect(all.size).toBe(24);
  });
  it("같은 색도 상태가 다르면 문장이 다르다 · 진단 말투 없음 · 열어 둔 말끝", () => {
    for (const c of COLOR_CHOICES) {
      expect(new Set(QUADS.map((q) => colorText(c.id, q))).size).toBe(4);
      for (const q of QUADS) { const t = colorText(c.id, q)!; expect(t).toContain("끌리는 색을 보면"); expect(t).not.toMatch(/진단|장애|증상|병|우울증/); expect(t).toMatch(/수 있어요\.$/); }
    }
  });
  it("건너뛰기·없음 = 글 없음", () => {
    expect(colorText(COLOR_SKIP, "HN")).toBeNull();
    expect(colorText(null, "HN")).toBeNull();
    expect(colorText(undefined, "LP")).toBeNull();
  });
  it("디렉팅 — 얼룩 하나 + 색 하나가 한 문단 안에 녹고 건너뛰면 기존과 같다", () => {
    const base = directing(two(2, 5), 3, 1).text;
    const both = directing(two(2, 5), 3, 1, [2], 4).text;
    expect(both).toContain("그림에서 느낀 걸 보면");
    expect(both).toContain("끌리는 색을 보면");
    expect(both).not.toMatch(/\n\s*\n/);
    expect(directing(two(2, 5), 3, 1, [null], COLOR_SKIP).text).toBe(base);
    expect(directing(two(2, 5), 3, 1, [-1], null).text).toBe(base);
    expect(directing(two(2, 5), 3, 1, undefined, 0).text).toContain("끌리는 색을 보면");
  });
});
