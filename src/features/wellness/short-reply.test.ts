import { expect, it } from "vitest";
import { normalizeReply } from "./short-reply";
it("표시 과정에서 공감 뒤의 질문을 잘라내지 않는다", () => {
  const reply = "동료와 멀어진 게 마음에 걸리시죠.\n최근 계기가 있었어요?";
  expect(normalizeReply(reply)).toBe("동료와 멀어진 게 마음에 걸리시죠. 최근 계기가 있었어요?");
});
