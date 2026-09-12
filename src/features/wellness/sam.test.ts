import { describe, expect, it } from "vitest";
import { AXES, directing, EMPTY_SAM, quadrantOf, samAnswered, samDone, samWeight, type SamScore } from "./sam";

const S: SamScore[] = [1, 2, 3, 4, 5];
const full = (v: SamScore, a: SamScore, d: SamScore = 4, sl: SamScore = 4, sat: SamScore = 4) => ({ valence: v, arousal: a, dominance: d, sleep: sl, satisfaction: sat });

describe("축 정의", () => {
  it("5축, 축마다 은유 질문·그림 이름표 5개·근거 표기가 있고 직접 질문('기분은 어느 쪽')이 없다", () => {
    expect(AXES).toHaveLength(5);
    for (const x of AXES) {
      expect(x.labels).toHaveLength(5);
      expect(x.basis.length).toBeGreaterThan(2);
      expect(x.question).not.toMatch(/기분은 어느|몸은 어느/);
      expect(x.question.endsWith("?")).toBe(true);
    }
    expect(samDone(EMPTY_SAM)).toBe(false);
    expect(samAnswered({ ...EMPTY_SAM, valence: 3, sleep: 2 })).toBe(2);
    expect(samDone(full(3, 3))).toBe(true);
  });
});

describe("SAM → 사분면", () => {
  it("기분×긴장 25조합이 전부 네 사분면 중 하나로 간다", () => {
    for (const v of S) for (const a of S) expect(["HP", "LP", "HN", "LN"]).toContain(quadrantOf(v, a));
  });
  it("불쾌+긴장 HN · 불쾌+처짐 LN · 유쾌+긴장 HP · 유쾌+차분 LP · 가운데(3)는 긴장 축이 정함", () => {
    expect(quadrantOf(1, 5)).toBe("HN"); expect(quadrantOf(2, 1)).toBe("LN");
    expect(quadrantOf(5, 4)).toBe("HP"); expect(quadrantOf(4, 2)).toBe("LP");
    expect(quadrantOf(3, 5)).toBe("HN"); expect(quadrantOf(3, 1)).toBe("LN"); expect(quadrantOf(3, 3)).toBe("LP"); expect(quadrantOf(4, 3)).toBe("LP");
  });
  it("마음 컨디션 재료는 기분 축만: ≤2 heavy · 3 neutral · ≥4 light", () => {
    expect(samWeight(1)).toBe("heavy"); expect(samWeight(3)).toBe("neutral"); expect(samWeight(5)).toBe("light");
  });
});

describe("directing", () => {
  it("첫 문장이 고른 은유(하늘·물)를 받아서 시작하고, 사분면 전략이 붙고, 임상 용어가 없다", () => {
    const d = directing(full(2, 5), 4, 2);
    expect(d.quadrant).toBe("HN");
    expect(d.weight).toBe("heavy");
    expect(d.text.startsWith("오늘 하늘은 흐림, 안의 물은 폭포 — ")).toBe(true);
    expect(d.text).toContain("숨 고르기");
    expect(d.text).not.toMatch(/\d점|등급|우울증|진단|각성/);
  });
  it("잠·통제감이 좋으면 5문단, 잠이 나쁘면 잠 문단이 먼저 끼고, 통제감 낮으면 작은 선택 문단이 낀다(최대 7)", () => {
    expect(directing(full(4, 2), 4, 1).text.split("\n\n")).toHaveLength(5);
    const bad = directing(full(2, 4, 1, 1), 4, 1);
    const paras = bad.text.split("\n\n");
    expect(paras).toHaveLength(7);
    expect(paras[2]).toContain("어젯밤은 뒤척인 밤");
    expect(paras[3]).toContain("아주 작은 선택 하나");
  });
  it("LN 은 아주 작은 행동, HP 는 힘 쓸 곳, LP 는 유지·기록, 몸 낮으면 부담 낮게, 몸 기록 없으면 그 문단이 말해 준다", () => {
    expect(directing(full(2, 1), 4, 1).text).toContain("아주 작은 행동 하나");
    expect(directing(full(5, 5), 4, 2).text).toContain("쓸 곳이 있을 때");
    expect(directing(full(4, 2), 4, 0).text).toContain("기록해 두면");
    expect(directing(full(5, 5), 1, 2).text).toContain("힘을 아껴");
    expect(directing(full(3, 3), null, 1).text).toContain("어제 몸 기록이 아직 없어서");
  });
});
