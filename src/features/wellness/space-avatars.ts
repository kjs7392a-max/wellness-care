/**
 * 마음 쉼터 「함께 머무는 캐릭터」 — 사람 캐릭터 8명(2026-11-20 사용자 지시 · 원본 그림, 앱 파스텔 톤).
 * 2026-11-21 사용자 "연령대는 남녀 구분을 하고 20대에서 40대까지 나눠줘 — 지금 보면 스타일이 다 아줌마야" →
 *   여성 4명(20·20·30·40대) + 남성 4명(20·20·30·40대)으로 다시 그림. 뽀글 파마·올림머리·은발·흰머리는 뺐다.
 *   🚫 id 8개는 그대로(서버 space_profiles 의 avatar 검사가 이 8개만 받는다) — 생김새·성별·나이만 바뀐다.
 * 실명 대신 이 캐릭터 이름만 보인다. 그림은 SVG 문자열(순수) → 화면은 <img src={avatarSrc(id)}>.
 */

export type AvatarId = "haneul" | "bada" | "saebyeok" | "noeul" | "sol" | "byeol" | "iseul" | "baram";
export type AvatarGender = "f" | "m";
export type AvatarAge = 20 | 30 | 40;

export interface AvatarDef {
  id: AvatarId;
  /** 화면에 보이는 이름 */
  name: string;
  /** 성별(그림의 머리 모양·얼굴·어깨가 달라진다) */
  gender: AvatarGender;
  /** 나이대 — 20~40대(2026-11-21) */
  age: AvatarAge;
  /** 고르는 화면의 짧은 설명 — "여성 · 20대" */
  hint: string;
  bg: string;
  skin: string;
  hair: string;
  shirt: string;
  /** 장면 속 전신 그림의 바지 색(2026-11-20) */
  pants: string;
}

const def = (d: Omit<AvatarDef, "hint">): AvatarDef => ({ ...d, hint: `${d.gender === "f" ? "여성" : "남성"} · ${d.age}대` });

/** 고르는 화면 순서 — 윗줄 여성 · 아랫줄 남성, 젊은 순 */
export const AVATARS: readonly AvatarDef[] = [
  // 여성 — 긴 생머리 · 높은 포니테일 · 어깨 길이 C컬 · 턱선 단발
  def({ id: "haneul", name: "하늘", gender: "f", age: 20, bg: "#e3dcf7", skin: "#f7dccb", hair: "#3b2924", shirt: "#b9a8e6", pants: "#5c5a7a" }),
  def({ id: "iseul", name: "이슬", gender: "f", age: 20, bg: "#d9ecf7", skin: "#f6d6c2", hair: "#2c2220", shirt: "#9cc6e8", pants: "#4e5a74" }),
  def({ id: "saebyeok", name: "새벽", gender: "f", age: 30, bg: "#fde3d3", skin: "#f3d2bf", hair: "#5a3a2c", shirt: "#ef9a86", pants: "#6a5a55" }),
  def({ id: "sol", name: "솔", gender: "f", age: 40, bg: "#e4f2d6", skin: "#f0cdb4", hair: "#3e2c24", shirt: "#7fae94", pants: "#3f4f48" }),
  // 남성 — 댄디컷 · 가르마펌 · 투블럭 올린 머리 · 짧은 머리+안경
  def({ id: "bada", name: "바다", gender: "m", age: 20, bg: "#d4efe6", skin: "#efc6a8", hair: "#262020", shirt: "#5f7fae", pants: "#3c4a63" }),
  def({ id: "byeol", name: "별", gender: "m", age: 20, bg: "#f6ead2", skin: "#deae8b", hair: "#2b211d", shirt: "#d0a066", pants: "#4b3d34" }),
  def({ id: "baram", name: "바람", gender: "m", age: 30, bg: "#dde9f6", skin: "#ebc4a4", hair: "#231d1b", shirt: "#6f7884", pants: "#383d45" }),
  def({ id: "noeul", name: "노을", gender: "m", age: 40, bg: "#fbefd2", skin: "#e6b896", hair: "#2f2826", shirt: "#8f9a5c", pants: "#4d5240" }),
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
const path = (d: string, fill: string, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;
const strokes = (d: string, color: string, w = 0.9, op = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;

// ── 앞모습 머리 ─────────────────────────────────────────────────────────────
// 머리(얼굴) = 타원 (50,44) 가로 16.5 · 세로 18.5 → 정수리 y 25.5 · 턱 y 62.5 · 귀 x 33.5/66.5

/** 몸 뒤에 그리는 뒷머리(긴 머리·단발·포니테일) */
function hairBack(a: AvatarDef): string {
  switch (a.id) {
    // 하늘 — 등까지 내려오는 긴 생머리
    case "haneul": return path("M30 42C30 23 39 17 50 17C61 17 70 23 70 42L71.5 80C65 84.5 35 84.5 28.5 80Z", a.hair);
    // 이슬 — 높이 묶은 포니테일이 오른쪽 뒤로 살짝 보인다
    case "iseul": return path("M58 22C68 19 76 26 75.5 38C75 50 71 60 66 67C67.5 57 67.5 47 64.5 37Z", a.hair);
    // 새벽 — 어깨에 닿는 C컬(끝이 안으로 말림)
    case "saebyeok": return path("M30 44C29 25 39 18 50 18C61 18 71 25 70 44L71.5 61C72 67.5 67 70 62.5 67.5L37.5 67.5C33 70 28 67.5 28.5 61Z", a.hair);
    // 솔 — 턱선 단발
    case "sol": return path("M31 44C30.5 26 39.5 19.5 50 19.5C60.5 19.5 69.5 26 69 44L69.5 57C67 60 62 60 60 58H40C38 60 33 60 30.5 57Z", a.hair);
    default: return "";
  }
}

/** 얼굴 위에 그리는 앞머리·옆머리 */
function hairFront(a: AvatarDef): string {
  const dk = shade(a.hair, 0.72), lt = shade(a.hair, 1.35);
  switch (a.id) {
    case "haneul": // 시스루 앞머리 + 얼굴을 감싸는 옆머리
      return path("M32.5 45C31 27 40 20 50 20C60 20 69 27 67.5 45C66.5 38 64.5 34 61.5 31.5C58 34.5 54 36 50 36C46 36 42 34.5 38.5 31.5C35.5 34 33.5 38 32.5 45Z", a.hair)
        // 앞머리 — 눈썹 위까지 내려와 끝이 둥글게 나뉜다(윗변은 정수리 머리와 겹쳐 틈이 없게)
        + path("M38.6 31.2C40 35.5 41 38.4 42 39.6C43 37.6 44.5 36.6 46 36.8C47 38.4 48.4 39.8 50 40.2C51.6 39.8 53 38.4 54 36.8C55.5 36.6 57 37.6 58 39.6C59 38.4 60 35.5 61.4 31.2C57.5 33.6 54 34.4 50 34.4C46 34.4 42.5 33.6 38.6 31.2Z", a.hair)
        + path("M33 40C31.6 50 32.6 59 35.5 66L38 64.8C36 57.5 35.3 49.5 36 41.5Z", a.hair)
        + path("M67 40C68.4 50 67.4 59 64.5 66L62 64.8C64 57.5 64.7 49.5 64 41.5Z", a.hair)
        + strokes("M44 23.5Q48 22.5 52 23", lt, 1.1, 0.5);
    case "iseul": // 뒤로 넘겨 높이 묶음 · 가운데 가르마 · 관자놀이 잔머리
      return path("M33.2 43C32 28.5 40 21 50 21C60 21 68 28.5 66.8 43C65.5 36.5 62.5 31.5 57.5 29.6C55 29.2 52.5 29.6 50 30.6C47.5 29.6 45 29.2 42.5 29.6C37.5 31.5 34.5 36.5 33.2 43Z", a.hair)
        + strokes("M50 22.5L50 30.4", dk, 0.8, 0.7)
        + strokes("M34.6 40Q34 45 35.4 49M65.4 40Q66 45 64.6 49", a.hair, 1, 0.9)
        + `<rect x="61.5" y="20.5" width="5" height="4" rx="2" transform="rotate(35 64 22.5)" fill="${shade(a.shirt, 0.85)}"/>`;
    case "saebyeok": // 옆가르마로 넘긴 앞머리 + 볼을 감싸는 옆머리
      return path("M32.5 46C31 28 40 20.5 51 20.5C61 20.5 69 28 67.5 46C66.3 38.5 64.3 33.5 60.5 30.5C54.5 34 46 36.2 38.6 35C36 38 34 41.5 32.5 46Z", a.hair)
        + path("M32.8 41C31.5 50 32.2 57.5 34.5 64C35 66 37 66.2 38 65C36 58 35.4 50 36.2 42.5Z", a.hair)
        + path("M67.2 41C68.5 50 67.8 57.5 65.5 64C65 66 63 66.2 62 65C64 58 64.6 50 63.8 42.5Z", a.hair)
        + strokes("M40.5 33.4Q48 31.5 57 27.6", dk, 0.9, 0.55);
    case "sol": // 옆가르마 단정한 단발 · 오른쪽은 귀 뒤로 넘김(귀걸이)
      return path("M33 44C32 28 40 21.5 50 21.5C61 21.5 68 28 67 44C65 36.5 61 32 55.5 31C49 31.5 41.5 34 36.5 38C34.8 40 33.6 42 33 44Z", a.hair)
        + path("M33.2 40C31.8 48 32.6 54.5 34.6 58.5L37.6 58C36 53 35.6 47 36.4 41.5Z", a.hair)
        + strokes("M47 24Q53 22.6 59 24.6", lt, 1, 0.45)
        + `<circle cx="66.6" cy="51.4" r="1.3" fill="#e6c36a"/>`;
    case "bada": // 댄디컷 — 이마를 덮는 앞머리, 옆은 짧게
      return path("M33 45C31.5 29 40 21 50.5 21C61 21 68.5 29 67 45C66.2 41 65.5 38.2 64 36.6C59.5 38.2 54.5 38.8 49.5 38.4C44 38 39 37.4 35.6 37C34.4 39.2 33.6 42 33 45Z", a.hair)
        + strokes("M40 37.6L41 34.8M45 38.2L45.6 35M50 38.6L50.2 35.2M55 38.4L54.6 35.2M60 37.8L59 35", dk, 0.9, 0.6);
    case "byeol": // 가르마펌 — 볼륨 있게 한쪽으로 넘기고 이마가 살짝 보인다
      return path("M33 44C30.5 27 39.5 18 51 18C62.5 18 70.5 26 67 44C66 37 63.5 32.5 58.5 30.8C54.5 31 50.5 33.2 47.8 36.8C46.4 33.4 43.2 31.6 39.8 32.2C36.2 34 34 38 33 44Z", a.hair)
        + strokes("M40 25Q46 22.5 52 23.4M55 24.5Q60 25.5 63.5 29.5M44 29.5Q48 27.5 53 28.5", lt, 1, 0.45);
    case "baram": // 투블럭 올린 머리 — 이마가 보이고 옆은 짧게 쳤다
      return path("M34 42C33 29 39.5 20 50.5 19.5C61.5 19 67.5 27 66.5 42C65.6 38 65 35 63.2 32.6C58.5 29.6 53 29 48 30C43.3 30.8 39.5 32.2 37.2 34.4C35.6 36.6 34.6 39.2 34 42Z", a.hair)
        + path("M33.6 45C33.1 40.5 33.5 37 35 34.6L37 35.6C35.8 38 35.3 41.2 35.4 45Z", shade(a.skin, 0.72), ` opacity="0.75"`)
        + path("M66.4 45C66.9 40.5 66.5 37 65 34.6L63 35.6C64.2 38 64.7 41.2 64.6 45Z", shade(a.skin, 0.72), ` opacity="0.75"`)
        + strokes("M42 26Q48 23 55 24M46 29Q52 27 59 28.5", lt, 1, 0.45);
    case "noeul": // 짧은 옆가르마 머리(단정한 직장인)
      return path("M33.5 44C32 29 40 21.5 50 21.5C60.5 21.5 68 28.5 66.5 44C65.5 38 64 34 61 32C56 31.4 50 31.8 44 33C40 34 37 36 35.5 38.5C34.6 40 34 42 33.5 44Z", a.hair)
        + strokes("M44.5 23.4Q43.2 27.5 44 33", shade(a.hair, 1.6), 0.8, 0.55);
  }
}

function glasses(a: AvatarDef): string {
  if (a.id !== "noeul") return "";
  return `<g fill="none" stroke="#2f2826" stroke-width="1.5"><rect x="37.5" y="42" width="10" height="8" rx="2.5"/><rect x="52.5" y="42" width="10" height="8" rx="2.5"/><path d="M47.5 45.5h5M37.5 45L34.5 44M62.5 45L65.5 44"/></g>`;
}

/** 머리(귀·얼굴·앞머리·눈썹·눈·볼·입·안경) — 얼굴 그림과 전신 그림이 같이 쓴다. 뒷머리는 hairBack 으로 따로(몸 뒤에). */
function headFront(a: AvatarDef): string {
  const neck = shade(a.skin, 0.9);
  const f = a.gender === "f";
  const browC = shade(a.hair, f ? 1.15 : 1);
  // 눈 — 반짝임(젊게) · 여성은 바깥쪽 속눈썹
  const eye = (cx: number, out: number) =>
    `<ellipse cx="${cx}" cy="46" rx="${f ? 1.9 : 1.8}" ry="${f ? 2.4 : 2.2}" fill="#3a3340"/><circle cx="${cx + 0.6}" cy="45.2" r="0.62" fill="#fff"/>`
    + (f ? strokes(`M${cx + out * 1.7} 44.9l${out * 1.4} -1.1`, "#2f2a33", 0.9) : "");
  return [
    `<ellipse cx="33.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/><ellipse cx="66.5" cy="46" rx="3.4" ry="4.2" fill="${neck}"/>`,
    `<ellipse cx="50" cy="44" rx="16.5" ry="18.5" fill="${a.skin}"/>`,
    hairFront(a),
    // 눈썹 — 여성은 가늘게 둥글게 · 남성은 진하고 곧게
    f
      ? strokes("M40.5 40.6q2.5-1.4 5 0M54.5 40.6q2.5-1.4 5 0", browC, 1.2)
      : strokes("M40 40.5q2.9-1.2 5.8-.3M54.2 40.2q2.9-.9 5.8.3", browC, 1.9),
    eye(43, -1), eye(57, 1),
    `<circle cx="38.6" cy="51.6" r="2.7" fill="#f2a39b" opacity="${f ? 0.45 : 0.16}"/><circle cx="61.4" cy="51.6" r="2.7" fill="#f2a39b" opacity="${f ? 0.45 : 0.16}"/>`,
    f
      ? strokes("M45.6 53.5Q50 57 54.4 53.5", "#c55f5a", 1.6)
      : strokes("M46.2 54.2Q50 56.4 53.8 54.2", "#a45a50", 1.5),
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
  // 짧은 머리 — 뒤통수를 덮고 목덜미에서 끝난다
  const cap = (top = 21, nape = 58.5) => path(`M33.5 44C33.5 ${top + 6} 41 ${top} 50 ${top}C59 ${top} 66.5 ${top + 6} 66.5 44C66.5 51 64 56 59 ${nape}Q50 ${nape + 2.5} 41 ${nape}C36 56 33.5 51 33.5 44Z`, a.hair);
  const dk = shade(a.hair, 0.72), lt = shade(a.hair, 1.35);
  let hair = cap();
  switch (a.id) {
    case "haneul": hair = path("M32 44C32 25 40 19 50 19C60 19 68 25 68 44L70.5 79C63.5 83 36.5 83 29.5 79Z", a.hair) + strokes("M44 30Q43 55 41 78M56 30Q57 55 59 78", dk, 0.8, 0.4); break;
    case "iseul": // 높이 묶어 가운데로 늘어진 포니테일
      hair = cap(21.5, 56) + `<rect x="46.5" y="25" width="7" height="4.6" rx="2.3" fill="${shade(a.shirt, 0.85)}"/>`
        + path("M46.8 29C44.5 39 44.6 52 49.5 64C50.5 66 51.5 66 52.4 63.6C55.8 52 56 39 53.2 29Z", a.hair)
        + strokes("M50 31Q49 46 50.8 61", dk, 0.8, 0.45); break;
    case "saebyeok": hair = path("M31.5 44C31.5 25 40 19 50 19C60 19 68.5 25 68.5 44L70 61C70.5 66.5 66.5 68.5 62.5 66.5L37.5 66.5C33.5 68.5 29.5 66.5 30 61Z", a.hair) + strokes("M38 64Q50 61.5 62 64", dk, 0.9, 0.5); break;
    case "sol": hair = path("M32 44C32 25.5 40 20 50 20C60 20 68 25.5 68 44L68.8 56.5C66 59.5 61 59.5 59 57.5H41C39 59.5 34 59.5 31.2 56.5Z", a.hair) + `<circle cx="67.4" cy="51.4" r="1.2" fill="#e6c36a"/>`; break;
    case "bada": hair = cap(21, 57.5) + strokes("M42 30Q50 27 58 30", lt, 0.9, 0.4); break;
    case "byeol": hair = cap(18.5, 57) + strokes("M39 28Q45 24 51 25M53 25.5Q59 25 62.5 30M41 35Q48 32 56 34", lt, 1, 0.45); break;
    case "baram": // 뒤·옆은 짧게 쳤다(목덜미가 보인다)
      hair = path("M33.8 42C33.8 26 41 20 50 20C59 20 66.2 26 66.2 42C66.2 46 65.4 49 64 51.5Q50 54.5 36 51.5C34.6 49 33.8 46 33.8 42Z", a.hair)
        + path("M36 51.5Q50 54.5 64 51.5C63 54 61.5 55.6 59.5 56.6Q50 58.6 40.5 56.6C38.5 55.6 37 54 36 51.5Z", shade(a.skin, 0.72), ` opacity="0.6"`); break;
    case "noeul": hair = cap(21.5, 56.5); break;
  }
  return ears + head + hair;
}

/** 옆모습 머리 — 오른쪽을 본다(왼쪽은 화면에서 뒤집기). 명상룸에서 서로 마주 보고 앉은 모습 · 옆으로 걷는 모습 */
function headSide(a: AvatarDef): string {
  const neck = shade(a.skin, 0.9);
  const f = a.gender === "f";
  const head = `<ellipse cx="50" cy="44" rx="16" ry="18.5" fill="${a.skin}"/><path d="M65 45.5Q69.2 49.2 65 51.8Z" fill="${a.skin}"/>`;
  // 뒤통수를 덮는 기본 머리(앞 머리선 x 66 · y 37)
  const capD = "M34 46C33 29 41 22 51 22C60 22 66 28 66.3 37C62 34.5 56 34 51 36C48 37.5 46.5 40 46 44C45.5 50 44 55 41 59C36.5 56 34.2 51.5 34 46Z";
  const ear = `<ellipse cx="46.5" cy="47" rx="3" ry="4" fill="${neck}"/>`;
  const dk = shade(a.hair, 0.72), lt = shade(a.hair, 1.35);
  let back = "", hair = path(capD, a.hair), showEar = true;
  switch (a.id) {
    case "haneul": hair = path("M34 44C33 30 41 22 51 22C60 22 66 28 66.3 37C63.5 36 60.5 37.5 58 39.5C55 37 51.5 36.5 48.5 38C47 41 46.5 44 46.5 47L47 60C47 66 46 71 44 76C38 77 33 76 31 73C32 64 34 55 34 44Z", a.hair) + strokes("M60.5 37.8L60 42", a.hair, 1.2, 0.8); showEar = false; break;
    case "iseul": // 높이 묶은 포니테일이 뒤로
      back = path("M38 25C29 25 24.5 34 25.5 46C26.2 53 28.5 58 31 61C31 53 31.8 45 35 37Z", a.hair) + strokes("M30 33Q27.5 44 30 57", dk, 0.8, 0.45);
      hair = path("M34 46C33 29 41 22 51 22C60 22 66 28 66.3 37C62.5 35.5 57.5 34.8 53 35.6C49.5 36.4 47 39 46 43C45.4 49 44 55 41 59C36.5 56 34.2 51.5 34 46Z", a.hair)
        + `<rect x="34.5" y="22.5" width="5" height="6" rx="2.2" transform="rotate(-25 37 25.5)" fill="${shade(a.shirt, 0.85)}"/>`;
      break;
    case "saebyeok": hair = path("M34 44C33 29 41 22 51 22C60 22 66 28 66.3 37C62 35 56 34.5 51 36.5C48 38 47 41 47 45L48 61C48.5 65 46 67 43 66.5L33.5 63C32.2 62.5 31.6 61 32 59.5C33.4 54.5 34 49.5 34 44Z", a.hair); showEar = false; break;
    case "sol": hair = path("M34 44C33 29 41 22 51 22C60 22 66 28 66.3 37C62 35 56 34.5 51 36.5C48 38 47 41 47 45L48 56.5C48 58.5 46.5 59.5 44.5 59.3L34.5 57.5C33 57.2 32.5 56 32.8 54.5C33.6 51 34 47.5 34 44Z", a.hair); showEar = false; break;
    case "bada": hair = path("M34 46C33 29 41 22 51 22C60 22 66 28 66.6 38.5C64.5 38.2 62.6 37.8 61 37.2C56 35.8 51.5 36 48.5 38C47 40.5 46.4 43.5 46 46C45.3 50.5 43.8 55 41 58.5C36.5 56 34.2 51.5 34 46Z", a.hair) + strokes("M63 38.2L63.6 35.4M59.5 37.4L59.8 34.6", dk, 0.8, 0.6); break;
    case "byeol": hair = path("M34 46C32.5 28 40.5 19 52 19.5C61.5 20 67.5 27 66.6 37.5C63 35.8 59.5 35.6 56.5 36.8C54 34.5 50.5 34.6 48 37C46.6 40 46 43 45.8 46C45.2 50.5 43.8 55 41 58.5C36.5 56 34.2 51.5 34 46Z", a.hair) + strokes("M42 26Q48 22.5 55 23.5M45 31Q51 28.5 58 30", lt, 1, 0.45); break;
    case "baram": hair = path("M35 43C34.6 29 41.5 20.5 52 20.5C60.5 20.5 66 26 66.6 33.5C63.5 32.6 60 32.6 56.5 33.4C52.5 34.4 49.5 36.6 48 39.5L46.8 43C43 43.5 38.5 43.5 35 43Z", a.hair)
      + path("M35 43C38.5 43.5 43 43.5 46.8 43C46 48 44.6 53 42 57C38 55 35.6 50.5 35.2 46Z", shade(a.skin, 0.72), ` opacity="0.6"`); break;
    case "noeul": break;
  }
  const brow = f ? strokes("M57 40.6q2.5-1.4 5 0", shade(a.hair, 1.15), 1.2) : strokes("M56.8 40.5q2.9-1.1 5.6-.2", a.hair, 1.8);
  const glass = a.id === "noeul"
    ? `<g fill="none" stroke="#2f2826" stroke-width="1.5"><rect x="55.5" y="42" width="9" height="8" rx="2.5"/><path d="M55.5 45.5H47.5"/></g>`
    : "";
  return [
    back, head, hair, showEar ? ear : "", brow,
    `<ellipse cx="60" cy="46" rx="1.7" ry="2.2" fill="#3a3340"/><circle cx="60.6" cy="45.2" r="0.55" fill="#fff"/>`,
    f ? strokes("M61.4 44.6l1.4-1", "#2f2a33", 0.9) : "",
    `<circle cx="58.5" cy="51.8" r="2.6" fill="#f2a39b" opacity="${f ? 0.45 : 0.16}"/>`,
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
  const collar = `<path d="M43 68.5L50 75L57 68.5" fill="none" stroke="${shade(a.shirt, 0.82)}" stroke-width="2" stroke-linejoin="round"/>`;
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

/** <img src> 로 바로 쓰는 data URL */
export function avatarSrc(id: AvatarId): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(id))}`;
}
