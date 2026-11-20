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
export interface RoomLayout { seats: readonly SeatPoint[]; door: SeatPoint }

export const ROOM_LAYOUT: Record<SpaceId, RoomLayout> = {
  meditation: {
    seats: [
      { x: 0.19, y: 0.628, s: 0.95 }, { x: 0.78, y: 0.628, s: 0.95 },
      { x: 0.12, y: 0.72, s: 1.1 }, { x: 0.88, y: 0.72, s: 1.1 },
      { x: 0.28, y: 0.592, s: 0.82 }, { x: 0.12, y: 0.572, s: 0.74 },
    ],
    door: { x: -0.06, y: 0.68, s: 1.0 },
  },
  temple: {
    seats: [
      { x: 0.42, y: 0.648, s: 1.0 }, { x: 0.66, y: 0.648, s: 1.0 }, { x: 0.18, y: 0.648, s: 1.0 }, { x: 0.88, y: 0.648, s: 1.0 },
      { x: 0.43, y: 0.603, s: 0.86 }, { x: 0.62, y: 0.603, s: 0.86 }, { x: 0.24, y: 0.603, s: 0.86 }, { x: 0.8, y: 0.603, s: 0.86 },
    ],
    door: { x: 0.5, y: 1.04, s: 1.25 },
  },
  church: {
    seats: [
      { x: 0.24, y: 0.59, s: 0.85 }, { x: 0.42, y: 0.59, s: 0.85 }, { x: 0.8, y: 0.59, s: 0.85 },
      { x: 0.2, y: 0.672, s: 0.96 }, { x: 0.42, y: 0.672, s: 0.96 }, { x: 0.8, y: 0.672, s: 0.96 },
      { x: 0.3, y: 0.76, s: 1.08 },
    ],
    door: { x: 0.61, y: 1.04, s: 1.25 },
  },
  cathedral: {
    seats: [
      { x: 0.2, y: 0.625, s: 0.86 }, { x: 0.32, y: 0.625, s: 0.86 },
      { x: 0.2, y: 0.712, s: 0.97 }, { x: 0.33, y: 0.712, s: 0.97 }, { x: 0.68, y: 0.712, s: 0.97 },
      { x: 0.25, y: 0.81, s: 1.08 }, { x: 0.7, y: 0.81, s: 1.08 },
    ],
    door: { x: 0.49, y: 1.04, s: 1.25 },
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

/** 걸어서 가는 시간(ms) — 화면 거리 / 걸음 빠르기 · 너무 짧거나 길지 않게 */
export const WALK_PX_PER_S = 80;
export function walkMs(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  return Math.round(Math.min(3200, Math.max(900, (d / WALK_PX_PER_S) * 1000)));
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
