import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SPACE_ROOMS } from "./space";

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

  it("무음 영상은 유지하고 별도 오디오에도 소리 단추를 제공한다", () => {
    expect(roomView).toMatch(/muted=\{!room\.sound\}/);
    expect(roomView).toContain("data-space-sound");
    expect(roomView).toContain("<audio");
    expect(roomView).toContain("소리 듣기");
    expect(roomView).toMatch(/data-space-sound-toggle/);
    expect(roomView).toMatch(/type="range"[\s\S]*?data-space-volume/);
  });

  it("🚫 명상룸 영상에 이미 있는 명상 안내를 화면에 또 얹지 않는다", () => {
    expect(roomView).not.toMatch(/호흡|숨을|소리로 돌아|여운|싱잉볼 명상|명상 안내/);
  });
});

describe("명상룸 음성 안내 — 자막을 기기 음성으로(2026-11-19 사용자 지시)", () => {
  it("명상룸만 voiceGuide · 공간 고르는 클릭에서 음성을 준비한다(iOS 는 첫 speak 가 클릭 안이어야)", () => {
    expect(SPACE_ROOMS.filter((r) => r.voiceGuide).map((r) => r.id)).toEqual(["meditation"]);
    const enter = sheet.slice(sheet.indexOf("const enter = (r: SpaceRoom)"), sheet.indexOf("setRoomId(r.id);"));
    expect(enter).toMatch(/if \(r\.voiceGuide\) primeSpeech\(\)/);
  });
  it("영상 시간에 맞춰 읽는다 — timeupdate → tick · 재생 시작 → 한 바퀴 시작(한 번)", () => {
    expect(roomView).toMatch(/onTimeUpdate=\{\(e\) => guideRef\.current\?\.tick\(e\.currentTarget\.currentTime\)\}/);
    expect(roomView).toMatch(/onPlaying=\{maybeAutoGuide\}/);
    expect(roomView).toMatch(/autoGuideRef\.current = false;\s*guide\.start\(video\.currentTime\)/);
    expect(roomView).toMatch(/createMeditationGuide</);
  });
  it("소리를 끄면 · 나가면 · 화면이 닫히면 음성을 멈춘다", () => {
    const apply = roomView.slice(roomView.indexOf("const apply = (p: SoundPref)"), roomView.indexOf("const video = ref.current;", roomView.indexOf("const apply = (p: SoundPref)")));
    expect(apply).toMatch(/if \(!p\.on\) guideRef\.current\?\.stop\(\)/);
    expect(roomView).toMatch(/const leave = \(\) => \{[^\n]*guideRef\.current\?\.stop\(\)/);
    expect(roomView).toMatch(/return \(\) => \{\s*guideRef\.current\?\.stop\(\);/);
  });
  it("단추는 목소리가 있고 소리가 켜졌을 때만 · 이름은 「음성 안내 다시 듣기 / 멈추기」", () => {
    expect(roomView).toMatch(/room\.voiceGuide && voice && soundOn && \(/);
    expect(roomView).toContain("data-space-voice-guide");
    expect(roomView).toContain("음성 안내 다시 듣기");
    expect(roomView).toContain("음성 안내 멈추기");
  });
  it("🚫 읽을 말은 meditation-voice.ts 에만 — 화면 파일엔 자막 문장이 없다", () => {
    expect(sheet).not.toMatch(/어깨의 힘|여운을|소리로 돌아오/);
  });
});
