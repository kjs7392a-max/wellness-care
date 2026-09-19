import { NextResponse } from "next/server";
import { MUSIC_CHANNELS, parseChannelVideos, pickPlaylist, type Playlist } from "@/features/wellness/music";

/**
 * 추천 음악 플레이리스트 — 채널 셋의 최신 영상 id 를 하루 한 번 만들어 준다(music.ts 머리 주석).
 * GET → { channels: { [key]: { ids, source } }, at }
 *   · 채널 「동영상」 페이지를 읽어(비공식 구조) 파싱 → 쇼츠·임베드 차단 제외 → 고정 목록 폴백.
 *   · 임베드 차단 판정 = 유튜브 oEmbed 가 200 이 아니면 차단(9/17 `5aSlkBcvWVQ` 이 이 경로로 잡혔다).
 *   · 캐시: CDN `s-maxage` 하루 + 인스턴스 메모리. 유튜브를 사용자마다 부르지 않는다.
 *   · 어떤 단계가 실패해도 응답은 200 — 폴백 목록으로(음악 카드가 빈 채로 뜨는 일이 없다).
 */
export const runtime = "nodejs";
const DAY = 86400;
const UA = { "user-agent": "Mozilla/5.0 (compatible; wellness-care/1.0)", "accept-language": "ko,en;q=0.8" };

let memo: { at: number; body: Record<string, Playlist> } | null = null;

async function embedOk(id: string): Promise<boolean> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, { headers: UA, signal: AbortSignal.timeout(6000) });
    return r.ok;
  } catch {
    return false;
  }
}

async function playlistFor(channelId: string, fallbackIds: string[]): Promise<Playlist> {
  try {
    const r = await fetch(`https://www.youtube.com/channel/${channelId}/videos`, { headers: UA, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return pickPlaylist([], () => false, fallbackIds);
    const items = parseChannelVideos(await r.text()).slice(0, 15);
    const oks = await Promise.all(items.map((v) => embedOk(v.id)));
    const okSet = new Set(items.filter((_, i) => oks[i]).map((v) => v.id));
    return pickPlaylist(items, (id) => okSet.has(id), fallbackIds);
  } catch {
    return pickPlaylist([], () => false, fallbackIds);
  }
}

export async function GET() {
  if (!memo || Date.now() - memo.at > DAY * 1000) {
    const entries = await Promise.all(MUSIC_CHANNELS.map(async (c) => [c.key, await playlistFor(c.channelId, c.fallbackIds)] as const));
    memo = { at: Date.now(), body: Object.fromEntries(entries) };
  }
  return NextResponse.json({ channels: memo.body, at: new Date(memo.at).toISOString() }, {
    headers: { "cache-control": `public, s-maxage=${DAY}, stale-while-revalidate=${DAY}` },
  });
}
