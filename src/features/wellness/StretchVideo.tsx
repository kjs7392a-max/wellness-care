"use client";

import { useEffect, useRef, useState } from "react";
import { guideStepAt, type GuideVideo } from "./guide";
import { sx } from "./sx";

/**
 * 가이드 영상 화면(타이머 없음 — 2026-09-12 사용자 지시 "타이머는 없애고 화면만").
 *
 * - 영상은 1분 세트를 loop 로 돌린다. 재생은 화면 맨 아래 「시작하기」 버튼(playing prop)이 켠다 —
 *   사용자 지시. 버튼이 사용자 제스처라 자동재생 정책에도 안 걸린다. 혹시 거부되면 「탭해서 시작」이 뜬다.
 * - 구간 안내는 영상의 currentTime 으로 정한다(타이머가 없으므로 영상이 곧 시계다).
 * - 원본에 오디오 트랙이 있어 muted 로 튼다.
 */
export function StretchVideo({ guide, playing }: { guide: GuideVideo; playing: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [t, setT] = useState(0);
  const [needTap, setNeedTap] = useState(false);
  const pos = guideStepAt(guide.steps, t);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) el.play().then(() => setNeedTap(false)).catch(() => setNeedTap(true));
    else el.pause();
  }, [playing]);

  // 구간이 바뀌면 진동 한 번(지원 기기만) — 화면을 안 보고 따라 해도 전환을 알 수 있게.
  useEffect(() => {
    if (t === 0) return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.index]);

  const tapPlay = () => {
    const el = ref.current;
    if (!el) return;
    el.play().then(() => setNeedTap(false)).catch(() => setNeedTap(true));
  };

  return (
    <div style={sx("position:relative; width:100%; aspect-ratio:9/16; max-height:58vh; border-radius:22px; overflow:hidden; background:#e8f1f5; box-shadow:0 10px 28px rgba(45,92,110,0.14)")} onClick={needTap ? tapPlay : undefined}>
      <video
        ref={ref}
        src={guide.src}
        muted
        loop
        playsInline
        preload="auto"
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        style={sx("width:100%; height:100%; object-fit:cover; display:block")}
      />
      {needTap && (
        <div style={sx("position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(20,40,50,0.28)")}>
          <div style={sx("padding:14px 22px; border-radius:999px; background:rgba(255,255,255,0.92); color:#2d5c6e; font-size:14px; font-weight:700")}>▶ 탭해서 시작</div>
        </div>
      )}
      {/* 구간 안내 — 영상 하단에 겹침. 영상엔 자막이 없고 앱이 얹는다. */}
      <div style={sx("position:absolute; left:0; right:0; bottom:0; padding:44px 16px 14px; background:linear-gradient(180deg, rgba(20,40,50,0) 0%, rgba(20,40,50,0.62) 100%); color:#fff; display:flex; flex-direction:column; gap:4px; pointer-events:none")}>
        <div style={sx("font-size:16px; font-weight:700; letter-spacing:-0.01em")}>{pos.step.title}</div>
        <div style={sx("font-size:12.5px; line-height:1.5; opacity:0.92; text-wrap:pretty")}>{pos.step.cue}</div>
        <div style={sx("height:3px; border-radius:2px; background:rgba(255,255,255,0.28); overflow:hidden; margin-top:6px")}>
          <div style={{ ...sx("height:100%; background:#fff; transition:width 0.25s linear"), width: `${Math.round(pos.progress * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
