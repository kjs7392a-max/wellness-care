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

import { guideMaxSec, PROGRAM_VIDEOS } from "./guide";

describe("PROGRAM_VIDEOS — 20초 시범 × 3회 = 1분 제한", () => {
  it("p1 은 1분 영상 1회, 나머지 12편은 20초 3회 → 전부 최대 60초", () => {
    const ids = Object.keys(PROGRAM_VIDEOS);
    expect(ids).toHaveLength(13);
    for (const id of ids) {
      const g = PROGRAM_VIDEOS[id];
      expect(guideMaxSec(g), id).toBe(60);
      if (id === "p1") { expect(g.playCount ?? 1).toBe(1); expect(guideTotalSec(g.steps)).toBe(60); }
      else { expect(g.playCount).toBe(3); expect(guideTotalSec(g.steps)).toBe(20); }
    }
  });
  it("걷기 p13·p14 는 영상이 없다", () => {
    expect(PROGRAM_VIDEOS.p13).toBeUndefined();
    expect(PROGRAM_VIDEOS.p14).toBeUndefined();
  });
  it("모든 영상 파일이 public 에 실재한다", async () => {
    const fs = await import("node:fs");
    for (const g of Object.values(PROGRAM_VIDEOS)) {
      expect(fs.existsSync("public" + g.src), g.src).toBe(true);
    }
  });
});
