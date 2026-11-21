/**
 * 마음 쉼터 3D 캐릭터의 뼈대·자세(2026-11-21 사용자 "아바타들을 3D로" · "배경실사와 크기를 맞춰야") — 순수 규칙만(테스트 space-3d-rig.test.ts).
 * 그리기(three.js)는 space-3d-render.ts. 2D 그림(space-avatars)과 같은 크기 약속을 지킨다:
 *   단위 u = 앉은 그림 상자 높이(figureHeight)의 1/126.
 *   - 책상다리(sit): 머리 꼭대기 ~ 앉은 엉덩이 밑 = 99u · 엉덩이 밑은 자리점(발밑 가운데)보다 6u 위 — 2D 와 같다(실사 크기 맞춤 그대로).
 *   - 장의자(pew): 등받이 윗선(자리점) 위로 보이는 키 = 83u — 그 아래는 잘라 등받이에 가린 것처럼.
 *   - 서기·걷기: 사람 비율(머리 4.3개) · 키 172u — 2D(124u)는 머리 큰 그림이라 걸을 때 아이처럼 작아 보였다.
 * 몸은 앞(+z, 화면 쪽)을 보고 서 있는 것이 기본(yaw 0). yaw π = 뒷모습, +π/2 = 화면 오른쪽을 봄.
 */
import type { AvatarId } from "./space-avatars";

/** 몸 치수(u) — 바닥(발밑)이 0 */
export const RIG = {
  height: 172,
  hip: 84, // 엉덩관절 높이(서 있을 때)
  hipHalf: 8.5, // 엉덩관절 사이 반
  thigh: 40,
  shin: 38,
  ankle: 6,
  shoulder: 133, // 어깨 높이(서 있을 때)
  shoulderHalf: 18,
  upperArm: 27,
  foreArm: 25,
  headR: 19.5,
  headY: 152.5, // 머리 가운데
  neckTop: 137,
} as const;
/** 엉덩관절 → 머리 꼭대기(곧게 앉았을 때) */
export const HIP_TO_TOP = RIG.headY + RIG.headR - RIG.hip;

export type Pose3D = "stand" | "walk" | "sit" | "pew";

export interface LegAngles { pitch: number; out: number; knee: number; twist: number }
export interface ArmAngles { pitch: number; out: number; elbow: number }
/** 관절 각(라디안) · lean = 몸통 앞으로 숙임 · bob = 엉덩이 들썩(u) · hipY = 엉덩관절 높이(자리점 기준 u) */
export interface Angles {
  hipY: number; lean: number; bob: number; sway: number; headPitch: number; headTurn: number;
  legL: LegAngles; legR: LegAngles; armL: ArmAngles; armR: ArmAngles;
}

/** 책상다리 — 엉덩이 밑이 자리점보다 6u 위, 머리 꼭대기까지 99u(2D 와 같은 실사 크기) */
export const SIT_LEAN = 0.1;
export const SIT_SEAT = 6;
export const SIT_HIP = SIT_SEAT + 99 - HIP_TO_TOP * Math.cos(SIT_LEAN);
/** 장의자 — 등받이 윗선(자리점) 위로 83u */
export const PEW_LEAN = 0.04;
export const PEW_HIP = 83 - HIP_TO_TOP * Math.cos(PEW_LEAN);

const leg = (pitch: number, knee: number, out = 0, twist = 0): LegAngles => ({ pitch, out, knee, twist });
const arm = (pitch: number, elbow: number, out = 0.06): ArmAngles => ({ pitch, out, elbow });

/**
 * 걷기 한 주기(phase 0~1 = 두 걸음) — 0 = 왼발 뒤꿈치가 닿는 순간.
 * 허벅지는 앞뒤로, 무릎은 발을 들어 앞으로 내딛는 동안 접힌다 · 팔은 반대쪽 다리와 함께 · 몸은 발이 닿을 때 내려간다.
 */
export const WALK_AMP = 0.36;
export function walkAngles(phase: number): Angles {
  const t = 2 * Math.PI * phase;
  const thigh = (p: number) => WALK_AMP * Math.cos(p); // +앞
  // 무릎: 발을 뗀 뒤(뒤로 간 다리가 앞으로 나올 때) 크게 접히고, 디딜 땐 거의 편다
  const knee = (p: number) => 0.08 + 0.95 * Math.max(0, Math.sin(p - 0.35)) ** 1.6 + 0.12 * Math.max(0, -Math.sin(p));
  return {
    hipY: RIG.hip, lean: 0.05, bob: -1.6 * Math.abs(Math.cos(t)), sway: 0.6 * Math.sin(t), headPitch: 0.02, headTurn: 0,
    legL: leg(thigh(t), knee(t)), legR: leg(thigh(t + Math.PI), knee(t + Math.PI)),
    armL: arm(-0.42 * Math.cos(t), 0.28 + 0.14 * Math.max(0, -Math.cos(t))),
    armR: arm(-0.42 * Math.cos(t + Math.PI), 0.28 + 0.14 * Math.max(0, -Math.cos(t + Math.PI))),
  };
}

/** 그 자세의 관절 각 · breath = 0~1(숨 주기) · phase = 걷기 주기 */
export function poseAngles(pose: Pose3D, phase = 0, breath = 0): Angles {
  const b = Math.sin(2 * Math.PI * breath);
  switch (pose) {
    case "walk":
      return walkAngles(phase);
    case "stand":
      return {
        hipY: RIG.hip, lean: 0.02, bob: 0.3 * b, sway: 0, headPitch: 0.03, headTurn: 0,
        legL: leg(0.02, 0.04), legR: leg(-0.02, 0.04), armL: arm(0.05, 0.18), armR: arm(0.05, 0.18),
      };
    case "sit":
      // 책상다리 — 허벅지는 앞·바깥으로 눕히고, 정강이는 접어 안쪽으로 엇갈린다 · 손은 무릎 위
      return {
        hipY: SIT_HIP, lean: SIT_LEAN + 0.01 * b, bob: 0.25 * b, sway: 0, headPitch: 0.1, headTurn: 0,
        legL: leg(1.42, 2.55, 0.95, -1.05), legR: leg(1.42, 2.55, 0.95, -1.05),
        armL: { pitch: 0.36, out: 0.3, elbow: 0.32 }, armR: { pitch: 0.36, out: 0.3, elbow: 0.32 },
      };
    case "pew":
      // 의자에 곧게 앉음 — 무릎 아래는 내려온다 · 손은 무릎 위(등받이에 가려 거의 안 보인다)
      return {
        hipY: PEW_HIP, lean: PEW_LEAN + 0.008 * b, bob: 0.2 * b, sway: 0, headPitch: 0.12, headTurn: 0,
        legL: leg(1.5, 1.5, 0.08), legR: leg(1.5, 1.5, 0.08),
        armL: { pitch: 0.62, out: 0.1, elbow: 0.95 }, armR: { pitch: 0.62, out: 0.1, elbow: 0.95 },
      };
  }
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixLeg = (a: LegAngles, b: LegAngles, t: number): LegAngles => ({ pitch: mix(a.pitch, b.pitch, t), out: mix(a.out, b.out, t), knee: mix(a.knee, b.knee, t), twist: mix(a.twist, b.twist, t) });
const mixArm = (a: ArmAngles, b: ArmAngles, t: number): ArmAngles => ({ pitch: mix(a.pitch, b.pitch, t), out: mix(a.out, b.out, t), elbow: mix(a.elbow, b.elbow, t) });
/** 두 자세 사이(앉기·일어서기를 부드럽게) */
export function mixAngles(a: Angles, b: Angles, t: number): Angles {
  return {
    hipY: mix(a.hipY, b.hipY, t), lean: mix(a.lean, b.lean, t), bob: mix(a.bob, b.bob, t), sway: mix(a.sway, b.sway, t),
    headPitch: mix(a.headPitch, b.headPitch, t), headTurn: mix(a.headTurn, b.headTurn, t),
    legL: mixLeg(a.legL, b.legL, t), legR: mixLeg(a.legR, b.legR, t), armL: mixArm(a.armL, b.armL, t), armR: mixArm(a.armR, b.armR, t),
  };
}
/** 앉고 일어서는 데 걸리는 시간(ms) — 2D 의 서 있는 잠깐(600ms)·앉기 전 멈춤(450ms) 안에 들어온다 */
export const POSE_BLEND_MS = { sitDown: 650, standUp: 520, other: 220 } as const;
export function blendMs(from: Pose3D, to: Pose3D): number {
  const seated = (p: Pose3D) => p === "sit" || p === "pew";
  if (!seated(from) && seated(to)) return POSE_BLEND_MS.sitDown;
  if (seated(from) && !seated(to)) return POSE_BLEND_MS.standUp;
  return POSE_BLEND_MS.other;
}
export const easeInOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** 머리 꼭대기 높이(자리점 기준 u) — 숙임만 반영한 간단한 계산(테스트·이름표 자리) */
export function headTop(a: Angles): number {
  return a.hipY + a.bob + HIP_TO_TOP * Math.cos(a.lean);
}

/**
 * 바라보는 쪽(yaw) — 2D 의 앞·뒤·옆(뒤집기) 약속을 그대로 받는다.
 * 명상룸에서 마주 보고 앉은 옆모습은 화면 쪽으로 조금(0.7 ≈ 40°) 돌려 얼굴과 책상다리가 보이게(3D 라 가능).
 */
export function targetYaw(face: string, flip: boolean, seatedSide = false): number {
  if (face === "back") return Math.PI;
  if (face === "side") {
    const s = seatedSide ? Math.PI / 2 - 0.7 : Math.PI / 2;
    return flip ? -s : s;
  }
  return 0;
}
/** 가장 가까운 쪽으로 돌기 */
export function turnToward(cur: number, target: number, maxStep: number): number {
  let d = target - cur;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  if (Math.abs(d) <= maxStep) return cur + d;
  return cur + Math.sign(d) * maxStep;
}

/** 한 주기(두 걸음)에 가는 거리(u) — 발이 미끄러지지 않게 걸음을 이동 거리에 맞춘다 */
export const STRIDE_U = 4 * (RIG.thigh + RIG.shin) * Math.sin(WALK_AMP);

/** 머리 모양 — 2D 캐릭터와 같은 사람(긴 머리·단발·올림머리…) */
export type HairStyle = "long" | "short" | "bob" | "bun" | "curly" | "curlyShort" | "thin";
export const HAIR: Record<AvatarId, { style: HairStyle; glasses?: string }> = {
  haneul: { style: "long" },
  bada: { style: "short" },
  saebyeok: { style: "bob" },
  noeul: { style: "short", glasses: "#3b302b" },
  sol: { style: "bun" },
  byeol: { style: "curly" },
  iseul: { style: "curlyShort", glasses: "#8a6f8f" },
  baram: { style: "thin" },
};
