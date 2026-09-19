import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 소스 가드 — jsdom 이 없어 화면은 이 파일이 유일한 방어선. 2026-09-19 마음온도 이식 3건.
 * 주석은 걷어내고 코드만 본다(주석에서 이름을 불러도 통과하지 않게).
 */
const src = readFileSync(join(process.cwd(), "src/features/wellness/WellnessApp.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("WellnessApp — 유형 직접 선택", () => {
  it("케어&힐링 카드에 「내 유형 알아요」·「모르겠어요」 두 갈래가 있고 16개 격자는 PERSONA_CODES 로 그린다", () => {
    expect(src).toMatch(/내 유형 알아요/);
    expect(src).toMatch(/모르겠어요/);
    expect(src).toMatch(/PERSONA_CODES\.map\(/);
    expect(src).toMatch(/pickedPersona\(/);
  });
  it("결과 화면은 기울기(lean)가 있을 때만 막대를 그리고, 「유형 바꾸기」가 있다", () => {
    expect(src).toMatch(/done\.lean\s*(&&|\?)/);
    expect(src).toMatch(/유형 바꾸기/);
    expect(src).not.toMatch(/"테스트로"|"다시 하기"/); // 결과 화면 끝 버튼은 「유형 바꾸기 · 닫기」 둘만(사용자 지시 2026-09-19)
  });
});

describe("WellnessApp — 오늘 해볼 것 · 디렉팅 한 줄 · 도서 링크", () => {
  it("데일리 힐링에 「오늘 해볼 것」 카드가 유형의 todo 를 그린다", () => {
    expect(src).toMatch(/오늘 해볼 것/);
    expect(src).toMatch(/\.todo\.map\(/);
  });
  it("마음카드 디렉팅 뒤에 personaDirecting 한 줄이 붙는다(유형이 있을 때만)", () => {
    expect(src).toMatch(/personaDirecting\(/);
  });
  it("추천 도서는 bookSearchUrl 링크로 새 창", () => {
    expect(src).toMatch(/bookSearchUrl\(/);
    expect(src).toMatch(/target="_blank"/);
  });
});

describe("홈 주간 흐름 박스 — 버튼 둘(2026-09-19 사용자 지시)", () => {
  it("「월간 기록 보기 ›」와 「케어&힐링 가기 ›」가 한 줄에 반씩(flex:1) 있고, 케어&힐링은 daily 탭으로 간다", () => {
    const i = src.indexOf("월간 기록 보기 ›");
    const j = src.indexOf("케어&힐링 가기 ›");
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    const block = src.slice(src.lastIndexOf("renderWeekFlow(", i), j + 40);
    expect(block.match(/flex:1/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(block).toMatch(/tab: "daily"/);
  });
});
