import { describe, it, expect } from "vitest";
import { riskLevel } from "./risk";

// 렉시콘 큐레이션.md 핵심 규칙 회귀 테스트.
// "죽겠다"는 원인이 앞에 오면 관용구(L0), "죽고 싶다"는 원인 없이 상태로 오면 위험(L2).
describe("riskLevel", () => {
  it("일상 과장('죽겠다/미치겠다')은 위험이 아니다 (L0)", () => {
    expect(riskLevel("아 더워 죽겠다")).toBe(0);
    expect(riskLevel("배고파 미치겠어")).toBe(0);
    expect(riskLevel("일이 많아서 죽겠네")).toBe(0);
    expect(riskLevel("웃겨서 죽는 줄 알았어요")).toBe(0);
    expect(riskLevel("회의가 죽을 맛이에요")).toBe(0);
  });

  it("원인어 + 어미가 앞에 오면 위험 표현도 관용구로 통과", () => {
    // "죽고 싶"이 있어도 앞에 감각 원인어 + '~서' 어미가 오면 L0.
    expect(riskLevel("더워서 죽고 싶을 만큼 힘든 날씨네요")).toBe(0);
  });

  it("원인 없이 상태로 오는 위험 표현은 L2", () => {
    expect(riskLevel("그냥 다 죽고 싶어요")).toBe(2);
    expect(riskLevel("요즘 사라지고 싶어")).toBe(2);
    expect(riskLevel("살기 싫다")).toBe(2);
    expect(riskLevel("자해를 생각했어요")).toBe(2);
    expect(riskLevel("내일이 안 왔으면 좋겠어")).toBe(2);
  });

  it("평범한 문장은 L0", () => {
    expect(riskLevel("오늘 급식 지도 하느라 정신없었어요")).toBe(0);
    expect(riskLevel("")).toBe(0);
  });
});
