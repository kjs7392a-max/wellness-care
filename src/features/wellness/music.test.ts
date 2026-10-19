import { describe, expect, it } from "vitest";
import { DEFAULT_AGE, DEFAULT_MOOD, MUSIC_GENRES, embedSrc, musicAgeOf, musicMoodOf, musicPickFor, rotateFrom } from "./music";
import { MUSIC_PICKS } from "./music-picks";
import { AGE_BANDS } from "./directing/profile";
import { PERSONA_CODES } from "./persona";

// 2026-10-19 사용자: 장르 칩 넷(가요·클래식·재즈·팝송)은 언제나 같고, 곡은 앱이 나이대·성향으로 고른다.

describe("선곡표 — 48목록 · 목록마다 8곡 · 유튜브 id 모양", () => {
  it("장르 4 × 나이대 3 × 성향 4 가 빠짐없이 있다", () => {
    expect(MUSIC_GENRES.map((g) => g.label)).toEqual(["가요", "클래식", "재즈", "팝송"]);
    for (const g of MUSIC_GENRES) for (const a of ["young", "mid", "senior"]) for (const m of ["calm", "emotional", "lively", "focus"]) {
      const list = MUSIC_PICKS[`${g.key}/${a}/${m}`];
      expect(list, `${g.key}/${a}/${m}`).toBeDefined();
      expect(list).toHaveLength(8);
      for (const [id, title] of list) {
        expect(id).toMatch(/^[A-Za-z0-9_-]{11}$/);
        expect(title.length).toBeGreaterThan(0);
      }
      expect(new Set(list.map(([id]) => id)).size).toBe(8); // 한 목록 안에 같은 영상 두 번 없음
    }
    expect(Object.keys(MUSIC_PICKS)).toHaveLength(48);
  });
});

describe("50~60대 클래식 = 정통 클래식 위주 · 가곡 자리만 세미클래식·피아노곡(2026-10-19 사용자 지시)", () => {
  it("가곡(그리운 금강산·가고파·보리밭·목련화·비목·선구자)이 없다", () => {
    for (const m of ["calm", "emotional", "lively", "focus"]) {
      const titles = MUSIC_PICKS[`classical/senior/${m}`].map(([, t]) => t).join(" ");
      expect(titles).not.toMatch(/금강산|가고파|보리밭|목련화|비목|선구자/);
    }
  });
});

describe("나이대·성향 → 묶음", () => {
  it("나이대 6칸 → 3묶음 · 모르면 null", () => {
    expect(AGE_BANDS.map(musicAgeOf)).toEqual(["young", "young", "mid", "mid", "senior", "senior"]);
    expect(musicAgeOf(null)).toBeNull();
  });
  it("16유형 → E/I × F/T 넷 · 이상한 값은 null", () => {
    expect(musicMoodOf("ISTJ")).toBe("calm");
    expect(musicMoodOf("INFP")).toBe("emotional");
    expect(musicMoodOf("ENFP")).toBe("lively");
    expect(musicMoodOf("ENTJ")).toBe("focus");
    expect(new Set(PERSONA_CODES.map(musicMoodOf)).size).toBe(4);
    expect(PERSONA_CODES.every((c) => musicMoodOf(c) !== null)).toBe(true);
    expect(musicMoodOf("")).toBeNull();
    expect(musicMoodOf("XXXX")).toBeNull();
    expect(musicMoodOf(null)).toBeNull();
  });
});

describe("musicPickFor — 같은 장르라도 사람에 따라 곡이 다르다", () => {
  it("50대 ENFP 가요 = senior/lively 목록", () => {
    const p = musicPickFor("kpop", "50대", "ENFP");
    expect(p.ids).toEqual(MUSIC_PICKS["kpop/senior/lively"].map(([id]) => id));
    expect(p.titles[0]).toBe(MUSIC_PICKS["kpop/senior/lively"][0][1]);
    expect(p).toMatchObject({ age: "senior", mood: "lively", personal: true });
    expect(musicPickFor("kpop", "20대", "ISTJ").ids).not.toEqual(p.ids);
  });
  it("모르는 칸만 기본값 · 둘 중 하나라도 모르면 personal=false", () => {
    expect(musicPickFor("jazz", null, null)).toMatchObject({ age: DEFAULT_AGE, mood: DEFAULT_MOOD, personal: false });
    expect(musicPickFor("jazz", "60대", null)).toMatchObject({ age: "senior", mood: DEFAULT_MOOD, personal: false });
    expect(musicPickFor("jazz", null, "INFJ")).toMatchObject({ age: DEFAULT_AGE, mood: "emotional", personal: false });
    expect(musicPickFor("jazz", null, null).ids).toHaveLength(8);
  });
});

describe("rotateFrom · embedSrc", () => {
  it("고른 곡부터 · 순서 유지 · 범위 밖은 그대로", () => {
    expect(rotateFrom(["a", "b", "c", "d"], 2)).toEqual(["c", "d", "a", "b"]);
    expect(rotateFrom(["a", "b"], 0)).toEqual(["a", "b"]);
    expect(rotateFrom(["a", "b"], 9)).toEqual(["a", "b"]);
  });
  it("임베드 주소 = nocookie · 첫 곡 + 나머지 playlist · 자동재생 없음", () => {
    const u = embedSrc(["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"]);
    expect(u).toBe("https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?playlist=bbbbbbbbbbb,ccccccccccc&rel=0");
    expect(u).not.toMatch(/autoplay=1/);
    expect(embedSrc(["aaaaaaaaaaa"])).toBe("https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?rel=0");
  });
});
