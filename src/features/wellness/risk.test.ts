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

// 2026-09-19 보강 — AI Hub 「웰니스 대화 스크립트」(NIA) 자살충동·자살시도·자해 의도 발화 128건을 riskLevel 에 돌려
// 놓친 59건(재현율 54%)의 모양에서 뽑은 표현. 문장은 우리 말로 다시 썼다(원문 0). 대조군(웰니스 5,103 · 심리상담 일반군 27,911)
// 오탐 불변 조건으로 넣었고, 정신과 검토 대기(risk.ts 블록 주석).
describe("riskLevel — 웰니스 스크립트 놓친 표현 보강", () => {
  it("'죽고 싶다' 변형·완곡 표현이 L2", () => {
    expect(riskLevel("요즘은 죽고만 싶어요")).toBe(2);
    expect(riskLevel("그냥 사라졌으면 좋겠어요")).toBe(2);
    expect(riskLevel("내가 없어졌으면 좋겠다는 생각이 자꾸 들어요")).toBe(2);
    expect(riskLevel("먼지가 되고 싶어요")).toBe(2);
    expect(riskLevel("살아서 뭐하나 싶어요")).toBe(2);
    expect(riskLevel("인생이 여기서 끝났으면 좋겠어요")).toBe(2);
    expect(riskLevel("죽는 게 나을 것 같다는 생각이 들어요")).toBe(2);
    expect(riskLevel("나도 죽으면 어떨까 편해질까 싶어요")).toBe(2);
    expect(riskLevel("살아야 할 의미가 있을까요")).toBe(2);
    expect(riskLevel("내가 살아야 할 가치를 못 느껴요")).toBe(2);
  });
  it("방법을 말하는 표현이 L2", () => {
    expect(riskLevel("옥상에서 뛰어내릴까 고민했어요")).toBe(2);
    expect(riskLevel("차라리 죽어버리자 싶었어요")).toBe(2);
    expect(riskLevel("죽어버릴까 하는 생각도 했어요")).toBe(2);
    expect(riskLevel("목을 매려고 준비까지 했어요")).toBe(2);
    expect(riskLevel("수면제를 한번에 다 먹어버릴까 했어요")).toBe(2);
  });
  it("보강 뒤에도 일상 문장·비유·시험 걱정은 L0", () => {
    expect(riskLevel("이번 학기만 빨리 끝났으면 좋겠어요")).toBe(0);
    expect(riskLevel("시험에 떨어질까 걱정이에요")).toBe(0);
    expect(riskLevel("웃겨 죽겠다 진짜")).toBe(0);
    expect(riskLevel("일에 목매지 말라고 하더라고요")).toBe(0);
    expect(riskLevel("수면제를 처방받아서 좀 자요")).toBe(0);
    expect(riskLevel("그 얘긴 이제 끝났으면 좋겠어요")).toBe(0);
    expect(riskLevel("죽자고 뛰었더니 숨이 차요")).toBe(0);
  });
});
