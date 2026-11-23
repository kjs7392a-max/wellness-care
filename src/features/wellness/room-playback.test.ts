import { describe, expect, it, vi } from "vitest";
import { createRoomPlayback, createRoomPlaylist, MAX_SKIPS, playlistStart } from "./room-playback";
const media = () => ({ play: vi.fn(async () => {}), pause: vi.fn(), currentTime: 12 });

describe("공간 미디어의 재생 수명", () => {
  it("생성만으로 자동 재생하지 않는다", () => {
    const el = media();
    createRoomPlayback();
    expect(el.play).not.toHaveBeenCalled();
  });
  it("영상과 소리를 모두 나갈 때 멈추고 처음으로 되돌린다", async () => {
    const p = createRoomPlayback();
    const video = media(), audio = media();
    expect(await p.play(video)).toBe(true);
    expect(await p.play(audio)).toBe(true);
    p.dispose();
    for (const el of [video, audio]) { expect(el.pause).toHaveBeenCalled(); expect(el.currentTime).toBe(0); }
    expect(await p.play(audio)).toBe(false);
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("공간을 나간 뒤 지연된 play가 완료돼도 소리를 다시 멈춘다", async () => {
    const p = createRoomPlayback();
    let finish!: () => void;
    const audio = media();
    audio.play.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const pending = p.play(audio);
    p.dispose();
    finish();
    expect(await pending).toBe(false);
    expect(audio.pause).toHaveBeenCalledTimes(2);
  });
  it("불러오는 중 소리 멈추기를 눌러도 나중에 재생되지 않는다", async () => {
    const p = createRoomPlayback();
    let finish!: () => void;
    const audio = media();
    audio.play.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const pending = p.play(audio);
    p.pause(audio);
    finish();
    expect(await pending).toBe(false);
    expect(audio.pause).toHaveBeenCalledTimes(2);
  });
  it("이전 재생 요청의 완료가 새 재생을 멈추지 않는다", async () => {
    const p = createRoomPlayback();
    let finish!: () => void;
    const audio = media();
    audio.play.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const oldPlay = p.play(audio);
    p.pause(audio);
    expect(await p.play(audio)).toBe(true);
    finish();
    expect(await oldPlay).toBe(false);
    expect(audio.pause).toHaveBeenCalledTimes(1);
  });
  it("실패한 미디어는 실패로 반환하고 재시도할 수 있다", async () => {
    const p = createRoomPlayback(); const audio = media();
    audio.play.mockRejectedValueOnce(new Error("network"));
    expect(await p.play(audio)).toBe(false);
    expect(await p.play(audio)).toBe(true);
  });
});

describe("공간 재생 목록", () => {
  const tracks = ["first.mp3", "second.mp3", "third.mp3"] as const;
  function setup() {
    const audio = { ...media(), src: tracks[0] as string };
    const playback = createRoomPlayback();
    const onTrack = vi.fn();
    return { audio, playback, onTrack, playlist: createRoomPlaylist(audio, tracks, playback, onTrack) };
  }
  it("곡이 끝나면 1→2→3→1 순으로 재생한다", async () => {
    const { audio, onTrack, playlist } = setup();
    await playlist.play();
    for (const expected of ["second.mp3", "third.mp3", "first.mp3"]) {
      expect(await playlist.ended()).toBe(true);
      expect(audio.src).toBe(expected);
    }
    expect(onTrack.mock.calls).toEqual([[1], [2], [0]]);
    expect(audio.play).toHaveBeenCalledTimes(4);
  });
  it("듣기를 시작하기 전이나 멈춘 뒤의 종료 이벤트는 다음 곡을 틀지 않는다", async () => {
    const { audio, playlist, onTrack } = setup();
    await playlist.ended();
    expect(audio.play).not.toHaveBeenCalled();
    await playlist.play();
    playlist.pause();
    await playlist.ended();
    expect(onTrack).not.toHaveBeenCalled();
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("멈춘 상태의 다음 곡은 선택만 하고 자동 재생하지 않는다", async () => {
    const { audio, playlist } = setup();
    await playlist.next();
    expect(audio.src).toBe("second.mp3");
    expect(audio.play).not.toHaveBeenCalled();
    await playlist.play();
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("공간을 나간 뒤에는 곡 종료·다음 곡·재생 요청을 모두 무시한다", async () => {
    const { audio, playback, playlist, onTrack } = setup();
    await playlist.play();
    playback.dispose();
    await playlist.ended();
    await playlist.next();
    expect(await playlist.play()).toBe(false);
    expect(onTrack).not.toHaveBeenCalled();
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.pause).toHaveBeenCalled();
  });
  it("다음 곡 로딩 중 나가도 늦게 완료된 소리는 정지한다", async () => {
    const { audio, playback, playlist } = setup();
    await playlist.play();
    let complete!: () => void;
    audio.play.mockImplementationOnce(() => new Promise<void>((resolve) => { complete = resolve; }));
    const pending = playlist.ended();
    playback.dispose();
    const calls = audio.pause.mock.calls.length;
    complete();
    expect(await pending).toBe(false);
    expect(audio.pause.mock.calls.length).toBeGreaterThan(calls);
  });
});

describe("공간 재생 목록 — 20곡(2026-11-23)", () => {
  const five = ["a.mp3", "b.mp3", "c.mp3", "d.mp3", "e.mp3"] as const;
  const media = () => ({ play: vi.fn(() => Promise.resolve()), pause: vi.fn(), currentTime: 0, src: "" });
  it("처음 곡을 정할 수 있다 — 그 다음부터 차례로", async () => {
    const audio = { ...media(), src: five[3] as string };
    const onTrack = vi.fn();
    const list = createRoomPlaylist(audio, five, createRoomPlayback(), onTrack, 3);
    expect(list.index).toBe(3);
    await list.play();
    await list.ended();
    expect(audio.src).toBe("e.mp3");
    await list.ended();
    expect(audio.src).toBe("a.mp3");
    expect(createRoomPlaylist(audio, five, createRoomPlayback(), onTrack, 99).index).toBe(0); // 엉뚱한 값이면 첫 곡
  });
  it("들어올 때 처음 곡은 아무 곡(3곡 이하면 첫 곡)", () => {
    expect(playlistStart(20, 0)).toBe(0);
    expect(playlistStart(20, 0.999)).toBe(19);
    expect(playlistStart(20, 0.5)).toBe(10);
    expect(playlistStart(3, 0.9)).toBe(0);
    expect(playlistStart(0, 0.5)).toBe(0);
  });
  it("곡을 못 불러오면 다음 곡으로 — 연달아 MAX_SKIPS 곡이 안 되면 그만 · 한 곡을 끝까지 들으면 다시 센다", async () => {
    const audio = { ...media(), src: five[0] as string };
    const list = createRoomPlaylist(audio, five, createRoomPlayback(), vi.fn());
    expect(await list.failed()).toBe(true); // 듣기 전엔 아무것도 안 한다
    expect(audio.src).toBe("a.mp3");
    await list.play();
    for (let k = 1; k < MAX_SKIPS; k++) expect(await list.failed()).toBe(true);
    expect(audio.src).toBe(five[MAX_SKIPS - 1]);
    expect(await list.failed()).toBe(false);
    const again = createRoomPlaylist({ ...media(), src: five[0] as string }, five, createRoomPlayback(), vi.fn());
    await again.play();
    await again.failed();
    await again.ended(); // 끝까지 들음 → 다시 센다
    for (let k = 1; k < MAX_SKIPS; k++) expect(await again.failed()).toBe(true);
  });
});
