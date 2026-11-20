import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 화면(jsdom 없음)은 소스로 지킨다 — 2026-11-20 「함께 머무는 사람」. 주석은 걷어내고 코드만 본다.
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const ui = strip(readFileSync(join(__dirname, "SpaceTogether.tsx"), "utf8"));
const rt = strip(readFileSync(join(__dirname, "space-realtime.ts"), "utf8"));
const sheet = strip(readFileSync(join(__dirname, "SpaceSheet.tsx"), "utf8"));
const app = readFileSync(join(__dirname, "WellnessApp.tsx"), "utf8");
const cfg = strip(readFileSync(join(__dirname, "space-config.ts"), "utf8"));

describe("함께 머무는 사람 — 연결", () => {
  it("연결 정보가 없으면 기능이 안 나온다(spaceRealtimeReady)", () => {
    expect(sheet).toMatch(/const together = spaceRealtimeReady\(\)/);
    expect(sheet).toMatch(/together \? \{ who, avatar, onPickAvatar: pick \} : null/);
    expect(sheet).toMatch(/\{together && \(/);
  });
  it("앱이 계정/둘러보기를 넘긴다", () => {
    const line = app.split("\n").find((l) => l.includes("<SpaceSheet onClose=")) ?? "";
    expect(line).toContain("who={{ guest: s.guest, loginId: s.loginId }}");
  });
  it("모든 채널은 비공개(private) · 익명 로그인 · 둘러보기 세션은 이 탭 동안만", () => {
    const channels = rt.match(/sb\.channel\([^\n]*/g) ?? [];
    expect(channels.length).toBeGreaterThanOrEqual(2);
    for (const c of channels) expect(c).toMatch(/private: true/);
    expect(rt).toMatch(/signInAnonymously\(\)/);
    expect(rt).toMatch(/who\.guest \? window\.sessionStorage : window\.localStorage/);
  });
  it("🚫 secret·service_role 키를 코드에 두지 않는다", () => {
    expect(cfg + rt).not.toMatch(/service_role|sb_secret_/);
  });
  it("공간을 나가면(화면이 사라지면) 연결을 끊는다", () => {
    expect(ui).toMatch(/return \(\) => \{\s*cancelled = true;\s*session\?\.leave\(\);/);
    expect(rt).toMatch(/leave\(\) \{[\s\S]*?untrack\(\)[\s\S]*?removeChannel\(ch\)/);
  });
});

describe("함께 머무는 사람 — 안전", () => {
  it("보내기 전 checkOutgoing · 연속 전송 제한 · 받은 건 acceptIncoming", () => {
    expect(ui).toMatch(/const c = checkOutgoing\(input\)/);
    expect(ui).toMatch(/limiter\.take\(\)/);
    expect(rt.match(/acceptIncoming\(payload\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it("★위험한 말은 안 보내고 상담 안내(RISK_REPLY)를 보여 준다", () => {
    const send = ui.slice(ui.indexOf("const send = () =>"), ui.indexOf("const msgs ="));
    expect(send).toMatch(/c\.reason === "risk" \? "risk"/);
    expect(send.indexOf('setNotice(c.reason === "risk"')).toBeLessThan(send.indexOf("s.sendRoom("));
    expect(ui).toMatch(/RISK_REPLY\.slice\(0, 2\)/);
  });
  it("가려진 메시지는 글을 보여 주지 않는다", () => {
    expect(ui).toMatch(/m\.hidden \? "안전을 위해 가려진 메시지예요\." : m\.text/);
  });
  it("🚫 메시지를 기기에 저장하지 않는다 — 저장소에 쓰는 건 고른 캐릭터뿐", () => {
    const writes = ui.match(/setItem\([^)]*\)/g) ?? [];
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/AVATAR_KEY/);
    expect(rt).not.toMatch(/localStorage\.setItem|sessionStorage\.setItem/);
  });
  it("차단·신고가 있다 · 신고하면 차단도", () => {
    expect(ui).toMatch(/>차단</);
    expect(ui).toMatch(/>신고</);
    expect(ui).toMatch(/if \(ok\) block\(peer\)/);
  });
  it("🚫 공간 화면(RoomView)에 명상 안내 글을 얹지 않는다는 기존 약속 그대로 — 함께하기 화면은 다른 파일", () => {
    const roomView = sheet.slice(sheet.indexOf("function RoomView"), sheet.indexOf("function SpeakerIcon"));
    expect(roomView).not.toMatch(/호흡|숨을|소리로 돌아|여운|싱잉볼 명상|명상 안내/);
    expect(roomView).toMatch(/<TogetherLayer /);
  });
});
