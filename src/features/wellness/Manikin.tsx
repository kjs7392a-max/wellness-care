"use client";

import type { SamScore } from "./sam";

/**
 * SAM 인형 — 우리가 그린 5단계(저작권 문제 없음). 원본 SAM 처럼 글자 없이 그림으로만 고르게 한다.
 * valence: 입 모양(찡그림 → 미소) + 눈썹. arousal: 눈 크기·몸 주변 떨림선(차분 → 들뜸).
 * 크기는 size 하나로 조절(정사각). 색은 앱 팔레트(#2d5c6e 선, 파스텔 채움).
 */
export function Manikin({ kind, level, size = 56, active = false }: { kind: "valence" | "arousal"; level: SamScore; size?: number; active?: boolean }) {
  const t = (level - 1) / 4; // 0~1
  const stroke = active ? "#4a3f80" : "#5f7a88";
  const fill = active ? "#efe9fb" : "#f5f8fa";
  // 입: valence 는 곡률 −1(찡그림)~+1(미소). arousal 은 작은 'o' 로 고정(놀람/들뜸은 눈으로).
  const curve = kind === "valence" ? (t * 2 - 1) : 0;
  const mouthY = 58; const mouthW = 14;
  const mouth = kind === "valence"
    ? `M ${50 - mouthW} ${mouthY} Q 50 ${mouthY + curve * 12} ${50 + mouthW} ${mouthY}`
    : "";
  // 눈: arousal 은 감김(작은 선) → 크게 뜸. valence 는 보통 크기 고정.
  const eyeR = kind === "arousal" ? 1.5 + t * 4.5 : 3.2;
  // 눈썹: valence 낮을수록 안쪽이 내려감(걱정), 높을수록 평평.
  const browTilt = kind === "valence" ? (1 - t) * 5 : 0;
  // 떨림선: arousal 높을수록 몸 주변에 짧은 선이 늘어난다.
  const rays = kind === "arousal" ? Math.round(t * 6) : 0;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden style={{ display: "block" }}>
      {/* 몸 */}
      <rect x="30" y="70" width="40" height="26" rx="10" fill={fill} stroke={stroke} strokeWidth="2.4" />
      {/* 머리 */}
      <circle cx="50" cy="46" r="24" fill={fill} stroke={stroke} strokeWidth="2.4" />
      {/* 눈썹 */}
      <line x1="36" y1={38 + browTilt} x2="45" y2={38 - browTilt * 0.2} stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="55" y1={38 - browTilt * 0.2} x2="64" y2={38 + browTilt} stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      {/* 눈 */}
      {kind === "arousal" && level === 1
        ? (<><line x1="37" y1="47" x2="44" y2="47" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" /><line x1="56" y1="47" x2="63" y2="47" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" /></>)
        : (<><circle cx="40.5" cy="47" r={eyeR} fill={stroke} /><circle cx="59.5" cy="47" r={eyeR} fill={stroke} /></>)}
      {/* 입 */}
      {kind === "valence"
        ? <path d={mouth} fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
        : <ellipse cx="50" cy="59" rx={3 + t * 4} ry={2 + t * 4.5} fill="none" stroke={stroke} strokeWidth="2.4" />}
      {/* 떨림선(들뜸) */}
      {Array.from({ length: rays }).map((_, i) => {
        const ang = (-100 + i * (200 / Math.max(1, rays - 1))) * (Math.PI / 180);
        const x1 = 50 + Math.cos(ang) * 30, y1 = 46 + Math.sin(ang) * 30, x2 = 50 + Math.cos(ang) * 38, y2 = 46 + Math.sin(ang) * 38;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="2" strokeLinecap="round" />;
      })}
    </svg>
  );
}
