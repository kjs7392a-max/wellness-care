/**
 * 마음 쉼터 「함께 머무는 캐릭터」(2026-11-20 사용자 지시 · 원본 그림, 앱 파스텔 톤).
 * 2026-11-21 사용자 "남녀 구분 · 20대에서 40대까지 — 지금 보면 스타일이 다 아줌마야" → 다시 그렸다가
 * 같은 날 "마음의 대화와 같은 캐릭터로 해도 될 것 같은데" → **마음의 대화 캐릭터 6명(characters.ts)과 같은 사람**으로.
 *   - 고르는 화면·대화창 얼굴 = 마음의 대화 그림 그대로(작게 줄인 사본 public/wellness/space/avatars/{look}.jpg).
 *   - 장면 속 몸(앉음·장의자·걸음 × 앞·옆·뒤) = 이 파일의 단순 그림 — 머리 모양·안경·귀걸이·옷을 그 캐릭터와 똑같이 맞췄다.
 *   🚫 id 는 서버 space_profiles 의 avatar 검사(8개)에 있는 것만 — 6명은 그 가운데 6개, 예전 이슬·별은 하늘·바다 모습으로(LEGACY).
 * 실명 대신 이 캐릭터 이름(또는 내가 지은 이름)만 보인다.
 */

export type AvatarId = "haneul" | "bada" | "saebyeok" | "noeul" | "sol" | "byeol" | "iseul" | "baram";
export type AvatarGender = "f" | "m";
export type AvatarAge = 20 | 30 | 40 | 50;
/** 마음의 대화 캐릭터(characters.ts 의 id) — 같은 사람 */
export type AvatarLook = "cheer" | "peer" | "senior" | "buddy" | "counselor" | "listener";
/** 윗옷 — 가디건(안에 흰 옷) · 깃 블라우스 · 단추 셔츠 · 니트(안에 셔츠 깃) */
export type AvatarTop = "cardigan" | "blouse" | "shirt" | "sweater";

export interface AvatarDef {
  id: AvatarId;
  /** 화면에 보이는 이름 */
  name: string;
  look: AvatarLook;
  gender: AvatarGender;
  /** 나이대(마음의 대화 캐릭터 나이 그대로) */
  age: AvatarAge;
  /** 고르는 화면의 짧은 설명 — "여성 · 20대" */
  hint: string;
  bg: string;
  skin: string;
  hair: string;
  /** 윗옷 색 */
  shirt: string;
  top: AvatarTop;
  /** 안에 입은 옷·깃 색 */
  inner: string;
  /** 장면 속 전신 그림의 바지 색(2026-11-20) */
  pants: string;
  glasses?: boolean;
  /** 희끗한 머리(옆머리·한 줄기) */
  gray?: string;
}

const def = (d: Omit<AvatarDef, "hint">): AvatarDef => ({ ...d, hint: `${d.gender === "f" ? "여성" : "남성"} · ${d.age}대` });

/** 고르는 화면 순서 — 윗줄 여성 · 아랫줄 남성, 젊은 순(마음의 대화 캐릭터 나이: 28·34·47 / 31·45·52) */
export const AVATARS: readonly AvatarDef[] = [
  def({ id: "haneul", name: "하늘", look: "cheer", gender: "f", age: 20, bg: "#d3efe6", skin: "#f8dccb", hair: "#231d1c", shirt: "#f2df8f", top: "cardigan", inner: "#fbf8f1", pants: "#6f7fa0" }),
  def({ id: "saebyeok", name: "새벽", look: "peer", gender: "f", age: 30, bg: "#f8ddd4", skin: "#f4d4c1", hair: "#3a2822", shirt: "#f1c5b6", top: "blouse", inner: "#f6d6ca", pants: "#86716a" }),
  def({ id: "sol", name: "솔", look: "senior", gender: "f", age: 40, bg: "#cfdcf2", skin: "#f1d1bc", hair: "#3a2d28", shirt: "#2e3b5e", top: "cardigan", inner: "#fbfaf6", pants: "#3b4256", glasses: true, gray: "#9b948f" }),
  def({ id: "bada", name: "바다", look: "buddy", gender: "m", age: 30, bg: "#d3ecdc", skin: "#f1cfb4", hair: "#1f1a1a", shirt: "#a9c2e8", top: "shirt", inner: "#a9c2e8", pants: "#3c4a63" }),
  def({ id: "noeul", name: "노을", look: "counselor", gender: "m", age: 40, bg: "#ddd6f2", skin: "#ecc6a9", hair: "#3b3330", shirt: "#8d8e93", top: "sweater", inner: "#f7f7f5", pants: "#4a4d55", glasses: true }),
  def({ id: "baram", name: "바람", look: "listener", gender: "m", age: 50, bg: "#d6e2ef", skin: "#e9c2a3", hair: "#2f2a28", shirt: "#2c3a5e", top: "sweater", inner: "#c9d9f0", pants: "#55524e", gray: "#8f8984" }),
];

/** 예전에 고른 이슬·별(2026-11-21 앞 그림) — 서버엔 그대로 있으니 비슷한 사람 모습으로 그린다 */
const LEGACY: Partial<Record<AvatarId, AvatarId>> = { iseul: "haneul", byeol: "bada" };

export function avatarOf(id: string | null | undefined): AvatarDef | null {
  const real = (id && LEGACY[id as AvatarId]) || id;
  return AVATARS.find((a) => a.id === real) ?? null;
}

/** 살짝 어두운 피부(목·귀 그림자) */
function shade(hex: string, k = 0.9): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0");
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
}
const path = (d: string, fill: string, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;
const strokes = (d: string, color: string, w = 0.9, op = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;

// ── 앞모습 머리 ─────────────────────────────────────────────────────────────
// 머리(얼굴) = 타원 (50,44) 가로 16.5 · 세로 18.5 → 정수리 y 25.5 · 턱 y 62.5 · 귀 x 33.5/66.5

/** 몸 뒤에 그리는 뒷머리(똥머리·단발) */
function hairBack(a: AvatarDef): string {
  switch (a.look) {
    // 밝은 사람 — 정수리에 묶은 똥머리
    case "cheer": return `<circle cx="50.5" cy="16.5" r="7.6" fill="${a.hair}"/><circle cx="46" cy="18.6" r="4.2" fill="${a.hair}"/>`;
    // 옆반 동료 — 어깨에 닿는 단발(끝이 살짝 뻗친다)
    case "peer": return path("M30 44C29 25 39 18 50 18C61 18 71 25 70 44L71.5 61C72.5 66 70 68.5 66 67L34 67C30 68.5 27.5 66 28.5 61Z", a.hair);
    // 수석교사 — 턱선 위 짧은 단발(볼륨)
    case "senior": return path("M30.5 44C30 25.5 39.5 19 50 19C60.5 19 70 25.5 69.5 44L70 54C67.5 57.5 63 57.5 61 55.5H39C37 57.5 32.5 57.5 30 54Z", a.hair);
    default: return "";
  }
}

/** 얼굴 위에 그리는 앞머리·옆머리 */
function hairFront(a: AvatarDef): string {
  const dk = shade(a.hair, 0.72), lt = shade(a.hair, 1.45);
  switch (a.look) {
    case "cheer": // 위로 묶음 · 눈썹 위 앞머리 · 귀 앞으로 가는 잔머리
      return path("M33.4 43C32.4 28.5 40.5 21.5 50 21.5C59.5 21.5 67.6 28.5 66.6 43C65.6 37 63.5 33 60.5 30.8C57 33.4 53.6 34.4 50 34.4C46.4 34.4 43 33.4 39.5 30.8C36.5 33 34.4 37 33.4 43Z", a.hair)
        + path("M38.6 31.2C40 35.5 41 38.2 42 39.4C43 37.6 44.5 36.6 46 36.8C47 38.4 48.4 39.6 50 40C51.6 39.6 53 38.4 54 36.8C55.5 36.6 57 37.6 58 39.4C59 38.2 60 35.5 61.4 31.2C57.5 33.6 54 34.4 50 34.4C46 34.4 42.5 33.6 38.6 31.2Z", a.hair)
        + strokes("M34.6 39.5Q33.9 43.5 34.8 47.5M65.4 39.5Q66.1 43.5 65.2 47.5", a.hair, 0.8, 0.75)
        + strokes("M44 24Q48 22.6 53 23.4", lt, 1, 0.45);
    case "peer": // 옆가르마로 넘긴 앞머리 + 볼을 감싸는 옆머리(끝이 뻗침)
      return path("M32.5 46C31 28 40 20.5 51 20.5C61 20.5 69 28 67.5 46C66.3 38.5 64.3 33.5 60.5 30.5C54.5 34 46 36.2 38.6 35C36 38 34 41.5 32.5 46Z", a.hair)
        + path("M32.8 41C31.4 50 31.8 58 33.6 64.6C34.2 66.4 36.6 66.6 37.6 65.2C35.8 58 35.4 50 36.2 42.5Z", a.hair)
        + path("M67.2 41C68.6 50 68.2 58 66.4 64.6C65.8 66.4 63.4 66.6 62.4 65.2C64.2 58 64.6 50 63.8 42.5Z", a.hair)
        + strokes("M40.5 33.4Q48 31.5 57 27.6", dk, 0.9, 0.55);
    case "senior": // 옆가르마 짧은 단발 · 오른쪽 위에 희끗한 한 줄기
      return path("M32.6 46C31.4 28 40 21 50.5 21C61 21 68.6 28 67.4 46C66 38.5 62.5 33 56.5 31.4C50 31.6 42.5 34 37.2 38.4C35 40.4 33.5 43 32.6 46Z", a.hair)
        + path("M32.8 41C31.6 47.5 32.2 52.5 34 55.5L37 55C35.6 51 35.4 46.5 36.2 42.3Z", a.hair)
        + path("M67.2 41C68.4 47.5 67.8 52.5 66 55.5L63 55C64.4 51 64.6 46.5 63.8 42.3Z", a.hair)
        + strokes(`M57 23.4Q63.5 26.2 66 33.6`, a.gray ?? lt, 1.6, 0.85)
        + strokes("M41 26.5Q47 23.6 54 24", lt, 1, 0.4);
    case "buddy": // 볼륨 있는 검은 머리 · 앞머리를 한쪽으로 쓸어 이마가 살짝 보인다
      return path("M33 44C30.5 27 39.5 18 51 18C62.5 18 70.5 26 67 44C66 37 63.5 32.5 58.5 30.8C54.5 31 50.5 33.2 47.8 36.8C46.4 33.4 43.2 31.6 39.8 32.2C36.2 34 34 38 33 44Z", a.hair)
        + strokes("M40 25Q46 22.5 52 23.4M55 24.5Q60 25.5 63.5 29.5M44 29.5Q48 27.5 53 28.5", lt, 1, 0.45);
    case "counselor": // 앞머리를 내린 결 있는 머리(안경)
      return path("M33 45C31.5 29 40 21 50.5 21C61 21 68.5 29 67 45C66.2 41 65.5 38.2 64 36.6C59.5 38.2 54.5 38.8 49.5 38.4C44 38 39 37.4 35.6 37C34.4 39.2 33.6 42 33 45Z", a.hair)
        + strokes("M40 37.6L41 34.8M45 38.2L45.6 35M50 38.6L50.2 35.2M55 38.4L54.6 35.2M60 37.8L59 35", dk, 0.9, 0.6)
        + strokes("M41 26Q47 23 54 24M56 25.5Q61 27 64 31", lt, 1, 0.45);
    case "listener": // 옆가르마로 넘긴 머리 · 옆머리가 희끗하다
      return path("M33.5 44C32 29 40 21.5 50 21.5C60.5 21.5 68 28.5 66.5 44C65.5 38 64 34 61 32C56 31.4 50 31.8 44 33C40 34 37 36 35.5 38.5C34.6 40 34 42 33.5 44Z", a.hair)
        + strokes("M44.5 23.4Q43.2 27.5 44 33", lt, 0.8, 0.55)
        + strokes("M34.6 38Q33.8 41 34.2 44.5M65.4 38Q66.2 41 65.8 44.5", a.gray ?? lt, 1.7, 0.9);
  }
}

function glasses(a: AvatarDef): string {
  if (!a.glasses) return "";
  return `<g fill="none" stroke="#5e5860" stroke-width="1"><rect x="37.2" y="41.6" width="10.6" height="8.6" rx="3.8"/><rect x="52.2" y="41.6" width="10.6" height="8.6" rx="3.8"/><path d="M47.8 45.2q2.2-1.2 4.4 0M37.2 44.8L34.4 43.9M62.8 44.8L65.6 43.9"/></g>`;
}

/** 머리(귀·얼굴·앞머리·눈썹·눈·볼·입·안경·귀걸이) — 얼굴 그림과 전신 그림이 같이 쓴다. 뒷머리는 hairBack 으로 따로(몸 뒤에). */
function headFront(a: AvatarDef): string {
  const neck = shade(a.skin, 0.9);
  const f = a.gender === "f";
  const browC = shade(a.hair, f ? 1.15 : 1);
  // 눈 — 크고 반짝이게(마음의 대화 캐릭터처럼) · 여성은 바깥쪽 속눈썹
  const eye = (cx: number, out: number) =>
    `<ellipse cx="${cx}" cy="46" rx="2.1" ry="2.5" fill="#3a3340"/><circle cx="${cx + 0.7}" cy="45.1" r="0.7" fill="#fff"/>`
    + (f ? strokes(`M${cx + out * 1.9} 44.9l${out * 1.4} -1.1`, "#3a3340", 0.9) : "");
  return [
    `<ellipse cx="33.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/><ellipse cx="66.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/>`,
    `<ellipse cx="50" cy="44" rx="16.5" ry="18.5" fill="${a.skin}"/>`,
    hairFront(a),
    f
      ? strokes("M40.5 40.4q2.5-1.4 5 0M54.5 40.4q2.5-1.4 5 0", browC, 1.2)
      : strokes("M40 40.3q2.9-1.2 5.8-.3M54.2 40q2.9-.9 5.8.3", browC, 1.9),
    eye(43, -1), eye(57, 1),
    `<circle cx="38.6" cy="51.6" r="2.7" fill="#f2a39b" opacity="${f ? 0.45 : 0.18}"/><circle cx="61.4" cy="51.6" r="2.7" fill="#f2a39b" opacity="${f ? 0.45 : 0.18}"/>`,
    f
      ? strokes("M45.4 53.4Q50 57.4 54.6 53.4", "#c55f5a", 1.6)
      : strokes("M46 54Q50 56.8 54 54", "#a45a50", 1.5),
    glasses(a),
  ].join("");
}

/**
 * 윗옷의 앞쪽 무늬(2026-11-21 — 마음의 대화 캐릭터 옷과 같게) — 목둘레 y0 부터 아래 y1 까지.
 *   가디건 = 가운데 안옷(흰 티·블라우스)이 보이고 단추 · 블라우스 = 깃과 V 로 트인 목 · 셔츠 = 깃·단추 · 니트 = 목 둘레 골지 + 안에 셔츠 깃.
 */
function neckline(a: AvatarDef, y0: number, y1: number, skin = a.skin): string {
  const s2 = shade(a.shirt, 0.86), in2 = shade(a.inner, 0.9);
  const collar = (c: string, line: string) =>
    path(`M43 ${y0 - 0.5}L48.5 ${y0 + 6.5}L50 ${y0 + 1}Z`, c, ` stroke="${line}" stroke-width="0.6"`)
    + path(`M57 ${y0 - 0.5}L51.5 ${y0 + 6.5}L50 ${y0 + 1}Z`, c, ` stroke="${line}" stroke-width="0.6"`);
  switch (a.top) {
    case "cardigan": {
      const blouse = a.look === "senior";
      return path(`M44 ${y0}Q50 ${y0 + 4} 56 ${y0}L54.6 ${y1}H45.4Z`, a.inner)
        + (blouse ? collar(a.inner, in2) : strokes(`M45.2 ${y0 + 0.6}Q50 ${y0 + 4} 54.8 ${y0 + 0.6}`, in2, 0.8))
        + strokes(`M45.4 ${y0 + 2}L45.4 ${y1}M54.6 ${y0 + 2}L54.6 ${y1}`, s2, 0.9)
        + [y0 + 13, y0 + 22, y0 + 31].filter((y) => y < y1 - 2).map((y) => `<circle cx="56.3" cy="${y}" r="0.9" fill="${shade(a.shirt, 0.7)}"/>`).join("");
    }
    case "blouse":
      return path(`M46.5 ${y0}L50 ${y0 + 9}L53.5 ${y0}Z`, skin) + collar(a.inner, s2) + strokes(`M50 ${y0 + 9}V${y1}`, s2, 0.7, 0.8);
    case "shirt":
      return collar(shade(a.shirt, 1.04), s2) + strokes(`M50 ${y0 + 6}V${y1}`, s2, 0.8) + [y0 + 12, y0 + 21, y0 + 30].filter((y) => y < y1 - 2).map((y) => `<circle cx="50" cy="${y}" r="0.8" fill="#f4f6fa"/>`).join("");
    case "sweater":
      return path(`M42.5 ${y0 - 0.5}Q50 ${y0 + 7.5} 57.5 ${y0 - 0.5}L56 ${y0 - 0.5}Q50 ${y0 + 5} 44 ${y0 - 0.5}Z`, s2) + collar(a.inner, in2);
  }
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
    neckline(a, 70.5, 100),
    `</g>`,
    headFront(a),
    `</svg>`,
  ].join("");
}

/** sit = 바닥에 책상다리(방석·좌복) · pew = 장의자에 앉은 윗몸(아래는 등받이에 가림) · walk = 걷기 */
/** stand = 걷는 모습 그대로 멈춰 선 것(일어선 뒤·앉기 직전 잠깐) */
export type FigurePose = "sit" | "pew" | "walk" | "stand";
/** 그림 방향 — front 앞모습 · back 뒷모습 · side 옆모습(오른쪽을 봄 · 왼쪽은 화면에서 좌우 뒤집기) */
export type FigureFacing = "front" | "back" | "side";
/** 장면 속 전신 그림의 가로:세로 — 앉음 100×126 · 장의자 100×104(가슴께에서 잘림) · 걸음 100×150 (방향과 상관없이 같다) */
export const FIGURE_VIEW: Record<FigurePose, { w: number; h: number }> = { sit: { w: 100, h: 126 }, pew: { w: 100, h: 104 }, walk: { w: 100, h: 150 }, stand: { w: 100, h: 150 } };


/** 뒷모습 머리(2026-11-20 — 불당·교회·성당에서 앞을 보고 앉은 모습) — 얼굴 없이 귀·뒷머리만 */
function headBack(a: AvatarDef): string {
  const neck = shade(a.skin, 0.9);
  const ears = `<ellipse cx="33.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/><ellipse cx="66.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/>`;
  const head = `<ellipse cx="50" cy="44" rx="16.5" ry="18.5" fill="${a.skin}"/>`;
  const cap = (top = 21, nape = 58.5) => path(`M33.5 44C33.5 ${top + 6} 41 ${top} 50 ${top}C59 ${top} 66.5 ${top + 6} 66.5 44C66.5 51 64 56 59 ${nape}Q50 ${nape + 2.5} 41 ${nape}C36 56 33.5 51 33.5 44Z`, a.hair);
  const dk = shade(a.hair, 0.72), lt = shade(a.hair, 1.45);
  let hair = cap();
  switch (a.look) {
    case "cheer": // 위로 묶은 똥머리 · 목덜미 잔머리
      hair = cap(21.5, 55.5) + `<circle cx="50" cy="19" r="8" fill="${a.hair}"/>` + strokes("M44 21Q50 16 56 21", lt, 0.9, 0.45) + strokes("M41 54.5Q40.5 58 41.5 60.5M59 54.5Q59.5 58 58.5 60.5", a.hair, 0.9, 0.9); break;
    case "peer": hair = path("M31.5 44C31.5 25 40 19 50 19C60 19 68.5 25 68.5 44L70 61C71 66 68.5 68 65 66.6L35 66.6C31.5 68 29 66 30 61Z", a.hair) + strokes("M38 64Q50 61.5 62 64", dk, 0.9, 0.5); break;
    case "senior": hair = path("M32 44C32 25.5 40 20 50 20C60 20 68 25.5 68 44L68.8 53.8C66 57 61 57 59 55H41C39 57 34 57 31.2 53.8Z", a.hair) + strokes("M55 23Q62 26 65 33", a.gray ?? lt, 1.6, 0.8); break;
    case "buddy": hair = cap(18.5, 57) + strokes("M39 28Q45 24 51 25M53 25.5Q59 25 62.5 30M41 35Q48 32 56 34", lt, 1, 0.45); break;
    case "counselor": hair = cap(21, 57.5) + strokes("M42 30Q50 27 58 30M40 38Q50 35 60 38", lt, 0.9, 0.4); break;
    case "listener": hair = cap(21.5, 56.5) + strokes("M35 42Q35.5 50 39 55.5M65 42Q64.5 50 61 55.5", a.gray ?? lt, 1.8, 0.85); break;
  }
  return ears + head + hair;
}

/** 옆모습 머리 — 오른쪽을 본다(왼쪽은 화면에서 뒤집기). 명상룸에서 서로 마주 보고 앉은 모습 · 옆으로 걷는 모습 */
function headSide(a: AvatarDef): string {
  const neck = shade(a.skin, 0.9);
  const f = a.gender === "f";
  const head = `<ellipse cx="50" cy="44" rx="16" ry="18.5" fill="${a.skin}"/><path d="M65 45.5Q69.2 49.2 65 51.8Z" fill="${a.skin}"/>`;
  const capD = "M34 46C33 29 41 22 51 22C60 22 66 28 66.3 37C62 34.5 56 34 51 36C48 37.5 46.5 40 46 44C45.5 50 44 55 41 59C36.5 56 34.2 51.5 34 46Z";
  const ear = `<ellipse cx="46.5" cy="47" rx="3" ry="4" fill="${neck}"/>`;
  const dk = shade(a.hair, 0.72), lt = shade(a.hair, 1.45);
  let back = "", hair = path(capD, a.hair), showEar = true, after = "";
  switch (a.look) {
    case "cheer": // 정수리 뒤 똥머리 · 이마 앞머리
      back = `<circle cx="42" cy="20.5" r="7.6" fill="${a.hair}"/>`;
      hair = path("M34 46C33 29 41 22 51 22C60 22 66 28 66.6 39C64.6 38.6 62.8 38 61.4 37.4C56.5 35.8 51.5 36 48.5 38C47 40.5 46.4 43.5 46 46C45.4 50 44 54.5 41.2 58C36.6 55.6 34.2 51.5 34 46Z", a.hair)
        + strokes("M49 41Q48.4 48 50 54", a.hair, 1, 0.9);
      break;
    case "peer": hair = path("M34 44C33 29 41 22 51 22C60 22 66 28 66.3 37C62 35 56 34.5 51 36.5C48 38 47 41 47 45L48 61C48.5 65 46.5 67.4 43 66.8L33 64.2C31.6 63.8 31 62.4 31.5 61C33.2 55.5 34 50 34 44Z", a.hair); showEar = false; break;
    case "senior":
      hair = path("M34 44C33 29 41 22 51 22C60 22 66 28 66.3 37C62 35 56 34.5 51 36.5C48 38 47 41 47 45L47.8 54.5C47.8 56.5 46.4 57.4 44.5 57.2L34.5 55.6C33 55.3 32.5 54 32.8 52.6C33.6 49.6 34 47 34 44Z", a.hair)
        + strokes("M46 24Q55 22.5 61.5 27.5", a.gray ?? lt, 1.6, 0.8);
      showEar = false; break;
    case "buddy": hair = path("M34 46C32.5 28 40.5 19 52 19.5C61.5 20 67.5 27 66.6 37.5C63 35.8 59.5 35.6 56.5 36.8C54 34.5 50.5 34.6 48 37C46.6 40 46 43 45.8 46C45.2 50.5 43.8 55 41 58.5C36.5 56 34.2 51.5 34 46Z", a.hair) + strokes("M42 26Q48 22.5 55 23.5M45 31Q51 28.5 58 30", lt, 1, 0.45); break;
    case "counselor": hair = path("M34 46C33 29 41 22 51 22C60 22 66 28 66.6 38.5C64.5 38.2 62.6 37.8 61 37.2C56 35.8 51.5 36 48.5 38C47 40.5 46.4 43.5 46 46C45.3 50.5 43.8 55 41 58.5C36.5 56 34.2 51.5 34 46Z", a.hair) + strokes("M63 38.2L63.6 35.4M59.5 37.4L59.8 34.6", dk, 0.8, 0.6) + strokes("M42 27Q49 24 56 25", lt, 0.9, 0.4); break;
    case "listener": after = strokes("M44.6 38Q43.4 44 41.5 50", a.gray ?? lt, 2, 0.85); break;
  }
  const brow = f ? strokes("M57 40.4q2.5-1.4 5 0", shade(a.hair, 1.15), 1.2) : strokes("M56.8 40.3q2.9-1.1 5.6-.2", a.hair, 1.8);
  const glass = a.glasses
    ? `<g fill="none" stroke="#5e5860" stroke-width="1"><rect x="55.2" y="41.6" width="9.4" height="8.6" rx="3.6"/><path d="M55.2 45.2H47.5"/></g>`
    : "";
  return [
    back, head, hair, after, showEar ? ear : "", brow,
    `<ellipse cx="60" cy="46" rx="1.9" ry="2.4" fill="#3a3340"/><circle cx="60.7" cy="45.1" r="0.6" fill="#fff"/>`,
    f ? strokes("M61.6 44.5l1.4-1", "#3a3340", 0.9) : "",
    `<circle cx="58.5" cy="51.8" r="2.6" fill="#f2a39b" opacity="${f ? 0.45 : 0.18}"/>`,
    f ? strokes("M60.3 54.4Q62.6 56 64.3 54", "#c55f5a", 1.5) : strokes("M60.6 54.6Q62.6 55.6 64.2 54.4", "#a45a50", 1.4),
    glass,
  ].join("");
}

/**
 * 걷기 한 주기(2026-11-20 사용자 "귀신도 아니고 스르르 움직이지 말고 세밀하게 걷는 것처럼") — 그림 안 CSS.
 * 0.9초에 두 걸음(같은 날 "너무 빨라 · 천천히 자연스럽게" → 0.52초에서 늦춤 · 사람이 편히 걷는 박자). 0% = 이 다리 뒤꿈치가 닿는 순간 · 반대 다리는 반 주기 늦게.
 * - 옆모습: 허벅지(엉덩이 축)와 정강이(무릎 축)를 따로 돌린다 — 디딜 땐 펴고, 뒤로 차올린 뒤 무릎을 접어 앞으로 내딛는다.
 * - 앞·뒷모습: 내딛는 다리는 길어 보이고(가까움), 들어 올리는 다리는 짧아진다(무릎이 앞으로) · 몸이 디딘 발 쪽으로 살짝 실린다.
 * - 팔은 반대쪽 다리와 함께 · 몸은 발이 닿을 때 내려가고 한 발로 설 때 올라간다(두 걸음에 두 번).
 * 화면의 이동 빠르기(space-seats WALK_SPEED_H)를 이 주기에 맞춰 발이 미끄러져 보이지 않게 했다.
 */
export const WALK_CYCLE_S = 0.9;
function walkStyle(facing: FigureFacing): string {
  const T = `${WALK_CYCLE_S}s`, half = `-${WALK_CYCLE_S / 2}s`;
  const run = (name: string, ease = "linear") => `animation:${name} ${T} ${ease} infinite`;
  const common = [
    `@keyframes bob{0%,50%,100%{transform:translateY(${facing === "side" ? 2.2 : 1.6}px)}25%,75%{transform:translateY(0)}}`,
    `.w{${run("bob", "ease-in-out")}}`,
  ];
  const side = [
    // 허벅지: 앞(-) ↔ 뒤(+) · 정강이: 무릎 굽힘(+)
    `@keyframes th{0%{transform:rotate(-31deg)}15%{transform:rotate(-23deg)}50%{transform:rotate(26deg)}62%{transform:rotate(16deg)}82%{transform:rotate(-20deg)}100%{transform:rotate(-31deg)}}`,
    `@keyframes kn{0%{transform:rotate(0)}12%{transform:rotate(9deg)}35%{transform:rotate(2deg)}50%{transform:rotate(12deg)}64%{transform:rotate(55deg)}80%{transform:rotate(30deg)}94%{transform:rotate(2deg)}100%{transform:rotate(0)}}`,
    `@keyframes ar{0%{transform:rotate(15deg)}50%{transform:rotate(-15deg)}100%{transform:rotate(15deg)}}`,
    `@keyframes fa{0%{transform:rotate(-5deg)}50%{transform:rotate(-20deg)}100%{transform:rotate(-5deg)}}`,
    `.tn,.tf{transform-origin:50.5px 102px;${run("th")}}`,
    `.sn,.sf{transform-origin:50.5px 121px;${run("kn")}}`,
    `.an,.af{transform-origin:50.5px 74px;${run("ar", "ease-in-out")}}`,
    `.en,.ef{transform-origin:50.5px 89px;${run("fa", "ease-in-out")}}`,
    `.tf,.sf,.af,.ef{animation-delay:${half}}`,
  ];
  const lift = facing === "back"
    ? `@keyframes lg{0%{transform:scaleY(.95)}20%{transform:scaleY(1)}50%{transform:scaleY(1.04)}64%{transform:scaleY(.8)}82%{transform:scaleY(.93)}100%{transform:scaleY(.95)}}`
    : `@keyframes lg{0%{transform:scaleY(1.04)}20%{transform:scaleY(1)}50%{transform:scaleY(.96)}64%{transform:scaleY(.8)}82%{transform:scaleY(.98)}100%{transform:scaleY(1.04)}}`;
  const armK = facing === "back"
    ? `@keyframes am{0%{transform:scaleY(1.02) rotate(0)}50%{transform:scaleY(.86) rotate(0)}100%{transform:scaleY(1.02) rotate(0)}}`
    : `@keyframes am{0%{transform:scaleY(.86)}50%{transform:scaleY(1.02)}100%{transform:scaleY(.86)}}`;
  const frontBack = [
    lift, armK,
    `@keyframes sw{0%,50%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(-1px) rotate(-.9deg)}75%{transform:translateX(1px) rotate(.9deg)}}`,
    `.sw{transform-origin:50px 145px;${run("sw", "ease-in-out")}}`,
    `.ll{transform-origin:43.5px 102px;${run("lg")}}`,
    `.lr{transform-origin:56.5px 102px;${run("lg")};animation-delay:${half}}`,
    `.al{transform-origin:30.5px 74px;${run("am", "ease-in-out")}}`,
    `.ar{transform-origin:69.5px 74px;${run("am", "ease-in-out")};animation-delay:${half}}`,
  ];
  return `<style>${[...common, ...(facing === "side" ? side : frontBack)].join("")}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`;
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
  const upright = pose === "walk" || pose === "stand";
  // 앞모습 옷 무늬(가디건·블라우스·셔츠·니트 — 마음의 대화 캐릭터 옷과 같게)
  const collar = neckline(a, 68.5, upright ? 106 : pose === "pew" ? 104 : 103);
  // 몸통 — 남성은 어깨가 넓고(31~69) 여성은 좁다(34.5~65.5) · 2026-11-21 남녀 구분
  const sh = a.gender === "m" ? 2 : -1.5;
  const torso = `<path d="M${33 - sh} 76Q${33 - sh} 68 ${42 - sh / 2} 68H${58 + sh / 2}Q${67 + sh} 68 ${67 + sh} 76L${upright ? `${69 + sh / 2} 106H${31 - sh / 2}` : `${68 + sh / 2} 103H${32 - sh / 2}`}Z" fill="${a.shirt}"/>`;
  const neckRect = `<rect x="43" y="57" width="14" height="14" rx="5" fill="${neck}"/>`;
  let parts: string[];
  if (pose === "pew") {
    // 장의자(교회·성당) — 머리·어깨·가슴께까지만(그 아래는 앞 의자 등받이에 가린 것처럼 잘림). 다리·손은 안 보인다.
    if (facing === "side") {
      parts = [
        `<rect x="45" y="57" width="11" height="14" rx="5" fill="${neck}"/>`,
        `<path d="M39 76Q39 68 47 68H54Q62 68 62 76L62.5 104H37.5Z" fill="${a.shirt}"/>`,
        `<path d="M53 75Q58 90 60 106" fill="none" stroke="${sleeve}" stroke-width="10"/>`,
        headSide(a),
      ];
    } else {
      const body = [
        neckRect,
        `<path d="M33 76Q33 68 42 68H58Q67 68 67 76L67.5 104H32.5Z" fill="${a.shirt}"/>`,
        `<path d="M36 75Q30 89 30.5 106" fill="none" stroke="${sleeve}" stroke-width="10"/>`,
        `<path d="M64 75Q70 89 69.5 106" fill="none" stroke="${sleeve}" stroke-width="10"/>`,
      ];
      parts = facing === "back" ? [...body, headBack(a)] : [hairBack(a), ...body, collar, headFront(a)];
    }
  } else if (facing === "side") {
    const sideNeck = `<rect x="45" y="57" width="11" height="14" rx="5" fill="${neck}"/>`;
    if (upright) {
      const backPants = shade(a.pants, 0.8), backSleeve = shade(a.shirt, 0.8), backSkin = shade(a.skin, 0.92);
      // 다리 = 허벅지(엉덩이 50.5,102) + 정강이(무릎 50.5,121) + 발(앞쪽으로) · 팔 = 위팔(어깨 50.5,74) + 아래팔(팔꿈치 50.5,89)
      const leg = (t: string, k: string, fill: string) =>
        `<g class="${t}"><rect x="45.5" y="100" width="10" height="24" rx="5" fill="${fill}"/><g class="${k}"><rect x="45.8" y="118" width="9.4" height="24" rx="4.7" fill="${fill}"/><ellipse cx="53.2" cy="142.6" rx="7.4" ry="3.6" fill="${shoe}"/></g></g>`;
      const arm = (u: string, l: string, fill: string, hand: string) =>
        `<g class="${u}"><rect x="46" y="71" width="9" height="20" rx="4.5" fill="${fill}"/><g class="${l}"><rect x="46.4" y="86" width="8.2" height="18" rx="4.1" fill="${fill}"/><circle cx="50.5" cy="105.5" r="4.4" fill="${hand}"/></g></g>`;
      parts = [
        pose === "walk" ? walkStyle("side") : "",
        `<g class="w">`,
        leg("tf", "sf", backPants),
        arm("af", "ef", backSleeve, backSkin),
        leg("tn", "sn", a.pants),
        sideNeck,
        `<path d="M40 76Q40 68 48 68H53Q61 68 61 76L62 106H39Z" fill="${a.shirt}"/>`,
        arm("an", "en", sleeve, a.skin),
        headSide(a),
        `</g>`,
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
  } else if (upright) {
    // 다리 = 엉덩이(43.5|56.5, 102)에서 내려온 다리 + 발 · 팔 = 어깨에서 · 앞·뒤 흔들림은 길이(원근)로
    const leg = (c: string, x: number, cx: number) =>
      `<g class="${c}"><rect x="${x}" y="100" width="11" height="40" rx="5" fill="${a.pants}"/><path d="M${x + 1} 128H${x + 10}" stroke="${shade(a.pants, 0.82)}" stroke-width="1.2"/><ellipse cx="${cx}" cy="141" rx="7" ry="4" fill="${shoe}"/></g>`;
    parts = [
      pose === "walk" ? walkStyle(facing) : "",
      `<g class="w"><g class="sw">`,
      facing === "front" ? hairBack(a) : "",
      leg("ll", 38, 43.5), leg("lr", 51, 56.5),
      `<g class="al"><rect x="25" y="72" width="11" height="32" rx="5.5" fill="${sleeve}"/><circle cx="30.5" cy="106" r="5" fill="${a.skin}"/></g>`,
      `<g class="ar"><rect x="64" y="72" width="11" height="32" rx="5.5" fill="${sleeve}"/><circle cx="69.5" cy="106" r="5" fill="${a.skin}"/></g>`,
      neckRect, torso,
      facing === "back" ? headBack(a) : collar + headFront(a),
      `</g></g>`,
    ];
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

/** 얼굴 그림 — 마음의 대화 캐릭터 그림(작게 줄인 사본 192px) · 고르는 화면·대화창·목록 */
export const AVATAR_PHOTO_DIR = "/wellness/space/avatars";
export function avatarSrc(id: AvatarId): string {
  const a = avatarOf(id) ?? AVATARS[0];
  return `${AVATAR_PHOTO_DIR}/${a.look}.jpg`;
}
/** 그림 파일을 못 읽었을 때 쓰는 그린 얼굴(data URL) */
export function avatarSvgSrc(id: AvatarId): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(id))}`;
}
