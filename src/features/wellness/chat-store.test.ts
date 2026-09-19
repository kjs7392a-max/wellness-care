import { describe, expect, it } from "vitest";
import { CHAT_STORE_KEY, HISTORY_LIMIT, clearAllChats, clearCharacterChat, emptyChatStore, historyFor, parseChatStore, serializeChatStore, setCharacterChat, type StoredMsg } from "./chat-store";

// 2026-09-19 사용자: "채팅의 내용을 기록하려고 하는 거야" — DB 없이 그 폰(localStorage)에만 대화를 남기고 다음에 이어간다.
const m = (role: "me" | "bot", text: string, risk?: true): StoredMsg => ({ role, text, at: "오전 9:00", ...(risk ? { risk } : {}) });

describe("parseChatStore / serializeChatStore — 직렬화", () => {
  it("빈 값·깨진 JSON·다른 버전은 빈 저장소로(앱이 죽지 않는다)", () => {
    expect(parseChatStore(null)).toEqual(emptyChatStore());
    expect(parseChatStore("{not json")).toEqual(emptyChatStore());
    expect(parseChatStore(JSON.stringify({ v: 99, byCharacter: { peer: [m("me", "x")] } }))).toEqual(emptyChatStore());
  });
  it("왕복하면 같은 값 · 키는 버전이 붙어 있다", () => {
    const st = setCharacterChat(emptyChatStore(), "peer", [m("bot", "안녕"), m("me", "힘들어요")]);
    expect(parseChatStore(serializeChatStore(st))).toEqual(st);
    expect(CHAT_STORE_KEY).toMatch(/:v1$/);
  });
  it("모양이 어긋난 말풍선(role 없음·text 아님)은 버린다", () => {
    const raw = JSON.stringify({ v: 1, byCharacter: { peer: [{ role: "me", text: "ok", at: "a" }, { text: 3 }, null] } });
    expect(parseChatStore(raw).byCharacter.peer).toEqual([{ role: "me", text: "ok", at: "a" }]);
  });
});

describe("setCharacterChat / clear — 캐릭터별 보관", () => {
  it("캐릭터별로 갈라 저장하고 다른 캐릭터엔 손대지 않는다", () => {
    let st = setCharacterChat(emptyChatStore(), "peer", [m("me", "a")]);
    st = setCharacterChat(st, "senior", [m("me", "b")]);
    expect(st.byCharacter.peer).toHaveLength(1);
    expect(st.byCharacter.senior).toHaveLength(1);
    st = clearCharacterChat(st, "peer");
    expect(st.byCharacter.peer).toBeUndefined();
    expect(st.byCharacter.senior).toHaveLength(1);
    expect(clearAllChats()).toEqual(emptyChatStore());
  });
  it("한 캐릭터에 200개가 넘으면 오래된 것부터 버린다(폰 저장 공간)", () => {
    const many = Array.from({ length: 250 }, (_, i) => m(i % 2 ? "bot" : "me", `t${i}`));
    const st = setCharacterChat(emptyChatStore(), "peer", many);
    expect(st.byCharacter.peer).toHaveLength(200);
    expect(st.byCharacter.peer![0].text).toBe("t50");
  });
});

describe("historyFor — 서버로 보내는 최근 대화", () => {
  it("상한은 서버가 자르는 수와 같은 하나의 정의(20)", () => {
    expect(HISTORY_LIMIT).toBe(20);
    const many = Array.from({ length: 60 }, (_, i) => m(i % 2 ? "bot" : "me", `t${i}`));
    const h = historyFor(many);
    expect(h).toHaveLength(HISTORY_LIMIT);
    expect(h[h.length - 1].text).toBe("t59");
  });
  it("위험(L2)으로 표시된 말풍선(질문·고정 안내 둘 다)은 서버에 다시 보내지 않는다", () => {
    const h = historyFor([m("bot", "안녕"), m("me", "죽고만 싶어요", true), m("bot", "지금 많이 힘드신 것 같아요", true), m("me", "그냥 피곤해요")]);
    expect(h.map((x) => x.text)).toEqual(["안녕", "그냥 피곤해요"]);
    expect(h.every((x) => !("risk" in x) && !("at" in x))).toBe(true);
  });
});
