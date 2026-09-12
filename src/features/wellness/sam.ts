import type { Level } from "./condition";

/**
 * SAM(Self-Assessment Manikin, Bradley & Lang 1994) — 그림 인형으로 답하는 검증된 정서 자가보고 척도.
 * 두 축만 쓴다: valence(불쾌 1 ~ 유쾌 5) · arousal(차분 1 ~ 들뜸/긴장 5). 원본은 9점이지만 5점 축약형도 널리 쓰인다.
 * 두 답을 정서의 원형 모델(Russell 1980) 사분면으로 읽고, 사분면별로 근거가 있는 정서조절 전략을 제안한다.
 *
 * 2026-09-12 사용자 확정: 추상 그림 6장(투사식)은 검사가 될 수 없어 SAM 으로 교체. 점수·등급·진단 없음, 자가보고.
 * 그림은 저작권 문제가 없도록 우리가 그린 5단계 인형(SVG, Manikin 컴포넌트).
 */

export type SamScore = 1 | 2 | 3 | 4 | 5;
export interface SamAnswer {
  valence: SamScore | null;
  arousal: SamScore | null;
}

export const VALENCE_LABEL: Record<SamScore, string> = { 1: "많이 힘듦", 2: "조금 힘듦", 3: "그저 그럼", 4: "조금 좋음", 5: "많이 좋음" };
export const AROUSAL_LABEL: Record<SamScore, string> = { 1: "축 처짐", 2: "느긋함", 3: "보통", 4: "긴장됨", 5: "매우 긴장·들뜸" };

/** 원형 모델 사분면 — HP 고각성·유쾌 / LP 저각성·유쾌 / HN 고각성·불쾌 / LN 저각성·불쾌 */
export type Quadrant = "HP" | "LP" | "HN" | "LN";

/**
 * 사분면 판정. 기분이 그저 그럼(3)일 땐 긴장 축이 정한다 — 긴장되면 HN(긴장), 처지면 LN(처짐), 보통이면 LP(무난).
 * 유쾌한데 긴장 보통(3)이면 LP 로(들뜸이 아니라 평온으로 본다).
 */
export function quadrantOf(v: SamScore, a: SamScore): Quadrant {
  const pos = v >= 4, neg = v <= 2, high = a >= 4, low = a <= 2;
  if (neg) return high ? "HN" : "LN";
  if (pos) return high ? "HP" : "LP";
  // v === 3
  if (high) return "HN";
  if (low) return "LN";
  return "LP";
}

/** 마음 컨디션 재료 — 기분 축만 본다(불쾌 ≤2 heavy, 유쾌 ≥4 light) */
export function samWeight(v: SamScore): "heavy" | "light" | "neutral" {
  return v <= 2 ? "heavy" : v >= 4 ? "light" : "neutral";
}

/** 첫 문단 — 사분면 + 세기. 용어 없이 상태 말로. */
function opening(q: Quadrant, v: SamScore, a: SamScore): string {
  const strong = v === 1 || v === 5 || a === 1 || a === 5;
  switch (q) {
    case "HP": return strong
      ? "지금 기분이 좋고 에너지도 많이 올라와 있어요. 오늘은 힘이 나는 날이에요."
      : "지금 기분이 좋은 편이고 에너지도 조금 올라와 있어요. 움직이고 싶은 날이에요.";
    case "LP": return v >= 4
      ? "지금 기분이 좋은 편이고 몸은 편안해요. 애쓰지 않아도 하루가 잘 흘러가는 상태예요."
      : "지금은 특별히 좋지도 나쁘지도 않은, 무난한 상태예요. 몸도 크게 긴장하지 않았어요.";
    case "HN": return v <= 2
      ? "지금 기분이 힘든 쪽이고 몸도 긴장해 있어요. 낮에 있었던 일이 아직 가라앉지 않은 것 같아요."
      : "지금 기분은 그저 그런데 몸이 긴장해 있어요. 마음보다 몸이 먼저 신호를 보내는 상태예요.";
    case "LN": return v <= 2
      ? "지금 기분이 힘든 쪽이고 힘도 빠져 있어요. 쌓인 피로가 마음까지 내려온 날이에요."
      : "지금 기분은 그저 그런데 힘이 빠져 있어요. 에너지가 바닥에 가까워진 상태예요.";
  }
}

/** 사분면이 몸에서 어떻게 나타나는지 — 사용자가 확인할 수 있는 감각으로 */
const WHY: Record<Quadrant, string> = {
  HP: "이런 날은 몸이 먼저 움직이고 싶어 하고, 생각도 빨라져요. 다만 힘이 올라와 있을 때는 쉬는 타이밍을 놓치기 쉬워서, 저녁에 갑자기 방전되는 경우가 많아요.",
  LP: "이런 날은 숨이 고르고 어깨에 힘이 빠져 있어요. 특별히 애쓰지 않아도 하루가 잘 흘러가는 상태라, 무언가를 더 하기보다 지금 이 상태를 기억해 두는 게 좋아요.",
  HN: "이런 날은 어깨가 올라가고 턱에 힘이 들어가고, 같은 생각이 반복돼요. 몸이 먼저 긴장하고 있어서 생각으로는 잘 풀리지 않아요. 몸의 긴장을 풀어야 생각도 함께 가라앉습니다.",
  LN: "이런 날은 몸이 무겁고, 해야 할 일이 평소보다 크게 보이고, 시작이 제일 어려워요. 게을러서가 아니라 에너지가 바닥에 가까워서 그래요. 의지로 밀어붙이기보다 아주 작은 움직임으로 시동을 거는 게 효과가 있어요.",
};

/** 어제 신체 컨디션을 한 줄로 엮는다 — 오늘 제안의 근거 */
function bodyLine(body: Level | null): string {
  if (body === null) return "어제 몸 기록이 아직 없어서, 오늘은 마음 쪽만 보고 제안드려요.";
  if (body <= 2) return "어제 몸 컨디션은 낮은 쪽이었어요. 마음이 어떻든 오늘은 몸이 먼저 쉬어야 하는 날입니다.";
  if (body === 3) return "어제 몸 컨디션은 보통이었어요. 무리하지 않는 선에서 조금 움직일 여유는 있어요.";
  return "어제 몸 컨디션은 좋은 편이었어요. 몸에 힘이 남아 있으니, 마음이 무거워도 몸부터 움직여 볼 수 있어요.";
}

/**
 * 제안 — 사분면별 정서조절 전략 하나. HN 긴장 낮추기(호흡·이완) / LN 아주 작은 행동 하나(행동활성화) / HP 힘 쓸 곳 / LP 유지·기록
 */
function closing(q: Quadrant, body: Level | null, slot: number): string {
  const evening = slot === 2;
  const tired = body !== null && body <= 2;
  switch (q) {
    case "HN":
      return tired
        ? "이럴 땐 생각으로 정리하려 할수록 더 복잡해져요. 몸의 긴장부터 푸는 게 먼저예요 — 잠들기 전 이완 호흡(4초 들이쉬고 8초 내쉬기)이면 충분합니다."
        : evening
          ? "이럴 땐 생각으로 정리하려 할수록 더 복잡해져요. 먼저 숨으로 긴장을 가라앉혀 보세요 — 3분 숨 고르기, 그다음 퇴근 전 어깨·목 풀기 1분."
          : "이럴 땐 생각으로 정리하려 할수록 더 복잡해져요. 지금 창가에서 3분 숨 고르기로 긴장을 먼저 풀어 보세요.";
    case "LN":
      return tired
        ? "이런 날은 큰 걸 하려 하면 더 가라앉아요. 아주 작은 것 하나만 — 앉은 채로 1분 기지개, 그걸로 오늘은 충분해요."
        : evening
          ? "이런 날은 기다린다고 힘이 돌아오지 않아요. 아주 작은 행동 하나가 먼저예요 — 퇴근 전 복도 한 바퀴, 그다음에 마음이 조금 따라옵니다."
          : "이런 날은 기다린다고 힘이 돌아오지 않아요. 아주 작은 행동 하나가 먼저예요 — 자리에서 1분 기지개, 그다음에 마음이 조금 따라옵니다.";
    case "HP":
      return tired
        ? "마음은 힘이 나는데 몸은 어제 많이 썼어요. 오늘은 힘을 아껴 쓰는 날 — 앉아서 하는 낮은 강도만."
        : evening
          ? "이 힘은 쓸 곳이 있을 때 오래 가요. 퇴근 전 복도 한 바퀴 걷기로 오늘을 가볍게 닫아 보세요."
          : "이 힘은 쓸 곳이 있을 때 오래 가요. 오후에 짧게 걷거나 몸을 한 번 풀어 두면 저녁까지 갑니다.";
    case "LP":
      return evening
        ? "좋은 흐름이에요. 지금 상태를 기록해 두면 힘든 날에 돌아볼 기준이 생겨요. 퇴근 전 1분 기지개로 오늘을 마무리해 보세요."
        : "좋은 흐름이에요. 지금 상태를 기록해 두면 힘든 날에 돌아볼 기준이 생겨요. 하던 대로 이어가세요.";
  }
}

/** 마지막 한 줄 — 안심 */
const REASSURE: Record<Quadrant, string> = {
  HP: "오늘의 힘을 다 쓰지 않아도 됩니다. 조금 남겨 두는 것도 잘하는 거예요.",
  LP: "이런 날이 쌓이는 게 회복이에요. 지금처럼만 가면 됩니다.",
  HN: "감정이 큰 건 그만큼 진심이었다는 뜻이에요. 지금은 판단하지 말고 잠시 내려놓기만 하면 됩니다.",
  LN: "오늘 아무것도 못 했다고 느껴져도, 여기까지 온 것 자체가 한 일이에요. 작은 것 하나면 충분합니다.",
};

export interface Directing {
  quadrant: Quadrant;
  weight: "heavy" | "light" | "neutral";
  text: string;
}

/** 두 답 → 문단 5개(지금 상태 · 몸에서 나타남 · 어제 몸 · 오늘의 제안 · 안심) */
export function directing(v: SamScore, a: SamScore, body: Level | null, slot: number): Directing {
  const q = quadrantOf(v, a);
  const paras = [opening(q, v, a), WHY[q], bodyLine(body), closing(q, body, slot), REASSURE[q]];
  return { quadrant: q, weight: samWeight(v), text: paras.join("\n\n") };
}
