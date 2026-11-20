import { describe, expect, it } from "vitest";
import { acceptIncoming, checkOutgoing, createRateLimiter, displayName, dmTopic, maskContacts, MAX_MESSAGE, peopleFromPresence, PII_MASK, roomTopic, shortTag, SPACE_IDS } from "./space-together";
import { AVATARS } from "./space-avatars";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("채널 이름 — SQL 정책과 같다", () => {
  const sql = readFileSync(join(process.cwd(), "docs/space-realtime-setup.sql"), "utf8");
  it("공간 방 넷 = space:<id> · SQL 의 허용 목록과 같다", () => {
    for (const id of SPACE_IDS) expect(sql).toContain(`'${roomTopic(id)}'`);
  });
  it("1:1 = dm:<방>:<작은 id>:<큰 id> · 순서와 상관없이 같은 이름 · SQL 은 3·4번째 칸을 본다", () => {
    expect(dmTopic("meditation", "b-uid", "a-uid")).toBe("dm:meditation:a-uid:b-uid");
    expect(dmTopic("meditation", "a-uid", "b-uid")).toBe(dmTopic("meditation", "b-uid", "a-uid"));
    expect(sql).toMatch(/split_part\(\(select realtime\.topic\(\)\), ':', 3\)/);
    expect(sql).toMatch(/split_part\(\(select realtime\.topic\(\)\), ':', 4\)/);
  });
});

describe("이름 — 실명 대신 캐릭터 이름 + 두 자리", () => {
  it("같은 사람은 늘 같은 번호 · 캐릭터 이름", () => {
    expect(shortTag("abc")).toBe(shortTag("abc"));
    expect(shortTag("abc")).toMatch(/^\d\d$/);
    expect(displayName("haneul", "abc")).toBe(`하늘 ${shortTag("abc")}`);
  });
  it("캐릭터 여덟 · 이름이 겹치지 않는다", () => {
    expect(AVATARS).toHaveLength(8);
    expect(new Set(AVATARS.map((a) => a.name)).size).toBe(8);
  });
});

describe("보내기 전 검사", () => {
  it("빈 말 · 너무 긴 말은 안 보낸다", () => {
    expect(checkOutgoing("   ")).toEqual({ ok: false, reason: "empty" });
    expect(checkOutgoing("가".repeat(MAX_MESSAGE + 1))).toEqual({ ok: false, reason: "too-long" });
    expect(checkOutgoing("가".repeat(MAX_MESSAGE)).ok).toBe(true);
  });
  it("★위험한 표현은 다른 사람에게 보내지 않는다(risk.ts L2)", () => {
    expect(checkOutgoing("죽고 싶어요")).toEqual({ ok: false, reason: "risk" });
  });
  it("일상어는 그대로 · 공백 정리", () => {
    expect(checkOutgoing("  오늘   좀  피곤하네요 ")).toEqual({ ok: true, text: "오늘 좀 피곤하네요", masked: false });
  });
  it("연락처·링크는 가린다", () => {
    for (const s of ["010-1234-5678", "01012345678", "+82 10 1234 5678", "me@school.kr", "https://open.kakao.com/o/abc", "www.example.com", "example.co.kr/abc", "카톡 아이디 hello123", "인스타 @my.id"]) {
      const r = maskContacts(`연락 주세요 ${s} 요`);
      expect(r.masked, s).toBe(true);
      expect(r.text, s).toContain(PII_MASK);
    }
    expect(maskContacts("오늘 3시 10분에 산책했어요").masked).toBe(false);
    const ok = checkOutgoing("번호는 010-1234-5678 이에요");
    expect(ok.ok && ok.masked && ok.text.includes(PII_MASK)).toBe(true);
  });
});

describe("받은 메시지", () => {
  const good = { id: "m1", from: "u1", avatar: "bada", text: "안녕하세요", at: 1 };
  it("모양이 맞으면 받는다 · 틀리면 버린다", () => {
    expect(acceptIncoming(good)).toMatchObject({ text: "안녕하세요", hidden: false });
    expect(acceptIncoming({ ...good, avatar: "dragon" })).toBeNull();
    expect(acceptIncoming({ ...good, text: "가".repeat(MAX_MESSAGE + 1) })).toBeNull();
    expect(acceptIncoming({ ...good, at: "x" })).toBeNull();
    expect(acceptIncoming(null)).toBeNull();
  });
  it("★다른 앱이 규칙을 안 지켜도 — 위험한 말은 가리고, 연락처는 가린다", () => {
    expect(acceptIncoming({ ...good, text: "죽고 싶어요" })).toMatchObject({ hidden: true, text: "" });
    expect(acceptIncoming({ ...good, text: "010-1234-5678 로 연락" })?.text).toContain(PII_MASK);
  });
});

describe("연속 전송 제한", () => {
  it("1초 안에 두 번은 안 됨 · 1분에 15개까지", () => {
    let t = 0;
    const rl = createRateLimiter({ now: () => t });
    expect(rl.take()).toBe(true);
    t = 500; expect(rl.take()).toBe(false);
    t = 1000; expect(rl.take()).toBe(true);
    for (let i = 0; i < 13; i++) { t += 1000; expect(rl.take()).toBe(true); }
    t += 1000; expect(rl.take()).toBe(false); // 16번째
    t = 61_500; expect(rl.take()).toBe(true); // 1분 지나면 다시
  });
});

describe("함께 있는 사람", () => {
  it("나·차단한 사람·모양 틀린 것 빼고 · 먼저 온 순서 · 같은 사람 여러 탭은 하나로", () => {
    const state = {
      a: [{ uid: "me", avatar: "haneul", since: 1 }],
      b: [{ uid: "u2", avatar: "bada", since: 5 }, { uid: "u2", avatar: "bada", since: 3 }],
      c: [{ uid: "u3", avatar: "sol", since: 2 }],
      d: [{ uid: "u4", avatar: "nope", since: 0 }],
      e: [{ uid: "u5", avatar: "byeol", since: 4 }],
    };
    const ppl = peopleFromPresence(state, "me", new Set(["u5"]));
    expect(ppl.map((p) => p.uid)).toEqual(["u3", "u2"]);
    expect(ppl[1].since).toBe(3);
  });
});
