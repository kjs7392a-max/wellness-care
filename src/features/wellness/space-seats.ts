/**
 * 마음 쉼터 장면 속 자리(2026-11-20 사용자 지시 "캐릭터가 움직일 수 있게 · 들어오는 게 보이고 퇴장할 때는 나가는 것처럼").
 * 순수 규칙만(테스트 space-seats.test.ts) — 그리기는 SpaceTogether.tsx.
 *
 * 좌표는 **영상 기준 비율(0~1)** 이다(fitRoomVideo 가 정한 영상 자리에 얹는다 → 화면 크기가 달라도 같은 방석·의자 위).
 *   x, y = 앉은 캐릭터의 **발밑 가운데** · s = 멀고 가까움(작을수록 멀다).
 * 자리는 2026-11-20 각 영상 1초 프레임에 격자를 얹어 실측 — 영상 속 인물 자리 · 명상룸 자막 상자(y .773~)는 비웠다.
 * 문(door) = 들어오고 나가는 곳. 명상룸은 왼쪽 옆(아래는 자막), 나머지는 화면 아래 통로.
 */
import type { SpaceId } from "./space";

export interface SeatPoint { x: number; y: number; s: number }
/**
 * 앉았을 때 바라보는 쪽(2026-11-20 사용자 지시) —
 *   forward = 불당·교회·성당: 앞(불상·십자가)을 본다 → 화면에선 **뒷모습**.
 *   center  = 명상룸: 서로 **마주 본다** → 방 가운데(x .5)를 향한 옆모습.
 */
export type SeatFace = "forward" | "center";
/**
 * 앉는 곳(2026-11-20 사용자 지시 "성당·교회는 좌식에 앉은 것처럼 보여") —
 *   floor = 방석·좌복(명상룸·불당): 바닥에 책상다리.
 *   pew   = 장의자(교회·성당): 의자에 앉아 등받이에 아랫몸이 가려 **윗몸만** 보인다.
 */
export type SitOn = "floor" | "pew";
/**
 * 통로(2026-11-20 사용자 "귀신도 아니고 … 걷는 것처럼") — 장의자 사이로 곧장 가로지르지 않게.
 *   x = 통로 가운데 · left/right = 왼쪽·오른쪽 장의자가 끝나는 곳(여기서부터 줄 안 — 아랫몸이 등받이에 가린다).
 */
export interface Aisle { x: number; left: number; right: number }
export interface RoomLayout { seats: readonly SeatPoint[]; door: SeatPoint; face: SeatFace; sitOn: SitOn; aisle?: Aisle }

export const ROOM_LAYOUT: Record<SpaceId, RoomLayout> = {
  meditation: {
    seats: [
      { x: 0.19, y: 0.628, s: 0.95 }, { x: 0.78, y: 0.628, s: 0.95 },
      { x: 0.12, y: 0.72, s: 1.1 }, { x: 0.88, y: 0.72, s: 1.1 },
      { x: 0.28, y: 0.592, s: 0.82 }, { x: 0.12, y: 0.572, s: 0.74 },
    ],
    door: { x: -0.06, y: 0.68, s: 1.0 },
    face: "center",
    sitOn: "floor",
  },
  temple: {
    seats: [
      { x: 0.42, y: 0.648, s: 1.0 }, { x: 0.66, y: 0.648, s: 1.0 }, { x: 0.18, y: 0.648, s: 1.0 }, { x: 0.88, y: 0.648, s: 1.0 },
      { x: 0.43, y: 0.603, s: 0.86 }, { x: 0.62, y: 0.603, s: 0.86 }, { x: 0.24, y: 0.603, s: 0.86 }, { x: 0.8, y: 0.603, s: 0.86 },
    ],
    door: { x: 0.5, y: 1.04, s: 1.25 },
    face: "forward",
    sitOn: "floor",
  },
  church: {
    seats: [
      // 장의자 등받이 윗선(y .585 · .635 · .696)에 맞춤 — 그 아래 몸은 등받이에 가린다(2026-11-20 재실측)
      { x: 0.24, y: 0.585, s: 0.84 }, { x: 0.36, y: 0.585, s: 0.84 }, { x: 0.8, y: 0.588, s: 0.84 },
      { x: 0.2, y: 0.635, s: 0.93 }, { x: 0.38, y: 0.635, s: 0.93 }, { x: 0.82, y: 0.636, s: 0.93 },
      { x: 0.28, y: 0.696, s: 1.05 },
    ],
    door: { x: 0.61, y: 1.04, s: 1.25 },
    face: "forward",
    sitOn: "pew",
    aisle: { x: 0.6, left: 0.47, right: 0.74 },
  },
  cathedral: {
    seats: [
      // 장의자 안쪽 · 등받이 윗선에 맞춤(2026-11-20 재실측 — 예전 자리 몇 개가 가운데 통로였다).
      // 앞쪽 줄은 화면 밖(가장자리)으로 빠지고 오른쪽은 영상 속 사람 자리라 비웠다 · 먼 줄일수록 작게.
      { x: 0.23, y: 0.604, s: 0.72 }, { x: 0.7, y: 0.582, s: 0.6 }, { x: 0.3, y: 0.576, s: 0.58 },
      { x: 0.15, y: 0.625, s: 0.85 }, { x: 0.62, y: 0.571, s: 0.55 },
    ],
    door: { x: 0.49, y: 1.04, s: 1.25 },
    face: "forward",
    sitOn: "pew",
    aisle: { x: 0.46, left: 0.34, right: 0.58 },
  },
};

export interface SeatClaim { uid: string; seat: number | null; since: number }

/**
 * 누가 어느 자리에 앉나 — 모두가 같은 답을 내야 한다(각자 계산).
 * 먼저 온 사람부터(since → uid 순) 원하는 자리를 차지하고, 이미 찼거나 없으면 비어 있는 첫 자리. 자리가 다 차면 null(장면엔 안 보이고 목록에만).
 */
export function resolveSeats(people: readonly SeatClaim[], seatCount: number): Map<string, number | null> {
  const order = [...people].sort((a, b) => a.since - b.since || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  const taken = new Set<number>();
  const out = new Map<string, number | null>();
  const want = (s: number | null) => (s !== null && Number.isInteger(s) && s >= 0 && s < seatCount ? s : null);
  for (const p of order) {
    const w = want(p.seat);
    if (w !== null && !taken.has(w)) { taken.add(w); out.set(p.uid, w); continue; }
    out.set(p.uid, null);
  }
  for (const p of order) {
    if (out.get(p.uid) !== null) continue;
    let free = -1;
    for (let i = 0; i < seatCount; i++) if (!taken.has(i)) { free = i; break; }
    if (free >= 0) { taken.add(free); out.set(p.uid, free); }
  }
  return out;
}

export interface Rect { left: number; top: number; width: number; height: number }

/** 영상 비율 좌표 → 화면 좌표(px) */
export function toScreen(rect: Rect, p: { x: number; y: number }): { x: number; y: number } {
  return { x: rect.left + p.x * rect.width, y: rect.top + p.y * rect.height };
}

/** 앉은 캐릭터의 키(px) — 영상 높이와 멀고 가까움에 맞춘다 */
export function figureHeight(rect: Rect, s: number): number {
  return Math.round(rect.height * 0.085 * s);
}

/**
 * 걸어서 가는 시간(ms) — 2026-11-20 "스르르 움직이지 말고 걷는 것처럼": 발이 미끄러져 보이지 않게
 * 빠르기를 **캐릭터 키에 맞춘다**(키 0.33배/초 · 그림 속 걸음 주기 1.1초와 맞물림 → 한 걸음 ≈ 키의 0.18).
 * 같은 날 "너무 빨리 움직여 · 천천히 자연스럽게" → 0.9배/초에서 늦춤. 첫 구간은 천천히 출발, 마지막 구간은 천천히 멈춘다(SpaceTogether).
 * figH = 걷는 모습의 키(px, 출발·도착 평균) · 아주 짧은 구간은 0(바로).
 */
export const WALK_SPEED_H = 0.33;
export function walkMs(a: { x: number; y: number }, b: { x: number; y: number }, figH: number): number {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d < 0.5) return 0;
  const v = WALK_SPEED_H * Math.max(20, figH);
  return Math.round(Math.min(24000, Math.max(300, (d / v) * 1000)));
}

/** 말풍선 — 짧게 · 오래 두지 않는다 */
export const BUBBLE_MS = 4500;
export function bubbleText(text: string, max = 26): string {
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : text;
}

/** 말풍선이 화면 밖으로 나가지 않게 가로로 밀 거리(px) — 폭은 글자 수로 어림 */
export function bubbleShift(centerX: number, text: string, boxW: number, pad = 6): number {
  if (!(boxW > 0)) return 0;
  const half = Math.min(150, 18 + [...text].length * 11.5) / 2;
  if (centerX + half > boxW - pad) return Math.round(boxW - pad - half - centerX);
  if (centerX - half < pad) return Math.round(pad + half - centerX);
  return 0;
}

// ── 바라보는 쪽(2026-11-20 사용자 지시 "불당·교회·성당은 앞을 보고, 명상룸은 마주 보고") ──────────────
/** 그림의 방향 — front 앞모습(화면 쪽) · back 뒷모습(안쪽) · side 옆모습(기본은 오른쪽을 봄, flip 이면 왼쪽) */
export type Facing = "front" | "back" | "side";
export interface Heading { face: Facing; flip: boolean }

/** 앉은 자리에서 바라보는 쪽 */
export function seatHeading(layout: RoomLayout, i: number): Heading {
  const seat = layout.seats[i];
  if (layout.face === "forward" || !seat) return { face: "back", flip: false };
  return { face: "side", flip: seat.x > 0.5 };
}

/** 걸어가는 쪽 — 옆으로 많이 가면 옆모습, 안쪽(위)으로 가면 뒷모습, 화면 쪽(아래)으로 오면 앞모습 */
export function walkHeading(from: { x: number; y: number }, to: { x: number; y: number }): Heading {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy) * 0.8) return { face: "side", flip: dx < 0 };
  return { face: dy < 0 ? "back" : "front", flip: false };
}

// ── 걷는 길(2026-11-20) ───────────────────────────────────────────────
/** 장면 속 한 점 — 영상 비율 좌표 · s 멀고 가까움 · sink = 발을 앉은 키의 그만큼 아래로(장의자 줄 바닥) · door = 화면 밖 입구 */
export interface ScenePt { x: number; y: number; s: number; sink?: number; door?: boolean }
/** 한 구간 — to 까지 걷는다 · clip = 그동안 아랫몸이 장의자 등받이에 가린다 */
export interface Way { to: ScenePt; clip: boolean }
/** 장의자 줄에 서 있을 때 발 높이(등받이 윗선 아래로 앉은 키의 0.28) */
export const PEW_SINK = 0.28;

export const doorPoint = (L: RoomLayout): ScenePt => ({ ...L.door, door: true });
export const sitPoint = (L: RoomLayout, i: number): ScenePt => ({ ...L.seats[i] });

/** 입구 → 자리(마지막 점에서 앉는다). 통로가 있으면 통로로 올라가 줄 끝에서 옆으로 들어간다. */
export function routeIn(L: RoomLayout, i: number): Way[] {
  const seat = L.seats[i];
  if (!L.aisle || !seat) return seat ? [{ to: sitPoint(L, i), clip: false }] : [];
  const sink = L.sitOn === "pew" ? PEW_SINK : 0;
  const row = (x: number): ScenePt => ({ x, y: seat.y, s: seat.s, sink });
  const edge = seat.x < L.aisle.x ? L.aisle.left : L.aisle.right;
  return [
    { to: row(L.aisle.x), clip: false },
    { to: row(edge), clip: false },
    { to: row(seat.x), clip: sink > 0 },
  ];
}

/** 자리 → 입구 — 그 자리에서 일어선 모습(stand) 다음, 들어온 길을 거꾸로 */
export function routeOut(L: RoomLayout, i: number): { stand: Way; ways: Way[] } {
  const inn = routeIn(L, i);
  const last = inn[inn.length - 1] ?? { to: sitPoint(L, i), clip: false };
  const ways: Way[] = [];
  for (let k = inn.length - 2; k >= 0; k--) ways.push({ to: inn[k].to, clip: inn[k + 1].clip });
  ways.push({ to: doorPoint(L), clip: inn[0]?.clip ?? false });
  return { stand: last, ways };
}

/** 자리 → 다른 자리(먼저 온 사람에게 밀렸을 때) — 나가는 길(입구 빼고) + 들어가는 길 */
export function routeMove(L: RoomLayout, from: number, to: number): { stand: Way; ways: Way[] } {
  const out = routeOut(L, from);
  return { stand: out.stand, ways: [...out.ways.slice(0, -1), ...routeIn(L, to)] };
}
