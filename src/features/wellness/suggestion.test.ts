import { describe, expect, it } from "vitest";
import { DEMO_PINNED_SLOT, contextualItem, resolveSuggestion, suggestionChoices } from "./suggestion";
import { PARQ_REST_ITEM, ROLES, type Role } from "./data";

const ROLE_KEYS: Role[] = ["teacher", "admin", "care"];

describe("resolveSuggestion — 접속 시각을 따른다 (2026-09-17 사용자 지시로 시연 고정 해제)", () => {
  it("시연용 시간대 고정이 풀려 있다", () => {
    expect(DEMO_PINNED_SLOT).toBeNull();
  });

  it("기본 호출(고정값 인자 없이)이 시각으로 slot 을 가른다", () => {
    for (const role of ROLE_KEYS) {
      expect(resolveSuggestion({ role, tier: 0, hour: 8, dow: 1 }).item).toBe(ROLES[role].items[0]);
      expect(resolveSuggestion({ role, tier: 0, hour: 13, dow: 1 }).item).toBe(ROLES[role].items[1]);
      expect(resolveSuggestion({ role, tier: 0, hour: 17, dow: 1 }).item).toBe(ROLES[role].items[2]);
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

  it("직군별 항목·주말 판정 — 주말엔 근무 표현이 떨어진 제목(2026-09-19 · contextualItem)", () => {
    const s = resolveSuggestion({ role: "admin", tier: 0, hour: 8, dow: 6 }, null);
    expect(s.item.title).toBe("30초 눈 운동");
    expect(s.isWeekend).toBe(true);
    expect(resolveSuggestion({ role: "admin", tier: 0, hour: 8, dow: 3 }, null).item.title).toBe("문서작업 중간 30초 눈 운동");
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

// 2026-09-17 사용자 지시: 「지금 바로 시작하기」를 고를 수 있게 → 처음엔 직군의 세 시간대 항목을 늘어놓았는데
//   아침에 「4교시 후…」「퇴근 전…」이 같이 떠 말이 안 됐다(사용자 지적) → **시간대 항목 1 + 부위 프로세스 3(목·어깨·자세)**.
import { PROGRAMS } from "./data";
describe("suggestionChoices — 시간대 1 + 부위 3", () => {
  const byId = (id: string) => PROGRAMS.find((p) => p.id === id)!;
  it("0·1단계 = 4개, 첫째는 그 시간대 항목(resolveSuggestion 과 같은 것), 나머지 셋은 목·어깨·자세 순", () => {
    for (const role of ROLE_KEYS) {
      for (const tier of [0, 1] as const) {
        for (const hour of [8, 13, 17]) {
          const c = suggestionChoices({ role, tier, hour, dow: 1 });
          expect(c.length).toBe(4);
          expect(c[0].item).toBe(resolveSuggestion({ role, tier, hour, dow: 1 }).item);
          expect(c[0].part).toBeUndefined();
          expect(c.slice(1).map((x) => x.part)).toEqual(["목", "어깨", "자세"]);
          expect(new Set(c.map((x) => x.item)).size).toBe(4);
        }
      }
    }
  });
  it("1단계(낮은 강도)의 부위 항목은 전부 low 인 라이브러리 항목", () => {
    for (const x of suggestionChoices({ role: "teacher", tier: 1, hour: 8, dow: 1 }).slice(1)) {
      const pg = PROGRAMS.find((p) => p === x.item);
      expect(pg, x.item.title).toBeDefined();
      expect(pg!.low).toBe(true);
    }
  });
  it("부위 항목엔 시간대 이름이 없다 — 아침에 「퇴근 전」이 뜨지 않는다", () => {
    for (const tier of [0, 1] as const) for (const x of suggestionChoices({ role: "teacher", tier, hour: 8, dow: 1 }).slice(1)) expect(x.item.title).not.toMatch(/수업 전|4교시|퇴근 전|잠들기 전/);
  });
  it("부위 항목은 전부 가이드 영상이 있다", () => {
    for (const tier of [0, 1] as const) for (const x of suggestionChoices({ role: "admin", tier, hour: 13, dow: 1 }).slice(1)) expect(x.item.video, x.item.title).toBeDefined();
  });
  it("2단계(숨 고르기)는 하나뿐 — 부위 항목을 섞지 않는다", () => {
    for (const role of ROLE_KEYS) expect(suggestionChoices({ role, tier: 2, hour: 17, dow: 1 }).map((x) => x.item)).toEqual([PARQ_REST_ITEM]);
  });
  it("자세 항목은 평소엔 전신 기지개, 낮은 강도엔 앉은 자리 허리(p15/p5)", () => {
    expect(suggestionChoices({ role: "care", tier: 0, hour: 8, dow: 1 })[3].item).toBe(byId("p15"));
    expect(suggestionChoices({ role: "care", tier: 1, hour: 8, dow: 1 })[3].item).toBe(byId("p5"));
  });
});

// 2026-09-19 사용자: "오늘은 주말인데 「4교시 후 목·어깨 긴장 이완」이라는 제목이 있어 — 일·시간에 맞게".
describe("contextualItem — 요일·시각에 맞는 제목", () => {
  const teacher = (hour: number, dow: number) => resolveSuggestion({ role: "teacher", tier: 0, hour, dow }, null);
  it("주말 낮엔 학교 시간 표현이 시간대 말로 바뀐다(수업 전→아침 · 4교시 후→한낮 · 퇴근 전→저녁)", () => {
    expect(contextualItem(teacher(9, 6).item, { isWeekend: true, hour: 9 }).title).toBe("아침 목소리·후두 이완 호흡");
    expect(contextualItem(teacher(13, 0).item, { isWeekend: true, hour: 13 }).title).toBe("한낮 목·어깨 긴장 이완");
    expect(contextualItem(teacher(17, 6).item, { isWeekend: true, hour: 17 }).title).toBe("저녁 어깨·목 풀기");
  });
  it("행정·급식 직군의 근무 표현(문서작업 중간·서 있는 사이)도 주말엔 뗀다", () => {
    const admin = resolveSuggestion({ role: "admin", tier: 0, hour: 9, dow: 6 }, null).item;
    expect(contextualItem(admin, { isWeekend: true, hour: 9 }).title).toBe("30초 눈 운동");
    const care = resolveSuggestion({ role: "care", tier: 0, hour: 13, dow: 0 }, null).item;
    expect(contextualItem(care, { isWeekend: true, hour: 13 }).title).toBe("종아리 풀기");
  });
  it("평일 낮은 그대로", () => {
    expect(contextualItem(teacher(13, 3).item, { isWeekend: false, hour: 13 }).title).toBe("4교시 후 목·어깨 긴장 이완");
  });
  it("밤(22~5시)엔 요일·직군과 무관하게 「잠들기 전 이완 호흡」(영상 있음)", () => {
    for (const [hour, dow] of [[23, 3], [2, 6], [22, 1]] as const) {
      const it2 = contextualItem(resolveSuggestion({ role: "admin", tier: 0, hour, dow }, null).item, { isWeekend: dow === 6, hour });
      expect(it2.title).toBe("잠들기 전 이완 호흡");
      expect(it2.video).toBeTruthy();
    }
    expect(contextualItem(teacher(5, 3).item, { isWeekend: false, hour: 5 }).title).toBe("수업 전 목소리·후두 이완 호흡");
  });
  it("suggestionChoices 의 첫 항목도 같은 규칙을 탄다(주말 정오 → 한낮 · 밤 → 잠들기 전)", () => {
    expect(suggestionChoices({ role: "teacher", tier: 0, hour: 13, dow: 6 }, null)[0].item.title).toBe("한낮 목·어깨 긴장 이완");
    expect(suggestionChoices({ role: "teacher", tier: 0, hour: 23, dow: 2 }, null)[0].item.title).toBe("잠들기 전 이완 호흡");
    expect(suggestionChoices({ role: "teacher", tier: 0, hour: 13, dow: 2 }, null)[0].item.title).toBe("4교시 후 목·어깨 긴장 이완");
  });
});
