import { describe, expect, it } from "vitest";
import { directing, HEAVY_TONES, pickWeight, ranked, tally, TONES } from "./directing";
import { PROBES } from "./data";

describe("마음카드 데이터", () => {
  it("그림 6장, 장마다 4지선다, 선택지마다 결이 있고 결 6종 전부 어딘가에 쓰인다", () => {
    expect(PROBES).toHaveLength(6);
    const used = new Set<string>();
    for (const p of PROBES) {
      expect(p.options).toHaveLength(4);
      for (const o of p.options) { expect(TONES).toContain(o.tone); used.add(o.tone); }
    }
    expect(used.size).toBe(6);
  });
});

describe("tally / ranked / pickWeight", () => {
  it("집계와 순위", () => {
    const t = tally(["무게", "무게", "안정", "격동", "무게", "안정"]);
    expect(t.무게).toBe(3);
    expect(ranked(t)).toEqual(["무게", "안정", "격동"]);
  });
  it("무거운 결 3장 이상 heavy, 0장 light, 그 사이 neutral", () => {
    expect(pickWeight(["무게", "정지", "격동", "안정", "활력", "연결"])).toBe("heavy");
    expect(pickWeight(["안정", "활력", "연결", "안정", "활력", "연결"])).toBe("light");
    expect(pickWeight(["무게", "안정", "활력", "연결", "안정", "활력"])).toBe("neutral");
    expect(HEAVY_TONES).toEqual(["무게", "정지", "격동"]);
  });
});

describe("directing", () => {
  it("첫 문장은 가장 많은 결, 둘째는 두 번째 결, 마무리는 제안 — 숫자·진단 없음", () => {
    const d = directing(["무게", "무게", "안정", "격동", "무게", "안정"], 4, 2);
    expect(d.weight).toBe("heavy");
    expect(d.top).toEqual(["무게", "안정"]);
    expect(d.text).toContain("쌓이고 눌린");
    expect(d.text).toContain("중심은 흔들리지");
    expect(d.text).toContain("퇴근 전 어깨·목 풀기");
    expect(d.text).not.toMatch(/\d점|등급|우울증|진단/);
  });
  it("고르게 갈리면 섞임 문장", () => {
    const d = directing(["활력", "안정", "연결", "무게", "정지", "격동"], 3, 1);
    expect(d.text).toContain("고르게 갈렸어요");
  });
  it("몸이 낮고 결이 무거우면 쉬라는 제안, 가벼우면 좋은 흐름", () => {
    expect(directing(["무게", "정지", "격동", "무게", "정지", "격동"], 1, 2).text).toContain("쉬어가야");
    expect(directing(["활력", "안정", "활력", "안정", "연결", "안정"], 4, 0).text).toContain("좋은 흐름");
  });
  it("아직 아무것도 안 골랐으면 빈 글", () => {
    expect(directing([], 3, 1).text).toBe("");
  });
});
