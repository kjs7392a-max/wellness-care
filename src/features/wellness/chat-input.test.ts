import { describe, expect, it } from "vitest";
import { shouldSubmitChatKey } from "./chat-input";

describe("한글 조합과 대화 전송", () => {
  it("조합 중 Enter는 확정만 하고, 이후 Enter로 한 번 전송한다", () => {
    const decisions = [
      shouldSubmitChatKey({ key: "Enter", isComposing: true, keyCode: 229 }, true),
      shouldSubmitChatKey({ key: "Enter", isComposing: false, keyCode: 13 }, false),
    ];
    expect(decisions).toEqual([false, true]);
  });
  it("Safari가 compositionend를 먼저 보내도 229 Enter는 전송하지 않는다", () => {
    expect(shouldSubmitChatKey({ key: "Enter", isComposing: false, keyCode: 229 }, false)).toBe(false);
  });
  it("브라우저 조합 플래그가 빠져도 compositionstart 상태로 막는다", () => {
    expect(shouldSubmitChatKey({ key: "Enter", keyCode: 13 }, true)).toBe(false);
  });
  it("일반 Enter는 허용하고 다른 키와 길게 누른 Enter는 보내지 않는다", () => {
    expect(shouldSubmitChatKey({ key: "Enter" }, false)).toBe(true);
    expect(shouldSubmitChatKey({ key: "a" }, false)).toBe(false);
    expect(shouldSubmitChatKey({ key: "Enter", repeat: true }, false)).toBe(false);
  });
});
