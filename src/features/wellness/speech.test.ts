import { describe, expect, it } from "vitest";
import { SILENT_STOP_MS, cleanTranscript, micHint, recognitionCtor, shouldResume, shouldSend, speechSupport } from "./speech";

const ctor = function () {} as unknown as new () => unknown;

describe("speechSupport — 못 쓰는 브라우저에서는 마이크를 안 그린다", () => {
  it("표준 이름만 있어도 · 웹킷 접두만 있어도 쓸 수 있다", () => {
    expect(speechSupport({ SpeechRecognition: ctor })).toBe(true);
    expect(speechSupport({ webkitSpeechRecognition: ctor })).toBe(true);
  });
  it("둘 다 없으면 false · window 가 없어도 false(서버 렌더)", () => {
    expect(speechSupport({})).toBe(false);
    expect(speechSupport(undefined)).toBe(false);
  });
  it("보안 컨텍스트가 아니면 false — 브라우저가 마이크를 주지 않는다", () => {
    expect(speechSupport({ SpeechRecognition: ctor, isSecureContext: false })).toBe(false);
    expect(speechSupport({ SpeechRecognition: ctor, isSecureContext: true })).toBe(true);
  });
  it("recognitionCtor 는 쓸 수 있을 때만 생성자를 준다", () => {
    expect(recognitionCtor({ webkitSpeechRecognition: ctor })).toBe(ctor);
    expect(recognitionCtor({})).toBeNull();
    expect(recognitionCtor({ SpeechRecognition: ctor, isSecureContext: false })).toBeNull();
  });
});

describe("shouldSend / cleanTranscript — 빈 소리는 보내지 않는다", () => {
  it("빈 문자열·공백만이면 안 보낸다", () => {
    expect(shouldSend("")).toBe(false);
    expect(shouldSend("   ")).toBe(false);
    expect(shouldSend("\n \t")).toBe(false);
  });
  it("글자가 하나라도 있으면 보낸다", () => {
    expect(shouldSend(" 네 ")).toBe(true);
  });
  it("앞뒤 공백을 털고 겹친 공백은 한 칸으로", () => {
    expect(cleanTranscript("  오늘   정말  힘들었어요 ")).toBe("오늘 정말 힘들었어요");
    expect(cleanTranscript("한 줄\n두 줄")).toBe("한 줄 두 줄");
  });
});

describe("shouldResume — 답이 온 뒤 다시 들을 것인가", () => {
  it("「이어 말하기」가 켜져 있으면 다시 듣는다", () => {
    expect(shouldResume({ keepOn: true, riskShown: false })).toBe(true);
  });
  it("꺼져 있으면 안 듣는다", () => {
    expect(shouldResume({ keepOn: false, riskShown: false })).toBe(false);
  });
  it("위험 응답이 뜬 자리에서는 켜져 있어도 다시 듣지 않는다(상담 안내를 읽는 자리)", () => {
    expect(shouldResume({ keepOn: true, riskShown: true })).toBe(false);
  });
});

describe("micHint — 켜진 줄 모르면 안 된다", () => {
  it("상태마다 무엇이 일어나는지 말한다 · 꺼져 있으면 빈 문자열", () => {
    expect(micHint("listening")).toContain("듣고 있어요");
    expect(micHint("waiting")).toContain("다시 들을게요");
    expect(micHint("off")).toBe("");
  });
});

describe("SILENT_STOP_MS — 계속 듣고 있지 않게", () => {
  it("아무 말이 없으면 스스로 꺼지는 시간이 정해져 있다(5~30초)", () => {
    expect(SILENT_STOP_MS).toBeGreaterThanOrEqual(5_000);
    expect(SILENT_STOP_MS).toBeLessThanOrEqual(30_000);
  });
});
