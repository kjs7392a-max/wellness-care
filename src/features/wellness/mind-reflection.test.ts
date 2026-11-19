import { describe, expect, it } from "vitest";
import { completeMindCard, emptyMindCard, MIND_IMAGES, mindSolution, type DailyAnswer, type MindCardAnswer } from "./mind-card";
import { mindNarrative } from "./mind-reflection";
import { completeRainStory, emptyRainStory, rainStoryNarrative } from "./rain-story";

const done = (changes: Partial<MindCardAnswer> = {}) => completeMindCard({ ...emptyMindCard(() => 0.99999), images: MIND_IMAGES.map((_,i) => i < 4 ? 0 : null), mood: 4, stress: 4, energy: 2, ...changes }, new Date("2026-11-17T06:00:00Z"));

describe("한 글로 읽는 마음풀이", () => {
  it("미완료 답변에는 풀이를 만들지 않는다", () => {
    expect(mindNarrative(emptyMindCard())).toBe("");
    expect(mindNarrative({...done(),images:[null]})).toBe("");
    expect(rainStoryNarrative(emptyRainStory())).toBe("");
  });
  it("좋았던 기분과 부담, 남은 힘을 한 글에 함께 반영한다", () => {
    const reading = mindNarrative(done());
    expect(reading).toContain("좋았던 기분과 신경 쓸 일이 많았던 하루");
    expect(reading).toContain("남은 힘도 적은 편");
    expect(reading).toContain("마음쉼터");
  });
  it("상태를 건너뛴 경우 그림으로 마음을 추측하지 않는다", () => {
    const answer=done({mood:"skip",stress:"skip",energy:"skip"});
    expect(mindNarrative(answer)).toContain("마음을 추측하지 않고");
    expect(mindSolution(answer)?.destination).toBe("space");
  });
  it("그림에서 고른 표현만 되짚으며 활동 추천은 바꾸지 않는다", () => {
    const a=done(), b=done({images:MIND_IMAGES.map((_,i) => i < 4 ? 5 : null)});
    expect(mindNarrative(a)).toContain("숲길에서 ‘차분해지는 느낌’");
    expect(mindNarrative(b)).toContain("아직 잘 모르거나 다른 느낌");
    expect(mindSolution(a)).toEqual(mindSolution(b));
  });
  it("무작위 순서에서도 선택한 그림의 이름과 응답을 정확히 연결한다", () => {
    const order=[11,5,1,8];
    const a=done({imageOrder:order,images:MIND_IMAGES.map((_,i)=>order.includes(i)?0:null)});
    const text=mindNarrative(a);
    expect(text).toContain("불빛에서 ‘마음이 놓여요’");
    expect(text).toContain("갈림길에서 ‘새로운 길이 기대돼요’");
    expect(text).toContain("새에서 ‘가벼움’");
    expect(text).not.toContain("숲길에서");
  });
  it("선택한 영향 요인만 돌아보고 미선택 설명을 덧붙이지 않는다", () => {
    const reading=mindNarrative(done({causes:["업무","학부모와의 소통"]}));
    expect(reading).toContain("‘업무’");
    expect(reading).toContain("다음 업무 시간");
    expect(reading).toContain("학부모와의 소통");
    expect(reading).not.toContain("동료와의 관계");
    expect(mindNarrative(done())).not.toContain("따로 고르지");
  });
  it("산책 안전 제한을 풀이에서도 지킨다", () => {
    const a=done({mood:4,stress:1,energy:4});
    expect(mindNarrative(a,true)).toContain("산책을 제안");
    expect(mindNarrative(a,false)).not.toContain("산책을 제안");
  });
  it("모든 상태 조합을 소제목·목록·점수·질병 판정 없이 제공한다", () => {
    const values: DailyAnswer[]=[1,2,3,4,5,"skip"];
    for(const mood of values) for(const stress of values) for(const energy of values){
      const reading=mindNarrative(done({mood,stress,energy}));
      expect(reading.length).toBeGreaterThan(180);
      expect(reading).not.toMatch(/\n|\d+점|등급|위험군|우울증|당신은.*유형|무의식.*뜻|오늘의 마음을 함께 읽어보면|이 제안을 고른 이유/);
    }
  });
  it("빗속의 나는 별도의 그림 조합 해설을 사용하며 점수를 드러내지 않는다", () => {
    const a=completeRainStory({...emptyRainStory(),rain:"heavy",exposure:"soaked",protection:"none"},new Date());
    const text=rainStoryNarrative(a);
    expect(text).toContain("부담");expect(text).toContain("도움");
    expect(text).not.toMatch(/\d+점|등급|우울증/);
  });
});
