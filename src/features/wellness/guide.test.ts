import { describe, expect, it } from "vitest";
import { guideStepAt, guideTotalSec, SHOULDER_RELEASE } from "./guide";

const steps = SHOULDER_RELEASE.steps;

describe("SHOULDER_RELEASE 콘티", () => {
  it("6구간 합계가 정확히 60초 — 영상 길이(60.0s)와 같아야 반복이 맞는다", () => {
    expect(steps).toHaveLength(6);
    expect(guideTotalSec(steps)).toBe(60);
  });
});

describe("guideStepAt", () => {
  it("0초는 첫 구간", () => {
    const p = guideStepAt(steps, 0);
    expect(p.index).toBe(0);
    expect(p.loop).toBe(0);
    expect(p.progress).toBe(0);
  });
  it("경계: 9초는 1구간, 10초는 2구간(어깨 으쓱)", () => {
    expect(guideStepAt(steps, 9).index).toBe(0);
    expect(guideStepAt(steps, 10).index).toBe(1);
    expect(guideStepAt(steps, 10).step.title).toBe("어깨 으쓱");
  });
  it("구간 안 경과·진행률", () => {
    const p = guideStepAt(steps, 17); // 10 + 7
    expect(p.index).toBe(1);
    expect(p.stepElapsed).toBe(7);
    expect(p.progress).toBeCloseTo(7 / 15);
  });
  it("마지막 구간 55~59초", () => {
    expect(guideStepAt(steps, 55).index).toBe(5);
    expect(guideStepAt(steps, 59).index).toBe(5);
  });
  it("60초부터 두 번째 반복 첫 구간 — 3·5·10분 선택 시 세트 반복", () => {
    const p = guideStepAt(steps, 60);
    expect(p.loop).toBe(1);
    expect(p.index).toBe(0);
    expect(guideStepAt(steps, 130).loop).toBe(2);
    expect(guideStepAt(steps, 130).index).toBe(1); // 120 + 10 = 세트 안 10초 → 2구간 시작
    expect(guideStepAt(steps, 129).index).toBe(0); // 120 + 9
    expect(guideStepAt(steps, 599).index).toBe(5); // 10분 마지막 초
  });
  it("음수·NaN 은 0초로", () => {
    expect(guideStepAt(steps, -5).index).toBe(0);
    expect(guideStepAt(steps, NaN).index).toBe(0);
  });
});
