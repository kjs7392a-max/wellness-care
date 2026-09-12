import { describe, expect, it } from "vitest";
import { AROUSAL_LABEL, directing, quadrantOf, samWeight, VALENCE_LABEL, type SamScore } from "./sam";

const S: SamScore[] = [1, 2, 3, 4, 5];

describe("SAM → 사분면", () => {
  it("기분×긴장 25조합이 전부 네 사분면 중 하나로 간다", () => {
    for (const v of S) for (const a of S) expect(["HP", "LP", "HN", "LN"]).toContain(quadrantOf(v, a));
  });
  it("불쾌+긴장 HN · 불쾌+처짐 LN · 유쾌+긴장 HP · 유쾌+차분 LP", () => {
    expect(quadrantOf(1, 5)).toBe("HN");
    expect(quadrantOf(2, 1)).toBe("LN");
    expect(quadrantOf(5, 4)).toBe("HP");
    expect(quadrantOf(4, 2)).toBe("LP");
  });
  it("기분 그저 그럼(3)은 긴장 축이 정한다: 긴장 HN · 처짐 LN · 보통 LP. 유쾌+긴장 보통은 LP", () => {
    expect(quadrantOf(3, 5)).toBe("HN");
    expect(quadrantOf(3, 1)).toBe("LN");
    expect(quadrantOf(3, 3)).toBe("LP");
    expect(quadrantOf(4, 3)).toBe("LP");
  });
  it("마음 컨디션 재료는 기분 축만: ≤2 heavy · 3 neutral · ≥4 light", () => {
    expect(samWeight(1)).toBe("heavy"); expect(samWeight(3)).toBe("neutral"); expect(samWeight(5)).toBe("light");
  });
  it("라벨 5개씩, 점수 숫자는 라벨에 없다", () => {
    for (const s of S) { expect(VALENCE_LABEL[s]).not.toMatch(/\d/); expect(AROUSAL_LABEL[s]).not.toMatch(/\d/); }
  });
});

describe("directing", () => {
  it("문단 5개, 사분면별 전략 문장, 임상 용어 없음", () => {
    const d = directing(2, 5, 4, 2);
    expect(d.quadrant).toBe("HN");
    expect(d.weight).toBe("heavy");
    const paras = d.text.split("\n\n");
    expect(paras).toHaveLength(5);
    expect(paras[0]).toContain("긴장해 있어요");
    expect(paras[3]).toContain("숨 고르기");
    expect(d.text).not.toMatch(/\d점|등급|우울증|진단|각성/);
  });
  it("LN 은 아주 작은 행동, HP 는 힘 쓸 곳, LP 는 유지·기록", () => {
    expect(directing(2, 1, 4, 1).text).toContain("아주 작은 행동 하나");
    expect(directing(5, 5, 4, 2).text).toContain("쓸 곳이 있을 때");
    expect(directing(4, 2, 4, 0).text).toContain("기록해 두면");
  });
  it("어제 몸이 낮으면 어느 사분면이든 부담 낮은 제안, 몸 기록 없으면 그 문단이 말해 준다", () => {
    expect(directing(1, 5, 1, 2).text).toContain("이완 호흡");
    expect(directing(5, 5, 1, 2).text).toContain("힘을 아껴");
    expect(directing(3, 3, null, 1).text).toContain("어제 몸 기록이 아직 없어서");
  });
  it("세기: 기분 1/5 나 긴장 1/5 면 '많이' 톤", () => {
    expect(directing(5, 5, 4, 1).text).toContain("많이 올라와");
    expect(directing(4, 4, 4, 1).text).toContain("조금 올라와");
  });
});
