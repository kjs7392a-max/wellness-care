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
/** 그림 방향 — front 앞모습 · back 뒷모습 · side 옆모습(오른쪽을 봄 · 왼쪽은 화면에서 좌우 뒤집기) */
export type FigureFacing = "front" | "back" | "side";
/** 장면 속 전신 그림의 가로:세로 — 앉음 100×126 · 걸음 100×150 (방향과 상관없이 같다) */
export const FIGURE_VIEW: Record<FigurePose, { w: number; h: number }> = { sit: { w: 100, h: 126 }, walk: { w: 100, h: 150 } };

const dotsSvg = (dots: readonly [number, number, number][], fill: string) => dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join("");

/** 뒷모습 머리(2026-11-20 — 불당·교회·성당에서 앞을 보고 앉은 모습) — 얼굴 없이 귀·뒷머리만 */
function headBack(a: AvatarDef): string {
  const neck = shade(a.skin, 0.9);
  const ears = `<ellipse cx="33.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/><ellipse cx="66.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/>`;
  const head = `<ellipse cx="50" cy="44" rx="16.5" ry="18.5" fill="${a.skin}"/>`;
  const cap = `<path d="M33.5 44C33.5 27 41 21 50 21C59 21 66.5 27 66.5 44C66.5 51 64 56 59 58.5Q50 61 41 58.5C36 56 33.5 51 33.5 44Z" fill="${a.hair}"/>`;
  let hair = cap;
  switch (a.id) {
    case "haneul": hair = `<path d="M32 44C32 25 40 19 50 19C60 19 68 25 68 44L70 76C63 80 37 80 30 76Z" fill="${a.hair}"/>`; break;
    case "saebyeok": hair = `<path d="M31.5 44C31.5 25 40 19 50 19C60 19 68.5 25 68.5 44L69 61C62 64 38 64 31 61Z" fill="${a.hair}"/>`; break;
    case "sol": hair = cap + `<circle cx="50" cy="19" r="8.5" fill="${a.hair}"/><path d="M43 25.5Q50 28.5 57 25.5" fill="none" stroke="${shade(a.hair, 0.75)}" stroke-width="1.4" stroke-linecap="round"/>`; break;
    case "byeol": hair = cap + dotsSvg([[36, 33, 6], [43, 26, 6.5], [51, 23.5, 7], [59, 26, 6.5], [65, 33, 6], [67, 42, 5], [33, 42, 5], [35, 51, 5], [41, 57, 5], [50, 58.5, 5], [59, 57, 5], [65, 51, 5]], a.hair); break;
    case "iseul": hair = cap + dotsSvg([[36, 33, 5.5], [42, 27, 5.5], [50, 24.5, 6], [58, 27, 5.5], [64, 33, 5.5], [66.5, 41, 4.5], [33.5, 41, 4.5], [35, 50, 4.5], [41, 56.5, 4.5], [50, 58, 4.5], [59, 56.5, 4.5], [65, 50, 4.5]], a.hair); break;
    case "baram": hair = `<path d="M33.8 37Q42 30.5 50 31Q58 30.5 66.2 37L66.5 45C66.3 52 62 58 50 59.5C38 58 33.7 52 33.5 45Z" fill="${a.hair}" stroke="${shade(a.hair, 0.82)}" stroke-width="0.9"/><path d="M40 41Q42 49 41 55M50 36Q50.5 46 50 57M60 41Q58 49 59 55" fill="none" stroke="${shade(a.hair, 0.86)}" stroke-width="0.9" stroke-linecap="round"/>`; break;
  }
  return ears + head + hair;
}

/** 옆모습 머리 — 오른쪽을 본다(왼쪽은 화면에서 뒤집기). 명상룸에서 서로 마주 보고 앉은 모습 · 옆으로 걷는 모습 */
function headSide(a: AvatarDef): string {
  const neck = shade(a.skin, 0.9);
  const older = a.id === "iseul" || a.id === "baram";
  const head = `<ellipse cx="50" cy="44" rx="16" ry="18.5" fill="${a.skin}"/><path d="M65 45.5Q69.2 49.2 65 51.8Z" fill="${a.skin}"/>`;
  const cap = `<path d="M34 46C33 29 41 22 51 22C60 22 66 28 66.3 37C62 34.5 56 34 51 36C48 37.5 46.5 40 46 44C45.5 50 44 55 41 59C36.5 56 34.2 51.5 34 46Z" fill="${a.hair}"/>`;
  const ear = `<ellipse cx="46.5" cy="47" rx="3" ry="4" fill="${neck}"/>`;
  let back = "", hair = cap, showEar = true;
  switch (a.id) {
    case "haneul": hair = `<path d="M34 44C33 30 41 22 51 22C60 22 66 28 66.3 37C62 34.5 56 34 51 36C48 38 47 41 46.5 45L47 60C47 66 46 71 44 76C38 77 33 76 31 73C32 64 34 55 34 44Z" fill="${a.hair}"/>`; showEar = false; break;
    case "saebyeok": hair = `<path d="M34 44C33 29 41 22 51 22C60 22 66 28 66.3 37C62 35 56 34.5 51 36.5C48 38 47 41 47 45L48 59C44 62 37 62 33 59C33.5 54 34 49 34 44Z" fill="${a.hair}"/>`; showEar = false; break;
    case "sol": back = `<circle cx="37" cy="27" r="8" fill="${a.hair}"/>`; break;
    case "byeol": hair = cap + dotsSvg([[38, 29, 6.5], [45, 24.5, 6.5], [53, 23.5, 6.5], [60, 26.5, 5.5], [64.5, 32, 4.5], [35, 37, 6], [35.5, 46, 5.5], [39, 54, 5], [43.5, 39, 5]], a.hair); break;
    case "iseul": hair = cap + dotsSvg([[38, 29.5, 5.5], [45, 25.5, 5.5], [52.5, 24.5, 5.5], [59.5, 27, 5], [64, 32.5, 4], [35.5, 37, 5], [35.5, 45.5, 4.8], [39, 53, 4.5]], a.hair); break;
    case "baram": hair = `<path d="M34 42C34 38 36 35 39 33L46.5 36C45.5 41 45 48 44 56C39 56 34.5 51 34 46Z" fill="${a.hair}"/><path d="M41 27Q50 23 59 26Q50 25.5 41 27Z" fill="${a.hair}"/>`; break;
  }
  const brow = `<path d="M57 40.6q2.5-1.4 5 0" fill="none" stroke="${shade(a.hair === "#eceae6" || a.hair === "#d8d4de" ? "#9a9590" : a.hair, 1)}" stroke-width="1.3" stroke-linecap="round"/>`;
  const glass = a.id === "noeul" || a.id === "iseul"
    ? `<g fill="none" stroke="${a.id === "noeul" ? "#3b302b" : "#8a6f8f"}" stroke-width="1.5"><rect x="55.5" y="42" width="9" height="8" rx="3"/><path d="M55.5 45.5H47.5"/></g>`
    : "";
  return [
    back, head, hair, showEar ? ear : "", brow,
    `<ellipse cx="60" cy="46" rx="1.7" ry="2.2" fill="#3a3340"/>`,
    `<circle cx="58.5" cy="51.8" r="2.6" fill="#f2a39b" opacity="0.42"/>`,
    older ? `<path d="M57.5 50.4q1.6 1 3.2 0" fill="none" stroke="${shade(a.skin, 0.8)}" stroke-width="0.9" stroke-linecap="round"/>` : "",
    `<path d="M60.3 54.4Q62.6 56 64.3 54" fill="none" stroke="#b5655a" stroke-width="1.5" stroke-linecap="round"/>`,
    glass,
  ].join("");
}

/** 걷는 팔다리 흔들기(그림 안 CSS) — 움직임 줄이기 설정이면 멈춘다 */
function swingStyle(o: { ll: string; lr: string; al: string; ar: string }): string {
  return [
    `<style>@keyframes s{from{transform:rotate(15deg)}to{transform:rotate(-15deg)}}`,
    `.ll{transform-origin:${o.ll};animation:s .42s ease-in-out infinite alternate}`,
    `.lr{transform-origin:${o.lr};animation:s .42s ease-in-out infinite alternate-reverse}`,
    `.al{transform-origin:${o.al};animation:s .42s ease-in-out infinite alternate-reverse}`,
    `.ar{transform-origin:${o.ar};animation:s .42s ease-in-out infinite alternate}`,
    `@media (prefers-reduced-motion:reduce){.ll,.lr,.al,.ar{animation:none}}</style>`,
  ].join("");
}

/**
 * 장면 속 전신 캐릭터(2026-11-20 사용자 지시) — 앉은/걷는 모습 × 앞·뒤·옆.
 * - 불당·교회·성당: 앞을 보고 앉는다 → 뒷모습 · 명상룸: 서로 마주 본다 → 옆모습.
 * - 걸을 때는 가는 쪽을 본다(안쪽으로 들어가면 뒷모습, 화면 쪽으로 나오면 앞모습, 옆으로 가면 옆모습).
 * 걷는 모습은 SVG 안의 CSS 로 팔다리를 흔든다(이미지로 넣어도 움직인다).
 */
export function figureSvg(id: AvatarId, pose: FigurePose, facing: FigureFacing = "front"): string {
  const a = avatarOf(id) ?? AVATARS[0];
  const neck = shade(a.skin, 0.9);
  const sleeve = shade(a.shirt, 0.92);
  const shoe = "#3a3236";
  const v = FIGURE_VIEW[pose];
  const collar = `<path d="M43 68.5L50 75L57 68.5" fill="none" stroke="${shade(a.shirt, 0.82)}" stroke-width="2" stroke-linejoin="round"/>`;
  const torso = `<path d="M33 76Q33 68 42 68H58Q67 68 67 76L${pose === "walk" ? "69 106H31" : "68 103H32"}Z" fill="${a.shirt}"/>`;
  const neckRect = `<rect x="43" y="57" width="14" height="14" rx="5" fill="${neck}"/>`;
  let parts: string[];
  if (facing === "side") {
    const sideNeck = `<rect x="45" y="57" width="11" height="14" rx="5" fill="${neck}"/>`;
    if (pose === "walk") {
      const backPants = shade(a.pants, 0.82), backSleeve = shade(a.shirt, 0.8);
      parts = [
        swingStyle({ ll: "50.5px 102px", lr: "50.5px 102px", al: "50px 74px", ar: "50px 74px" }),
        `<g class="lr"><rect x="45" y="100" width="11" height="40" rx="5" fill="${backPants}"/><ellipse cx="53" cy="141" rx="8" ry="4" fill="${shoe}"/></g>`,
        `<g class="al"><rect x="45" y="72" width="10" height="32" rx="5" fill="${backSleeve}"/><circle cx="50" cy="106" r="4.6" fill="${shade(a.skin, 0.92)}"/></g>`,
        `<g class="ll"><rect x="45" y="100" width="11" height="40" rx="5" fill="${a.pants}"/><ellipse cx="53" cy="141" rx="8" ry="4" fill="${shoe}"/></g>`,
        sideNeck,
        `<path d="M40 76Q40 68 48 68H53Q61 68 61 76L62 106H39Z" fill="${a.shirt}"/>`,
        `<g class="ar"><rect x="45" y="72" width="10" height="32" rx="5" fill="${sleeve}"/><circle cx="50" cy="106" r="4.8" fill="${a.skin}"/></g>`,
        headSide(a),
      ];
    } else {
      parts = [
        `<path d="M27 108Q27 99 40 99H70Q81 100 81 108.5Q81 118 70 118.5H36Q27 118 27 111Z" fill="${a.pants}"/>`,
        `<path d="M44 108.5Q60 104.5 76 108" fill="none" stroke="${shade(a.pants, 0.78)}" stroke-width="1.6" stroke-linecap="round"/>`,
        sideNeck,
        `<path d="M39 76Q39 68 47 68H54Q62 68 62 76L63 104H37Z" fill="${a.shirt}"/>`,
        `<path d="M53 75Q61 90 67 101" fill="none" stroke="${sleeve}" stroke-width="10" stroke-linecap="round"/><circle cx="68.5" cy="104" r="5" fill="${a.skin}"/>`,
        headSide(a),
      ];
    }
  } else if (pose === "walk") {
    parts = [
      swingStyle({ ll: "43.5px 106px", lr: "56.5px 106px", al: "31px 74px", ar: "69px 74px" }),
      `<g class="ll"><rect x="38" y="102" width="11" height="38" rx="5" fill="${a.pants}"/><ellipse cx="43.5" cy="141" rx="7" ry="4" fill="${shoe}"/></g>`,
      `<g class="lr"><rect x="51" y="102" width="11" height="38" rx="5" fill="${a.pants}"/><ellipse cx="56.5" cy="141" rx="7" ry="4" fill="${shoe}"/></g>`,
      `<g class="al"><rect x="25" y="72" width="11" height="32" rx="5.5" fill="${sleeve}"/><circle cx="30.5" cy="106" r="5" fill="${a.skin}"/></g>`,
      `<g class="ar"><rect x="64" y="72" width="11" height="32" rx="5.5" fill="${sleeve}"/><circle cx="69.5" cy="106" r="5" fill="${a.skin}"/></g>`,
      neckRect, torso,
      facing === "back" ? headBack(a) : collar + headFront(a),
    ];
    if (facing === "front") parts.unshift(hairBack(a));
  } else {
    const legs = [
      `<path d="M13 109Q13 99 30 100L50 103L70 100Q87 99 87 109Q87 120 72 120H28Q13 120 13 109Z" fill="${a.pants}"/>`,
      facing === "back" ? "" : `<path d="M30 111Q50 105 70 111" fill="none" stroke="${shade(a.pants, 0.78)}" stroke-width="1.6" stroke-linecap="round"/>`,
    ];
    parts = facing === "back"
      ? [
        ...legs, neckRect, torso,
        // 뒷모습 — 손은 앞(무릎 위)에 있어 안 보인다
        `<path d="M36 75Q28 89 30 101" fill="none" stroke="${sleeve}" stroke-width="10" stroke-linecap="round"/>`,
        `<path d="M64 75Q72 89 70 101" fill="none" stroke="${sleeve}" stroke-width="10" stroke-linecap="round"/>`,
        headBack(a),
      ]
      : [
        hairBack(a), ...legs, neckRect, torso,
        `<path d="M36 75Q25 90 25 103" fill="none" stroke="${sleeve}" stroke-width="10" stroke-linecap="round"/><circle cx="25.5" cy="106" r="5" fill="${a.skin}"/>`,
        `<path d="M64 75Q75 90 75 103" fill="none" stroke="${sleeve}" stroke-width="10" stroke-linecap="round"/><circle cx="74.5" cy="106" r="5" fill="${a.skin}"/>`,
        collar, headFront(a),
      ];
  }
  return [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${v.w} ${v.h}">`, ...parts, `</svg>`].join("");
}

export function figureSrc(id: AvatarId, pose: FigurePose, facing: FigureFacing = "front"): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(figureSvg(id, pose, facing))}`;
}

/** <img src> 로 바로 쓰는 data URL */
export function avatarSrc(id: AvatarId): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(id))}`;
}
