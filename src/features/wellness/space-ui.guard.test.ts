import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 화면(jsdom 없음)은 소스로 지킨다 — 2026-11-08 「마음 쉼터」 연결.
const app = readFileSync(join(__dirname, "WellnessApp.tsx"), "utf8");
const sheet = readFileSync(join(__dirname, "SpaceSheet.tsx"), "utf8");
const roomView = sheet.slice(sheet.indexOf("function RoomView"), sheet.indexOf("function SpeakerIcon"));

describe("마음 쉼터 — 앱에 연결", () => {
  it("케어 탭 마음 박스에 「마음 쉼터」 줄이 있고 sheet space 를 연다", () => {
    expect(app).toMatch(/id: "space", emoji: "🕯️", label: "마음 쉼터"[^\n]*sheet: "space"/);
    expect(app).toMatch(/s\.sheet === "space" && <SpaceSheet onClose=/);
  });
});

describe("마음 쉼터 — 공간 화면", () => {
  it("영상은 반복 재생(loop) · 세로로 꽉 맞춤은 fitRoomVideo 가 정한다", () => {
    expect(roomView).toMatch(/<video[\s\S]*?\bloop\b/);
    expect(roomView).toMatch(/fitRoomVideo\(/);
    expect(roomView).not.toMatch(/object-fit:cover|objectFit:\s*"cover"/);
  });

  it("소리 없는 공간은 무음(muted) — 소리 단추는 room.sound 일 때만", () => {
    expect(roomView).toMatch(/muted=\{!room\.sound\}/);
    expect(roomView).toMatch(/\{room\.sound && \(\s*<div data-space-sound/);
    expect(roomView).toMatch(/data-space-sound-toggle/);
    expect(roomView).toMatch(/type="range"[\s\S]*?data-space-volume/);
  });

  it("🚫 명상룸 영상에 이미 있는 명상 안내를 화면에 또 얹지 않는다", () => {
    expect(roomView).not.toMatch(/호흡|숨을|소리로 돌아|여운|싱잉볼 명상|명상 안내/);
  });
});
