"use client";

import { useEffect, useRef } from "react";
import { guideStepAt, type GuideVideo } from "./guide";
import { sx } from "./sx";

/**
 * 타이머 시트의 원형 시계 자리에 들어가는 가이드 영상.
 *
 * - 영상은 1분 세트 하나를 loop 로 돌린다. 재생·정지는 타이머(running)가 정한다 — 영상에
 *   자체 컨트롤을 두면 「시작하기」 버튼과 영상이 따로 놀아 기록(sessions)과 어긋난다.
 * - 안내 문구는 타이머의 elapsed 초로만 정한다(guideStepAt). 영상 currentTime 을 읽지 않는
 *   이유: 브라우저가 자동재생을 거부해도 안내는 타이머대로 흘러야 한다.
 * - 원본에 오디오 트랙이 있어 muted 로 튼다(무음이 자동재생 조건이기도 하다).
 */
export function StretchVideo({ guide, elapsed, running, total }: { guide: GuideVideo; elapsed: number; running: boolean; total: number }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const pos = guideStepAt(guide.steps, elapsed);
  const done = total > 0 && elapsed >= total;

  // 타이머 시작·정지에 영상을 맞춘다. play() 는 사용자 제스처 밖에서 거부될 수 있어 실패를 삼킨다.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (running && !done) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [running, done]);

  // 처음(0초)으로 되돌아오면 영상도 처음부터 — 분 칩을 바꾸거나 다시 시작할 때.
  useEffect(() => {
    const el = ref.current;
    if (el && elapsed === 0) el.currentTime = 0;
  }, [elapsed]);

  // 구간이 바뀌면 진동 한 번(지원 기기만). 화면을 안 보고 따라 해도 구간 전환을 알 수 있게.
  const stepKey = pos.loop + "-" + pos.index;
  useEffect(() => {
    if (!running || elapsed === 0) return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  return (
    <div style={sx("display:flex; flex-direction:column; gap:12px; width:100%")}>
      <div style={sx("position:relative; width:100%; aspect-ratio:9/16; max-height:52vh; border-radius:22px; overflow:hidden; background:#e8f1f5; box-shadow:0 10px 28px rgba(45,92,110,0.14)")}>
        <video
          ref={ref}
          src={guide.src}
          muted
          loop
          playsInline
          preload="auto"
          style={sx("width:100%; height:100%; object-fit:cover; display:block")}
        />
        {/* 구간 안내 — 영상 하단에 겹침. 영상엔 자막이 없고 앱이 얹는다. */}
        <div style={sx("position:absolute; left:0; right:0; bottom:0; padding:44px 16px 14px; background:linear-gradient(180deg, rgba(20,40,50,0) 0%, rgba(20,40,50,0.62) 100%); color:#fff; display:flex; flex-direction:column; gap:4px")}>
          <div style={sx("font-size:16px; font-weight:700; letter-spacing:-0.01em")}>{done ? "오늘 몫 완료" : pos.step.title}</div>
          <div style={sx("font-size:12.5px; line-height:1.5; opacity:0.92; text-wrap:pretty")}>{done ? "여기까지로 충분해요." : pos.step.cue}</div>
          <div style={sx("height:3px; border-radius:2px; background:rgba(255,255,255,0.28); overflow:hidden; margin-top:6px")}>
            <div style={{ ...sx("height:100%; background:#fff; transition:width 0.9s linear"), width: `${Math.round((done ? 1 : pos.progress) * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
