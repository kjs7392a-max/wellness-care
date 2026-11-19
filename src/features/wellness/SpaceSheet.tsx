"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SOUND_PREF_KEY, SPACE_ROOMS, fitRoomVideo, parseSoundPref, setVolume, spaceRoom, toggleSound, type SoundPref, type SpaceId, type SpaceRoom } from "./space";
import { sx } from "./sx";
import { createRoomPlayback, createRoomPlaylist, type RoomPlayback, type RoomPlaylist } from "./room-playback";

/**
 * 마음 쉼터(2026-11-08) — 케어 탭 마음 박스의 「마음 쉼터」 줄이 연다.
 * 고르는 화면(불당·교회·성당·명상룸) → 공간 하나 = 영상이 화면 가득 반복 재생.
 * - 불당·교회·성당 = 소리 듣기를 눌러 별도 오디오 재생. 명상룸 = 싱잉볼 소리.
 * - 🚫 명상룸 영상엔 명상 안내 자막이 이미 있다 — 이 화면에 안내 글을 얹지 말 것(머리줄엔 공간 이름만).
 * - 영상 자리·크기는 space.ts `fitRoomVideo`(주요 인물·십자가·불상·자막이 머리줄 아래에 다 보이게). 남는 띠는 흐린 포스터.
 */

/** 머리줄(‹·이름·소리 단추)이 덮는 위쪽 높이 — 지켜야 할 칸은 이 아래에 둔다. space.test.ts 의 INSET_TOP 과 같게. */
const HEADER_INSET = 100;
const BOTTOM_INSET = 8;

// ---- 소리 ----
// iOS 사파리는 video.volume 을 바꿀 수 없다(늘 1). 그런 기기에서만 Web Audio 의 GainNode 로 음량을 조절한다.
// AudioContext 는 사용자가 누른 그 순간에 만들고 깨워야 한다(안 그러면 잠든 채라 소리가 아예 안 난다) — 그래서 고르는 화면의 클릭에서 준비한다.
let audioCtx: AudioContext | null = null;
let volumeSettable: boolean | null = null;

function canSetVolume(): boolean {
  if (volumeSettable !== null) return volumeSettable;
  try {
    const a = document.createElement("audio");
    a.volume = 0.5;
    volumeSettable = Math.abs(a.volume - 0.5) < 0.01;
  } catch {
    volumeSettable = true;
  }
  return volumeSettable;
}

/** 사용자 클릭 안에서만 부른다. 음량을 직접 바꿀 수 있는 기기면 아무것도 안 한다. */
function primeAudio() {
  if (typeof window === "undefined" || canSetVolume()) return;
  const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    audioCtx = null;
  }
}

function loadPref(): SoundPref {
  try {
    return parseSoundPref(window.localStorage.getItem(SOUND_PREF_KEY));
  } catch {
    return parseSoundPref(null);
  }
}

function savePref(p: SoundPref) {
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, JSON.stringify(p));
  } catch {
    /* 저장 못 해도 이번 방문엔 그대로 쓴다 */
  }
}

export function SpaceSheet({ onClose }: { onClose: () => void }) {
  const [roomId, setRoomId] = useState<SpaceId | null>(null);
  if (roomId) return <RoomView key={roomId} room={spaceRoom(roomId)} onBack={() => setRoomId(null)} />;

  const enter = (r: SpaceRoom) => {
    if (r.sound) primeAudio();
    setRoomId(r.id);
  };

  return (
    <div data-space-sheet style={sx("position:absolute; inset:0; background:linear-gradient(175deg,#f6f2fc 0%,#f0f7fb 100%); display:flex; flex-direction:column; animation:wFade 0.2s ease-out")}>
      <div style={sx("flex:none; display:flex; align-items:center; gap:11px; padding:48px 16px 14px; background:#fff; border-bottom:1px solid #d9d2ec")}>
        <div onClick={onClose} style={sx("cursor:pointer; flex:none; display:flex; align-items:center; justify-content:center; width:40px; height:40px; margin:-8px 0 -8px -12px; font-size:34px; line-height:1; font-weight:800; -webkit-text-stroke:1.2px #4f4390; color:#4f4390")}>‹</div>
        <div style={sx("flex:1; min-width:0; display:flex; flex-direction:column; gap:2px")}>
          <div style={sx("font-size:15px; font-weight:700; color:#2d5c6e")}>🕯️ 마음 쉼터</div>
          <div style={sx("font-size:11px; color:#8ba8b3")}>불당 · 교회 · 성당 · 명상룸</div>
        </div>
      </div>
      <div style={sx("flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:14px; padding:20px 20px 28px")}>
        <div style={sx("text-align:center; font-size:13.5px; color:#6b8c9a; line-height:1.6; text-wrap:pretty")}>머물고 싶은 곳을 골라 주세요.</div>
        <div style={sx("display:grid; grid-template-columns:repeat(2, 1fr); gap:12px")}>
          {SPACE_ROOMS.map((r) => (
            <div key={r.id} data-space-room={r.id} onClick={() => enter(r)} style={sx("cursor:pointer; display:flex; flex-direction:column; border-radius:18px; overflow:hidden; border:1.5px solid #c4b8ec; background:#fff; box-shadow:0 4px 12px rgba(110,95,190,0.10)")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.poster} alt="" style={{ ...sx("display:block; width:100%; aspect-ratio:3/4; object-fit:cover; background:#1c2f38"), objectPosition: r.thumbPos }} />
              <div style={sx("display:flex; flex-direction:column; gap:2px; padding:10px 12px 12px")}>
                <div style={sx("font-size:15px; font-weight:800; letter-spacing:-0.01em; color:#4a3f80")}>{r.name}</div>
                <div style={sx("font-size:12px; font-weight:500; line-height:1.4; color:#6b8c9a")}>{r.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomView({ room, onBack }: { room: SpaceRoom; onBack: () => void }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRef = useRef<RoomPlayback | null>(null);
  const playlistRef = useRef<RoomPlaylist | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const tracks = room.audio;
  const track = tracks?.[trackIndex] ?? tracks?.[0];
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const soundRequestRef = useRef(0);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [needTap, setNeedTap] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pref, setPref] = useState<SoundPref>(() => room.audio ? { ...loadPref(), on: false } : room.sound ? loadPref() : { on: false, volume: 0 });
  // 음량 막대를 보일 수 있는가 — 직접 바꿀 수 있거나, Web Audio 로 이었을 때만.
  const [volumeOk, setVolumeOk] = useState(true);

  // 화면 크기 — 영상 자리는 이 크기로 정한다.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const soundElement = () => room.audio ? audioRef.current : ref.current;
  const apply = (p: SoundPref) => {
    const video = ref.current;
    if (video) video.muted = !room.sound || !p.on;
    const el = soundElement();
    if (!el) return;
    el.muted = !p.on;
    if (!room.audio && !room.sound) { el.muted = true; return; }
    if (gainRef.current) gainRef.current.gain.value = p.on ? p.volume : 0;
    else if (canSetVolume()) el.volume = p.volume;
  };

  useLayoutEffect(() => {
    const video = ref.current;
    if (!video) return;
    const playback = createRoomPlayback();
    playbackRef.current = playback;
    if (audioRef.current && tracks) {
      const sources = tracks.map((item) => item.src) as [string, ...string[]];
      playlistRef.current = createRoomPlaylist(audioRef.current, sources, playback, setTrackIndex);
    }
    // 외부 독경 스트림은 CORS를 보장하지 않으므로 Web Audio에 연결하지 않는다.
    // 음량 변경이 불가능한 기기는 기기 자체 음량으로 조절한다.
    if (room.sound && !canSetVolume() && audioCtx) {
      try {
        if (!sourceRef.current) sourceRef.current = audioCtx.createMediaElementSource(video);
        const gain = audioCtx.createGain();
        sourceRef.current.connect(gain).connect(audioCtx.destination);
        gainRef.current = gain;
      } catch { gainRef.current = null; }
    }
    setVolumeOk(canSetVolume() || !!gainRef.current);
    apply(pref);
    void playback.play(video).then(async (ok) => {
      if (!playback.active) return;
      if (!ok && room.sound && pref.on) {
        const off = { ...pref, on: false };
        setPref(off);
        apply(off);
        ok = await playback.play(video);
      }
      if (playback.active) setNeedTap(!ok);
    });
    // 오디오는 입장 시 재생하지 않는다. 이 방문의 버튼 클릭으로만 시작한다.
    const audio = audioRef.current;
    const source = sourceRef.current;
    const gain = gainRef.current;
    return () => {
      playlistRef.current?.pause();
      playback.dispose();
      // 아직 play()를 부르지 않은 요소도 실제 노드를 잡아 정리한다.
      video.pause();
      audio?.pause();
      source?.disconnect();
      gain?.disconnect();
      gainRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (next: SoundPref) => {
    const request = ++soundRequestRef.current;
    if (audioCtx && audioCtx.state === "suspended") void audioCtx.resume();
    setAudioFailed(false);
    setPref(next);
    savePref(next);
    apply(next);
    const el = soundElement();
    const playback = playbackRef.current;
    if (!el || !playback) return;
    if (room.audio && !next.on) { playlistRef.current?.pause(); return; }
    if (next.on && (room.audio || el.paused)) void (room.audio ? playlistRef.current!.play() : playback.play(el)).then((ok) => {
      if (!playback.active || request !== soundRequestRef.current) return;
      if (room.audio && !ok) {
        playlistRef.current?.pause();
        setAudioFailed(true);
        const off = { ...next, on: false };
        setPref(off);
        apply(off);
      } else if (!room.audio) setNeedTap(!ok);
    });
  };

  const advanceTrack = (ended = false) => {
    const playback = playbackRef.current;
    const playlist = playlistRef.current;
    if (!playback?.active || !playlist) return;
    const request = ++soundRequestRef.current;
    setAudioFailed(false);
    void (ended ? playlist.ended() : playlist.next()).then((ok) => {
      if (!playback.active || request !== soundRequestRef.current || ok) return;
      playlist.pause();
      setAudioFailed(true);
      setPref((p) => ({ ...p, on: false }));
    });
  };

  const tapPlay = () => {
    const video = ref.current;
    const playback = playbackRef.current;
    if (!video || !playback) return;
    if (audioCtx && audioCtx.state === "suspended") void audioCtx.resume();
    void playback.play(video).then((ok) => { if (playback.active) setNeedTap(!ok); });
  };

  const leave = () => { ++soundRequestRef.current; playlistRef.current?.pause(); playbackRef.current?.dispose(); onBack(); };

  const rect = fitRoomVideo(size.w, size.h, room.w, room.h, room.safe, HEADER_INSET, BOTTOM_INSET);
  const soundOn = (room.sound || !!room.audio) && pref.on;

  return (
    <div ref={boxRef} data-space-view={room.id} style={sx("position:absolute; inset:0; overflow:hidden; background:#0d1418; animation:wFade 0.25s ease-out")}>
      {/* 영상이 화면보다 작아 생기는 띠 — 같은 장면을 흐리게 깔아 빈 칸처럼 보이지 않게. */}
      <div aria-hidden style={{ ...sx("position:absolute; inset:-40px; background-size:cover; background-position:center; filter:blur(28px) brightness(0.55)"), backgroundImage: `url(${room.poster})` }} />
      {/* 크기를 재기 전에도 영상은 만들어 둔다(처음 재생이 이 요소를 잡아야 한다) — 잴 때까지만 숨김. */}
      <video
        ref={ref}
        src={room.src}
        poster={room.poster}
        loop
        playsInline
        preload="auto"
        muted={!room.sound}
        autoPlay={!room.sound}
        onError={() => setFailed(true)}
        style={{ ...sx("position:absolute; display:block; max-width:none"), left: rect.left, top: rect.top, width: rect.width, height: rect.height, visibility: size.w > 0 ? "visible" : "hidden" }}
      />
      {tracks && <audio data-space-audio ref={audioRef} src={tracks[0].src} preload="none" loop={tracks.length === 1}
        onEnded={() => advanceTrack(true)}
        onError={() => { playlistRef.current?.pause(); setAudioFailed(true); setPref((p) => ({ ...p, on: false })); }} />}
      {/* 머리줄 — 공간 이름과 소리 조절. */}
      <div style={sx("position:absolute; left:0; right:0; top:0; padding:48px 16px 30px; display:flex; align-items:center; gap:11px; background:linear-gradient(180deg, rgba(8,14,20,0.62) 0%, rgba(8,14,20,0.30) 62%, rgba(8,14,20,0) 100%)")}>
        <div onClick={leave} aria-label="공간 고르기로 돌아가기" style={sx("cursor:pointer; flex:none; display:flex; align-items:center; justify-content:center; width:40px; height:40px; margin:-8px 0 -8px -12px; font-size:34px; line-height:1; font-weight:800; -webkit-text-stroke:1.2px #fff; color:#fff")}>‹</div>
        <div style={sx("flex:1; min-width:0; font-size:16px; font-weight:800; letter-spacing:-0.01em; color:#fff; text-shadow:0 1px 6px rgba(0,0,0,0.35)")}>{room.name}</div>
        {(room.sound || room.audio) && (
          <div data-space-sound style={sx("flex:none; display:flex; align-items:center; gap:8px; padding:5px 12px 5px 5px; border-radius:999px; background:rgba(255,255,255,0.16); border:1px solid rgba(255,255,255,0.3); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px)")}>
            <button
              type="button"
              data-space-sound-toggle
              aria-label={soundOn ? "소리 멈추기" : room.audio ? "소리 듣기" : "소리 켜기"}
              aria-pressed={soundOn}
              onClick={() => change(toggleSound(pref))}
              style={sx("cursor:pointer; flex:none; min-width:34px; height:34px; gap:5px; border-radius:999px; border:none; padding:0; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.92)")}
            >
              <SpeakerIcon on={soundOn} />
              {room.audio && <span style={sx("font-size:11px; font-weight:700; padding-right:8px; white-space:nowrap")}>{soundOn ? "소리 멈추기" : "소리 듣기"}</span>}
            </button>
            {volumeOk && (
              <input
                type="range"
                data-space-volume
                disabled={!!room.audio && !soundOn}
                aria-label="음량"
                min={0}
                max={100}
                step={1}
                value={Math.round((soundOn ? pref.volume : 0) * 100)}
                onChange={(e) => change(setVolume(pref, Number(e.currentTarget.value) / 100))}
                style={sx("width:86px; accent-color:#c9bdf5; cursor:pointer")}
              />
            )}
          </div>
        )}
      </div>
      {track && <div style={sx("position:absolute; left:16px; right:16px; bottom:18px; color:#fff; font-size:11px; line-height:1.5; text-shadow:0 1px 4px #000")}>
        {audioFailed && <div role="alert" style={sx("padding:8px 10px; margin-bottom:8px; border-radius:10px; background:rgba(0,0,0,0.6)")}>소리를 불러오지 못했어요. 소리 듣기를 다시 눌러 주세요.</div>}
        {tracks && tracks.length > 1 && <div style={sx("display:flex; align-items:center; gap:10px; padding:7px 9px; margin-bottom:5px; border-radius:10px; background:rgba(0,0,0,0.48)")}>
          <span aria-live="polite" style={sx("flex:1")}>{trackIndex + 1} / {tracks.length} · {track.title}</span>
          <button type="button" onClick={() => advanceTrack()} aria-label="다음 곡" style={sx("flex:none; border:1px solid rgba(255,255,255,0.5); border-radius:999px; padding:5px 9px; background:rgba(255,255,255,0.16); color:#fff; cursor:pointer; font-size:11px")}>다음 곡 ›</button>
        </div>}
        <details key={track.src} style={sx("padding:6px 9px; border-radius:10px; background:rgba(0,0,0,0.48)")}>
          <summary style={sx("cursor:pointer")}>{track.title} · 음원 출처</summary>
          <div>{track.artist} · <a href={track.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#fff" }}>원본</a>
            {track.license && <> · <a href={track.license.url} target="_blank" rel="noopener noreferrer" style={{ color: "#fff" }}>{track.license.label}</a></>}
          </div>
        </details>
      </div>}
      {needTap && !failed && (
        <div onClick={tapPlay} style={sx("position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(10,18,24,0.28); cursor:pointer")}>
          <div style={sx("padding:14px 22px; border-radius:999px; background:rgba(255,255,255,0.92); color:#2d5c6e; font-size:14px; font-weight:700")}>▶ 탭해서 시작</div>
        </div>
      )}
      {failed && (
        <div style={sx("position:absolute; left:20px; right:20px; bottom:40px; padding:12px 14px; border-radius:14px; background:rgba(255,255,255,0.92); color:#2d5c6e; font-size:13px; line-height:1.5; text-align:center")}>영상을 불러오지 못했어요. 잠시 뒤 다시 들어와 주세요.</div>
      )}
    </div>
  );
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a3f80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="#4a3f80" />
      {on ? (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 6a8.5 8.5 0 0 1 0 12" />
        </>
      ) : (
        <>
          <path d="M16.5 9.5l5 5" />
          <path d="M21.5 9.5l-5 5" />
        </>
      )}
    </svg>
  );
}
