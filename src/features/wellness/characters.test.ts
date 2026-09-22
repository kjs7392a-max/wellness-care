import { describe, expect, it } from "vitest";
import { CHARACTERS, CHARACTER_DISPLAY_NAME, INTRO, characterOf, charactersInDisplayOrder, DEFAULT_CHARACTER, isCharacterId, systemPromptFor } from "./characters";
import { SYSTEM_CORE, SYSTEM_EXAMPLES } from "./risk";

describe("CHARACTERS", () => {
  // 2026-09-13: 사용자가 그림을 주며 한 명 추가(4 → 5). 인원·성별 비율은 사양이 아니므로 숫자를 못박지 않는다.
  it("id 가 겹치지 않고, 아바타 파일 경로가 id 와 짝이 맞는다", () => {
    expect(CHARACTERS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(CHARACTERS.length);
    for (const c of CHARACTERS) {
      expect(c.avatar, c.id).toBe(`/wellness/images/char-${c.id}.png`);
      expect(c.color, c.id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  // ★ 고르는 화면은 그림만 보여준다(역할 고르기를 시키지 않는다 — 2026-09-13 사용자).
  //   role 은 이미지가 깨졌을 때의 첫 글자로만 쓰이므로 비어 있으면 안 된다.
  it("역할 이름은 화면에 안 나오지만, 이미지가 깨졌을 때 그릴 첫 글자는 있어야 한다", () => {
    for (const c of CHARACTERS) expect(c.role.trim().length, c.id).toBeGreaterThan(0);
  });
  it("역할에 「선생님」이 붙지 않고, 개인 이름이 없다 — 표시 이름은 「오늘, 어떤 하루였나요?」 하나(2026-09-22 사용자 지시로 개명)", () => {
    expect(CHARACTER_DISPLAY_NAME).toBe("오늘, 어떤 하루였나요?");
    for (const c of CHARACTERS) {
      expect(c.role).not.toContain("선생님");
      expect("name" in c).toBe(false);
      for (const old of ["윤서현", "강미경", "박준혁", "한도윤", "서현", "미경", "준혁", "도윤"]) {
        expect(c.intro, c.id).not.toContain(old);
        expect(c.persona, c.id).not.toContain(old);
      }
    }
  });
  it("인사말은 전부 같은 한 문장(INTRO), 역할 이름(옆반·수석교사·동기·상담교사·상담사)이 없고, 인물 설정이 직함을 밝히지 말라고 명시한다(사용자 지시)", () => {
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
    expect(new Set(ps).size).toBe(CHARACTERS.length);
  });
});

describe("SYSTEM_EXAMPLES — 좋은 답 예시", () => {
  it("선생님/답 쌍 10개, 임상 용어·이모지 없음, 질문으로 끝나지 않는 답도 있다", () => {
    const body = SYSTEM_EXAMPLES.split("## 좋은 답")[1] ?? "";
    const answers = SYSTEM_EXAMPLES.split("\n").filter((l) => l.startsWith("답: "));
    expect(answers).toHaveLength(10);
    for (const w of ["우울증", "진단", "심리검사", "치료", "스트레스 지수", "인지 재구성", "반영"]) expect(body, w).not.toContain(w);
    expect(/\p{Extended_Pictographic}/u.test(SYSTEM_EXAMPLES)).toBe(false);
    expect(answers.some((l) => !l.trim().endsWith("?"))).toBe(true);
  });
});

describe("charactersInDisplayOrder — 윗줄 여성 · 아랫줄 남성, 각 줄 나이순 (2026-09-13 사용자 지시)", () => {
  it("여성이 모두 남성보다 앞에 온다", () => {
    const order = charactersInDisplayOrder();
    const lastFemale = order.map((c) => c.gender).lastIndexOf("female");
    const firstMale = order.map((c) => c.gender).indexOf("male");
    expect(firstMale).toBeGreaterThan(lastFemale);
  });

  it("같은 성별 안에서는 나이가 적은 쪽이 앞", () => {
    for (const g of ["female", "male"] as const) {
      const ages = charactersInDisplayOrder().filter((c) => c.gender === g).map((c) => c.age);
      expect(ages).toEqual([...ages].sort((a, b) => a - b));
    }
  });

  // 화면이 3열로 그릴 때 「윗줄 = 여성」이 성립하려면 여성이 정확히 3명이어야 한다.
  // 인원 구성이 바뀌면 줄이 어긋나므로 여기서 먼저 빨개진다.
  it("3열 기준 첫 줄이 전부 여성이다", () => {
    const order = charactersInDisplayOrder();
    expect(order.length).toBe(6);
    expect(order.slice(0, 3).every((c) => c.gender === "female")).toBe(true);
    expect(order.slice(3).every((c) => c.gender === "male")).toBe(true);
  });

  it("나이는 페르소나에 적힌 나이대와 어긋나지 않는다", () => {
    for (const c of charactersInDisplayOrder()) {
      const decade = Math.floor(c.age / 10) * 10;
      expect(c.persona, `${c.id}(${c.age}세)`).toContain(`${decade}대`);
    }
  });
});

// 2026-09-19 — AI Hub 「공감형 대화」(NIA) 직장 동료 세션 36,290 공감 발화의 분포에서 도출한 규칙.
// 기쁨 = 격려 46%·동조 44%·위로 5%·조언 6% / 부정 감정 = 동조 27~34% 1위 · 위로 · 조언 22~26% · 격려.
describe("SYSTEM_CORE — 공감의 배합(공감형 대화 분포 기반)", () => {
  const lines = SYSTEM_CORE.split("\n");
  it("좋은 일에는 위로·조언을 붙이지 말라는 규칙이 있다", () => {
    expect(lines.some((l) => /좋은 일|기쁜/.test(l) && /위로/.test(l) && /조언|제안/.test(l) && /(않|말|금지)/.test(l))).toBe(true);
  });
  it("무거운 말에는 동조 → 위로 → 제안 순서와 '네 번에 한 번' 상한이 있다", () => {
    expect(lines.some((l) => /그럴 만하다|그럴 만/.test(l) && /위로/.test(l) && /네 번에 한 번|네 번 중 한 번/.test(l))).toBe(true);
  });
  it("당황에는 같이 놀라 주기부터라는 규칙이 있다", () => {
    expect(lines.some((l) => /당황/.test(l) && /놀라/.test(l))).toBe(true);
  });
  it("프롬프트 본문엔 데이터셋 이름·작문 호칭이 없다(출처는 코드 주석·README 에만)", () => {
    expect(SYSTEM_CORE).not.toMatch(/AI Hub|공감형 대화|NIA/);
    expect(SYSTEM_EXAMPLES).not.toMatch(/AI Hub|공감형 대화|NIA|공감화자|감정화자/);
  });
});

describe("SYSTEM_EXAMPLES — 새 예시 3쌍(좋은 일·당황·불안)", () => {
  const pairs = (() => {
    const ls = SYSTEM_EXAMPLES.split("\n");
    const out: { q: string; a: string }[] = [];
    for (let i = 0; i < ls.length - 1; i++) if (ls[i].startsWith("선생님: ") && ls[i + 1].startsWith("답: ")) out.push({ q: ls[i].slice(5), a: ls[i + 1].slice(3) });
    return out;
  })();
  it("좋은 일 예시가 둘 이상이고 그 답에는 위로 어휘가 없다", () => {
    const joy = pairs.filter((p) => /(맛있|칭찬|됐어요|합격|고맙다고|좋아졌|잘 됐)/.test(p.q));
    expect(joy.length).toBeGreaterThanOrEqual(2);
    for (const p of joy) expect(p.a, p.q).not.toMatch(/고생|애쓰|버티|힘드|위로/);
  });
  it("당황 예시와 불안 예시가 각 하나 이상 있다", () => {
    expect(pairs.some((p) => /(당황|실수|잘못 보냈|헷갈)/.test(p.q))).toBe(true);
    expect(pairs.some((p) => /(불안|걱정|잠이 안|떨려)/.test(p.q))).toBe(true);
  });
});
