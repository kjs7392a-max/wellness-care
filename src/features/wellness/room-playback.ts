/** 공간을 떠난 뒤 늦게 완료된 play()도 즉시 정지시킨다. */
export interface RoomMedia { play(): Promise<void>; pause(): void; currentTime: number }
export function createRoomPlayback() {
  let active = true;
  const versions = new Map<RoomMedia, number>();
  const wantsPlay = new Map<RoomMedia, boolean>();
  const pause = (media: RoomMedia) => {
    versions.set(media, (versions.get(media) ?? 0) + 1);
    wantsPlay.set(media, false);
    media.pause();
  };
  return {
    get active() { return active; },
    pause,
    async play(media: RoomMedia): Promise<boolean> {
      if (!active) return false;
      const version = (versions.get(media) ?? 0) + 1;
      versions.set(media, version);
      wantsPlay.set(media, true);
      try {
        await media.play();
        if (!active) { media.pause(); return false; }
        if (versions.get(media) !== version) { if (!wantsPlay.get(media)) media.pause(); return false; }
        return true;
      } catch { return false; }
    },
    dispose() {
      active = false;
      for (const media of versions.keys()) {
        media.pause();
        try { media.currentTime = 0; } catch { /* 아직 준비되지 않은 미디어 */ }
      }
      versions.clear();
      wantsPlay.clear();
    },
  };
}
export type RoomPlayback = ReturnType<typeof createRoomPlayback>;

/**
 * 같은 audio 요소의 소스만 바꾸며 곡을 차례로 재생한다. 종료 후 이벤트는 무시한다.
 * start = 처음 곡(2026-11-23 — 20곡이라 들어올 때마다 다른 곡부터, 호출하는 쪽에서 정한다 · audio 의 처음 src 와 같아야 한다).
 * failed() = 지금 곡을 못 불러왔을 때 — 듣는 중이면 다음 곡으로 넘어간다(외부 음원 하나가 끊겨도 소리가 멈추지 않게).
 *   연달아 MAX_SKIPS 곡이 안 되면 false(그만 — 연결이 끊긴 것) · 한 곡을 끝까지 들으면 다시 센다.
 */
export interface PlaylistMedia extends RoomMedia { src: string }
export const MAX_SKIPS = 3;
export function createRoomPlaylist(
  media: PlaylistMedia, sources: readonly [string, ...string[]], playback: RoomPlayback,
  onTrack: (index: number) => void, start = 0,
) {
  let index = Number.isInteger(start) && start >= 0 && start < sources.length ? start : 0;
  let playing = false;
  let skips = 0;
  const play = async () => {
    if (!playback.active) return false;
    playing = true;
    return playback.play(media);
  };
  const pause = () => { playing = false; playback.pause(media); };
  const next = async () => {
    if (!playback.active) return false;
    playback.pause(media);
    index = (index + 1) % sources.length;
    media.src = sources[index];
    onTrack(index);
    return playing ? playback.play(media) : true;
  };
  return {
    play, pause, next,
    get index() { return index; },
    async ended() { if (!(playback.active && playing)) return true; skips = 0; return next(); },
    async failed() {
      if (!(playback.active && playing)) return true;
      skips += 1;
      if (skips >= Math.min(MAX_SKIPS, sources.length)) return false;
      return next();
    },
  };
}
/** 처음 곡 — 3곡 넘으면 아무 곡에서나(rand 0~1) · 아니면 첫 곡 */
export function playlistStart(count: number, rand: number = Math.random()): number {
  if (count <= 3) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor(rand * count)));
}
export type RoomPlaylist = ReturnType<typeof createRoomPlaylist>;
