/**
 * 추천 음악 — 장르 칩 넷(가요·클래식·재즈·팝송)은 언제나 같고, 그 안의 곡은 **나이대 × 성향**으로 고른다. 순수 모듈(테스트 music.test.ts).
 *
 * 2026-10-19 사용자: "4가지는 디폴트인데 연령대 성향별을 앱이 파악하고 거기에 맞는 4가지에 곡들을 선곡하는거지" → 선곡표(music-picks.ts) 방식 확정.
 *   · 9/19~10/19 는 채널 셋(emptysilver·클래식·가요)의 최신 영상을 서버가 읽어 왔다(`api/wellness/music`) — 곡마다 나이대·성향 정보가 없어 이번에 걷어냈다.
 *   · 나이대 = 라이프가이드 「내 프로필」(PROFILE_STORE_KEY) · 성향 = 마음 성향 유형(PERSONA_STORE_KEY). 둘 다 기기에 이미 있다 — 새로 묻지 않는다.
 *   · 모르면 기본값(30~40대 · 차분)으로 고르고, 화면이 「알려 주시면 맞춤 곡으로 바뀐다」고 말한다.
 * 🚫 자동재생 금지 · 음원을 앱에 담지 않는다(유튜브 공식 임베드만 · youtube-nocookie).
 */
import type { AgeBand } from "./directing/profile";
import { MUSIC_PICKS } from "./music-picks";

export type MusicGenre = "kpop" | "classical" | "jazz" | "pop";
export type MusicAge = "young" | "mid" | "senior";
export type MusicMood = "calm" | "emotional" | "lively" | "focus";

export const MUSIC_GENRES: ReadonlyArray<{ key: MusicGenre; label: string }> = [
  { key: "kpop", label: "가요" },
  { key: "classical", label: "클래식" },
  { key: "jazz", label: "재즈" },
  { key: "pop", label: "팝송" },
];
export const MUSIC_AGE_LABEL: Readonly<Record<MusicAge, string>> = { young: "10~20대", mid: "30~40대", senior: "50~60대" };
export const MUSIC_MOOD_LABEL: Readonly<Record<MusicMood, string>> = { calm: "차분형", emotional: "감성형", lively: "활기형", focus: "집중형" };
export const DEFAULT_AGE: MusicAge = "mid";
export const DEFAULT_MOOD: MusicMood = "calm";

/** 나이대 6칸 → 3묶음. 모르면 null. */
export function musicAgeOf(band: AgeBand | null | undefined): MusicAge | null {
  if (!band) return null;
  if (band === "10대" || band === "20대") return "young";
  if (band === "30대" || band === "40대") return "mid";
  return "senior";
}

/**
 * 성향 16유형 → 4묶음 = 에너지 방향(E/I) × 판단 축(F/T).
 *   I·T = 차분 · I·F = 감성 · E·F = 활기 · E·T = 집중. 유형 글자가 아니면 null.
 */
export function musicMoodOf(code: string | null | undefined): MusicMood | null {
  if (!code || !/^[EI][SN][TF][JP]$/.test(code)) return null;
  const e = code[0] === "E", f = code[2] === "F";
  return e ? (f ? "lively" : "focus") : (f ? "emotional" : "calm");
}

export interface MusicPick { ids: string[]; titles: string[]; age: MusicAge; mood: MusicMood; personal: boolean }

/** 장르 + 나이대 + 성향 → 곡 목록. 하나라도 모르면 그 칸만 기본값. personal = 둘 다 알았는가. */
export function musicPickFor(genre: MusicGenre, band: AgeBand | null | undefined, code: string | null | undefined): MusicPick {
  const a = musicAgeOf(band), m = musicMoodOf(code);
  const age = a ?? DEFAULT_AGE, mood = m ?? DEFAULT_MOOD;
  const list = MUSIC_PICKS[`${genre}/${age}/${mood}`] ?? [];
  return { ids: list.map(([id]) => id), titles: list.map(([, t]) => t), age, mood, personal: a !== null && m !== null };
}

/** 고른 곡부터 재생되게 목록을 돌린다(나머지 순서는 그대로). */
export function rotateFrom<T>(xs: readonly T[], i: number): T[] {
  if (i <= 0 || i >= xs.length) return xs.slice();
  return xs.slice(i).concat(xs.slice(0, i));
}

/** 첫 곡 + 나머지를 playlist 로(9/17 방식 그대로) · youtube-nocookie · 자동재생 없음. */
export function embedSrc(ids: string[]): string {
  const [first, ...rest] = ids;
  const q = rest.length ? `playlist=${rest.join(",")}&rel=0` : "rel=0";
  return `https://www.youtube-nocookie.com/embed/${first}?${q}`;
}
