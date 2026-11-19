/**
 * 명상룸 음성 안내(2026-11-19 사용자 지시) — 영상 속 자막 세 줄을 **기기 내장 한국어 음성**(Web Speech API)으로 잔잔하게 읽는다.
 *
 * - 목소리: 사용자 선택 = 기기 내장 음성(외부 TTS·음성 파일 없음 · 비용 없음). 그래서 목소리는 기기마다 다르다
 *   (아이폰·맥 = 유나 · 안드로이드/크롬 = Google 한국어 · 윈도 엣지 = SunHi 등). 한국어 목소리가 없는 기기는 읽지 않는다(자막만).
 * - 빈도: 사용자 미답 → 가정 = **들어올 때 한 바퀴(세 줄) 한 번**, 그 뒤엔 싱잉볼만. 머리줄 「음성 안내」 단추로 다시 듣기·멈추기.
 * - 시점: 영상 자막이 뜨는 때에 맞춘다. 2026-11-19 프레임 실측(24fps) — 글자가 다 보이는 때 0.21s · 3.42s · 6.83s,
 *   앞 자막이 흐려지기 시작하는(= 새 자막이 떠오르기 시작하는) 때 3.04s · 6.42s. 그래서 0.1 · 3.05 · 6.45 에 읽기 시작한다.
 * - 길이(2026-11-19 맥 크롬 「유나」 · 속도 0.85 실측): 2.8 · 3.4 · 3.7초 → 0.1–2.9 · 3.05–6.4 · 6.45–10.1 로 자막 칸과 맞는다.
 *   쉼표를 넣으면 줄마다 0.4~0.9초 길어져 셋째 줄이 다음 바퀴 첫 자막까지 1초 넘게 넘어갔다 → 🚫 쉼표 넣지 말 것.
 *   목소리가 다른 기기에서 조금 길어지면 겹치지 않고 차례로 이어 읽는다(음성 엔진의 대기열).
 * - 소리를 끄면 읽지 않는다(음성도 소리). 공간을 나가면 즉시 멈춘다.
 * - 🚫 이 글을 화면에 띄우지 말 것 — 영상에 이미 자막이 있다(space-ui.guard 가 SpaceSheet 를 지킨다).
 */

export interface GuideLine { at: number; text: string }

/** 자막과 같은 말(글자 그대로) */
export const GUIDE_LINES: readonly GuideLine[] = [
  { at: 0.1, text: "편안히 앉아 어깨의 힘을 빼세요." },
  { at: 3.05, text: "숨을 편하게 쉬며 소리의 여운을 느껴보세요." },
  { at: 6.45, text: "생각이 떠오르면 천천히 소리로 돌아오세요." },
];
/** 영상 한 바퀴 길이(초) — meditation.mp4 */
export const GUIDE_LOOP_SECONDS = 10.08;
/** 잔잔하게 — 조금 느리게 · 조금 낮게 · 싱잉볼보다 조금 작게 */
export const GUIDE_RATE = 0.85;
export const GUIDE_PITCH = 0.95;
export const GUIDE_VOLUME_RATIO = 0.75;
/** 첫 줄이 지나고 이만큼(초) 넘어서 시작하면 이번 바퀴는 건너뛰고 다음 바퀴 처음부터 세 줄을 다 읽는다. */
const LATE = 0.6;
/**
 * '삼켜진 말' = 시작(onstart) 없이 DROPPED_MS 안에 끝남 → RETRY_MS 뒤 한 번만 다시 넣는다.
 * 2026-11-19 맥 크롬 실측: 빈 말(" ") 바로 뒤에 넣은 말이 이렇게 사라졌다.
 * (시작하자마자 끊기는 것처럼 보인 기록은 시험용 영상이 화면 밖이라 크롬이 멈춘 탓이었다 — 실제 끊김 아님, 다시 넣지 않는다.)
 */
const DROPPED_MS = 300;
const RETRY_MS = 250;

export interface VoiceLike { name: string; lang: string; localService?: boolean }

const isKorean = (v: VoiceLike) => v.lang.replace("_", "-").toLowerCase().startsWith("ko");
/** 맥·iOS 의 장난스러운 목소리(할머니·할아버지·락코 등)는 명상에 맞지 않는다. */
const NOVELTY = /eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|할머니|할아버지/i;

function voiceScore(v: VoiceLike): number {
  let s = 0;
  if (/yuna|유나/i.test(v.name)) s += 40;
  if (/sunhi|선희|natural/i.test(v.name)) s += 30;
  if (/google/i.test(v.name)) s += 20;
  if (/premium|enhanced|고품질|향상/i.test(v.name)) s += 15;
  if (v.lang.replace("_", "-").toLowerCase() === "ko-kr") s += 5;
  if (NOVELTY.test(v.name)) s -= 60;
  return s;
}

/** 한국어 목소리 중 가장 잔잔하게 들릴 것 하나. 없으면 null(= 읽지 않는다). */
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
 * 한 바퀴 읽기 — 영상 시간(`tick(currentTime)`, 영상 timeupdate 에서 부른다)에 맞춰 세 줄을 차례로 대기열에 넣는다.
 * 순수 조립(브라우저 API 는 밖에서 넣는다) — 테스트 meditation-voice.test.ts.
 */
export function createMeditationGuide<U extends UtteranceLike>(opts: {
  synth: SynthLike<U>;
  makeUtterance: (text: string) => U;
  voice: unknown;
  onChange?: (playing: boolean) => void;
  /** 시험용 — 시계·지연 */
  now?: () => number;
  later?: (fn: () => void, ms: number) => void;
}) {
  const { synth, makeUtterance, voice, onChange } = opts;
  const now = opts.now ?? (() => Date.now());
  const later = opts.later ?? ((fn: () => void, ms: number) => { setTimeout(fn, ms); });
  const N = GUIDE_LINES.length;
  let state: "idle" | "waiting" | "running" = "idle";
  let next = N;
  let last = -1;
  let volume = 0.6;
  let pending = 0;
  let generation = 0;

  const isPlaying = () => state !== "idle";
  const set = (s: typeof state) => {
    const was = isPlaying();
    state = s;
    if (was !== isPlaying()) onChange?.(isPlaying());
  };
  const finishIfDone = () => { if (state === "running" && next >= N && pending <= 0) set("idle"); };
  const quiet = () => { if (synth.speaking || synth.pending) synth.cancel(); };

  const say = (line: GuideLine, retry = false) => {
    const u = makeUtterance(line.text);
    u.lang = "ko-KR";
    u.voice = voice;
    u.rate = GUIDE_RATE;
    u.pitch = GUIDE_PITCH;
    u.volume = Math.min(1, Math.max(0, volume * GUIDE_VOLUME_RATIO));
    const g = generation;
    const queued = now();
    let startedAt: number | null = null;
    if (!retry) pending += 1;
    u.onstart = () => { startedAt = now(); };
    const done = () => {
      if (g !== generation) return; // 멈춘 뒤 늦게 온 끝 알림은 무시
      // ★크롬: 말이 시작도 못 하고 곧바로 끝나 버리는 일이 있다(위 DROPPED_MS 실측). 그럴 땐 한 번만 다시 넣는다.
      const swallowed = startedAt === null && now() - queued < DROPPED_MS;
      if (swallowed && !retry) {
        later(() => { if (g === generation) say(line, true); }, RETRY_MS);
        return;
      }
      pending -= 1;
      finishIfDone();
    };
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  };

  const tick = (t: number) => {
    const wrapped = last >= 0 && t < last - 1;
    last = t;
    if (state === "waiting") {
      if (!wrapped) return;
      next = 0;
      set("running");
    } else if (state === "running" && wrapped && next < N) {
      // 다 읽기 전에 한 바퀴가 끝났다(재생이 멈췄다 섰다 등) — 남은 줄은 버린다. 자막과 어긋난 말을 하지 않는다.
      next = N;
      finishIfDone();
      return;
    }
    if (state !== "running") return;
    while (next < N && t >= GUIDE_LINES[next].at) {
      say(GUIDE_LINES[next]);
      next += 1;
    }
  };

  return {
    get playing() { return isPlaying(); },
    setVolume(v: number) { volume = v; },
    /** 영상 시간 t 에서 한 바퀴 시작 — 첫 줄을 이미 많이 지났으면 다음 바퀴 처음부터. */
    start(t: number) {
      generation += 1;
      quiet();
      pending = 0;
      next = 0;
      last = t;
      if (t <= GUIDE_LINES[0].at + LATE) {
        set("running");
        tick(t);
      } else set("waiting");
    },
    tick,
    stop() {
      generation += 1;
      pending = 0;
      next = N;
      synth.cancel(); // 멈출 땐 늘 비운다(시작 때만 조건부 — 크롬은 cancel 직후 speak 를 가끔 삼킨다)
      set("idle");
    },
  };
}
export type MeditationGuide = ReturnType<typeof createMeditationGuide>;
