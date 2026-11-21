"use client";
/**
 * 마음 쉼터 3D 캐릭터 층(2026-11-21 시안) — 장면 상자 안에 canvas 하나를 깔고, 3D 그리기(space-3d-render)는 이때 따로 불러온다.
 * 사람 상자([data-space-actor])는 그대로 두고 그림만 3D 로 바꾼다 — 이름표·말풍선·누르기는 2D 상자가 맡는다.
 * WebGL 을 못 쓰면 onFail → 2D 그림으로 돌아간다.
 */
import { useEffect, useRef, type RefObject } from "react";
import { sx } from "./sx";
import type { SpaceId } from "./space";

export function Space3DLayer({ boxRef, room, onFail }: { boxRef: RefObject<HTMLDivElement | null>; room: SpaceId; onFail: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const failRef = useRef(onFail);
  failRef.current = onFail;
  useEffect(() => {
    let off = false;
    let stop: (() => void) | null = null;
    import("./space-3d-render")
      .then(({ startSpace3D }) => {
        const canvas = canvasRef.current, box = boxRef.current;
        if (off || !canvas || !box) return;
        stop = startSpace3D(canvas, box, room, () => failRef.current()).stop;
      })
      .catch(() => { if (!off) failRef.current(); });
    return () => { off = true; stop?.(); };
  }, [boxRef, room]);
  return <canvas ref={canvasRef} data-space-3d aria-hidden="true" style={sx("position:absolute; inset:0; width:100%; height:100%; z-index:0; pointer-events:none")} />;
}
