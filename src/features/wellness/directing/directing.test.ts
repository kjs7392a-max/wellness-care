import { describe, expect, it } from "vitest";
import { AGE_BANDS, ageOfBand, parseProfile, serializeProfile } from "./profile";
import { OUTFIT_QUESTIONS, SCENES, ageDecade, outfitCard, outfitCards, pickOutfit } from "./outfit";
import { sentenceInputFromSam, sentencesFor } from "./sentences";
import { WALK_COURSES, difficultyMark, walkMapUrl } from "./walk";
import { EMPTY_SAM } from "../sam";

// 2026-09-21 마음온도 「피드백」 이식 — 코디·문장·산책·프로필.
describe("profile — 성별·나이대 저장값", () => {
  it("직렬화 → 파싱 왕복 · 깨진 값은 null", () => {
    const p = { gender: "male" as const, ageBand: "40대" as const };
    expect(parseProfile(serializeProfile(p))).toEqual(p);
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile("{bad")).toBeNull();
    expect(parseProfile(JSON.stringify({ gender: "x", ageBand: "40대" }))).toBeNull();
    expect(parseProfile(JSON.stringify({ gender: "female", ageBand: "70대" }))).toBeNull();
  });
  it("나이대 대표 나이는 그 대의 가운데이고 원본 wp 로 되돌리면 같은 대가 나온다", () => {
    for (const b of AGE_BANDS) expect(ageDecade(ageOfBand(b))).toBe(b);
  });
});

describe("outfit — 컨디션 퀵 체크(2026-10-20 사용자: 메이크업처럼 컨디션을 고르게)", () => {
  const input = { temperature: 22, weatherCode: "Clear" as const, gender: "female" as const, ageBand: "30대" as const, mbti: "ENFP" };
  it("질문 셋 = 몸 컨디션·기분·일정 · 일정 칩은 네 장면과 같다", () => {
    expect(OUTFIT_QUESTIONS.map((q) => q.key)).toEqual(["condition", "mood", "scene"]);
    expect(OUTFIT_QUESTIONS[2].options.map((o) => o.id)).toEqual([...SCENES]);
  });
  it("셋 다 골라야 결과 · 고른 일정의 카드 한 장 · 옷 규칙은 원본 그대로", () => {
    expect(pickOutfit(input, {})).toBeNull();
    expect(pickOutfit(input, { condition: "normal", mood: "calm" })).toBeNull();
    expect(pickOutfit(input, { condition: "normal", mood: "calm", scene: "nope" })).toBeNull();
    const p = pickOutfit(input, { condition: "normal", mood: "calm", scene: "date" })!;
    expect(p.card).toEqual(outfitCard("date", input));
    expect(p.shoesChanged).toBe(false);
  });
  it("피곤한 날엔 힐·구두를 편한 신발로 바꾼다 · 원래 편한 신발은 그대로", () => {
    const tiredDate = pickOutfit(input, { condition: "tired", mood: "calm", scene: "date" })!;
    expect(outfitCard("date", input).shoes.name).toBe("힐");
    expect(tiredDate.card.shoes.name).not.toBe("힐");
    expect(tiredDate.shoesChanged).toBe(true);
    const male = { ...input, gender: "male" as const };
    expect(pickOutfit(male, { condition: "tired", mood: "calm", scene: "work" })!.card.shoes.name).not.toBe("옥스퍼드 슈즈");
    const casual = pickOutfit(input, { condition: "tired", mood: "calm", scene: "casual" })!;
    expect(casual.card.shoes).toEqual(outfitCard("casual", input).shoes);
    expect(casual.shoesChanged).toBe(false);
  });
  it("컨디션·기분마다 조언이 다르다", () => {
    const tips = (k: "condition" | "mood", ids: string[]) => new Set(ids.map((id) => pickOutfit(input, { condition: "normal", mood: "calm", scene: "work", [k]: id })![k === "condition" ? "conditionTip" : "moodTip"]));
    expect(tips("condition", ["tired", "normal", "fresh"]).size).toBe(3);
    expect(tips("mood", ["calm", "bright", "confident"]).size).toBe(3);
  });
});

describe("outfit — 원본 규칙", () => {
  const base = { weatherCode: "Clear" as const, gender: "female" as const, ageBand: "30대" as const, mbti: "ENFP" };
  it("네 장면 · 장면 이름표는 원본 그대로", () => {
    const cards = outfitCards({ ...base, temperature: 22 });
    expect(cards.map((c) => c.scene)).toEqual([...SCENES]);
    expect(cards.map((c) => c.timeLabel)).toEqual(["출근은 기분좋게", "여유있는 외출", "행복한 데이트", "오랜만의 모임"]);
  });
  it("여성 출근 12°C = 블레이저·슬랙스·로퍼 / 남성 = 비즈니스 재킷·치노 팬츠·옥스퍼드 슈즈 · 22°C 여성 = 블라우스·여름 팬츠(원본 아우터 경계 15°C · 하의 20°C)", () => {
    const f = outfitCard("work", { ...base, temperature: 12 });
    expect([f.outer.name, f.pants.name, f.shoes.name]).toEqual(["블레이저", "슬랙스", "로퍼"]);
    const m = outfitCard("work", { ...base, gender: "male", temperature: 12 });
    expect([m.outer.name, m.pants.name, m.shoes.name]).toEqual(["비즈니스 재킷", "치노 팬츠", "옥스퍼드 슈즈"]);
    const w = outfitCard("work", { ...base, temperature: 22 });
    expect([w.outer.name, w.pants.name]).toEqual(["블라우스", "여름 팬츠"]);
  });
  it("기온 경계: 4°C 출근 여성 = 울 코트·울 팬츠 · 30°C 데이트 여성 = 우아한 블라우스·스커트·힐", () => {
    const cold = outfitCard("work", { ...base, temperature: 4 });
    expect([cold.outer.name, cold.pants.name]).toEqual(["울 코트", "울 팬츠"]);
    const hot = outfitCard("date", { ...base, temperature: 30 });
    expect([hot.outer.name, hot.pants.name, hot.shoes.name]).toEqual(["우아한 블라우스", "스커트", "힐"]);
  });
  it("설명 앞머리는 날씨 말(비 오는 날 · 완벽한 날씨) · 스타일 분석은 나이대 스타일 · 검색어는 「N대 MBTI 추천 코디」", () => {
    expect(outfitCard("casual", { ...base, temperature: 22, weatherCode: "Rain" }).description).toMatch(/^비 오는 날 /);
    expect(outfitCard("casual", { ...base, temperature: 22 }).description).toMatch(/^완벽한 날씨 /);
    expect(outfitCard("work", { ...base, temperature: 22 }).styleAnalysis).toContain("smart casual");
    expect(outfitCard("work", { ...base, ageBand: "50대", temperature: 22 }).styleAnalysis).toContain("classic elegant");
    expect(outfitCard("work", { ...base, temperature: 22 }).naverSearchQuery).toBe("30대 ENFP 추천 코디");
    expect(outfitCard("work", { ...base, temperature: 22, mbti: "" }).naverSearchQuery).toBe("30대 추천 코디"); // 유형 전에도 열린다(2026-09-22)
    // 원본 rN 의 나이대 경계는 25~34 → 30대 · 35~44 → 40대(wp 와 다르다) — 그대로 둔다(화면 검색어는 wp 쪽 naverSearchQuery 를 쓴다).
    expect(outfitCard("work", { ...base, temperature: 22 }).blogSearchKeyword).toBe("여자 40대 봄 출근룩 코디");
    expect(outfitCard("work", { ...base, ageBand: "20대", temperature: 22 }).blogSearchKeyword).toBe("여자 30대 봄 출근룩 코디");
  });
  it("모든 장면·성별·기온대에서 아우터·하의·신발 설명이 비어 있지 않다", () => {
    for (const g of ["female", "male"] as const) for (const t of [0, 7, 12, 18, 25, 32]) for (const c of outfitCards({ ...base, gender: g, temperature: t })) {
      for (const it of [c.outer, c.pants, c.shoes]) { expect(it.name.length).toBeGreaterThan(0); expect(it.description.length).toBeGreaterThan(0); }
    }
  });
});

describe("sentences — 원본 x2 + 마음카드 입력", () => {
  it("상태별 세 문장 · 원본 첫 문장 그대로", () => {
    expect(sentencesFor({ state: "stressed", sleepHours: 7, steps: 5000, mood: 6, score: 60 })[0]).toMatch(/^"오늘 하루, 당신의 마음은 얼마나 애썼나요\?/);
    expect(sentencesFor({ state: "calm", sleepHours: 7, steps: 5000, mood: 6, score: 60 })[0]).toMatch(/^"나를 아끼는 일은/);
    expect(sentencesFor({ state: "happy", sleepHours: 7, steps: 5000, mood: 6, score: 60 })).toHaveLength(3);
  });
  it("항상 3개 이하 · 잠 부족 조건은 세 개가 이미 찼으면 안 붙는다(원본 규칙)", () => {
    const r = sentencesFor({ state: "calm", sleepHours: 3, steps: 5000, mood: 6, score: 60 });
    expect(r).toHaveLength(3);
    expect(r.join("")).not.toContain("잠은 마음의 빨래");
  });
  it("마음카드 없음 = calm · 기분 1~2 = stressed · 3 = calm · 4~5 = happy · 잠 척도 → 시간", () => {
    expect(sentenceInputFromSam(null).state).toBe("calm");
    expect(sentenceInputFromSam(EMPTY_SAM).state).toBe("calm");
    expect(sentenceInputFromSam({ ...EMPTY_SAM, valence: 2 }).state).toBe("stressed");
    expect(sentenceInputFromSam({ ...EMPTY_SAM, valence: 3 }).state).toBe("calm");
    expect(sentenceInputFromSam({ ...EMPTY_SAM, valence: 5 }).state).toBe("happy");
    expect(sentenceInputFromSam({ ...EMPTY_SAM, valence: 2, sleep: 1 })).toMatchObject({ mood: 4, sleepHours: 3 });
  });
});

describe("walk — 통합 코스 1 · 지도 링크", () => {
  it("코스 1개로 통합 · 링크는 좌표 유무로", () => {
    expect(WALK_COURSES.map((c) => c.name)).toEqual(["내 주변 산책 코스"]);
    expect(WALK_COURSES.map((c) => difficultyMark(c.difficulty))).toEqual(["🟢"]);
    expect(walkMapUrl(null, null)).toBe("https://www.google.com/maps/search/산책로+공원+둘레길");
    expect(walkMapUrl(37.5, 127.0)).toBe("https://www.google.com/maps/search/산책로+공원+둘레길/@37.5,127,14z");
  });
});
