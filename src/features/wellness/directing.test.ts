import { describe, expect, it } from "vitest";
import { directing, dominantQuadrant, HEAVY_TONES, pickWeight, quadrantTally, ranked, tally, TONE_QUADRANT, TONES } from "./directing";
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
  it("결 6종이 원형 모델 사분면에 빠짐없이 놓이고, 무거운 결 = 불쾌 사분면", () => {
    for (const t of TONES) expect(["HP", "LP", "HN", "LN"]).toContain(TONE_QUADRANT[t]);
    for (const t of HEAVY_TONES) expect(["HN", "LN"]).toContain(TONE_QUADRANT[t]);
    for (const t of TONES.filter((x) => !HEAVY_TONES.includes(x))) expect(["HP", "LP"]).toContain(TONE_QUADRANT[t]);
  });
});

describe("tally / ranked / pickWeight / quadrant", () => {
  it("집계와 순위", () => {
    const t = tally(["무게", "무게", "안정", "격동", "무게", "안정"]);
    expect(t.무게).toBe(3);
    expect(ranked(t)).toEqual(["무게", "안정", "격동"]);
  });
  it("무거운 결 3장 이상 heavy, 0장 light, 그 사이 neutral", () => {
    expect(pickWeight(["무게", "정지", "격동", "안정", "활력", "연결"])).toBe("heavy");
    expect(pickWeight(["안정", "활력", "연결", "안정", "활력", "연결"])).toBe("light");
    expect(pickWeight(["무게", "안정", "활력", "연결", "안정", "활력"])).toBe("neutral");
  });
  it("우세 사분면: 불쾌가 절반 이상이면 불쾌 쪽(HN/LN 중 많은 쪽), 아니면 유쾌 쪽. 동률은 낮은 각성", () => {
    expect(quadrantTally(["격동", "격동", "무게", "활력", "안정", "연결"])).toEqual({ HP: 1, LP: 2, HN: 2, LN: 1 });
    expect(dominantQuadrant(["격동", "격동", "무게", "활력", "안정", "연결"])).toBe("HN");
    expect(dominantQuadrant(["무게", "정지", "격동", "활력", "활력", "활력"])).toBe("LN"); // 3:3 → 불쾌, HN1<LN2
    expect(dominantQuadrant(["활력", "활력", "안정", "무게", "연결", "활력"])).toBe("HP");
    expect(dominantQuadrant(["안정", "연결", "활력", "무게", "안정", "격동"])).toBe("LP");
    expect(dominantQuadrant([])).toBeNull();
  });
});

describe("directing — 사분면별 전략", () => {
  it("저각성·불쾌(무게 우세): 눌린 것 + 아주 작은 행동 하나. 숫자·진단 없음", () => {
    const d = directing(["무게", "무게", "안정", "격동", "무게", "안정"], 4, 2);
    expect(d.quadrant).toBe("LN");
    expect(d.weight).toBe("heavy");
    expect(d.top).toEqual(["무게", "안정"]);
    expect(d.text).toContain("쌓인 피로");
    expect(d.text).toContain("중심은 흔들리지"); // 둘째 결(안정)은 다른 사분면이라 짚어 준다
    expect(d.text).toContain("아주 작은 행동 하나");
    expect(d.text).not.toMatch(/\d점|등급|우울증|진단|각성 수준/);
  });
  it("고각성·불쾌(격동 우세): 식지 않은 감정 + 호흡으로 각성 낮추기", () => {
    const d = directing(["격동", "격동", "격동", "무게", "활력", "안정"], 4, 1);
    expect(d.quadrant).toBe("HN");
    expect(d.text).toContain("가라앉지 않은 감정");
    expect(d.text).toContain("숨 고르기");
  });
  it("몸이 지친 날엔 사분면과 무관하게 부담 낮은 제안", () => {
    expect(directing(["무게", "정지", "격동", "무게", "정지", "격동"], 1, 2).text).toContain("그걸로 오늘은 충분");
    expect(directing(["활력", "활력", "활력", "안정", "연결", "활력"], 1, 2).text).toContain("힘을 아껴");
  });
  it("유쾌 우세: 유지·기록", () => {
    const d = directing(["안정", "연결", "안정", "활력", "안정", "연결"], 4, 0);
    expect(d.quadrant).toBe("LP");
    expect(d.text).toContain("좋은 흐름");
    expect(d.text).toContain("기록해 두면");
  });
  it("문단 5개(마음·몸에서 나타남·어제 몸·제안·안심), 어제 몸이 없으면 그 문단이 말해 준다", () => {
    const d = directing(["무게", "무게", "안정", "격동", "무게", "안정"], 4, 2);
    const paras = d.text.split("\n\n");
    expect(paras).toHaveLength(5);
    expect(paras[1]).toContain("몸이 무겁고");
    expect(paras[2]).toContain("어제 몸 컨디션은 좋은 편");
    expect(paras[4]).toContain("여기까지 온 것 자체가");
    expect(directing(["활력", "활력", "활력", "안정", "연결", "활력"], null, 1).text).toContain("어제 몸 기록이 아직 없어서");
  });
  it("고르게 갈리면 섞임 문장, 아직 아무것도 안 골랐으면 빈 글", () => {
    expect(directing(["활력", "안정", "연결", "무게", "정지", "격동"], 3, 1).text).toContain("여러 갈래로 나뉘었어요");
    expect(directing([], 3, 1).text).toBe("");
  });
});
