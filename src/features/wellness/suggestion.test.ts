import { describe, expect, it } from "vitest";
import { MVP_FIXED_SUGGESTION, resolveSuggestion } from "./suggestion";
import { SHOULDER_RELEASE } from "./guide";

describe("resolveSuggestion — MVP 고정", () => {
  it("플래그가 켜져 있다(시연 기간)", () => {
    expect(MVP_FIXED_SUGGESTION).toBe(true);
  });
  it("시각·요일·직군과 무관하게 「퇴근 전 어깨·목 풀기」 + 가이드 영상", () => {
    const cases = [
      { role: "teacher" as const, parqYes: false, hour: 8, dow: 1 },
      { role: "admin" as const, parqYes: false, hour: 13, dow: 3 },
      { role: "care" as const, parqYes: false, hour: 17, dow: 6 }, // 주말이어도
    ];
    for (const c of cases) {
      const s = resolveSuggestion(c, true);
      expect(s.item.title).toBe("퇴근 전 어깨·목 풀기");
      expect(s.item.video).toBe(SHOULDER_RELEASE);
      expect(s.slot).toBe(2);
      expect(s.isWeekend).toBe(false); // 주말 문구·제목 변형이 끼어들지 않게
    }
  });
  it("PAR-Q 에 걸리면 저강도판 — 역시 영상 있음", () => {
    const s = resolveSuggestion({ role: "teacher", parqYes: true, hour: 17, dow: 2 }, true);
    expect(s.item.title).toBe("퇴근 전 앉은 채로 어깨 내려놓기");
    expect(s.item.video).toBe(SHOULDER_RELEASE);
  });
});

describe("resolveSuggestion — 원래 설계(플래그 off)", () => {
  it("시각으로 slot 이 갈린다", () => {
    expect(resolveSuggestion({ role: "teacher", parqYes: false, hour: 8, dow: 1 }, false).slot).toBe(0);
    expect(resolveSuggestion({ role: "teacher", parqYes: false, hour: 13, dow: 1 }, false).slot).toBe(1);
    expect(resolveSuggestion({ role: "teacher", parqYes: false, hour: 17, dow: 1 }, false).slot).toBe(2);
  });
  it("직군별 항목·주말 판정", () => {
    const s = resolveSuggestion({ role: "admin", parqYes: false, hour: 8, dow: 6 }, false);
    expect(s.item.title).toBe("문서작업 중간 30초 눈 운동");
    expect(s.isWeekend).toBe(true);
  });
});
