import { describe, expect, it } from "vitest";
import { DEFAULT_GROUP_BY_AGE, DEFAULT_GROUP_BY_MOOD, MUSIC_GENRES, defaultGroupFor, embedSrc, musicMoodOf, pickCollection } from "./music";
import { MUSIC_COLLECTIONS } from "./music-collections";
import { AGE_BANDS } from "./directing/profile";
import { PERSONA_CODES } from "./persona";

// 2026-10-20 사용자: "그냥 노래선곡하지 말고 여러곡이 나오는 … 7080 모음 · 90년대 모음 이런 식으로 분류해줘 재즈도 가요도 팝송도".

const label = (g: (typeof MUSIC_GENRES)[number]["key"], i: number) => MUSIC_COLLECTIONS[g][i].label;

describe("모음표 — 장르 넷 · 묶음마다 모음 2개 이상 · 유튜브 id 모양", () => {
  it("장르 넷 모두 묶음이 있고, 묶음 라벨은 장르 안에서 겹치지 않는다", () => {
    expect(MUSIC_GENRES.map((g) => g.label)).toEqual(["가요", "클래식", "재즈", "팝송"]);
    for (const g of MUSIC_GENRES) {
      const groups = MUSIC_COLLECTIONS[g.key];
      expect(groups.length, g.key).toBeGreaterThanOrEqual(4);
      expect(new Set(groups.map((x) => x.label)).size).toBe(groups.length);
      for (const grp of groups) {
        expect(grp.items.length, `${g.key}/${grp.label}`).toBeGreaterThanOrEqual(2);
        expect(new Set(grp.items.map((x) => x.id)).size).toBe(grp.items.length);
        for (const it of grp.items) {
          expect(it.id).toMatch(it.kind === "video" ? /^[A-Za-z0-9_-]{11}$/ : /^PL[A-Za-z0-9_-]{16,32}$/);
          expect(it.title.length).toBeGreaterThan(0);
          expect(it.source.length).toBeGreaterThan(0);
        }
      }
    }
  });
  it("가요·팝송은 시대 묶음(7080·80년대·90년대·2000년대·2010년대 …)", () => {
    expect(MUSIC_COLLECTIONS.kpop.map((g) => g.label)).toEqual(["7080", "80년대", "90년대", "2000년대", "2010년대", "2020년대"]);
    expect(MUSIC_COLLECTIONS.pop.map((g) => g.label)).toEqual(["70년대", "80년대", "90년대", "2000년대", "2010년대", "최신"]);
  });
  it("모음 제목에 「모음·명곡·베스트·히트곡·TOP」 류가 아니라 곡 하나 이름만 있는 칸은 없다(한 곡 선곡으로 돌아가지 않게)", () => {
    for (const g of MUSIC_GENRES) for (const grp of MUSIC_COLLECTIONS[g.key]) for (const it of grp.items) {
      expect(it.title, it.title).not.toMatch(/^[^-]+ - [^-]+$/); // 「가수 - 곡」 꼴 = 옛 선곡표
    }
  });
});

describe("처음 펼치는 묶음 — 가요·팝송 = 나이대 · 재즈·클래식 = 성향", () => {
  it("기본 묶음 라벨이 모음표에 실제로 있다(글자 하나 틀리면 맨 앞 묶음으로 조용히 떨어진다)", () => {
    for (const g of ["kpop", "pop"] as const) for (const v of Object.values(DEFAULT_GROUP_BY_AGE[g])) expect(MUSIC_COLLECTIONS[g].map((x) => x.label), `${g}:${v}`).toContain(v);
    for (const g of ["jazz", "classical"] as const) for (const v of Object.values(DEFAULT_GROUP_BY_MOOD[g])) expect(MUSIC_COLLECTIONS[g].map((x) => x.label), `${g}:${v}`).toContain(v);
  });
  it("60대 가요 = 7080 · 20대 가요 = 2010년대 · 60대 팝송 = 70년대 · 나이대 몰라도 묶음은 나온다", () => {
    expect(label("kpop", defaultGroupFor("kpop", "60대", null).index)).toBe("7080");
    expect(label("kpop", defaultGroupFor("kpop", "20대", "ENFP").index)).toBe("2010년대");
    expect(label("pop", defaultGroupFor("pop", "60대", null).index)).toBe("70년대");
    expect(defaultGroupFor("kpop", "60대", null).basis).toEqual({ kind: "age", band: "60대" });
    expect(defaultGroupFor("kpop", null, "ENFP")).toMatchObject({ basis: null }); // 가요는 성향을 안 본다
    expect(label("kpop", defaultGroupFor("kpop", null, null).index)).toBe("90년대");
    expect(new Set(AGE_BANDS.map((b) => defaultGroupFor("kpop", b, null).index)).size).toBe(6);
  });
  it("재즈·클래식은 성향으로 · 나이대는 안 본다", () => {
    expect(label("jazz", defaultGroupFor("jazz", "60대", "ISTJ").index)).toBe("피아노");
    expect(label("classical", defaultGroupFor("classical", null, "ENTJ").index)).toBe("집중");
    expect(defaultGroupFor("jazz", "60대", null)).toMatchObject({ basis: null });
    expect(label("jazz", defaultGroupFor("jazz", null, null).index)).toBe("명곡");
  });
  it("16유형 → E/I × F/T 넷 · 이상한 값은 null", () => {
    expect(musicMoodOf("ISTJ")).toBe("calm");
    expect(musicMoodOf("INFP")).toBe("emotional");
    expect(musicMoodOf("ENFP")).toBe("lively");
    expect(musicMoodOf("ENTJ")).toBe("focus");
    expect(new Set(PERSONA_CODES.map(musicMoodOf)).size).toBe(4);
    expect(musicMoodOf("XXXX")).toBeNull();
    expect(musicMoodOf(null)).toBeNull();
  });
});

describe("pickCollection · embedSrc", () => {
  it("범위 밖 번호는 0 으로(옛 상태값이 와도 화면이 비지 않는다)", () => {
    expect(pickCollection("kpop", 99, 99)).toMatchObject({ groupIndex: 0, itemIndex: 0 });
    expect(pickCollection("kpop", 2, 1).item).toBe(MUSIC_COLLECTIONS.kpop[2].items[1]);
    expect(pickCollection("jazz", -1, 0).groupIndex).toBe(0);
  });
  it("영상 = embed/id · 재생목록 = videoseries · nocookie · 자동재생 없음", () => {
    expect(embedSrc({ kind: "video", id: "aaaaaaaaaaa", title: "t", source: "s" })).toBe("https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?rel=0");
    const u = embedSrc({ kind: "list", id: "PLabcdefghijklmnopqr", title: "t", source: "s" });
    expect(u).toBe("https://www.youtube-nocookie.com/embed/videoseries?list=PLabcdefghijklmnopqr&rel=0");
    expect(u).not.toMatch(/autoplay=1/);
  });
});
