import { describe, expect, it } from "vitest";
import { BLOT_DIR, COLOR_DIR, needAdvice, needLine, readPicks, socialLine } from "./needs";
import { BLOT_CHOICES } from "./blot";
import { COLOR_CHOICES } from "./color";
import { directing, type SamScore } from "./sam";

describe("needs — 선택 조합 계산", () => {
  it("얼룩·색 보기 전부에 방향(act·soc)이 있고 −1~+1 안", () => {
    for (const c of BLOT_CHOICES) { const d = BLOT_DIR[c.id]; expect(d, c.label).toBeTruthy(); expect(Math.abs(d.act)).toBeLessThanOrEqual(1); expect(Math.abs(d.soc)).toBeLessThanOrEqual(1); }
    for (const c of COLOR_CHOICES) { const d = COLOR_DIR[c.id]; expect(d, c.label).toBeTruthy(); expect(Math.abs(d.act)).toBeLessThanOrEqual(1); expect(Math.abs(d.soc)).toBeLessThanOrEqual(1); }
  });
  it("현재 긴장과 견준다 — 같은 파랑·고요도 긴장이 높으면 「진정을 찾는 중」, 낮으면 「더 깊이 쉬고 싶은」", () => {
    const hi = readPicks(5, [3], 4), lo = readPicks(1, [3], 4);
    expect(hi.kind).toBe("calm"); expect(lo.kind).toBe("steady"); // 이미 차분하면 방향이 아니라 같은 결
    expect(needLine(hi, 5)).toContain("진정을 찾고");
    const mid = readPicks(3, [3], 4);
    expect(mid.kind).toBe("calm");
    expect(needLine(mid, 3, 0)).toContain("차분한 쪽을 가리켜요");
  });
  it("활기 쪽 선택은 긴장이 낮을 때 「기운을 끌어올리고」", () => {
    const r = readPicks(1, [4], 0);
    expect(r.kind).toBe("energize");
    expect(needLine(r, 1)).toContain("기운을 끌어올리고");
  });
  it("얼룩과 색이 반대쪽이면 두 갈래", () => {
    const r = readPicks(3, [3], 0); // 고요(−1) vs 빨강(+1)
    expect(r.kind).toBe("split");
    expect(needLine(r, 3)).toMatch(/두 가지 바람|함께 있는 날/);
    expect(needAdvice(r)!.length).toBeGreaterThan(0);
  });
  it("건너뛰면 줄을 만들지 않는다 · 하나만 골랐으면 그 하나로만 계산", () => {
    const none = readPicks(3, [-1], -1);
    expect(none.kind).toBe("none"); expect(needLine(none, 3)).toBeNull(); expect(needAdvice(none)).toBeNull(); expect(socialLine(none)).toBeNull();
    expect(readPicks(3, [-1], 4).from).toBe("color");
    expect(readPicks(3, [3], -1).from).toBe("blot");
    expect(needLine(readPicks(3, [-1], 4), 3, 1)).toContain("고른 색은");
  });
  it("사람/혼자는 뚜렷할 때만 말한다", () => {
    expect(socialLine(readPicks(3, [0], 1))).toContain("사람 곁");
    expect(socialLine(readPicks(3, [2], 5))).toContain("혼자");
    expect(socialLine(readPicks(3, [1], 2))).toBeNull();
  });
  it("진단·병·점수 말투 없음 — 방향 줄은 열어 둔 말끝", () => {
    for (let a = 1; a <= 5; a++) for (let b = 0; b < 5; b++) for (let c = 0; c < 6; c++) for (let p = 0; p < 2; p++) {
      const r = readPicks(a as SamScore, [b], c); const t = needLine(r, a as SamScore, p) ?? "";
      expect(t).not.toMatch(/진단|장애|증상|병|우울증|\d점/);
    }
  });
  it("요약에 반영 — 같은 상태라도 선택 조합이 다르면 방향 줄이 달라진다", () => {
    const calm = directing({ valence: 2 as SamScore, arousal: 4 as SamScore }, 3, 1, [3], 4, 20000).short;
    const act = directing({ valence: 2 as SamScore, arousal: 2 as SamScore }, 3, 1, [4], 0, 20000).short;
    expect(calm).toMatch(/차분한 쪽/);
    expect(act).toMatch(/활기/);
    expect(calm).not.toBe(act);
    // 이미 최대 긴장인데 활기 쪽을 골랐으면 방향이 아니라 「같은 결」
    expect(readPicks(5, [4], 0).kind).toBe("steady");
  });
});
