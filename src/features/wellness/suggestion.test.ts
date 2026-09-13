import { describe, expect, it } from "vitest";
import { DEMO_PINNED_SLOT, resolveSuggestion } from "./suggestion";
import { PARQ_REST_ITEM, PARQ_TIER_AT, ROLES, type Role } from "./data";

const ROLE_KEYS: Role[] = ["teacher", "admin", "care"];

describe("resolveSuggestion — 시연용 시간대 고정", () => {
  it("퇴근 전(slot 2)으로 못박혀 있다", () => {
    expect(DEMO_PINNED_SLOT).toBe(2);
  });

  it("언제 열어도 그 직군의 「퇴근 전」 항목이 나온다 — 시각·요일 무관", () => {
    for (const role of ROLE_KEYS) {
      for (const [hour, dow] of [[8, 1], [13, 3], [17, 5], [10, 6], [21, 0]]) {
        const s = resolveSuggestion({ role, parqYes: 0, hour, dow });
        expect(s.slot).toBe(2);
        expect(s.isWeekend).toBe(false); // 「퇴근 전」 제목과 쉬는 날 문구가 부딪히지 않게
        expect(s.item).toBe(ROLES[role].items[2]);
      }
    }
  });

  // 2026-09-13: 직군까지 고정했더니 「어떤 일을 하고 계신가요?」가 화면에서 아무 일도 하지 않았다.
  it("직군은 고정되지 않는다 — 셋이 서로 다른 제안을 받는다", () => {
    const titles = ROLE_KEYS.map((role) => resolveSuggestion({ role, parqYes: 0, hour: 17, dow: 1 }).item.title);
    expect(new Set(titles).size).toBe(3);
  });

  it("PAR-Q 에 걸리면 같은 시간대의 저강도판", () => {
    for (const role of ROLE_KEYS) {
      const s = resolveSuggestion({ role, parqYes: 1, hour: 17, dow: 1 });
      expect(s.item).toBe(ROLES[role].low[2]);
    }
  });

  // 시연에서 「지금 바로 시작하기」를 누르면 타이머가 아니라 가이드 영상이 떠야 한다(2026-09-13 사용자 지시).
  it("고정된 시간대의 항목은 직군·강도와 무관하게 전부 가이드 영상을 갖는다", () => {
    for (const role of ROLE_KEYS) {
      for (const parqYes of [0, 1]) {
        const s = resolveSuggestion({ role, parqYes, hour: 17, dow: 1 });
        expect(s.item.video, `${role}/예${parqYes}개 — ${s.item.title}`).toBeDefined();
      }
    }
  });
});

describe("resolveSuggestion — 고정을 풀면(원래 설계)", () => {
  it("시각으로 slot 이 갈린다", () => {
    expect(resolveSuggestion({ role: "teacher", parqYes: 0, hour: 8, dow: 1 }, null).slot).toBe(0);
    expect(resolveSuggestion({ role: "teacher", parqYes: 0, hour: 13, dow: 1 }, null).slot).toBe(1);
    expect(resolveSuggestion({ role: "teacher", parqYes: 0, hour: 17, dow: 1 }, null).slot).toBe(2);
  });

  it("직군별 항목·주말 판정", () => {
    const s = resolveSuggestion({ role: "admin", parqYes: 0, hour: 8, dow: 6 }, null);
    expect(s.item.title).toBe("문서작업 중간 30초 눈 운동");
    expect(s.isWeekend).toBe(true);
  });
});

describe("resolveSuggestion — PAR-Q+ 「예」 개수로 단계가 갈린다 (2026-09-13 사용자 지적)", () => {
  const at = (role: Role, parqYes: number) => resolveSuggestion({ role, parqYes, hour: 17, dow: 1 });

  it("0개 = 평소 강도 · 문턱만큼이면 낮은 강도 · 그 위는 숨 고르기만", () => {
    for (const role of ROLE_KEYS) {
      expect(at(role, 0).item).toBe(ROLES[role].items[2]);
      expect(at(role, PARQ_TIER_AT.low).item).toBe(ROLES[role].low[2]);
      expect(at(role, PARQ_TIER_AT.rest).item).toBe(PARQ_REST_ITEM);
    }
  });

  // 이것이 사용자가 본 증상이다 — 「예 1개」와 「예 7개」가 같은 제안을 받고 있었다.
  it("예가 1개일 때와 7개일 때가 다른 제안이다", () => {
    for (const role of ROLE_KEYS) {
      expect(at(role, 1).item).not.toBe(at(role, 7).item);
    }
  });

  it("3단계는 직군을 보지 않는다 — 셋이 같은 항목", () => {
    const items = ROLE_KEYS.map((r) => at(r, 7).item);
    expect(new Set(items).size).toBe(1);
  });

  it("3단계 항목에도 가이드 영상이 있다", () => {
    expect(PARQ_REST_ITEM.video).toBeDefined();
  });
});
