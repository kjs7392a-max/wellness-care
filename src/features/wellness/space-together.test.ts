import { describe, expect, it } from "vitest";
import { acceptIncoming, checkOutgoing, createRateLimiter, displayName, dmTopic, maskContacts, MAX_MESSAGE, peopleFromPresence, PII_MASK, presenceList, roomTopic, shortTag, SPACE_IDS } from "./space-together";
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
  it("캐릭터 여섯(마음의 대화와 같은 사람) · 이름이 겹치지 않는다 · 윗줄 여성 아랫줄 남성", () => {
    expect(AVATARS).toHaveLength(6);
    expect(new Set(AVATARS.map((a) => a.name)).size).toBe(6);
    expect(new Set(AVATARS.map((a) => a.look)).size).toBe(6);
    expect(AVATARS.slice(0, 3).every((a) => a.gender === "f")).toBe(true);
    expect(AVATARS.slice(3).every((a) => a.gender === "m")).toBe(true);
    for (const a of AVATARS) expect(a.hint).toBe(`${a.gender === "f" ? "여성" : "남성"} · ${a.age}대`);
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

describe("자리(seat) — presence 에 실린 원하는 자리", () => {
  it("정수 0~15 만 · 그 밖은 null · presenceList 는 나·차단도 포함", () => {
    const state = { a: [{ uid: "me", avatar: "haneul", since: 1, seat: 2 }], b: [{ uid: "u2", avatar: "bada", since: 2, seat: 99 }], c: [{ uid: "u3", avatar: "sol", since: 3, seat: 1.5 }] };
    const all = presenceList(state);
    expect(all.map((p) => [p.uid, p.seat])).toEqual([["me", 2], ["u2", null], ["u3", null]]);
    expect(peopleFromPresence(state, "me", new Set(["u3"])).map((p) => p.uid)).toEqual(["u2"]);
  });
});


describe("자리 고르는 중(2026-11-20)", () => {
  it("presence 의 picking·at 을 읽는다 · 이상한 값은 버린다", async () => {
    const { presenceList } = await import("./space-together");
    const ps = presenceList({
      a: [{ uid: "a", avatar: "sol", since: 1, seat: null, picking: true, at: null }],
      b: [{ uid: "b", avatar: "bada", since: 2, seat: 3, picking: false, at: 500 }],
      c: [{ uid: "c", avatar: "bada", since: 3, seat: 1, picking: "yes", at: "x" }],
    });
    expect(ps.find((p) => p.uid === "a")).toMatchObject({ picking: true, seat: null });
    expect(ps.find((p) => p.uid === "a")?.at).toBeUndefined();
    expect(ps.find((p) => p.uid === "b")).toMatchObject({ seat: 3, at: 500 });
    expect(ps.find((p) => p.uid === "b")?.picking).toBeUndefined();
    expect(ps.find((p) => p.uid === "c")?.picking).toBeUndefined();
    expect(ps.find((p) => p.uid === "c")?.at).toBeUndefined();
  });
});

describe("이름 짓기 규칙(checkNickname)", () => {
  it("한글·영문·숫자 2~10자 · 앞뒤 공백은 지운다", async () => {
    const { checkNickname } = await import("./space-together");
    expect(checkNickname(" 바다빛 ")).toEqual({ ok: true, nickname: "바다빛" });
    expect(checkNickname("Sky7")).toEqual({ ok: true, nickname: "Sky7" });
    expect(checkNickname("가")).toEqual({ ok: false, reason: "short" });
    expect(checkNickname("가".repeat(11))).toEqual({ ok: false, reason: "long" });
    expect(checkNickname("바다 빛")).toEqual({ ok: false, reason: "chars" });
    expect(checkNickname("하늘!")).toEqual({ ok: false, reason: "chars" });
    expect(checkNickname("ㅋㅋㅋ")).toEqual({ ok: false, reason: "chars" });
  });
  it("운영자처럼 보이는 이름 · 욕설 · 위험한 말 · 긴 숫자는 안 된다", async () => {
    const { checkNickname } = await import("./space-together");
    expect(checkNickname("관리자1")).toEqual({ ok: false, reason: "reserved" });
    expect(checkNickname("Admin")).toEqual({ ok: false, reason: "reserved" });
    expect(checkNickname("닥터포레스트")).toEqual({ ok: false, reason: "reserved" });
    expect(checkNickname("시발")).toEqual({ ok: false, reason: "unsafe" });
    expect(checkNickname("죽고싶어")).toEqual({ ok: false, reason: "unsafe" });
    expect(checkNickname("01012345678")).toEqual({ ok: false, reason: "long" });
    expect(checkNickname("a1234567")).toEqual({ ok: false, reason: "unsafe" });
  });
  it("presence 의 pv(이름 바꾼 시각)를 읽는다", async () => {
    const { presenceList } = await import("./space-together");
    const [p] = presenceList({ a: [{ uid: "a", avatar: "sol", since: 1, seat: null, pv: 1700 }] });
    expect(p.pv).toBe(1700);
  });
});

describe("🚫 캐릭터 id 는 서버가 받는 8개 안에서(2026-11-21 다시 그려도 id 는 안 바꾼다)", () => {
  it("space_profiles 의 avatar 검사 안 · 예전에 고른 이슬·별도 그려진다(하늘·바다 모습)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const sql = readFileSync(join(process.cwd(), "docs/space-profiles-setup.sql"), "utf8");
    const m = sql.match(/avatar in \(([^)]*)\)/);
    expect(m).toBeTruthy();
    const ids = [...(m?.[1] ?? "").matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
    for (const a of AVATARS) expect(ids).toContain(a.id);
    const { avatarOf } = await import("./space-avatars");
    for (const id of ids) expect(avatarOf(id), id).toBeTruthy();
    expect(avatarOf("iseul")?.id).toBe("haneul");
    expect(avatarOf("byeol")?.id).toBe("bada");
    const src = readFileSync(join(process.cwd(), "src/features/wellness/space-avatars.ts"), "utf8");
    expect(src).not.toMatch(/dotsSvg/); // 뽀글 파마를 그리던 점 머리
  });
  it("마음의 대화 캐릭터(characters.ts)와 같은 사람 — 성별·나이대가 같고 얼굴 그림 파일이 있다", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { CHARACTERS } = await import("./characters");
    const { avatarSrc } = await import("./space-avatars");
    for (const a of AVATARS) {
      const c = CHARACTERS.find((x) => x.id === a.look);
      expect(c, a.look).toBeTruthy();
      expect(c!.gender === "female" ? "f" : "m", a.id).toBe(a.gender);
      expect(Math.floor(c!.age / 10) * 10, a.id).toBe(a.age);
      expect(existsSync(join(process.cwd(), "public", avatarSrc(a.id))), a.id).toBe(true);
    }
  });
});
