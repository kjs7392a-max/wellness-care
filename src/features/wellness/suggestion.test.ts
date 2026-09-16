import { describe, expect, it } from "vitest";
import { DEMO_PINNED_SLOT, resolveSuggestion } from "./suggestion";
import { PARQ_REST_ITEM, ROLES, type Role } from "./data";

const ROLE_KEYS: Role[] = ["teacher", "admin", "care"];

describe("resolveSuggestion — 시연용 시간대 고정", () => {
  it("퇴근 전(slot 2)으로 못박혀 있다", () => {
    expect(DEMO_PINNED_SLOT).toBe(2);
  });

  it("언제 열어도 그 직군의 「퇴근 전」 항목이 나온다 — 시각·요일 무관", () => {
    for (const role of ROLE_KEYS) {
      for (const [hour, dow] of [[8, 1], [13, 3], [17, 5], [10, 6], [21, 0]]) {
        const s = resolveSuggestion({ role, tier: 0, hour, dow });
        expect(s.slot).toBe(2);
        expect(s.isWeekend).toBe(false); // 「퇴근 전」 제목과 쉬는 날 문구가 부딪히지 않게
        expect(s.item).toBe(ROLES[role].items[2]);
      }
    }
  });

  // 2026-09-13: 직군까지 고정했더니 「어떤 일을 하고 계신가요?」가 화면에서 아무 일도 하지 않았다.
  it("직군은 고정되지 않는다 — 셋이 서로 다른 제안을 받는다", () => {
    const titles = ROLE_KEYS.map((role) => resolveSuggestion({ role, tier: 0, hour: 17, dow: 1 }).item.title);
    expect(new Set(titles).size).toBe(3);
  });

  it("안전 확인 1단계면 같은 시간대의 저강도판", () => {
    for (const role of ROLE_KEYS) {
      const s = resolveSuggestion({ role, tier: 1, hour: 17, dow: 1 });
      expect(s.item).toBe(ROLES[role].low[2]);
    }
  });

  // 시연에서 「지금 바로 시작하기」를 누르면 타이머가 아니라 가이드 영상이 떠야 한다(2026-09-13 사용자 지시).
  it("고정된 시간대의 항목은 직군·강도와 무관하게 전부 가이드 영상을 갖는다", () => {
    for (const role of ROLE_KEYS) {
      for (const tier of [0, 1] as const) {
        const s = resolveSuggestion({ role, tier, hour: 17, dow: 1 });
        expect(s.item.video, `${role}/단계${tier} — ${s.item.title}`).toBeDefined();
      }
    }
  });
});

describe("resolveSuggestion — 고정을 풀면(원래 설계)", () => {
  it("시각으로 slot 이 갈린다", () => {
    expect(resolveSuggestion({ role: "teacher", tier: 0, hour: 8, dow: 1 }, null).slot).toBe(0);
    expect(resolveSuggestion({ role: "teacher", tier: 0, hour: 13, dow: 1 }, null).slot).toBe(1);
    expect(resolveSuggestion({ role: "teacher", tier: 0, hour: 17, dow: 1 }, null).slot).toBe(2);
  });

  it("직군별 항목·주말 판정", () => {
    const s = resolveSuggestion({ role: "admin", tier: 0, hour: 8, dow: 6 }, null);
    expect(s.item.title).toBe("문서작업 중간 30초 눈 운동");
    expect(s.isWeekend).toBe(true);
  });
});

describe("resolveSuggestion — 안전 확인 단계로 제안이 갈린다 (2026-09-13 사용자 지적 → 2026-09-16 단계는 문항 성격으로)", () => {
  const at = (role: Role, tier: 0 | 1 | 2) => resolveSuggestion({ role, tier, hour: 17, dow: 1 });

  it("0 = 평소 강도 · 1 = 낮은 강도 · 2 = 숨 고르기만", () => {
    for (const role of ROLE_KEYS) {
      expect(at(role, 0).item).toBe(ROLES[role].items[2]);
      expect(at(role, 1).item).toBe(ROLES[role].low[2]);
      expect(at(role, 2).item).toBe(PARQ_REST_ITEM);
    }
  });

  // 이것이 2026-09-13 에 사용자가 본 증상이다 — 어떤 「예」든 같은 제안을 받고 있었다. 단계마다 달라야 한다.
  it("세 단계가 서로 다른 제안이다", () => {
    for (const role of ROLE_KEYS) {
      expect(at(role, 0).item).not.toBe(at(role, 1).item);
      expect(at(role, 1).item).not.toBe(at(role, 2).item);
    }
  });

  it("2단계는 직군을 보지 않는다 — 셋이 같은 항목", () => {
    const items = ROLE_KEYS.map((r) => at(r, 2).item);
    expect(new Set(items).size).toBe(1);
  });

  it("3단계 항목에도 가이드 영상이 있다", () => {
    expect(PARQ_REST_ITEM.video).toBeDefined();
  });
});

describe("resolveSuggestion — 단계마다 영상이 실제로 달라야 한다 (2026-09-13 사용자 지적)", () => {
  // 「예를 누르든 아니오를 누르든 변화가 없다」의 정체가 이것이었다 —
  // 제목·라이브러리 개수는 바뀌는데 **선생님이 보는 영상**이 같았다(교사·영양).
  // 🚫 제목만 바꿔 놓고 「달라졌다」고 하지 말 것.
  it("직군마다 0·1·2단계의 영상이 전부 다르다", () => {
    for (const role of ROLE_KEYS) {
      const vids = ([0, 1, 2] as const)
        .map((tier) => resolveSuggestion({ role, tier, hour: 17, dow: 1 }).item.video);
      expect(vids.every(Boolean), `${role} — 영상 없는 단계가 있다`).toBe(true);
      expect(new Set(vids).size, `${role} — ${vids.map((v) => v!.src.split("/").pop()).join(" / ")}`).toBe(3);
    }
  });
});
