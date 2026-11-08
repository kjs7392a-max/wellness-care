import { describe, expect, it } from "vitest";
import { changeScene, EMPTY_RAIN_CARD, finishRainCard, rainChatDraft, sceneReady } from "./rain-card";

describe("빗속의 사람 — 사용자 의미를 보존하는 카드", () => {
  it("두 장면을 고르기 전에는 결과로 진행하지 않는다", () => {
    expect(sceneReady(EMPTY_RAIN_CARD)).toBe(false);
    expect(finishRainCard(EMPTY_RAIN_CARD).finished).toBe(false);
    const a = changeScene(EMPTY_RAIN_CARD, "rain", 3);
    expect(finishRainCard(a).finished).toBe(false);
    expect(finishRainCard(changeScene(a,"place",1)).finished).toBe(true);
  });
  it("장면 변경 시 이전 장면에 대한 설명과 완료 상태를 초기화한다", () => {
    const a = {rain:3 as const,place:1 as const,note:"비가 좋아서",finished:true};
    expect(changeScene(a,"rain",0)).toEqual({...a,rain:0,note:"",finished:false});
    expect(a.note).toBe("비가 좋아서");
  });
  it("건너뛰기는 입력 중인 말을 결과나 대화에 남기지 않는다", () => {
    const a = finishRainCard({rain:3,place:1,note:"보내고 싶지 않은 말",finished:false},true);
    expect(a.note).toBe("");
    expect(rainChatDraft(a)).not.toContain("보내고 싶지");
  });
  it("폭우와 비 내리는 길에도 심리 해석을 더하지 않고 사용자의 의미만 전달한다", () => {
    const a = finishRainCard({rain:3,place:1,note:" 비 맞는 걸 좋아해서 즐거워요 ",finished:false});
    const draft = rainChatDraft(a);
    expect(draft).toContain("비 맞는 걸 좋아해서 즐거워요");
    expect(draft).not.toMatch(/우울|고립|무기력|위험|회피|스트레스/);
    expect(a).not.toHaveProperty("score");
  });
});
