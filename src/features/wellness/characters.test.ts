import { describe, expect, it } from "vitest";
import { CHARACTERS, characterOf, DEFAULT_CHARACTER, isCharacterId, systemPromptFor, withWaGwa } from "./characters";
import { SYSTEM_CORE } from "./risk";

describe("CHARACTERS", () => {
  it("4명, 남2·여2, id 중복 없음", () => {
    expect(CHARACTERS).toHaveLength(4);
    expect(CHARACTERS.filter((c) => c.gender === "female")).toHaveLength(2);
    expect(CHARACTERS.filter((c) => c.gender === "male")).toHaveLength(2);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(4);
  });
  it("역할·이름에 「선생님」이 붙지 않는다(사용자 지시)", () => {
    for (const c of CHARACTERS) {
      expect(c.role).not.toContain("선생님");
      expect(c.name).not.toContain("선생님");
    }
  });
  it("인물 설정에 임상 용어가 없다(화면·말투에서 상담 용어 금지)", () => {
    for (const c of CHARACTERS) {
      for (const w of ["우울증", "진단", "심리검사", "치료", "스트레스 지수"]) expect(c.persona, c.id).not.toContain(w);
    }
  });
});

describe("characterOf / systemPromptFor", () => {
  it("모르는 값·빈 값은 기본 캐릭터(옆반 동료)", () => {
    expect(characterOf(undefined).id).toBe(DEFAULT_CHARACTER);
    expect(characterOf("hacker").id).toBe(DEFAULT_CHARACTER);
    expect(characterOf(42).id).toBe(DEFAULT_CHARACTER);
    expect(isCharacterId("senior")).toBe(true);
    expect(isCharacterId("소연")).toBe(false);
  });
  it("프롬프트 = 공통 규칙 + 인물 설정 + 계절, 옛 이름 '소연' 없음", () => {
    for (const c of CHARACTERS) {
      const p = systemPromptFor(c.id, 9);
      expect(p).toContain(SYSTEM_CORE);
      expect(p).toContain(c.persona);
      expect(p).toContain("가을");
      expect(p).not.toContain("소연");
    }
  });
  it("캐릭터마다 프롬프트가 다르다(페르소나가 실제로 반영된다)", () => {
    const ps = CHARACTERS.map((c) => systemPromptFor(c.id, 9));
    expect(new Set(ps).size).toBe(4);
  });
});

describe("withWaGwa", () => {
  it("받침 있으면 과, 없으면 와", () => {
    expect(withWaGwa("윤서현")).toBe("윤서현과");
    expect(withWaGwa("박준혁")).toBe("박준혁과");
    expect(withWaGwa("소연")).toBe("소연과");
    expect(withWaGwa("미나")).toBe("미나와");
  });
});
