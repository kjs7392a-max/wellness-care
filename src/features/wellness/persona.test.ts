import { describe, expect, it } from "vitest";
import { PERSONA_ITEMS, PERSONA_TYPES, personaResult, type PersonaAnswers, type PersonaAxis } from "./persona";

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
      for (const s of [t.name, t.traits, t.comfort, t.quote, t.directing, ...t.books]) expect(s, `${c}: ${s}`).not.toMatch(banned);
    }
    for (const it of PERSONA_ITEMS) expect(it.text).not.toMatch(/MBTI/);
  });
});
