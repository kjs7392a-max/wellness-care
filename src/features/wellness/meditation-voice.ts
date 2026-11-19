/**
 * 명상룸 음성 안내(2026-11-19 사용자 지시) — 영상 속 자막 세 줄을 **기기 내장 한국어 음성**(Web Speech API)으로 잔잔하게 읽는다.
 *
 * - 목소리: 사용자 선택 = 기기 내장 음성(외부 TTS·음성 파일 없음). 기기마다 다르다 — 더 자연스러운 것부터 고른다
 *   (엣지 Natural > 기기의 향상된/프리미엄 음성 > Google > 유나 · 맥의 장난 목소리 제외). 한국어 목소리가 없으면 읽지 않는다(자막만).
 * - 빈도: 들어올 때 한 바퀴(세 줄) 한 번 → 그 뒤엔 싱잉볼만. 머리줄 음성 단추로 다시 듣기·멈추기.
 * - ★속도(2026-11-19 사용자: "기계음이고 빨라" → "눈 감고 음성 따라 할 거니 끝나는 타임을 계산해서 속도 조절"):
 *   문장마다 **끝나는 시각(end)** 을 정해 두고, 두 마디(자막 두 줄)로 나눠 읽는다. 첫 마디는 잔잔한 속도로,
 *   첫 마디가 끝나면 남은 시간을 계산해 마디 사이 쉼을 정하고 둘째 마디가 end 에 끝나게 한다.
 *   기기 목소리의 실제 빠르기(음절/초)는 읽을 때마다 재서 다음 계산에 쓴다(`pace` — 기기에 저장).
 *   크롬(맥)처럼 속도를 일정 이하로 못 낮추는 엔진이어도 쉼이 그 차이를 메워 끝 시각은 지킨다.
 * - 영상: 2026-11-19 명상룸 영상을 30초(10초 장면 ×3)로 다시 만들었다 — 자막 한 장이 10초씩
 *   (글자 보임 0.21–9.83 · 10.33–19.92 · 20.38–30.0초). 문장은 자막이 뜬 뒤 0.8초에 시작해 6초 안에 끝낸다.
 * - 소리를 끄면 읽지 않는다(음성도 소리). 공간을 나가면 즉시 멈춘다.
 * - 🚫 이 글을 화면에 띄우지 말 것 — 영상에 이미 자막이 있다(space-ui.guard 가 SpaceSheet 를 지킨다).
 */

export interface GuideLine {
  /** 읽기 시작(영상 시간 · 초) */
  at: number;
  /** 이때까지 다 읽는다(영상 시간 · 초) */
  end: number;
  /** 자막 두 줄 그대로 — 사이에 쉼 */
  phrases: readonly [string, string];
}

/** 영상 한 바퀴 길이(초) — meditation.mp4(242프레임 ×3 · 24fps) */
export const GUIDE_LOOP_SECONDS = 30.25;
const CARD = 242 / 24; // 자막 한 장 = 10초 장면 한 바퀴
const slot = (k: number): { at: number; end: number } => ({ at: +(k * CARD + 0.8).toFixed(2), end: +(k * CARD + 6.8).toFixed(2) });

export const GUIDE_LINES: readonly GuideLine[] = [
  { ...slot(0), phrases: ["편안히 앉아", "어깨의 힘을 빼세요."] },
  { ...slot(1), phrases: ["숨을 편하게 쉬며", "소리의 여운을 느껴보세요."] },
  { ...slot(2), phrases: ["생각이 떠오르면", "천천히 소리로 돌아오세요."] },
];
export const lineText = (l: GuideLine) => l.phrases.join(" ");

/** 잔잔한 빠르기(음절/초) — 이 빠르기가 되도록 속도를 낮춘다. 단, 너무 늘이면 더 기계처럼 들려서 MIN_RATE 아래로는 안 내린다. */
export const CALM_SPS = 4.0;
export const MIN_RATE = 0.7;
export const GUIDE_PITCH = 1;
export const GUIDE_VOLUME_RATIO = 0.75;
/** 기기 목소리의 처음 짐작(속도 1 에서 음절/초) — 맥 「유나」 실측 근처. 읽을 때마다 고쳐 간다. */
export const DEFAULT_PACE = 6.2;
/** 마디 사이 쉼(초) — 이보다 짧거나 길게는 안 쉰다 */
export const MIN_GAP = 0.6;
export const MAX_GAP = 2.2;
/** 첫 줄이 지나고 이만큼(초) 넘어서 시작하면 이번 바퀴는 건너뛰고 다음 바퀴 처음부터. */
const LATE = 0.6;
/** '삼켜진 말' = 시작(onstart) 없이 이 시간(ms) 안에 끝남 → RETRY_MS 뒤 한 번만 다시(2026-11-19 맥 크롬 실측 — 빈 말 직후). */
const DROPPED_MS = 300;
const RETRY_MS = 250;
/** 시각 비교 여유(초) — 소수 오차·타이머가 조금 일찍 울리는 것 */
const EPS = 0.05;

/** 읽는 양 — 한글 음절 수(그 밖의 글자는 반 음절쯤) */
export function syllables(text: string): number {
  let n = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c >= 0xac00 && c <= 0xd7a3) n += 1;
    else if (/[0-9A-Za-z]/.test(ch)) n += 0.5;
  }
  return Math.max(1, n);
}

/** 이 빠르기(속도 1 에서 음절/초)의 목소리로 잔잔하게 — 속도 */
export function calmRate(pace: number): number {
  return Math.min(1, Math.max(MIN_RATE, CALM_SPS / Math.max(0.1, pace)));
}

/**
 * 둘째 마디를 언제 시작할지(영상 시간) — 끝 시각(end)에 맞춰 끝나도록. 쉼은 MIN_GAP~MAX_GAP.
 * @param now 첫 마디가 끝난 영상 시간
 */
export function secondPhraseAt(now: number, end: number, phrase: string, pace: number, rate: number): number {
  const speak = syllables(phrase) / (Math.max(0.1, pace) * rate);
  return Math.min(now + MAX_GAP, Math.max(now + MIN_GAP, end - speak));
}

export interface VoiceLike { name: string; lang: string; localService?: boolean }

const isKorean = (v: VoiceLike) => v.lang.replace("_", "-").toLowerCase().startsWith("ko");
/** 맥·iOS 의 장난스러운 목소리(할머니·할아버지·락코 등)는 명상에 맞지 않는다. */
const NOVELTY = /eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|할머니|할아버지/i;

/** 더 자연스럽게 들릴수록 높게 — "기계음" 피드백(2026-11-19) 뒤 순서: 엣지 Natural > 향상됨/프리미엄 > Google > 유나 */
function voiceScore(v: VoiceLike): number {
  let s = 0;
  if (/natural|neural/i.test(v.name)) s += 60;
  if (/premium|enhanced|프리미엄|향상/i.test(v.name)) s += 50;
  if (/google/i.test(v.name)) s += 35;
  if (/yuna|유나|sunhi|선희/i.test(v.name)) s += 30;
  if (v.lang.replace("_", "-").toLowerCase() === "ko-kr") s += 5;
  if (NOVELTY.test(v.name)) s -= 80;
  return s;
}

/** 한국어 목소리 중 가장 자연스러운 것 하나. 없으면 null(= 읽지 않는다). */
export function pickKoreanVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  const ko = voices.filter(isKorean);
  if (ko.length === 0) return null;
  return ko.reduce((best, v) => (voiceScore(v) > voiceScore(best) ? v : best));
}

export interface UtteranceLike {
  text: string; lang: string; rate: number; pitch: number; volume: number;
  voice: unknown;
  onstart: ((...a: never[]) => unknown) | null;
  onend: ((...a: never[]) => unknown) | null;
  onerror: ((...a: never[]) => unknown) | null;
}
export interface SynthLike<U> { speak(u: U): void; cancel(): void; speaking?: boolean; pending?: boolean }

/**
 * 한 바퀴 읽기 — 영상 시간(`tick(currentTime)`, 영상 timeupdate 에서 부른다)에 맞춰 문장마다 두 마디를 읽는다.
 * 순수 조립(브라우저 API 는 밖에서 넣는다) — 테스트 meditation-voice.test.ts.
 */
export function createMeditationGuide<U extends UtteranceLike>(opts: {
  synth: SynthLike<U>;
  makeUtterance: (text: string) => U;
  voice: unknown;
  onChange?: (playing: boolean) => void;
  /** 이 목소리의 빠르기(속도 1 에서 음절/초) — 지난번에 잰 값. 없으면 DEFAULT_PACE */
  pace?: number;
  /** 빠르기를 새로 쟀을 때(기기에 저장용) */
  onPace?: (pace: number) => void;
  /** 시험용 — 시계(ms)·지연 */
  now?: () => number;
  later?: (fn: () => void, ms: number) => void;
}) {
  const { synth, makeUtterance, voice, onChange, onPace } = opts;
  const now = opts.now ?? (() => Date.now());
  const later = opts.later ?? ((fn: () => void, ms: number) => { setTimeout(fn, ms); });
  const N = GUIDE_LINES.length;
  let pace = opts.pace && opts.pace > 0 ? opts.pace : DEFAULT_PACE;
  let state: "idle" | "waiting" | "running" = "idle";
  let line = N;          // 지금(또는 다음) 문장
  let phase = 0;         // 0 = 첫 마디 전 · 1 = 첫 마디 읽는 중 · 2 = 둘째 마디 기다림 · 3 = 둘째 마디 읽는 중
  let secondAt = 0;      // 둘째 마디 시작(영상 시간)
  let rate = 1;
  let busy = false;
  let last = -1;         // 마지막 영상 시간
  let lastWall = 0;      // 그때의 벽시계(ms)
  let volume = 0.6;
  let generation = 0;
  let measuredOnce = false;

  const isPlaying = () => state !== "idle";
  const set = (s: typeof state) => {
    const was = isPlaying();
    state = s;
    if (was !== isPlaying()) onChange?.(isPlaying());
  };
  /** 지금 영상 시간 짐작 — 마지막 tick 이후 흐른 벽시계만큼 */
  const videoNow = () => last + Math.max(0, now() - lastWall) / 1000;
  const quiet = () => { if (synth.speaking || synth.pending) synth.cancel(); };

  const finishLine = () => {
    line += 1;
    phase = 0;
    if (line >= N) set("idle");
  };

  /** 마디 하나 읽기 — 끝나면 then() */
  const say = (text: string, then: () => void, retry = false) => {
    const u = makeUtterance(text);
    u.lang = "ko-KR";
    u.voice = voice;
    u.rate = rate;
    u.pitch = GUIDE_PITCH;
    u.volume = Math.min(1, Math.max(0, volume * GUIDE_VOLUME_RATIO));
    const g = generation;
    const queued = now();
    let startedAt: number | null = null;
    busy = true;
    u.onstart = () => { startedAt = now(); };
    const done = () => {
      if (g !== generation) return; // 멈춘 뒤 늦게 온 끝 알림은 무시
      const t = now();
      if (startedAt === null && t - queued < DROPPED_MS && !retry) {
        later(() => { if (g === generation) say(text, then, true); }, RETRY_MS);
        return;
      }
      // 실제 빠르기를 재서 다음 계산에 — 너무 짧은 건(끊김·오류) 버린다
      if (startedAt !== null) {
        const sec = (t - startedAt) / 1000;
        if (sec > 0.5) {
          const measured = syllables(text) / (sec * rate);
          if (measured > 1 && measured < 20) {
            pace = measuredOnce ? pace * 0.4 + measured * 0.6 : measured; // 처음 잰 값은 그대로 — 짐작보다 실측
            measuredOnce = true;
            onPace?.(pace);
          }
        }
      }
      busy = false;
      then();
      if (state === "running" && !busy && line >= N) set("idle"); // 남은 문장을 버린 뒤(되감김) 읽던 마디가 끝났다
    };
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  };

  const step = (t: number) => {
    if (state !== "running" || busy || line >= N) return;
    const l = GUIDE_LINES[line];
    if (phase === 0 && t + EPS >= l.at) {
      rate = calmRate(pace);
      phase = 1;
      say(l.phrases[0], () => {
        const t0 = videoNow();
        secondAt = secondPhraseAt(t0, l.end, l.phrases[1], pace, rate);
        phase = 2;
        // 둘째 마디는 계산한 시각에 정확히(timeupdate 는 0.25초 간격이라 늦다) — tick 도 같이 본다(먼저 오는 쪽)
        const g = generation;
        later(() => { if (g === generation) step(videoNow()); }, Math.max(0, Math.round((secondAt - t0) * 1000)));
      });
    } else if (phase === 2 && t + EPS >= secondAt) {
      phase = 3;
      say(l.phrases[1], () => { finishLine(); step(videoNow()); });
    }
  };

  const tick = (t: number) => {
    const wrapped = last >= 0 && t < last - 1;
    last = t;
    lastWall = now();
    if (state === "waiting") {
      if (!wrapped) return;
      line = 0;
      phase = 0;
      set("running");
    } else if (state === "running" && wrapped) {
      // 다 읽기 전에 한 바퀴가 끝났다(되감김 등) — 남은 문장은 버린다. 읽던 마디는 끝까지.
      line = N;
      phase = 0;
      if (!busy) set("idle");
      return;
    }
    step(t);
  };

  return {
    get playing() { return isPlaying(); },
    get pace() { return pace; },
    setVolume(v: number) { volume = v; },
    /** 영상 시간 t 에서 한 바퀴 시작 — 첫 줄을 이미 많이 지났으면 다음 바퀴 처음부터. */
    start(t: number) {
      generation += 1;
      quiet();
      busy = false;
      line = 0;
      phase = 0;
      last = t;
      lastWall = now();
      if (t <= GUIDE_LINES[0].at + LATE) {
        set("running");
        step(t);
      } else set("waiting");
    },
    tick,
    stop() {
      generation += 1;
      busy = false;
      line = N;
      phase = 0;
      synth.cancel(); // 멈출 땐 늘 비운다
      set("idle");
    },
  };
}
export type MeditationGuide = ReturnType<typeof createMeditationGuide>;
