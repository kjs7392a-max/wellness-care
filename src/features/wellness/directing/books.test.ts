import { describe, expect, it } from "vitest";
import { BOOK_CATEGORIES, bestBookAladinUrl, bestBookNaverUrl, bookCategory } from "./books";

describe("books — 분류 넷 · 분류마다 베스트셀러 1~5위", () => {
  it("에세이·시집·소설·자기개발서 순서", () => {
    expect(BOOK_CATEGORIES.map((c) => c.label)).toEqual(["에세이", "시집", "소설", "자기개발서"]);
  });
  it("분류마다 1~5위 다섯 권", () => {
    for (const c of BOOK_CATEGORIES) {
      expect(c.best.map((b) => b.rank), c.id).toEqual([1, 2, 3, 4, 5]);
      for (const b of c.best) expect(b.title && b.author, `${c.id} ${b.rank}`).toBeTruthy();
    }
  });
  it("모르는 분류는 첫 분류 · 링크는 제목+저자 검색", () => {
    expect(bookCategory("novel").label).toBe("소설");
    const b = bookCategory("novel").best[0];
    expect(bestBookNaverUrl(b)).toContain(encodeURIComponent("가호 무라카미 하루키"));
    expect(bestBookAladinUrl(b)).toContain("aladin.co.kr");
  });
});
