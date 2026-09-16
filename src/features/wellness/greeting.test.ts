import { describe, expect, it } from "vitest";
import { greetingForHour } from "./greeting";

// 2026-09-17 사용자 지시: 홈 인사말 「오늘도 한 걸음 왔네요」를 접속 시각에 맞게.
describe("greetingForHour — 시간대별 인사말", () => {
  it("0~23시 모두 비어 있지 않은 문장을 준다", () => {
    for (let h = 0; h < 24; h++) expect(greetingForHour(h).trim().length, `${h}시`).toBeGreaterThan(0);
  });
  it("아침·점심·오후·저녁·밤이 서로 다른 말이다", () => {
    const set = new Set([7, 12, 16, 20, 23].map(greetingForHour));
    expect(set.size).toBe(5);
  });
  it("같은 시간대 안에서는 같은 말(경계 안정)", () => {
    expect(greetingForHour(5)).toBe(greetingForHour(10));
    expect(greetingForHour(11)).toBe(greetingForHour(13));
    expect(greetingForHour(14)).toBe(greetingForHour(17));
    expect(greetingForHour(18)).toBe(greetingForHour(21));
    expect(greetingForHour(22)).toBe(greetingForHour(4));
  });
  it("아침엔 「아침」, 밤엔 「쉬」가 들어간다", () => {
    expect(greetingForHour(8)).toContain("아침");
    expect(greetingForHour(23)).toContain("쉬");
  });
});
