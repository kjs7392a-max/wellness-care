/**
 * 추천 음악 — 장르 칩 넷(가요·클래식·재즈·팝송) → 묶음 칩(시대·분위기) → 여러 곡이 이어지는 「모음」. 순수 모듈(테스트 music.test.ts).
 *
 * 2026-10-20 사용자: "그냥 노래선곡하지 말고 여러곡이 나오는 사이트 예를 들어서 7080 모음 2030모음 아니면 80년대 모음 90년대 모음
 *   이런 식으로 분류해줘 재즈도 가요도 팝송도" → 한 곡씩 고른 선곡표(10/19 music-picks.ts)를 걷어내고 모음표(music-collections.ts)로.
 *   · 가요·팝송 = 시대 묶음. 처음 펼치는 묶음만 나이대(내 프로필)로 정한다 — 60대는 7080, 20대는 2010년대처럼 그 시절부터.
 *   · 재즈·클래식 = 분위기 묶음. 처음 펼치는 묶음만 마음 성향(차분·감성·활기·집중)으로 정한다.
 *   · 모르면 맨 앞 묶음이 아니라 정해 둔 기본 묶음 · 화면이 「알려 주시면 맞는 묶음부터」라고 말한다. 고른 뒤엔 사람이 고른 묶음을 따른다.
 * 🚫 자동재생 금지 · 음원을 앱에 담지 않는다(유튜브 공식 임베드만 · youtube-nocookie).
 */
import type { AgeBand } from "./directing/profile";
import { MUSIC_COLLECTIONS } from "./music-collections";

export type MusicGenre = "kpop" | "classical" | "jazz" | "pop";
export type MusicMood = "calm" | "emotional" | "lively" | "focus";

/** video = 영상 하나에 여러 곡(방송사 모음) · list = 공식 재생목록 */
export interface MusicItem { kind: "video" | "list"; id: string; title: string; source: string }
export interface MusicGroup { label: string; items: readonly MusicItem[] }
export type MusicCollections = Readonly<Record<MusicGenre, readonly MusicGroup[]>>;

export const MUSIC_GENRES: ReadonlyArray<{ key: MusicGenre; label: string }> = [
  { key: "kpop", label: "가요" },
  { key: "classical", label: "클래식" },
  { key: "jazz", label: "재즈" },
  { key: "pop", label: "팝송" },
];
export const MUSIC_MOOD_LABEL: Readonly<Record<MusicMood, string>> = { calm: "차분형", emotional: "감성형", lively: "활기형", focus: "집중형" };

/** 가요·팝송은 나이대로, 재즈·클래식은 성향으로 첫 묶음을 고른다. 값 = 묶음 라벨(music-collections.ts 와 글자까지 같아야 한다 — 테스트가 지킨다). */
export const DEFAULT_GROUP_BY_AGE: Readonly<Record<"kpop" | "pop", Readonly<Record<AgeBand, string>> & { unknown: string }>> = {
  kpop: { "10대": "2020년대", "20대": "2010년대", "30대": "2000년대", "40대": "90년대", "50대": "80년대", "60대": "7080", unknown: "90년대" },
  pop: { "10대": "최신", "20대": "2010년대", "30대": "2000년대", "40대": "90년대", "50대": "80년대", "60대": "70년대", unknown: "90년대" },
};
export const DEFAULT_GROUP_BY_MOOD: Readonly<Record<"jazz" | "classical", Readonly<Record<MusicMood, string>> & { unknown: string }>> = {
  jazz: { calm: "피아노", emotional: "보컬", lively: "신나는", focus: "명곡", unknown: "명곡" },
  classical: { calm: "피아노", emotional: "휴식·잠", lively: "아침", focus: "집중", unknown: "명곡" },
};

/**
 * 성향 16유형 → 4묶음 = 에너지 방향(E/I) × 판단 축(F/T).
 *   I·T = 차분 · I·F = 감성 · E·F = 활기 · E·T = 집중. 유형 글자가 아니면 null.
 */
export function musicMoodOf(code: string | null | undefined): MusicMood | null {
  if (!code || !/^[EI][SN][TF][JP]$/.test(code)) return null;
  const e = code[0] === "E", f = code[2] === "F";
  return e ? (f ? "lively" : "focus") : (f ? "emotional" : "calm");
}

export interface MusicDefault {
  /** 처음 펼칠 묶음 번호 */
  index: number;
  /** 무엇으로 골랐나 — 화면 안내 한 줄용. null = 몰라서 기본 묶음 */
  basis: { kind: "age"; band: AgeBand } | { kind: "mood"; mood: MusicMood } | null;
}

/** 장르 + 나이대 + 성향 → 처음 펼칠 묶음. 가요·팝송은 나이대만, 재즈·클래식은 성향만 본다. */
export function defaultGroupFor(genre: MusicGenre, band: AgeBand | null | undefined, code: string | null | undefined): MusicDefault {
  const groups = MUSIC_COLLECTIONS[genre];
  const at = (label: string) => Math.max(0, groups.findIndex((g) => g.label === label));
  if (genre === "kpop" || genre === "pop") {
    const t = DEFAULT_GROUP_BY_AGE[genre];
    return band ? { index: at(t[band]), basis: { kind: "age", band } } : { index: at(t.unknown), basis: null };
  }
  const t = DEFAULT_GROUP_BY_MOOD[genre], mood = musicMoodOf(code);
  return mood ? { index: at(t[mood]), basis: { kind: "mood", mood } } : { index: at(t.unknown), basis: null };
}

/** 묶음 번호·모음 번호를 범위 안으로(옛 상태값·잘못된 값이 와도 화면이 비지 않게). */
export function pickCollection(genre: MusicGenre, group: number, item: number): { group: MusicGroup; groupIndex: number; item: MusicItem; itemIndex: number } {
  const groups = MUSIC_COLLECTIONS[genre];
  const gi = Number.isInteger(group) && group >= 0 && group < groups.length ? group : 0;
  const items = groups[gi].items;
  const ii = Number.isInteger(item) && item >= 0 && item < items.length ? item : 0;
  return { group: groups[gi], groupIndex: gi, item: items[ii], itemIndex: ii };
}

/** 임베드 주소 = youtube-nocookie · 영상은 그대로, 재생목록은 videoseries · 자동재생 없음. */
export function embedSrc(item: MusicItem): string {
  return item.kind === "list"
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${item.id}&rel=0`
    : `https://www.youtube-nocookie.com/embed/${item.id}?rel=0`;
}
