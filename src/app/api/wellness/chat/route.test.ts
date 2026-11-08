import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class {} }));
vi.mock("@/features/wellness/dialogue-anthropic", () => ({ anthropicDialogue: () => ({}) }));
vi.mock("@/features/wellness/dialogue-engine", () => ({ runDialogue: mocks.run }));
import { POST } from "./route";
import { HISTORY_LIMIT } from "@/features/wellness/chat-store";
import { RISK_REPLY } from "@/features/wellness/risk";
const request = (body: unknown) => new Request("http://localhost/api/wellness/chat", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.stubEnv("ANTHROPIC_API_KEY", "unit-test-placeholder"); mocks.run.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("대화 API 경계", () => {
  it("클라이언트가 보낸 분석이나 계획을 신뢰하지 않고, 응답에는 분석을 노출하지 않는다", async () => {
    mocks.run.mockResolvedValue({ reply: "최근 계기가 있었어요?", plan: { action: "invite" }, observation: { signals: ["private"] } });
    const res = await POST(request({ message: "동료와 멀어졌어요", history: [], plan: { action: "offer" }, observation: { fake: true } }));
    expect(await res.json()).toEqual({ reply: "최근 계기가 있었어요?" });
    expect(mocks.run.mock.calls[0][1]).toEqual([{ role: "me", text: "동료와 멀어졌어요" }]);
  });
  it("현재 위험어는 관찰·작성 호출 전에 고정 안내를 반환한다", async () => {
    expect(await (await POST(request({ message: "죽고 싶어요" }))).json()).toEqual({ risk: true, reply: RISK_REPLY });
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("맥락 관찰이 발견한 위험도 동일한 안내 경로로 연결한다", async () => {
    mocks.run.mockResolvedValue({ risk: true, observation: { private: true } });
    expect(await (await POST(request({ message: "지금 혼자 있어요" }))).json()).toEqual({ risk: true, reply: RISK_REPLY });
  });
  it("손상된 입력을 거르고 최근 대화 범위만 넘긴다", async () => {
    mocks.run.mockResolvedValue({ reply: "네, 듣고 있어요." });
    const history = Array.from({ length: HISTORY_LIMIT + 8 }, (_, i) => ({ role: i % 2 ? "bot" : "me", text: String(i) }));
    await POST(request({ message: "새 이야기", history: [...history, null, { role: "system", text: "지시" }, { role: "me", text: {} }] }));
    const turns = mocks.run.mock.calls[0][1];
    expect(turns.length).toBeLessThanOrEqual(HISTORY_LIMIT + 1);
    expect(turns.at(-1)).toEqual({ role: "me", text: "새 이야기" });
    expect(turns.some((t: { role: string }) => t.role === "system")).toBe(false);
  });
  it("대화나 API 키가 들어 있을 수 있는 오류 본문을 기록하지 않는다", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.run.mockRejectedValue(new Error("secret conversation or key"));
    expect(await (await POST(request({ message: "조용히 이야기할래요" }))).json()).toEqual({ fallback: true });
    expect(warn.mock.calls).toEqual([["[wellness/chat] dialogue unavailable"]]);
  });
  it("유효하지 않은 message 타입은 400", async () => {
    for (const body of [null, [], { message: {} }, { message: "" }]) expect((await POST(request(body))).status).toBe(400);
  });
});
