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

/** 같은 audio 요소의 소스만 바꾸며 곡을 차례로 재생한다. 종료 후 이벤트는 무시한다. */
export interface PlaylistMedia extends RoomMedia { src: string }
export function createRoomPlaylist(
  media: PlaylistMedia, sources: readonly [string, ...string[]], playback: RoomPlayback,
  onTrack: (index: number) => void,
) {
  let index = 0;
  let playing = false;
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
    async ended() { return playback.active && playing ? next() : true; },
  };
}
export type RoomPlaylist = ReturnType<typeof createRoomPlaylist>;
