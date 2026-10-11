import { describe, expect, it } from "vitest";
import { CONSENT_VERSION, GUEST_ACCOUNT, accountKey, onboardIdFor, emptyOnboardStore, parseOnboardStore, recordFor, savedDateLabel, serializeOnboardStore, setRecord } from "./onboard-store";

const rec = {
  consent: [true, false] as [boolean, boolean],
  perms: { 0: true, 2: false },
  role: "teacher" as const,
  parq: { 0: false, 1: true },
  parq2: { "heart.0": false },
  delay: { 0: false, 1: false, 2: false },
  savedAt: "2026-10-11T01:00:00.000Z",
};

describe("onboard-store", () => {
  it("저장한 계정은 다시 로그인하면 기록을 돌려준다(왕복)", () => {
    const st = parseOnboardStore(serializeOnboardStore(setRecord(emptyOnboardStore(), "abc@sen.go.kr", rec)));
    const got = recordFor(st, "abc@sen.go.kr");
    expect(got).not.toBeNull();
    expect(got!.role).toBe("teacher");
    expect(got!.parq).toEqual({ 0: false, 1: true });
    expect(got!.consentVersion).toBe(CONSENT_VERSION);
  });

  it("아이디 앞뒤 공백·대소문자가 달라도 같은 사람", () => {
    const st = setRecord(emptyOnboardStore(), "ABC@sen.go.kr ", rec);
    expect(recordFor(st, " abc@SEN.go.kr")).not.toBeNull();
  });

  it("다른 계정에는 앞사람 답이 넘어가지 않는다", () => {
    const st = setRecord(emptyOnboardStore(), "a@sen.go.kr", rec);
    expect(recordFor(st, "b@sen.go.kr")).toBeNull();
  });

  it("둘러보기(빈 아이디)는 저장도 조회도 안 한다", () => {
    expect(accountKey("  ")).toBeNull();
    const st = setRecord(emptyOnboardStore(), "", rec);
    expect(Object.keys(st.byAccount)).toHaveLength(0);
    expect(recordFor(st, "")).toBeNull();
  });

  it("둘러보기는 그 폰의 둘러보기 칸 하나에 저장 · 계정과 섞이지 않는다", () => {
    expect(onboardIdFor("", true)).toBe(GUEST_ACCOUNT);
    expect(onboardIdFor("a@sen.go.kr", false)).toBe("a@sen.go.kr");
    const st = setRecord(emptyOnboardStore(), onboardIdFor("", true), rec);
    expect(recordFor(st, onboardIdFor("", true))).not.toBeNull();
    expect(recordFor(st, "a@sen.go.kr")).toBeNull();
  });

  it("동의서 판이 바뀌면 옛 기록은 없는 것으로(처음부터 다시 묻는다)", () => {
    const st = setRecord(emptyOnboardStore(), "a@sen.go.kr", rec);
    st.byAccount["a@sen.go.kr"].consentVersion = CONSENT_VERSION - 1;
    expect(recordFor(st, "a@sen.go.kr")).toBeNull();
  });

  it("필수 동의가 빠진 기록은 쓰지 않는다", () => {
    const st = setRecord(emptyOnboardStore(), "a@sen.go.kr", { ...rec, consent: [false, false] });
    expect(recordFor(st, "a@sen.go.kr")).toBeNull();
  });

  it("깨진 저장값은 빈 표 · 깨진 한 사람만 버리고 나머지는 살린다", () => {
    expect(parseOnboardStore("{not json")).toEqual(emptyOnboardStore());
    expect(parseOnboardStore(null)).toEqual(emptyOnboardStore());
    const good = setRecord(emptyOnboardStore(), "a@sen.go.kr", rec);
    const raw = JSON.stringify({ v: 1, byAccount: { ...good.byAccount, "b@sen.go.kr": { ...rec, role: "pilot", consentVersion: 1 } } });
    const st = parseOnboardStore(raw);
    expect(recordFor(st, "a@sen.go.kr")).not.toBeNull();
    expect(st.byAccount["b@sen.go.kr"]).toBeUndefined();
  });

  it("지난번 답 날짜는 한국 날짜", () => {
    expect(savedDateLabel("2026-10-10T16:30:00.000Z")).toBe("2026.10.11");
    expect(savedDateLabel("nope")).toBeNull();
  });
});
