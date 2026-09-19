import { describe, expect, it } from "vitest";
import { PERSONA_CODES, PERSONA_ITEMS, PERSONA_TYPES, bookSearchUrl, personaDirecting, personaResult, pickedPersona, slotClosing, type PersonaAnswers, type PersonaAxis } from "./persona";

// 2026-09-17 사용자 확정: 근거 있는 문항 — IPIP 50문항(공개 도메인)에서 정서안정성을 뺀 40문항.
//   네 축 대응 = McCrae & Costa(1989): 외향성→E/I · 개방성→N/S · 우호성→F/T · 성실성→J/P.
//   5점 척도(1~5) · 역채점 문항은 6-x · 축 합 10~50 · 31 이상이면 앞 글자(E·N·F·J).

const AXES: PersonaAxis[] = ["E", "N", "F", "J"];
const fill = (score: number, only?: (i: (typeof PERSONA_ITEMS)[number]) => boolean): PersonaAnswers => {
  const a: PersonaAnswers = {};
  PERSONA_ITEMS.forEach((it, i) => { if (!only || only(it)) a[i] = score; });
  return a;
};
/** 일관된 답 — 앞 글자 쪽(hi)이면 순채점 5·역채점 1, 반대면 순채점 1·역채점 5. 「전부 5」는 순·역이 상쇄돼 중립이 된다(외향성 축은 5:5). */
const consistent = (hi: boolean, only?: (i: (typeof PERSONA_ITEMS)[number]) => boolean): PersonaAnswers => {
  const a: PersonaAnswers = {};
  PERSONA_ITEMS.forEach((it, i) => { if (!only || only(it)) a[i] = (it.keyed === "+") === hi ? 5 : 1; });
  return a;
};

describe("PERSONA_ITEMS — 문항 구성(IPIP 40)", () => {
  it("40문항, 축마다 10문항, 축마다 순채점·역채점이 섞여 있다", () => {
    expect(PERSONA_ITEMS.length).toBe(40);
    for (const ax of AXES) {
      const its = PERSONA_ITEMS.filter((i) => i.axis === ax);
      expect(its.length, ax).toBe(10);
      expect(its.some((i) => i.keyed === "+"), ax).toBe(true);
      expect(its.some((i) => i.keyed === "-"), ax).toBe(true);
    }
  });
  it("문항 문구는 비어 있지 않고 서로 다르며 원문(IPIP 번호)을 가리킨다", () => {
    const t = PERSONA_ITEMS.map((i) => i.text.trim());
    expect(t.every((x) => x.length > 0)).toBe(true);
    expect(new Set(t).size).toBe(40);
    expect(new Set(PERSONA_ITEMS.map((i) => i.ipip)).size).toBe(40);
  });
});

describe("personaResult — 채점", () => {
  it("앞 글자 쪽으로 일관되게 답하면 ENFJ", () => {
    expect(personaResult(consistent(true))!.type).toBe("ENFJ");
  });
  it("뒷글자 쪽으로 일관되게 답하면 ISTP", () => {
    expect(personaResult(consistent(false))!.type).toBe("ISTP");
  });
  it("「전부 5」처럼 방향 없이 답하면 순·역이 상쇄돼 외향성 축은 정확히 중립(30) → I", () => {
    expect(personaResult(fill(5))!.lean.E).toBe(0);
  });
  it("전부 3(중간)이면 합이 정확히 30 → 뒷글자(ISTP) — 경계 규칙은 「31 이상이 앞 글자」", () => {
    expect(personaResult(fill(3))!.type).toBe("ISTP");
  });
  it("한 축만 올리면 그 글자만 바뀐다", () => {
    const base = fill(3);
    const up = { ...base, ...consistent(true, (i) => i.axis === "E") };
    expect(personaResult(up)!.type).toBe("ESTP");
  });
  it("역채점 문항에 5를 주면 그 축은 내려간다", () => {
    const base = fill(3);
    const rev = { ...base, ...fill(5, (i) => i.axis === "J" && i.keyed === "-") };
    expect(personaResult(rev)!.lean.J).toBeLessThan(0);
  });
  it("기울기는 -1~1 이고 축 합과 같은 방향", () => {
    const r = personaResult(consistent(true))!;
    for (const ax of AXES) expect(r.lean[ax]).toBe(1);
    const r2 = personaResult(consistent(false))!;
    for (const ax of AXES) expect(r2.lean[ax]).toBe(-1);
  });
  it("하나라도 안 답했으면 null", () => {
    const a = fill(3); delete a[7];
    expect(personaResult(a)).toBeNull();
  });
});

describe("PERSONA_TYPES — 16유형 원고", () => {
  const CODES = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"];
  it("16유형 전부, 이름·성향·위로·문장·도서 2권·디렉팅 한 줄이 채워져 있다", () => {
    for (const c of CODES) {
      const t = PERSONA_TYPES[c];
      expect(t, c).toBeDefined();
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.traits.length).toBeGreaterThan(40);
      expect(t.comfort.length).toBeGreaterThan(20);
      expect(t.quote.length).toBeGreaterThan(5);
      expect(t.books.length).toBe(2);
      expect(t.directing.length).toBeGreaterThan(5);
    }
    expect(new Set(CODES.map((c) => PERSONA_TYPES[c].name)).size).toBe(16);
  });
  // 사용자 확정 2026-09-17 「재미의 선」 — 기전·예측·처방·권위 문구 금지. 이름도 MBTI(등록상표)를 안 쓴다.
  it("원고 전체에 금지어가 없다", () => {
    const banned = /코르티솔|세로토닌|도파민|호르몬|뇌|증폭|취약|위험|우울|불안장애|진단|검사|전문가 관점|연구에 따르면|%|MBTI/;
    for (const c of CODES) {
      const t = PERSONA_TYPES[c];
      for (const s of [t.name, t.traits, t.comfort, t.quote, t.directing, ...t.books, ...t.todo.flatMap((x) => [x.title, x.why])]) expect(s, `${c}: ${s}`).not.toMatch(banned);
    for (const h of [8, 12, 15, 19, 23]) expect(slotClosing(h)).not.toMatch(banned);
    }
    for (const it of PERSONA_ITEMS) expect(it.text).not.toMatch(/MBTI/);
  });
});

// 2026-09-19 — 마음온도 사이트에서 골라 온 셋(사용자 확정): 유형 직접 선택 · 「오늘 해볼 것」 · 마음카드 밑 유형×시간대 한 줄 · 도서 링크.
describe("PERSONA_CODES · pickedPersona — 유형 직접 선택", () => {
  it("16개 코드가 전부 PERSONA_TYPES 에 있고 겹치지 않는다", () => {
    expect(PERSONA_CODES).toHaveLength(16);
    expect(new Set(PERSONA_CODES).size).toBe(16);
    for (const c of PERSONA_CODES) expect(PERSONA_TYPES[c], c).toBeTruthy();
  });
  it("직접 고른 유형은 기울기가 없다(lean null · source picked) — 막대를 그리지 않는 근거", () => {
    const d = pickedPersona("INFJ");
    expect(d.type).toBe("INFJ");
    expect(d.lean).toBeNull();
    expect(d.source).toBe("picked");
  });
  it("없는 코드는 거부한다", () => {
    expect(() => pickedPersona("ABCD")).toThrow();
  });
});

describe("PERSONA_TYPES.todo — 「오늘 해볼 것」 유형별 3가지", () => {
  it("16유형 전부 3가지 · 제목 서로 다름 · 왜 한 줄 채워짐", () => {
    for (const c of PERSONA_CODES) {
      const todo = PERSONA_TYPES[c].todo;
      expect(todo, c).toHaveLength(3);
      expect(new Set(todo.map((x) => x.title)).size, c).toBe(3);
      for (const x of todo) { expect(x.title.trim().length, c).toBeGreaterThan(0); expect(x.why.trim().length, c).toBeGreaterThan(0); }
    }
  });
  it("제안이지 지시가 아니다 — 「~하세요/~해야」로 끝나는 제목이 없다", () => {
    for (const c of PERSONA_CODES) for (const x of PERSONA_TYPES[c].todo) expect(x.title, `${c}: ${x.title}`).not.toMatch(/(하세요|해야|하십시오|해라)$/);
  });
});

describe("slotClosing · personaDirecting — 마음카드 밑 한 줄", () => {
  it("시간대 다섯 구간(아침·점심·오후·저녁·밤)이 서로 다른 마무리를 낸다", () => {
    const lines = [8, 12, 15, 19, 23].map(slotClosing);
    expect(new Set(lines).size).toBe(5);
    expect(slotClosing(5)).toBe(slotClosing(10));   // 같은 구간
    expect(slotClosing(22)).toBe(slotClosing(3));   // 밤은 22시~새벽
  });
  it("유형 디렉팅 + 시간대 마무리가 한 줄로 합쳐지고 유형 문장이 그대로 들어간다", () => {
    const line = personaDirecting("ISTJ", 8);
    expect(line).toContain(PERSONA_TYPES.ISTJ.directing);
    expect(line).toContain(slotClosing(8));
    expect(line).not.toMatch(/\n/);
  });
});

describe("bookSearchUrl — 네이버 책 검색 링크", () => {
  it("『』를 떼고 제목·저자를 검색어로 넣는다", () => {
    const u = bookSearchUrl("『스토너』 존 윌리엄스");
    expect(u.startsWith("https://search.naver.com/search.naver?where=book&query=")).toBe(true);
    expect(decodeURIComponent(u.split("query=")[1])).toBe("스토너 존 윌리엄스");
  });
});
