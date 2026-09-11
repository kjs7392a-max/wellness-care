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

// 2026-09-12 보강 — AI Hub 「심리상담 데이터」 자살 사고 라벨 발화에서 빠져 있던 표현(문장은 우리 말로 다시 씀).
describe("riskLevel — 실제 상담 표현 보강", () => {
  it("'죽고 싶다' 없이 오는 위험 표현도 L2", () => {
    expect(riskLevel("수업하다가 갑자기 그냥 죽을까? 그런 생각이 들어요")).toBe(2);
    expect(riskLevel("그냥 한 번에 죽었으면 좋겠다")).toBe(2);
    expect(riskLevel("죽어야 끝나는구나 싶었어요")).toBe(2);
    expect(riskLevel("상태가 안 좋으면 극단적인 생각까지 가요")).toBe(2);
    expect(riskLevel("창문 밖으로 뛰어내리고 싶다 이랬어요")).toBe(2);
    expect(riskLevel("내가 왜 살지? 늘 그래요")).toBe(2);
    expect(riskLevel("죽는 게 낫지 않을까")).toBe(2);
    expect(riskLevel("죽음에 대해서는 자주 생각을 하죠")).toBe(2);
    expect(riskLevel("손목을 긋는 연습도 해봤어요")).toBe(2);
  });
  it("제3자 언급·뉴스는 L0 (일반군 오탐의 대부분)", () => {
    expect(riskLevel("어제 뉴스에 배우가 자살했다고 나오더라고요")).toBe(0);
    expect(riskLevel("엄마가 자살하셨을 때 많이 힘들었어요")).toBe(0);
    expect(riskLevel("학생이 올린 자해 사진을 보고 놀랐어요")).toBe(0);
  });
  it("살다/사다 혼동 — '안 사는 게' 는 위험어가 아니다", () => {
    expect(riskLevel("권해주는 걸 안 사는 게 너무 미안했어요")).toBe(0);
  });
  it("보강 뒤에도 일상 과장은 그대로 L0", () => {
    expect(riskLevel("더워서 죽을까 봐 에어컨 켰어요")).toBe(0);
    expect(riskLevel("일이 많아서 죽겠네")).toBe(0);
  });
});
