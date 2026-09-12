"use client";

import { useEffect, useRef, useState } from "react";
import { guideStepAt, type GuideVideo } from "./guide";
import { sx } from "./sx";

/**
 * 가이드 영상 화면(타이머 없음 — 2026-09-12 사용자 지시 "타이머는 없애고 화면만").
 *
 * - 영상은 guide.playCount 회(없으면 1회) 이어 틀고 멈춘다(loop 속성 없음 — 2026-09-12 사용자 지시 "1분이 되면
 *   멈춰" + "전부 1분 리미트": 20초 시범은 3회 = 1분). 마지막 회가 끝나면 onEnded 로 알린다.
 *   재생은 화면 맨 아래 「시작하기」 버튼(playing prop)이 켠다 — 버튼이 사용자 제스처라 자동재생 정책에도
 *   안 걸린다. 혹시 거부되면 「탭해서 시작」이 뜬다.
 * - 크기: 폭은 항상 꽉 채우고, 높이는 부모 flex 열에서 남는 만큼(flex:1). 영상은 object-fit 으로 채운다 —
 *   비율(9:16)을 지키면 짧은 폰에서 폭이 200px 도 안 돼 "너무 작다"(2026-09-12 사용자 사진), 고정 높이면 버튼이
 *   밀린다(그 전날). 그래서 cover 로 위·아래를 잘라 머리~허리를 크게 보여준다(전신이 필요한 편만 contain).
 * - 구간 안내는 영상의 currentTime 으로 정한다(타이머가 없으므로 영상이 곧 시계다).
 * - 소리는 켠다(원본에 음악 트랙 있음 — 2026-09-12 사용자 "음악이 안 나오는데"). 「시작하기」가 사용자 제스처라
 *   소리 있는 재생도 허용된다. 🚫 muted 를 되살리지 말 것 — 되살리면 음악이 사라진다. 폰이 무음 모드면 OS 가 막는다.
 */
export function StretchVideo({ guide, playing, onEnded }: { guide: GuideVideo; playing: boolean; onEnded: () => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [t, setT] = useState(0);
  const [needTap, setNeedTap] = useState(false);
  const [ended, setEnded] = useState(false);
  const [round, setRound] = useState(0); // 0부터. 화면엔 round+1 / playCount
  const playCount = guide.playCount ?? 1;
  const pos = guideStepAt(guide.steps, t);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      // 다 본 뒤 「시작하기」를 다시 누르면 처음(1회차)부터.
      if (ended) { setRound(0); el.currentTime = 0; }
      setEnded(false);
      el.play().then(() => setNeedTap(false)).catch(() => setNeedTap(true));
    } else el.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // 구간(또는 회차)이 바뀌면 진동 한 번(지원 기기만) — 화면을 안 보고 따라 해도 전환을 알 수 있게.
  const stepKey = round + "-" + pos.index;
  useEffect(() => {
    if (t === 0 && round === 0) return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  // 한 회가 끝났을 때: 남은 회차가 있으면 처음부터 다시, 없으면 끝.
  const handleEnded = () => {
    const el = ref.current;
    if (round + 1 < playCount && el) {
      setRound(round + 1);
      el.currentTime = 0;
      el.play().catch(() => setNeedTap(true));
      return;
    }
    setEnded(true);
    onEnded();
  };

  const tapPlay = () => {
    const el = ref.current;
    if (!el) return;
    el.play().then(() => setNeedTap(false)).catch(() => setNeedTap(true));
  };

  return (
    <div style={sx("position:relative; flex:1 1 0; min-height:220px; width:100%; border-radius:22px; overflow:hidden; background:#1c2f38; box-shadow:0 10px 28px rgba(45,92,110,0.14)")} onClick={needTap ? tapPlay : undefined}>
      <video
        ref={ref}
        src={guide.src}
        playsInline
        preload="auto"
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onEnded={handleEnded}
        style={{ ...sx("width:100%; height:100%; display:block"), objectFit: guide.fit ?? "cover", objectPosition: guide.focus ?? "50% 20%" }}
      />
      {needTap && (
        <div style={sx("position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(20,40,50,0.28)")}>
          <div style={sx("padding:14px 22px; border-radius:999px; background:rgba(255,255,255,0.92); color:#2d5c6e; font-size:14px; font-weight:700")}>▶ 탭해서 시작</div>
        </div>
      )}
      {/* 회차 — 3회 반복 영상에만. 오른쪽 위 작은 알약. */}
      {playCount > 1 && (
        <div style={sx("position:absolute; top:12px; right:12px; padding:5px 10px; border-radius:999px; background:rgba(20,40,50,0.45); color:#fff; font-size:12px; font-weight:700; font-variant-numeric:tabular-nums; pointer-events:none")}>{ended ? playCount : Math.min(round + 1, playCount)} / {playCount}</div>
      )}
      {/* 구간 안내 — 영상 하단에 겹침. 영상엔 자막이 없고 앱이 얹는다. */}
      <div style={sx("position:absolute; left:0; right:0; bottom:0; padding:44px 16px 14px; background:linear-gradient(180deg, rgba(20,40,50,0) 0%, rgba(20,40,50,0.62) 100%); color:#fff; display:flex; flex-direction:column; gap:4px; pointer-events:none")}>
        <div style={sx("font-size:16px; font-weight:700; letter-spacing:-0.01em")}>{ended ? "오늘 몫 완료" : pos.step.title}</div>
        <div style={sx("font-size:12.5px; line-height:1.5; opacity:0.92; text-wrap:pretty")}>{ended ? "여기까지로 충분해요." : pos.step.cue}</div>
        <div style={sx("height:3px; border-radius:2px; background:rgba(255,255,255,0.28); overflow:hidden; margin-top:6px")}>
          <div style={{ ...sx("height:100%; background:#fff; transition:width 0.25s linear"), width: `${Math.round((ended ? 1 : pos.progress) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
