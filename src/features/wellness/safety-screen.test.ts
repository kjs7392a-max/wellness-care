import { describe, expect, it } from "vitest";
import { SAFETY_QUESTIONS, safetyTier, type SafetyAnswers } from "./safety-screen";

// 2026-09-16: 「예 개수」로 갈랐던 PAR-Q+ 판정을 **문항 성격**으로 바꿨다(사용자 확정).
//   APSS(호주 ESSA) 1단계 = 하나라도 예 → 전문가 상담 후 시작 / ACSM 2015 = 징후·의사 지시 → 의학적 확인 권고,
//   알려진 질환·무증상 → 가벼운 강도로 시작. 이 테스트는 그 규칙을 못박는다 — 개수는 어디에도 안 나온다.

const idx = (kind: "flag" | "caution") =>
  SAFETY_QUESTIONS.map((q, i) => (q.kind === kind ? i : -1)).filter((i) => i >= 0);

const answers = (yes: number[]): SafetyAnswers => {
  const a: SafetyAnswers = {};
  SAFETY_QUESTIONS.forEach((_, i) => { a[i] = yes.includes(i); });
  return a;
};

describe("SAFETY_QUESTIONS — 문항 구성", () => {
  it("문항마다 성격이 flag 또는 caution 이고 두 성격이 다 있다", () => {
    for (const q of SAFETY_QUESTIONS) expect(["flag", "caution"]).toContain(q.kind);
    expect(idx("flag").length).toBeGreaterThan(0);
    expect(idx("caution").length).toBeGreaterThan(0);
  });

  it("문항 문구는 비어 있지 않고 서로 다르다", () => {
    const texts = SAFETY_QUESTIONS.map((q) => q.text.trim());
    expect(texts.every((t) => t.length > 0)).toBe(true);
    expect(new Set(texts).size).toBe(texts.length);
  });

  // PAR-Q+ 는 약관상 못 쓴다(수정 금지·앱 사용 서면 승인·한국어판 없음 — 2026-09-16 실측). 이름을 부르면 안 된다.
  it("문항 문구에 PAR-Q 이름이 없다", () => {
    for (const q of SAFETY_QUESTIONS) expect(q.text).not.toMatch(/PAR-?Q/i);
  });
});

describe("safetyTier — 개수가 아니라 성격으로 가른다", () => {
  it("전부 「아니오」면 0(평소 강도)", () => {
    expect(safetyTier(answers([]))).toBe(0);
  });

  it("아직 하나도 안 답했으면 0", () => {
    expect(safetyTier({})).toBe(0);
  });

  it("징후(flag) 하나라도 「예」면 2(숨 고르기 + 상담)", () => {
    for (const i of idx("flag")) expect(safetyTier(answers([i])), `flag #${i}`).toBe(2);
  });

  it("조심(caution)만 「예」면 1(낮은 강도)", () => {
    for (const i of idx("caution")) expect(safetyTier(answers([i])), `caution #${i}`).toBe(1);
  });

  it("조심이 여럿이어도 합산해서 올라가지 않는다 — 여전히 1", () => {
    expect(idx("caution").length).toBeGreaterThan(1);
    expect(safetyTier(answers(idx("caution")))).toBe(1);
  });

  it("징후와 조심이 섞이면 징후가 이긴다 — 2", () => {
    expect(safetyTier(answers([idx("flag")[0], idx("caution")[0]]))).toBe(2);
  });
});

// 소스 가드 — 이 저장소엔 jsdom 이 없어 화면 문구는 이것이 유일한 방어선이다.
// PAR-Q+ 이름·「캐나다운동생리학회」가 화면 문자열로 되살아나면 약관 문제가 그대로 돌아온다(주석은 허용).
import { readFileSync } from "node:fs";
import { join } from "node:path";
describe("소스 가드 — 화면 문자열에 PAR-Q+ 표기가 없다", () => {
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const f of ["WellnessApp.tsx", "data.ts"]) {
    it(`${f} 의 코드(주석 제외)에 PAR-Q·캐나다운동생리학회 문자열이 없다`, () => {
      const code = stripComments(readFileSync(join(__dirname, f), "utf8"));
      expect(code).not.toMatch(/캐나다운동생리학회/);
      // 식별자 PARQ_* 는 허용(화면에 안 나온다) — 사람에게 보이는 표기 「PAR-Q」만 막는다.
      expect(code).not.toMatch(/PAR-Q/);
    });
  }
});
