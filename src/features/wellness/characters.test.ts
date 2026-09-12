import { describe, expect, it } from "vitest";
import { CHARACTERS, CHARACTER_DISPLAY_NAME, INTRO, characterOf, DEFAULT_CHARACTER, isCharacterId, systemPromptFor } from "./characters";
import { SYSTEM_CORE, SYSTEM_EXAMPLES } from "./risk";

describe("CHARACTERS", () => {
  it("4명, 남2·여2, id 중복 없음", () => {
    expect(CHARACTERS).toHaveLength(4);
    expect(CHARACTERS.filter((c) => c.gender === "female")).toHaveLength(2);
    expect(CHARACTERS.filter((c) => c.gender === "male")).toHaveLength(2);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(4);
  });
  it("역할에 「선생님」이 붙지 않고, 개인 이름이 없다 — 표시 이름은 「마음과 대화」 하나(사용자 지시)", () => {
    expect(CHARACTER_DISPLAY_NAME).toBe("마음과 대화");
    for (const c of CHARACTERS) {
      expect(c.role).not.toContain("선생님");
      expect("name" in c).toBe(false);
      for (const old of ["윤서현", "강미경", "박준혁", "한도윤", "서현", "미경", "준혁", "도윤"]) {
        expect(c.intro, c.id).not.toContain(old);
        expect(c.persona, c.id).not.toContain(old);
      }
    }
  });
  it("인사말은 4명 전부 같은 한 문장(INTRO), 역할 이름(옆반·수석교사·동기·상담교사·상담사)이 없고, 인물 설정이 직함을 밝히지 말라고 명시한다(사용자 지시)", () => {
    for (const c of CHARACTERS) {
      expect(c.intro, c.id).toBe(INTRO);
      for (const w of ["옆반", "수석교사", "동기", "상담교사", "상담사"]) expect(c.intro, c.id).not.toContain(w);
      expect(c.persona, c.id).toContain("직함도 밝히지 않는다");
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
      expect(p).toContain(SYSTEM_EXAMPLES);
      expect(p).toContain("가을");
      expect(p).not.toContain("소연");
    }
  });
  it("캐릭터마다 프롬프트가 다르다(페르소나가 실제로 반영된다)", () => {
    const ps = CHARACTERS.map((c) => systemPromptFor(c.id, 9));
    expect(new Set(ps).size).toBe(4);
  });
});

describe("SYSTEM_EXAMPLES — 좋은 답 예시", () => {
  it("선생님/답 쌍 7개, 임상 용어·이모지 없음, 질문으로 끝나지 않는 답도 있다", () => {
    const body = SYSTEM_EXAMPLES.split("## 좋은 답")[1] ?? "";
    const answers = SYSTEM_EXAMPLES.split("\n").filter((l) => l.startsWith("답: "));
    expect(answers).toHaveLength(7);
    for (const w of ["우울증", "진단", "심리검사", "치료", "스트레스 지수", "인지 재구성", "반영"]) expect(body, w).not.toContain(w);
    expect(/\p{Extended_Pictographic}/u.test(SYSTEM_EXAMPLES)).toBe(false);
    expect(answers.some((l) => !l.trim().endsWith("?"))).toBe(true);
  });
});
