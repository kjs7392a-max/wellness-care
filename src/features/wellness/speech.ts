/**
 * 「오늘, 어떤 하루였나요?」 음성 입력 — 브라우저 내장 인식(Web Speech API)의 **판정·상태만** 담은 순수 모듈.
 *
 * 왜 화면에서 뺐나: 이 레포엔 jsdom 이 없어 화면 안에 두면 영원히 미검증으로 남는다(가드 주석 참고).
 * 여기엔 「지원하는가 · 무엇을 보낼 것인가 · 언제 스스로 꺼지는가」만 둔다. 실제 마이크 제어는 화면이 한다.
 *
 * 2026-09-22 사용자 확정:
 *   · 묻는 것은 말로, 답은 글로(읽어 주지 않는다 → 마이크가 제 소리를 되받을 일이 없다).
 *   · 「이어 말하기」 = 한 번 켜면 답이 온 뒤 스스로 다시 듣는다. 멈추려면 한 번 누른다.
 *   · 아무 말도 없으면 SILENT_STOP_MS 뒤 스스로 꺼진다(계속 듣고 있지 않게).
 * 🚫 답을 소리로 읽어 주는 기능을 여기에 얹지 말 것 — 그러면 마이크가 그 소리를 받아 되묻는다.
 */

/** 말이 끊긴 뒤 이만큼 아무 말도 없으면 「이어 말하기」를 스스로 끈다. */
export const SILENT_STOP_MS = 10_000;

/** 브라우저가 주는 인식기 생성자 — 표준 이름과 웹킷 접두 이름 둘 다 본다(사파리·구형 크롬은 접두만 있다). */
type RecognitionCtor = new () => unknown;
type SpeechWindow = {
  SpeechRecognition?: RecognitionCtor;
  webkitSpeechRecognition?: RecognitionCtor;
  isSecureContext?: boolean;
};

/**
 * 이 브라우저에서 음성 입력을 쓸 수 있는가. 못 쓰면 화면은 **마이크를 아예 안 그린다**
 * (눌러도 아무 일이 없는 단추를 두지 않는다).
 * ⚠ 보안 컨텍스트(https·localhost)가 아니면 브라우저가 마이크를 안 준다 — 그때도 false.
 */
export function speechSupport(w: SpeechWindow | undefined): boolean {
  if (!w) return false;
  if (w.isSecureContext === false) return false;
  return typeof (w.SpeechRecognition ?? w.webkitSpeechRecognition) === "function";
}

/** 인식기 생성자 하나 — 없으면 null. */
export function recognitionCtor(w: SpeechWindow | undefined): RecognitionCtor | null {
  if (!speechSupport(w)) return null;
  return (w!.SpeechRecognition ?? w!.webkitSpeechRecognition) ?? null;
}

/** 마이크 상태 — off(꺼짐) · listening(듣는 중) · waiting(답을 기다리는 중 · 「이어 말하기」는 유지) */
export type MicState = "off" | "listening" | "waiting";

/** 화면에 적는 한 줄. 상태마다 무엇이 일어나는지를 말한다(「듣고 있어요」가 안 보이면 켜진 줄 모른다). */
export function micHint(state: MicState): string {
  if (state === "listening") return "듣고 있어요 · 말씀하세요";
  if (state === "waiting") return "답을 쓰는 중이에요 · 곧 다시 들을게요";
  return "";
}

/**
 * 인식 결과를 보낼 것인지. 빈 소리·공백만 잡힌 것은 보내지 않는다(빈 말풍선이 생기면 안 된다).
 * 결과 문자열은 브라우저가 주는 그대로라 앞뒤 공백이 붙는다.
 */
export function shouldSend(transcript: string): boolean {
  return transcript.trim().length > 0;
}

/** 보낼 말 — 앞뒤 공백을 털고, 인식기가 겹쳐 준 공백을 한 칸으로 줄인다. */
export function cleanTranscript(transcript: string): string {
  return transcript.replace(/\s+/g, " ").trim();
}

/**
 * 답이 온 뒤 다시 들을 것인가 = 「이어 말하기」가 켜져 있고, 위험 응답이 뜬 게 아닐 때만.
 * ★ 위험 판정이 뜬 자리에서는 자동으로 다시 듣지 않는다 — 그 화면은 상담 안내를 읽어야 하는 자리다.
 */
export function shouldResume(opts: { keepOn: boolean; riskShown: boolean }): boolean {
  return opts.keepOn && !opts.riskShown;
}

/**
 * 말이 이만큼 멈추면 그때까지 들은 것을 **한 번에** 보낸다.
 * ★ 2026-09-25 사용자 "말하면 이어지지 않고 한 단어씩 끊겨" — continuous:true 에서는 인식기가 단어 한두 개마다
 *   조각을 끝냈다고(isFinal) 알린다. 그 순간 보내면 첫 단어만 가고, 답을 기다리는 동안 이어 한 말은 버려졌다.
 *   🚫 isFinal 순간에 바로 보내는 것으로 되돌리지 말 것(가드).
 */
export const SEND_PAUSE_MS = 1500;

/** 인식 결과 한 줄의 최소 모양(브라우저 SpeechRecognitionResult 에서 쓰는 것만). */
type HeardResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };

/**
 * 이번 세션 결과 중 from 번째부터(= 아직 안 보낸 것) 끝난 조각·말하는 중인 조각을 이어 한 문장으로.
 * 조각 사이는 한 칸 띄운다(붙이면 「오늘하루」처럼 뭉개진다) — 겹친 공백은 cleanTranscript 가 줄인다.
 */
export function heardSince(results: ArrayLike<HeardResult>, from: number): string {
  const parts: string[] = [];
  for (let i = Math.max(0, from); i < results.length; i++) parts.push(results[i][0]?.transcript ?? "");
  return mergeHeard(parts);
}

/** 공백을 뺀 모양 — 「오늘 하루」와 「오늘하루」를 같은 말로 본다. */
const bare = (t: string) => t.replace(/\s+/g, "");

/**
 * 조각들을 한 문장으로 잇는다.
 * ★ 2026-09-25 사용자 폰(안드로이드 크롬): 「오늘 하루 힘들었어」 한 번 말했는데
 *   「오늘오늘오늘오늘 오늘 하루 오늘 하루 힘들었어 오늘하루 힘들었어」로 나왔다 — 조각마다 **앞 말까지 누적해** 다시 준다.
 *   → 새 조각이 지금까지 이은 말로 시작하면 **바꿔 끼우고**, 이미 그 안에 있으면 **버리고**, 아니면 이어 붙인다.
 *   데스크톱 크롬처럼 새 조각만 주는 브라우저는 그대로 이어 붙는다.
 * ⚠ 대가: 같은 말을 일부러 되풀이한 것(「좋아 좋아」)은 하나로 접힐 수 있다 — 누적 반복보다 작은 손해라 받아들인다.
 */
export function mergeHeard(parts: readonly string[]): string {
  let out = "";
  for (const raw of parts) {
    const p = cleanTranscript(raw);
    if (!p) continue;
    const bo = bare(out), bp = bare(p);
    if (!bo || bp.startsWith(bo)) out = p;            // 누적 조각 — 앞 말을 포함한 더 긴 문장으로 바꿔 끼운다
    else if (bo.includes(bp)) continue;               // 이미 들은 말 — 버린다
    else out = `${out} ${p}`;                         // 새 조각 — 이어 붙인다
  }
  return cleanTranscript(out);
}
