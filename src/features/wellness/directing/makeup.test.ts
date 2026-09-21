import { describe, expect, it } from "vitest";
import { FEMALE_LOOKS, FEMALE_NONE, MALE_LOOKS, MALE_NONE } from "./makeup-data";
import { MAKEUP_QUESTIONS, pickMakeup, weatherAnalysis } from "./makeup";

// 2026-09-21 마음온도 「오늘의 메이크업」 이식 — 표·규칙은 원본 그대로.
describe("makeup-data — 원본 표 크기", () => {
  it("여성 27 · 남성 36 · 고민 없음 여성 9 · 남성 12", () => {
    expect(FEMALE_LOOKS).toHaveLength(27);
    expect(MALE_LOOKS).toHaveLength(36);
    expect(Object.keys(FEMALE_NONE)).toHaveLength(9);
    expect(Object.keys(MALE_NONE)).toHaveLength(12);
  });
  it("모든 줄에 제목·이모지·단계 1개 이상·팁이 있다", () => {
    for (const l of [...FEMALE_LOOKS, ...MALE_LOOKS]) {
      expect(l.title.length).toBeGreaterThan(0);
      expect(l.emoji.length).toBeGreaterThan(0);
      expect(l.steps.length).toBeGreaterThan(0);
      expect(l.tip.length).toBeGreaterThan(0);
    }
  });
});

describe("MAKEUP_QUESTIONS — 성별마다 4문항(질감·톤·고민·목적)", () => {
  it("여성: 질감 3 · 톤 3 · 고민 4(고민 없음 포함) · 목적 4", () => {
    const q = MAKEUP_QUESTIONS.female;
    expect(q.map((x) => x.options.length)).toEqual([3, 3, 4, 4]);
    expect(q[2].options.map((o) => o.id)).toContain("none");
  });
  it("남성: 질감 3 · 톤 3 · 고민 4 · 목적 4 · 문구는 원본(개기름·수염 자국)", () => {
    const q = MAKEUP_QUESTIONS.male;
    expect(q.map((x) => x.options.length)).toEqual([3, 3, 4, 4]);
    expect(q[0].options.map((o) => o.label)).toContain("번들거리는 개기름");
    expect(q[2].options.map((o) => o.label)).toContain("수염 자국");
  });
});

describe("pickMakeup — 원본 J2/V2/X2/Y2", () => {
  it("여성 dry·dullness·daily = 「촉촉 광채 데일리 메이크업」 + 톤 팁이 팁 뒤에 붙는다", () => {
    const r = pickMakeup("female", { texture: "dry", tone: "warm", concern: "dullness", occasion: "daily" });
    expect(r.title).toBe("촉촉 광채 데일리 메이크업");
    expect(r.tip).toMatch(/^건조한 피부는 메이크업 전 보습이 핵심이에요!/);
    expect(r.tip).toMatch(/💡 웜톤에는 코랄, 피치, 골드 계열이 잘 어울려요!/);
  });
  it("여성 고민 없음 = 질감×목적 표(X2) · 없는 조합은 normal-daily 로", () => {
    expect(pickMakeup("female", { texture: "oily", tone: "cool", concern: "none", occasion: "casual" }).title).toBe(FEMALE_NONE["oily-casual"].title);
    expect(pickMakeup("female", { texture: "dry", tone: "cool", concern: "none", occasion: "gathering" }).title).toBe(FEMALE_NONE["normal-daily"].title);
  });
  it("여성 목적 gathering 은 원본 표에 없어 casual 줄을 대신 준다(빈 결과를 안 낸다)", () => {
    const r = pickMakeup("female", { texture: "normal", tone: "neutral", concern: "redness", occasion: "gathering" });
    const casual = FEMALE_LOOKS.find((l) => l.skinTexture === "normal" && l.skinConcern === "redness" && l.occasion === "casual")!;
    expect(r.title).toBe(casual.title);
  });
  it("남성 rough·beard·business = 「신뢰감 있는 비즈니스 그루밍」 + 남성용 톤 팁", () => {
    const r = pickMakeup("male", { texture: "rough", tone: "cool", concern: "beard", occasion: "business" });
    expect(r.title).toBe("신뢰감 있는 비즈니스 그루밍");
    expect(r.tip).toMatch(/💡 쿨톤에는 핑크 베이스, 아이보리 계열이 화사한 피부톤을 만들어줘요!/);
  });
  it("남성 고민 없음 = Y2 · 없는 조합은 smooth-casual 로", () => {
    expect(pickMakeup("male", { texture: "oily", tone: "warm", concern: "none", occasion: "date" }).title).toBe(MALE_NONE["oily-date"].title);
  });
  it("여성 27조합 · 남성 36조합 전부 결과가 나온다(빈 결과 0)", () => {
    for (const tx of ["dry", "normal", "oily"]) for (const c of ["dullness", "redness", "puffiness"]) for (const o of ["daily", "special", "casual", "gathering"]) {
      expect(pickMakeup("female", { texture: tx, tone: "neutral", concern: c, occasion: o }).steps.length, `${tx}/${c}/${o}`).toBeGreaterThan(0);
    }
    for (const tx of ["rough", "smooth", "oily"]) for (const c of ["beard", "dull", "trouble"]) for (const o of ["business", "date", "casual", "gathering"]) {
      expect(pickMakeup("male", { texture: tx, tone: "neutral", concern: c, occasion: o }).steps.length, `${tx}/${c}/${o}`).toBeGreaterThan(0);
    }
  });
});

describe("weatherAnalysis — 원본 Sp(기온·습도)", () => {
  it("날씨가 없으면 빈 문장", () => {
    expect(weatherAnalysis(null, "dry", "dullness")).toBe("");
  });
  it("건조 + 습도 71 = 수분 레이어링 · 건조 + 4°C = 보습 · 그 밖 = 기본 문장", () => {
    expect(weatherAnalysis({ temperature: 20, humidity: 71 }, "dry", "dullness")).toMatch(/^현재 습도가 71%로 높아요/);
    expect(weatherAnalysis({ temperature: 4, humidity: 40 }, "rough", "beard")).toMatch(/^현재 4°C로 추운 날씨예요/);
    expect(weatherAnalysis({ temperature: 20, humidity: 40 }, "normal", "dullness")).toBe("현재 기온 20°C, 습도 40%를 고려한 맞춤 솔루션입니다.");
  });
});
