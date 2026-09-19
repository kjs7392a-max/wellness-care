import { describe, expect, it } from "vitest";
import { MIN_SECONDS, MUSIC_CHANNELS, MAX_IDS, embedSrc, parseChannelVideos, parseDuration, pickPlaylist } from "./music";

// 2026-09-19 사용자: "유튜브 임베딩은 최신으로 업데이트가 안 되나?" → "클래식과 가요를 하나씩 추천해서 (나)로".
// 유튜브 RSS 는 세 채널 전부 404(실측) → 채널 「동영상」 페이지(lockupViewModel)를 서버가 읽는다. 구조가 바뀌면 0편 → 고정 목록 폴백.

const lockup = (id: string, title: string, len: string) =>
  `{"lockupViewModel":{"contentImage":{"thumbnailViewModel":{"overlays":[{"thumbnailOverlayBadgeViewModel":{"thumbnailBadges":[{"thumbnailBadgeViewModel":{"text":"${len}"}}]}}]}},"contentId":"${id}","metadata":{"lockupMetadataViewModel":{"title":{"content":"${title}"}}}}}`;
const HTML = `<html>var ytInitialData = {"x":[${lockup("aaaaaaaaaaa", "첫 곡", "1:33:16")},${lockup("bbbbbbbbbbb", "쇼츠", "0:54")},${lockup("ccccccccccc", "둘째", "4:10")},${lockup("aaaaaaaaaaa", "중복", "1:00")}]};</script></html>`;

describe("parseChannelVideos — 채널 동영상 페이지에서 id·제목·길이", () => {
  it("순서대로 뽑고 중복 id 는 한 번만", () => {
    const v = parseChannelVideos(HTML);
    expect(v.map((x) => x.id)).toEqual(["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"]);
    expect(v[0]).toEqual({ id: "aaaaaaaaaaa", title: "첫 곡", seconds: 5596 });
    expect(v[1].seconds).toBe(54);
  });
  it("구조가 바뀐 페이지(lockupViewModel 없음)는 빈 배열 — 던지지 않는다", () => {
    expect(parseChannelVideos("<html>nothing</html>")).toEqual([]);
    expect(parseChannelVideos("")).toEqual([]);
  });
  it("길이 문자열 → 초", () => {
    expect(parseDuration("0:54")).toBe(54);
    expect(parseDuration("4:10")).toBe(250);
    expect(parseDuration("1:33:16")).toBe(5596);
    expect(parseDuration("?")).toBeNull();
  });
});

describe("pickPlaylist — 쇼츠·임베드 차단 제외 · 상한 · 폴백", () => {
  const items = [
    { id: "aaaaaaaaaaa", title: "a", seconds: 5000 },
    { id: "bbbbbbbbbbb", title: "쇼츠", seconds: 54 },
    { id: "ccccccccccc", title: "c", seconds: 250 },
    { id: "ddddddddddd", title: "차단", seconds: 300 },
    { id: "eeeeeeeeeee", title: "e", seconds: 120 },
  ];
  it("60초 미만과 임베드 차단을 빼고 순서를 지킨다", () => {
    const r = pickPlaylist(items, (id) => id !== "ddddddddddd", ["zzzzzzzzzzz"]);
    expect(r).toEqual({ ids: ["aaaaaaaaaaa", "ccccccccccc", "eeeeeeeeeee"], source: "live" });
    expect(MIN_SECONDS).toBe(60);
  });
  it("살아남은 것이 3편 미만이면 고정 목록으로 폴백(source 로 알린다)", () => {
    const r = pickPlaylist(items.slice(0, 2), () => true, ["zzzzzzzzzzz", "yyyyyyyyyyy"]);
    expect(r).toEqual({ ids: ["zzzzzzzzzzz", "yyyyyyyyyyy"], source: "fallback" });
  });
  it("상한(MAX_IDS)을 넘지 않는다", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: String(i).padStart(11, "x"), title: "t", seconds: 600 }));
    expect(pickPlaylist(many, () => true, []).ids).toHaveLength(MAX_IDS);
  });
});

describe("MUSIC_CHANNELS · embedSrc", () => {
  it("채널 셋(emptysilver · 클래식 · 가요) · 각자 채널 id 와 폴백 3편 이상", () => {
    expect(MUSIC_CHANNELS.map((c) => c.key)).toEqual(["emptysilver", "classical", "kpop"]);
    for (const c of MUSIC_CHANNELS) {
      expect(c.channelId).toMatch(/^UC[A-Za-z0-9_-]{22}$/);
      expect(c.fallbackIds.length).toBeGreaterThanOrEqual(3);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });
  it("임베드 주소 = nocookie · 첫 곡 + 나머지 playlist · 자동재생 없음", () => {
    const u = embedSrc(["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"]);
    expect(u).toBe("https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?playlist=bbbbbbbbbbb,ccccccccccc&rel=0");
    expect(u).not.toMatch(/autoplay=1/);
    expect(embedSrc(["aaaaaaaaaaa"])).toBe("https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?rel=0");
  });
});
