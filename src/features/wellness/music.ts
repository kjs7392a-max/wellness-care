/**
 * 추천 음악 — 유튜브 채널 셋의 최신 영상을 서버가 하루 한 번 읽어 플레이리스트로 만든다. 순수 모듈(테스트 music.test.ts).
 *
 * 2026-09-19 사용자: "임베딩은 최신으로 업데이트가 안 되나?" → "클래식과 가요를 하나씩 추천해서 (나)로".
 *   · 9/17 까지는 id 10개를 코드에 고정했다(새 곡이 올라와도 안 떴다).
 *   · 유튜브 RSS(`feeds/videos.xml`)는 세 채널 전부 **404**(실측 09-19 · 2026년 들어 사실상 폐기) → **채널 「동영상」 페이지**의
 *     `lockupViewModel` 에서 id·제목·길이를 뽑는다(라우트 `api/wellness/music`). 비공식 구조라 바뀌면 0편이 되고 → **고정 목록(fallbackIds)으로 폴백**.
 *   · 쇼츠(60초 미만)·임베드 차단(oEmbed 가 거부) 제외 · 최신순 MAX_IDS 편 · 24시간 CDN 캐시.
 *   · 채널은 전부 **음원 권리를 가진 공식 채널**(재업로드 채널 금지 — 저작권). 바꾸려면 MUSIC_CHANNELS 한 줄.
 * 🚫 자동재생 금지 · 음원을 앱에 담지 않는다(유튜브 공식 임베드만 · youtube-nocookie).
 */
export const MIN_SECONDS = 60;
export const MAX_IDS = 12;
export const MIN_LIVE = 3;

export interface MusicChannel { key: "emptysilver" | "classical" | "kpop"; label: string; note: string; channelId: string; fallbackIds: string[] }

export const MUSIC_CHANNELS: readonly MusicChannel[] = [
  {
    key: "emptysilver", label: "emptysilver", note: "바쁜 일상 속 잠시 쉬어 가는 편안한 음악",
    channelId: "UCyvNK9b_Rs7djuIQ4a7i5aw",
    // 09-17 실측 고정 10편(임베드 허용·쇼츠 제외) — 라이브 조회가 실패할 때만 쓴다.
    fallbackIds: ["wvVsDNnEeZg", "Bl20EHC6J4c", "Nz0x8tTr4js", "b6P_EugaIx4", "WRKSsfLCNZU", "pIUwLACKjyY", "hLimS8htMmA", "OEZh_V4qNrs", "r8vyi0MHGK8", "qQKeuX0PC0I"],
  },
  {
    key: "classical", label: "클래식 · HALIDONMUSIC", note: "이탈리아 음반사 Halidon 공식 채널 — 두 시간짜리 잔잔한 클래식 모음",
    channelId: "UCyOfqgtsQaM3S-VZnsYnHjQ",
    // 09-19 실측(재생 가능 11편 중 앞 8)
    fallbackIds: ["J9IAPulRLf8", "5cDyxFE_tMc", "vMPecVYh3oA", "e0Zyri8oNMk", "3molZdJ6Vf8", "52PrvhIOse8", "2T-FU4JH9V4", "82jTS6vaN7s"],
  },
  {
    key: "kpop", label: "가요 · 안테나", note: "유희열 소속사 안테나 공식 채널 — 정승환·규현·페퍼톤스·권진아의 라이브와 뮤직비디오",
    channelId: "UCwW6D9G9hegNPKYrQ0zivvQ",
    // 09-19 실측(재생 가능 12편 중 앞 8)
    fallbackIds: ["G0_kpwAue5U", "oLqLof_2imQ", "-bisvJRBoP4", "5LXlG8WtF4g", "7ukxrSbnFak", "-iTCD_gR5Rc", "IFjIIB0sgF4", "Zpm39r9T96w"],
  },
];

export interface ChannelVideo { id: string; title: string; seconds: number | null }
export interface Playlist { ids: string[]; source: "live" | "fallback" }

/** "1:33:16" · "4:10" → 초. 모양이 다르면 null(길이를 모르면 pickPlaylist 가 뺀다 — 쇼츠일 수 있어서). */
export function parseDuration(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!m) return null;
  const [, a, b, c] = m;
  return c !== undefined ? Number(a) * 3600 + Number(b) * 60 + Number(c) : Number(a) * 60 + Number(b);
}

/**
 * 채널 「동영상」 페이지 HTML → 영상 목록(페이지 순서 = 최신순). 비공식 구조(`lockupViewModel` · `contentId` · 배지 "m:ss").
 * 못 찾으면 빈 배열 — 던지지 않는다(라우트가 폴백으로 간다).
 */
export function parseChannelVideos(html: string): ChannelVideo[] {
  const out: ChannelVideo[] = [];
  const seen = new Set<string>();
  const re = /"lockupViewModel":\{"contentImage".*?"contentId":"([A-Za-z0-9_-]{11})"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const block = html.slice(m.index, m.index + 12000);
    const t = /"title":\{"content":"((?:[^"\\]|\\.)*)"/.exec(block);
    const d = /"text":"(\d{1,2}:\d{2}(?::\d{2})?)"/.exec(block);
    let title = t ? t[1] : "";
    try { title = JSON.parse(`"${title}"`); } catch { /* 이스케이프가 이상하면 원문 그대로 */ }
    out.push({ id, title, seconds: d ? parseDuration(d[1]) : null });
  }
  return out;
}

/** 쇼츠(60초 미만·길이 모름)와 임베드 차단을 빼고 MAX_IDS 편. MIN_LIVE 편이 안 되면 고정 목록. */
export function pickPlaylist(items: ChannelVideo[], embedOk: (id: string) => boolean, fallbackIds: string[]): Playlist {
  const ids = items.filter((v) => v.seconds !== null && v.seconds >= MIN_SECONDS && embedOk(v.id)).map((v) => v.id).slice(0, MAX_IDS);
  return ids.length >= MIN_LIVE ? { ids, source: "live" } : { ids: fallbackIds.slice(0, MAX_IDS), source: "fallback" };
}

/** 첫 곡 + 나머지를 playlist 로(9/17 방식 그대로) · youtube-nocookie · 자동재생 없음. */
export function embedSrc(ids: string[]): string {
  const [first, ...rest] = ids;
  const q = rest.length ? `playlist=${rest.join(",")}&rel=0` : "rel=0";
  return `https://www.youtube-nocookie.com/embed/${first}?${q}`;
}
