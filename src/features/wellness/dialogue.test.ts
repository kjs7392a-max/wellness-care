import { describe, expect, it, vi } from "vitest";
import type { Turn } from "./chat-store";
import { parseObservation, selectPlan, type Observation } from "./dialogue-state";
import { replyIssues, runDialogue, type DialogueTransport } from "./dialogue-engine";

function observation(turns: Turn[], changes: Partial<Observation> = {}): Observation {
  const topic = { turn: turns.length - 1, quote: turns.at(-1)!.text };
  return { topic, intent: "elaborating", newDetail: topic, facts: [topic], feelings: [], signals: [], followUp: null, bridge: null, safety: { level: "none", evidence: null }, ...changes };
}
const m = (text: string): Turn => ({ role: "me", text });
const b = (text: string): Turn => ({ role: "bot", text });
const candidate = (turns: Turn[], text = "최근 계기가 있었어요?") => ({ text, basis: { turn: turns.length - 1, quote: turns.at(-1)!.text }, alreadyAskedOrAnswered: false });

describe("근거와 대화 행동", () => {
  it("bot의 추측과 원문에 없는 인용을 사용자 사실로 받아들이지 않는다", () => {
    const turns = [m("피곤해요"), b("잠을 못 주무셨군요"), m("잠은 잘 잤어요")];
    expect(() => parseObservation(observation(turns, { facts: [{ turn: 1, quote: "잠을 못" }] }), turns)).toThrow("ungrounded");
    expect(() => parseObservation(observation(turns, { feelings: [{ turn: 2, quote: "우울해요" }] }), turns)).toThrow("ungrounded");
    expect(() => parseObservation(observation(turns, { newDetail: { turn: 0, quote: "피곤해요" } }), turns)).toThrow("stale");
  });
  it("이미 질문한 내용이나 답한 내용은 재질문하지 않는다", () => {
    const turns = [m("동료와 멀어졌어요"), b("최근 계기가 있었어요?"), m("그제 다퉜어요"), b("마음에 남았겠어요."), m("응")];
    const o = observation(turns, { intent: "acknowledging", newDetail: null, followUp: candidate(turns) });
    expect(selectPlan(o, turns).action).toBe("acknowledge");
    o.followUp = { ...candidate(turns, "언제 다투셨어요?"), alreadyAskedOrAnswered: true };
    expect(selectPlan(o, turns).action).toBe("acknowledge");
  });
  it("직전 질문에는 듣는 반응을 하고 새 장면에는 말을 열어 준다", () => {
    const turns = [m("관계가 어려워요"), b("어떤 관계예요?"), m("동료 사이요")];
    expect(selectPlan(observation(turns, { followUp: candidate(turns) }), turns).action).toBe("acknowledge");
    turns.push(b("함께 일하는 사이라 신경 쓰이겠어요."), m("예전에는 같이 밥도 먹었어요"));
    expect(selectPlan(observation(turns, { followUp: candidate(turns) }), turns).action).toBe("invite");
  });
  it("동의 한 번은 마무리가 아니며 반복·마무리와 구별한다", () => {
    const turns = [m("응")];
    expect(selectPlan(observation(turns, { intent: "acknowledging", newDetail: null }), turns).action).toBe("acknowledge");
    expect(selectPlan(observation(turns, { intent: "repeating", newDetail: null }), turns).action).toBe("bridge");
    expect(selectPlan(observation(turns, { intent: "closing_topic", newDetail: null }), turns).action).toBe("bridge");
    expect(selectPlan(observation(turns, { intent: "ending", newDetail: null }), turns).action).toBe("close");
  });
  it("안전 확인은 질문 빈도와 화제 마무리보다 우선한다", () => {
    const turns = [b("무슨 일이 있었어요?"), m("지금 혼자 있는데 버틸 수 있을지 모르겠어요")];
    const o = observation(turns, { intent: "closing_topic", safety: { level: "check", evidence: { turn: 1, quote: turns[1].text } } });
    expect(selectPlan(o, turns).action).toBe("safety_check");
    o.safety.level = "urgent";
    expect(selectPlan(o, turns).action).toBe("safety_support");
    expect(() => parseObservation({ ...o, safety: { level: "urgent", evidence: null } }, turns)).toThrow("ungrounded-safety");
  });
  it("직접 요청한 조언만 제안으로 선택한다", () => {
    const turns = [m("어떻게 해보면 좋을까요?")];
    expect(selectPlan(observation(turns, { intent: "asking_advice" }), turns).action).toBe("offer");
  });
});

describe("15턴 대화 정책 회귀 — 관찰 결과를 입력해 흐름 검증", () => {
  it("새 정보는 계속 듣고 질문을 교대하며, 마무리 후 실제 이전 화제로 연결한다", () => {
    const turns: Turn[] = [];
    const rows: [string, Observation["intent"], string | null, string, string][] = [
      ["오늘 따뜻하게 입었어요", "new_topic", null, "따뜻하게 챙겨 입으셨네요.", "acknowledge"],
      ["주말에는 친구를 만나기로 했어요", "new_topic", "어떤 약속이에요?", "반가운 약속이네요. 어떤 약속이에요?", "invite"],
      ["그냥 밥 먹으려고요", "answering", null, "편하게 밥 먹으며 수다 떨면 좋겠네요.", "acknowledge"],
      ["요즘 인간관계가 마음 같지 않아", "new_topic", "어떤 관계가 마음에 걸리세요?", "마음이 복잡하겠어요. 어떤 관계가 마음에 걸리세요?", "invite"],
      ["동료관계도 소원해진 것 같고", "elaborating", "최근 계기가 있었어요?", "매일 마주치는 사이라 신경이 쓰이겠어요.", "acknowledge"],
      ["인사해도 대답을 안 해요", "elaborating", "최근 계기가 있었어요?", "먼저 인사했는데 머쓱하셨겠어요. 최근 계기가 있었어요?", "invite"],
      ["지난주 회의 때 다퉜어요", "answering", null, "회의 뒤로 달라져서 더 마음에 걸리겠어요.", "acknowledge"],
      ["예전엔 점심도 같이 먹었는데", "elaborating", "지금은 점심시간을 어떻게 보내세요?", "예전 모습이 떠오르겠어요. 지금은 점심시간을 어떻게 보내세요?", "invite"],
      ["혼자 산책해요", "answering", null, "점심에는 잠깐 혼자 걸으며 쉬시는 거네요.", "acknowledge"],
      ["응", "acknowledging", null, "네, 천천히 듣고 있어요.", "acknowledge"],
      ["그냥 같은 생각만 하게 돼요", "repeating", null, "그 얘긴 잠깐 쉬어도 돼요. 아까 친구 만날 약속도 하셨죠.", "bridge"],
      ["친구랑 맛있는 거 먹으려고요", "new_topic", "먹고 싶은 게 있어요?", "맛있는 한 끼 기대되네요. 먹고 싶은 게 있어요?", "invite"],
      ["파스타요", "answering", null, "오, 파스타 좋죠. 편하게 즐길 시간이 되면 좋겠어요.", "acknowledge"],
      ["관계 얘기는 이제 그만할래요", "closing_topic", null, "네, 그 얘기는 여기까지 해요. 다른 얘기도 편하게요.", "bridge"],
      ["오늘은 이만 갈게요", "ending", null, "네, 오늘 이야기 나눠 주셔서 고마워요.", "close"],
    ];
    for (const [text, intent, question, reply, action] of rows) {
      turns.push(m(text));
      const newDetail = ["acknowledging", "repeating", "closing_topic", "ending"].includes(intent) ? null : { turn: turns.length - 1, quote: text };
      const o = observation(turns, { intent, newDetail, followUp: question ? candidate(turns, question) : null, bridge: intent === "repeating" ? { turn: 2, quote: "주말에는 친구를 만나기로 했어요" } : null });
      const verified = parseObservation(o, turns);
      const plan = selectPlan(verified, turns);
      expect(plan.action, text).toBe(action);
      expect(replyIssues({ text: reply, complete: true }, plan, turns), text).toEqual([]);
      turns.push(b(reply));
    }
  });
});

describe("분리된 생성 경로", () => {
  it("긴 답을 자르지 않고 같은 행동·질문을 유지해 전체를 다시 작성한다", async () => {
    const turns = [m("동료 사이가 멀어졌어요")];
    const o = observation(turns, { followUp: candidate(turns) });
    const transport: DialogueTransport = {
      observe: vi.fn().mockResolvedValue({ text: JSON.stringify(o), complete: true }),
      write: vi.fn().mockResolvedValueOnce({ text: "많이 속상하셨겠어요. " + "긴 설명을 덧붙입니다. ".repeat(10), complete: true }).mockResolvedValueOnce({ text: "동료와 멀어진 게 마음에 걸리시죠.", complete: true }),
    };
    const r = await runDialogue(transport, turns, "peer", 11);
    expect("reply" in r && r.reply.endsWith("최근 계기가 있었어요?")).toBe(true);
    expect(transport.write).toHaveBeenCalledTimes(2);
    expect(vi.mocked(transport.write).mock.calls[1][0]).toContain("선택한 행동과 질문을 유지");
  });
  it("질문은 생성기에 맡기지 않고 검증된 계획에서 정확히 한 번 조립한다", async () => {
    const turns = [m("동료 사이가 멀어졌어요")];
    const o = observation(turns, { followUp: candidate(turns) });
    const transport: DialogueTransport = {
      observe: async () => ({ text: JSON.stringify(o), complete: true }),
      write: vi.fn().mockResolvedValue({ text: "계속 마음에 걸렸겠어요.", complete: true }),
    };
    const result = await runDialogue(transport, turns, "peer", 11);
    expect(result).toHaveProperty("reply", "계속 마음에 걸렸겠어요. 최근 계기가 있었어요?");
    expect(transport.write).toHaveBeenCalledTimes(1);
  });
  it("화제 중단에서는 질문 없이 다른 이야기를 할 공간을 붙인다", async () => {
    const turns = [m("이 얘기는 그만할래요")];
    const o = observation(turns, { intent: "closing_topic", newDetail: null });
    const transport: DialogueTransport = {
      observe: async () => ({ text: JSON.stringify(o), complete: true }),
      write: vi.fn().mockResolvedValue({ text: "네, 그 얘기는 여기까지 해요.", complete: true }),
    };
    const result = await runDialogue(transport, turns, "peer", 11);
    expect(result).toHaveProperty("reply", "네, 그 얘기는 여기까지 해요. 다른 이야기도 편하게 해주세요.");
  });
  it("미완성·누락된 질문·최근 답변 반복은 재작성 대상이다", () => {
    const turns = [m("오늘 힘들었어요"), b("많이 힘드셨겠어요."), m("응")];
    const p = selectPlan(observation(turns, { followUp: candidate(turns) }), turns);
    expect(replyIssues({ text: "많이 힘드셨겠어요.", complete: true }, p, turns)).toContain("missing-planned-question");
    expect(replyIssues({ text: "많이 힘드셨겠어요.", complete: true }, p, turns)).toContain("repeated-reply");
    expect(replyIssues({ text: "지금은", complete: false }, p, turns)).toContain("incomplete");
  });
  it("검증 실패를 짧은 공감으로 위장하지 않는다", async () => {
    const turns = [m("어려워요")];
    const transport: DialogueTransport = { observe: async () => ({ text: JSON.stringify(observation(turns)), complete: true }), write: vi.fn().mockResolvedValue({ text: "길게 ".repeat(100), complete: true }) };
    await expect(runDialogue(transport, turns, "peer", 11)).rejects.toThrow("reply-validation-failed");
    expect(transport.write).toHaveBeenCalledTimes(2);
  });
  it("현재 위험이면 일반 문장 생성을 건너뛴다", async () => {
    const turns = [m("지금 위험해요")];
    const o = observation(turns, { safety: { level: "urgent", evidence: { turn: 0, quote: "지금 위험해요" } } });
    const transport: DialogueTransport = { observe: async () => ({ text: JSON.stringify(o), complete: true }), write: vi.fn() };
    expect(await runDialogue(transport, turns, "peer", 11)).toHaveProperty("risk", true);
    expect(transport.write).not.toHaveBeenCalled();
  });
  it("관찰 JSON 오류는 한 번만 재시도하고 원문 근거가 없으면 중단한다", async () => {
    const turns = [m("오늘은 좋아요")];
    const transport: DialogueTransport = { observe: vi.fn().mockResolvedValue({ text: "{}", complete: true }), write: vi.fn() };
    await expect(runDialogue(transport, turns, "peer", 11)).rejects.toThrow("observation-validation-failed");
    expect(transport.observe).toHaveBeenCalledTimes(2);
    expect(transport.write).not.toHaveBeenCalled();
  });
});
