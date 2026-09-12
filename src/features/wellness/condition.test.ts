import { describe, expect, it } from "vitest";
import { bodyEvidence, bodyLevel, change, HEAVY_PICKS, LEVEL_LABEL, levelFromSum, mindEvidence, mindLevel, suggestion } from "./condition";
import { PROBES } from "./data";

describe("levelFromSum", () => {
  it("−3~+3 → 1~5", () => {
    expect([-3, -2, -1, 0, 1, 2, 3].map(levelFromSum)).toEqual([1, 1, 2, 3, 4, 5, 5]);
  });
});

describe("bodyLevel", () => {
  it("몸풀기 3회 이상 + 평소 수준 = 좋음(사용자 예시)", () => {
    expect(bodyLevel({ stretchCount: 3, moveVsUsual: 0, stepsVsUsual: 0 })).toBe(4);
  });
  it("몸풀기 0회 + 둘 다 적음 = 휴식 필요", () => {
    expect(bodyLevel({ stretchCount: 0, moveVsUsual: -1, stepsVsUsual: -1 })).toBe(1);
  });
});

describe("mindLevel", () => {
  it("5일 기록 중 무거운 결 2일 = 보통(사용자 예시)", () => {
    expect(mindLevel({ pictureDays: 5, heavyDays: 2, chatCount: 2, riskFlagged: false })).toBe(3);
  });
  it("위험어가 뜬 주는 무조건 휴식 필요", () => {
    expect(mindLevel({ pictureDays: 5, heavyDays: 0, chatCount: 0, riskFlagged: true })).toBe(1);
  });
  it("기록도 대화도 없으면 단계를 매기지 않는다", () => {
    expect(mindLevel({ pictureDays: 0, heavyDays: 0, chatCount: 0, riskFlagged: false })).toBeNull();
  });
  it("대화 횟수는 단계를 바꾸지 않는다(내용도 횟수도 마음을 재는 잣대가 아니다)", () => {
    const a = mindLevel({ pictureDays: 4, heavyDays: 0, chatCount: 0, riskFlagged: false });
    const b = mindLevel({ pictureDays: 4, heavyDays: 0, chatCount: 7, riskFlagged: false });
    expect(a).toBe(b);
  });
  it("무거운 결 목록은 실제 「오늘의 그림」 선택지와 글자가 같다", () => {
    const labels = new Set(PROBES.flatMap((p) => p.options.map((o) => o.label)));
    for (const h of HEAVY_PICKS) expect(labels.has(h), h).toBe(true);
  });
});

describe("change / suggestion / evidence", () => {
  it("변화 문장 — 숫자 없이 단계 이름만", () => {
    expect(change(3, 4)).toMatchObject({ dir: "up", text: "지난주 보통 → 이번 주 좋음" });
    expect(change(4, 4).text).toBe("지난주와 같아요");
    expect(change(3, null).dir).toBe("none");
    for (const l of [1, 2, 3, 4, 5] as const) expect(change(3, l).text).not.toMatch(/\d/);
  });
  it("제안은 9조합 전부 문장이 있고 이모지가 없다", () => {
    const ls = [1, 3, 5] as const;
    for (const b of ls) for (const m of ls) {
      const t = suggestion(b, m);
      expect(t.length).toBeGreaterThan(8);
      expect(/\p{Extended_Pictographic}/u.test(t)).toBe(false);
    }
    expect(suggestion(4, 3)).toBe("가볍게 몸을 풀며 유지해 보세요.");
  });
  it("근거 줄에 점수·단계 숫자가 없다(횟수·일수만)", () => {
    const e = bodyEvidence({ stretchCount: 3, moveVsUsual: 0, stepsVsUsual: -1 }, 1);
    expect(e[0]).toBe("몸풀기 3회 (지난주 1회)");
    expect(e[2]).toContain("조금 적음");
    expect(mindEvidence({ pictureDays: 5, heavyDays: 2, chatCount: 2, riskFlagged: false })).toHaveLength(3);
    expect(mindEvidence({ pictureDays: 5, heavyDays: 2, chatCount: 2, riskFlagged: true })[0]).toContain("쉬어가도");
    expect(Object.values(LEVEL_LABEL)).toHaveLength(5);
  });
});

import { overallLevel } from "./condition";
describe("overallLevel — 종합", () => {
  it("평균, 어중간하면 낮은 쪽(좋음+보통 = 보통)", () => {
    expect(overallLevel(4, 3)).toBe(3);
    expect(overallLevel(4, 4)).toBe(4);
    expect(overallLevel(5, 2)).toBe(3);
    expect(overallLevel(1, 5)).toBe(3);
  });
  it("한쪽이 없으면 있는 쪽, 둘 다 없으면 없음, 위험어 주는 무조건 휴식 필요", () => {
    expect(overallLevel(4, null)).toBe(4);
    expect(overallLevel(null, null)).toBeNull();
    expect(overallLevel(5, 5, true)).toBe(1);
  });
});
