import { describe, expect, it } from "vitest";
import { QUICK_SEND_MS, dropSentPrefix, sentMemoryAfter, SEND_PAUSE_MS, sendDelay, steadyText, SILENT_STOP_MS, cleanTranscript, heardSince, mergeHeard, micHint, recognitionCtor, shouldResume, shouldSend, speechSupport } from "./speech";

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

describe("heardSince / SEND_PAUSE_MS — 한 조각마다 보내지 않고 말이 멈춘 뒤 한 번에 (2026-09-25 한 단어씩 끊김)", () => {
  const res = (...xs: [string, boolean][]) => xs.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f }));
  it("끝난 조각과 아직 말하는 조각을 이어 한 문장으로 만든다", () => {
    expect(heardSince(res(["오늘", true], [" 하루는", true], [" 좀 힘들었", false]), 0)).toBe("오늘 하루는 좀 힘들었");
  });
  it("이미 보낸 조각(from 앞)은 다시 안 넣는다", () => {
    expect(heardSince(res(["아까 보낸 말", true], ["새 말", true]), 1)).toBe("새 말");
    expect(heardSince(res(["아까 보낸 말", true]), 1)).toBe("");
  });
  it("조각 사이 공백이 없어도 한 칸 띄워 잇는다(조각을 붙여 단어가 뭉개지지 않게)", () => {
    expect(heardSince(res(["오늘", true], ["하루", true]), 0)).toBe("오늘 하루");
  });
  it("멈춤 기준은 1.5초 — 짧으면 또 끊기고 길면 답이 늦다", () => {
    expect(SEND_PAUSE_MS).toBe(1500);
    expect(SEND_PAUSE_MS).toBeLessThan(SILENT_STOP_MS);
  });
});

describe("mergeHeard — 안드로이드 크롬은 앞 말까지 누적해 다시 준다(2026-09-25 「오늘오늘오늘 오늘 하루…」)", () => {
  it("사용자 폰에서 실제로 온 모양 → 한 문장", () => {
    expect(mergeHeard(["오늘", "오늘", "오늘", "오늘", "오늘 하루", "오늘 하루 힘들었어", "오늘하루 힘들었어"])).toBe("오늘하루 힘들었어");
  });
  it("누적이 아니라 새 조각이면 이어 붙인다(데스크톱 크롬 모양)", () => {
    expect(mergeHeard(["오늘", "하루는", "힘들었어"])).toBe("오늘 하루는 힘들었어");
  });
  it("뒤 조각이 앞 문장 안에 이미 있으면 버린다 · 빈 조각은 무시", () => {
    expect(mergeHeard(["오늘 하루 힘들었어", "힘들었어", ""])).toBe("오늘 하루 힘들었어");
  });
  it("heardSince 도 같은 규칙으로 잇는다", () => {
    const res = ["오늘", "오늘 하루", "오늘 하루 힘들었어"].map((t) => Object.assign([{ transcript: t }], { isFinal: true }));
    expect(heardSince(res, 0)).toBe("오늘 하루 힘들었어");
  });
});

describe("sendDelay — 인식기가 문장을 확정했으면 빨리, 아직 말하는 중이면 기다린다(2026-09-25 「보내기까지 너무 느림」)", () => {
  it("마지막 조각이 확정(isFinal)이면 짧게 · 아니면 SEND_PAUSE_MS", () => {
    expect(sendDelay(true)).toBe(QUICK_SEND_MS);
    expect(sendDelay(false)).toBe(SEND_PAUSE_MS);
    expect(QUICK_SEND_MS).toBeLessThan(SEND_PAUSE_MS);
    expect(QUICK_SEND_MS).toBe(600);
  });
});

describe("steadyText — 입력칸 글자는 뒷걸음치지 않는다(2026-09-25 「말하는 중 글자가 튐」)", () => {
  it("새 글자가 보이는 글자의 앞부분일 뿐이면(줄어듦) 그대로 둔다", () => {
    expect(steadyText("오늘 하루 힘들", "오늘 하루")).toBe("오늘 하루 힘들");
    expect(steadyText("오늘 하루", "오늘하")).toBe("오늘 하루");
  });
  it("늘어나거나 고쳐진 글자는 바로 보여 준다", () => {
    expect(steadyText("오늘 하루", "오늘 하루 힘들었어")).toBe("오늘 하루 힘들었어");
    expect(steadyText("오늘 하로", "오늘 하루")).toBe("오늘 하루");
    expect(steadyText("", "오늘")).toBe("오늘");
  });
  it("새 글자가 비면(보냈거나 지웠을 때) 비운다", () => {
    expect(steadyText("오늘 하루", "")).toBe("");
  });
});

describe("dropSentPrefix — 이미 보낸 말을 안드로이드가 다시 붙여 줘도 두 번 보내지 않는다(2026-09-25 「졸립다」→「졸립다 자야겠다」)", () => {
  it("사용자 폰 모양: 보낸 「졸립다」 뒤 「졸립다 자야겠다」 → 「자야겠다」만", () => {
    expect(dropSentPrefix("졸립다 자야겠다", "졸립다")).toBe("자야겠다");
  });
  it("공백이 달라도 같은 말로 본다", () => {
    expect(dropSentPrefix("오늘하루 힘들었어 이제 잘래", "오늘 하루 힘들었어")).toBe("이제 잘래");
  });
  it("보낸 말과 똑같이 다시 온 것뿐이면 빈 문자열(보낼 게 없다)", () => {
    expect(dropSentPrefix("졸립다", "졸립다")).toBe("");
  });
  it("보낸 말로 시작하지 않으면 그대로 · 보낸 말이 없어도 그대로", () => {
    expect(dropSentPrefix("자야겠다", "졸립다")).toBe("자야겠다");
    expect(dropSentPrefix("졸립다", "")).toBe("졸립다");
  });
});

describe("sentMemoryAfter — 방금 보낸 말은 상관없는 새 말이 들어올 때 잊는다(세션이 바뀌어도 기억)", () => {
  it("보낸 말로 시작하거나(누적) 보낸 말의 앞부분(말하는 중)이면 기억을 유지", () => {
    expect(sentMemoryAfter("졸립다 자야겠다", "졸립다")).toBe("졸립다");
    expect(sentMemoryAfter("졸립", "졸립다")).toBe("졸립다");
  });
  it("상관없는 새 말이면 잊는다 · 아직 들은 게 없으면 유지", () => {
    expect(sentMemoryAfter("배고파", "졸립다")).toBe("");
    expect(sentMemoryAfter("", "졸립다")).toBe("졸립다");
  });
});
