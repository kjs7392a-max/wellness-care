/**
 * 마음 쉼터 「함께 머무는 캐릭터」 — 사람 캐릭터 8명(2026-11-20 사용자 지시 · 원본 그림, 앱 파스텔 톤).
 * 실명 대신 이 캐릭터 이름만 보인다. 그림은 SVG 문자열(순수) → 화면은 <img src={avatarSrc(id)}>.
 */

export type AvatarId = "haneul" | "bada" | "saebyeok" | "noeul" | "sol" | "byeol" | "iseul" | "baram";

export interface AvatarDef {
  id: AvatarId;
  /** 화면에 보이는 이름 */
  name: string;
  /** 고르는 화면의 짧은 설명(나이대 느낌만) */
  hint: string;
  bg: string;
  skin: string;
  hair: string;
  shirt: string;
  /** 장면 속 전신 그림의 바지 색(2026-11-20) */
  pants: string;
}

export const AVATARS: readonly AvatarDef[] = [
  { id: "haneul", name: "하늘", hint: "긴 머리 · 20대", bg: "#d9ecf7", skin: "#f6d7c3", hair: "#4a3328", shirt: "#b9a8e6", pants: "#5c5a7a" },
  { id: "bada", name: "바다", hint: "짧은 머리 · 20대", bg: "#d4efe6", skin: "#efc6a8", hair: "#2e2724", shirt: "#5f7fae", pants: "#3c4a63" },
  { id: "saebyeok", name: "새벽", hint: "단발 · 30대", bg: "#fde3d3", skin: "#f3d2bf", hair: "#6b4636", shirt: "#ef9a86", pants: "#6a5a55" },
  { id: "noeul", name: "노을", hint: "안경 · 40대", bg: "#fbefd2", skin: "#e8b896", hair: "#3b302b", shirt: "#8f9a5c", pants: "#4d5240" },
  { id: "sol", name: "솔", hint: "올림머리 · 40대", bg: "#e4f2d6", skin: "#f1c9ad", hair: "#5a3b2c", shirt: "#6fae8f", pants: "#3f5a4c" },
  { id: "byeol", name: "별", hint: "곱슬머리 · 30대", bg: "#e8e2f8", skin: "#dcaa86", hair: "#2f2420", shirt: "#b98a64", pants: "#4b3d34" },
  { id: "iseul", name: "이슬", hint: "은발 · 60대", bg: "#f9dfe8", skin: "#f5d9c7", hair: "#d8d4de", shirt: "#a58bc9", pants: "#5a4e6b" },
  { id: "baram", name: "바람", hint: "흰머리 · 60대", bg: "#dde9f6", skin: "#e9c1a0", hair: "#eceae6", shirt: "#8d96a3", pants: "#4a4f57" },
];

export function avatarOf(id: string | null | undefined): AvatarDef | null {
  return AVATARS.find((a) => a.id === id) ?? null;
}

/** 살짝 어두운 피부(목·귀 그림자) */
function shade(hex: string, k = 0.9): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0");
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

function hairBack(a: AvatarDef): string {
  switch (a.id) {
    case "haneul": return `<path d="M30 42C30 24 39 17 50 17C61 17 70 24 70 42L71 74C64 79 36 79 29 74Z" fill="${a.hair}"/>`;
    case "saebyeok": return `<path d="M29 44C29 25 39 18 50 18C61 18 71 25 71 44L71 60C66 63 61 62 59 59L41 59C39 62 34 63 29 60Z" fill="${a.hair}"/>`;
    case "sol": return `<circle cx="50" cy="19" r="8.5" fill="${a.hair}"/>`;
    default: return "";
  }
}

function hairFront(a: AvatarDef): string {
  switch (a.id) {
    case "haneul": return `<path d="M32 43C32 27 41 20 50 20C60 20 68 27 68 43C64 34 57 29 50 30C43 30 37 35 32 43Z" fill="${a.hair}"/>`;
    case "bada": return `<path d="M33 43C31 28 40 20 51 20C62 20 69 28 67 42C65 35 61 31 55 31C49 30 42 32 37 37C35 39 34 41 33 43Z" fill="${a.hair}"/>`;
    case "saebyeok": return `<path d="M32 41C32 27 41 21 50 21C59 21 68 27 68 41C64 37 61 36 57 36L43 36C39 36 36 37 32 41Z" fill="${a.hair}"/>`;
    case "noeul": return `<path d="M33 43C32 28 41 22 50 22C61 22 68 29 67 43C66 36 63 32 58 31C52 29 44 30 38 34C35 36 34 39 33 43Z" fill="${a.hair}"/>`;
    case "sol": return `<path d="M33 42C33 28 41 23 50 23C59 23 67 28 67 42C63 34 57 31 50 31C43 31 37 34 33 42Z" fill="${a.hair}"/>`;
    case "byeol": {
      const dots: [number, number, number][] = [[36, 34, 6], [41, 27, 6.5], [49, 24, 7], [57, 26, 6.5], [63, 32, 6], [66, 40, 4.5], [34, 41, 4.5], [45, 30, 5], [54, 30, 5]];
      return dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${a.hair}"/>`).join("");
    }
    case "iseul": {
      const dots: [number, number, number][] = [[35, 36, 5.5], [39, 29, 5.5], [46, 25, 6], [54, 25, 6], [61, 29, 5.5], [65, 36, 5.5], [34, 43, 4], [66, 43, 4], [50, 29, 4.5]];
      return dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${a.hair}"/>`).join("");
    }
    case "baram": return `<path d="M33 46C32 37 34 31 39 28L41 35C38 37 36 41 35 46Z" fill="${a.hair}"/><path d="M67 46C68 37 66 31 61 28L59 35C62 37 64 41 65 46Z" fill="${a.hair}"/><path d="M39 28C44 24 56 24 61 28C56 27 44 27 39 28Z" fill="${a.hair}"/>`;
  }
}

function glasses(a: AvatarDef): string {
  if (a.id !== "noeul" && a.id !== "iseul") return "";
  const c = a.id === "noeul" ? "#3b302b" : "#8a6f8f";
  return `<g fill="none" stroke="${c}" stroke-width="1.5"><rect x="37.5" y="42" width="10" height="8" rx="3"/><rect x="52.5" y="42" width="10" height="8" rx="3"/><path d="M47.5 45.5h5"/></g>`;
}

/** 머리(귀·얼굴·앞머리·눈썹·눈·볼·입·안경) — 얼굴 그림과 전신 그림이 같이 쓴다. 뒷머리는 hairBack 으로 따로(몸 뒤에). */
function headFront(a: AvatarDef): string {
  const neck = shade(a.skin, 0.9);
  const older = a.id === "iseul" || a.id === "baram";
  return [
    `<ellipse cx="33.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/><ellipse cx="66.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/>`,
    `<ellipse cx="50" cy="44" rx="16.5" ry="18.5" fill="${a.skin}"/>`,
    hairFront(a),
    `<path d="M40.5 40.6q2.5-1.4 5 0M54.5 40.6q2.5-1.4 5 0" fill="none" stroke="${shade(a.hair === "#eceae6" || a.hair === "#d8d4de" ? "#9a9590" : a.hair, 1)}" stroke-width="1.3" stroke-linecap="round"/>`,
    `<ellipse cx="43" cy="46" rx="1.8" ry="2.2" fill="#3a3340"/><ellipse cx="57" cy="46" rx="1.8" ry="2.2" fill="#3a3340"/>`,
    `<circle cx="38.6" cy="51.6" r="2.7" fill="#f2a39b" opacity="0.42"/><circle cx="61.4" cy="51.6" r="2.7" fill="#f2a39b" opacity="0.42"/>`,
    older ? `<path d="M39 50.5q1.6 1 3.2 0M57.8 50.5q1.6 1 3.2 0" fill="none" stroke="${shade(a.skin, 0.8)}" stroke-width="0.9" stroke-linecap="round"/>` : "",
    `<path d="M45.5 53.4Q50 57 54.5 53.4" fill="none" stroke="#b5655a" stroke-width="1.6" stroke-linecap="round"/>`,
    glasses(a),
  ].join("");
}

/** SVG 문자열(100×100) */
export function avatarSvg(id: AvatarId): string {
  const a = avatarOf(id) ?? AVATARS[0];
  const neck = shade(a.skin, 0.9);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
    `<defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs>`,
    `<circle cx="50" cy="50" r="50" fill="${a.bg}"/>`,
    `<g clip-path="url(#c)">`,
    hairBack(a),
    `<rect x="43" y="57" width="14" height="15" rx="5" fill="${neck}"/>`,
    `<path d="M13 100C13 79 29 70 50 70C71 70 87 79 87 100Z" fill="${a.shirt}"/>`,
    `<path d="M42 70.5L50 78L58 70.5" fill="none" stroke="${shade(a.shirt, 0.82)}" stroke-width="2" stroke-linejoin="round"/>`,
    `</g>`,
    headFront(a),
    `</svg>`,
  ].join("");
}

export type FigurePose = "sit" | "walk";
/** 장면 속 전신 그림의 가로:세로 — 앉음 100×126 · 걸음 100×150 */
export const FIGURE_VIEW: Record<FigurePose, { w: number; h: number }> = { sit: { w: 100, h: 126 }, walk: { w: 100, h: 150 } };

/**
 * 장면 속 전신 캐릭터(2026-11-20 사용자 지시 "들어오는 게 보이고 퇴장할 때는 나가는 것처럼") — 앉은 모습 · 걷는 모습.
 * 걷는 모습은 SVG 안의 CSS 로 팔다리를 흔든다(이미지로 넣어도 움직인다). 머리는 얼굴 그림과 같은 것.
 */
export function figureSvg(id: AvatarId, pose: FigurePose): string {
  const a = avatarOf(id) ?? AVATARS[0];
  const neck = shade(a.skin, 0.9);
  const sleeve = shade(a.shirt, 0.92);
  const shoe = "#3a3236";
  const v = FIGURE_VIEW[pose];
  const collar = `<path d="M43 68.5L50 75L57 68.5" fill="none" stroke="${shade(a.shirt, 0.82)}" stroke-width="2" stroke-linejoin="round"/>`;
  const body = pose === "walk"
    ? [
      `<style>@keyframes s{from{transform:rotate(15deg)}to{transform:rotate(-15deg)}}`,
      `.ll{transform-origin:43.5px 106px;animation:s .42s ease-in-out infinite alternate}`,
      `.lr{transform-origin:56.5px 106px;animation:s .42s ease-in-out infinite alternate-reverse}`,
      `.al{transform-origin:31px 74px;animation:s .42s ease-in-out infinite alternate-reverse}`,
      `.ar{transform-origin:69px 74px;animation:s .42s ease-in-out infinite alternate}`,
      `@media (prefers-reduced-motion:reduce){.ll,.lr,.al,.ar{animation:none}}</style>`,
      `<g class="ll"><rect x="38" y="102" width="11" height="38" rx="5" fill="${a.pants}"/><ellipse cx="43.5" cy="141" rx="7" ry="4" fill="${shoe}"/></g>`,
      `<g class="lr"><rect x="51" y="102" width="11" height="38" rx="5" fill="${a.pants}"/><ellipse cx="56.5" cy="141" rx="7" ry="4" fill="${shoe}"/></g>`,
      `<g class="al"><rect x="25" y="72" width="11" height="32" rx="5.5" fill="${sleeve}"/><circle cx="30.5" cy="106" r="5" fill="${a.skin}"/></g>`,
      `<g class="ar"><rect x="64" y="72" width="11" height="32" rx="5.5" fill="${sleeve}"/><circle cx="69.5" cy="106" r="5" fill="${a.skin}"/></g>`,
      `<rect x="43" y="57" width="14" height="14" rx="5" fill="${neck}"/>`,
      `<path d="M33 76Q33 68 42 68H58Q67 68 67 76L69 106H31Z" fill="${a.shirt}"/>`,
      collar,
    ]
    : [
      `<path d="M13 109Q13 99 30 100L50 103L70 100Q87 99 87 109Q87 120 72 120H28Q13 120 13 109Z" fill="${a.pants}"/>`,
      `<path d="M30 111Q50 105 70 111" fill="none" stroke="${shade(a.pants, 0.78)}" stroke-width="1.6" stroke-linecap="round"/>`,
      `<rect x="43" y="57" width="14" height="14" rx="5" fill="${neck}"/>`,
      `<path d="M33 76Q33 68 42 68H58Q67 68 67 76L68 103H32Z" fill="${a.shirt}"/>`,
      `<path d="M36 75Q25 90 25 103" fill="none" stroke="${sleeve}" stroke-width="10" stroke-linecap="round"/><circle cx="25.5" cy="106" r="5" fill="${a.skin}"/>`,
      `<path d="M64 75Q75 90 75 103" fill="none" stroke="${sleeve}" stroke-width="10" stroke-linecap="round"/><circle cx="74.5" cy="106" r="5" fill="${a.skin}"/>`,
      collar,
    ];
  return [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${v.w} ${v.h}">`, hairBack(a), ...body, headFront(a), `</svg>`].join("");
}

export function figureSrc(id: AvatarId, pose: FigurePose): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(figureSvg(id, pose))}`;
}

/** <img src> 로 바로 쓰는 data URL */
export function avatarSrc(id: AvatarId): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(id))}`;
}
