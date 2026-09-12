import type { Level } from "./condition";

/**
 * 「오늘의 마음카드」 — 그림으로 답하는 자가보고 5줄 + 종합 디렉팅.
 *
 * 축과 근거:
 *   valence·arousal·dominance = SAM(Self-Assessment Manikin, Bradley & Lang 1994) 세 축(기분·긴장·통제감)
 *   sleep = 단일 문항 수면 자가보고(연구에서 통용) · satisfaction = Kunin Faces Scale(1955, 직무 만족)
 * 묻는 방식(2026-09-12 사용자 확정): "기분 어떠세요?" 같은 직접 질문이 아니라 **은유 그림 5장** 중 하나를 고른다
 * (하늘·물·배·밤·교실 날씨). SAM 이 원래 글자 없는 그림 척도라 원본 취지와 맞다. 점수·등급·진단 없음.
 * 읽기: 기분×긴장 → 정서 원형 모델(Russell 1980) 사분면 → 사분면별 정서조절 전략. 통제감 낮으면 "내가 정하는 작은 선택",
 * 잠이 나쁘면 회복이 먼저. 만족은 기록 탭 주간 흐름용.
 */

export type SamScore = 1 | 2 | 3 | 4 | 5;
export type AxisKey = "valence" | "arousal" | "dominance" | "sleep" | "satisfaction";

export interface SamAnswer {
  valence: SamScore | null;
  arousal: SamScore | null;
  dominance: SamScore | null;
  sleep: SamScore | null;
  satisfaction: SamScore | null;
}
export const EMPTY_SAM: SamAnswer = { valence: null, arousal: null, dominance: null, sleep: null, satisfaction: null };

export interface Axis {
  key: AxisKey;
  /** 은유 질문 */
  question: string;
  /** 왼쪽 ↔ 오른쪽 작은 안내 */
  hint: string;
  /** 그림 5장 이름표(왼 → 오) */
  labels: [string, string, string, string, string];
  /** 근거 표기(각주용) */
  basis: string;
}

export const AXES: Axis[] = [
  { key: "valence", question: "오늘 마음의 하늘을 고른다면?", hint: "폭우 ↔ 노을", labels: ["폭우", "흐림", "옅은 구름", "맑음", "노을"], basis: "SAM 기분" },
  { key: "arousal", question: "지금 내 안의 물은 어떤 모양인가요?", hint: "잔잔한 호수 ↔ 폭포", labels: ["잔잔한 호수", "느린 강", "잔물결", "파도", "폭포"], basis: "SAM 긴장" },
  { key: "dominance", question: "오늘 나는 어떤 배에 타고 있었나요?", hint: "떠내려감 ↔ 키를 잡음", labels: ["떠내려가는 종이배", "노 없는 배", "흔들리는 배", "노 젓는 배", "키를 잡은 배"], basis: "SAM 통제감" },
  { key: "sleep", question: "어젯밤을 한 장면으로 고른다면?", hint: "뒤척임 ↔ 깊은 잠", labels: ["뒤척인 밤", "반쯤 뜬 눈", "얕은 잠", "편한 잠", "깊은 잠"], basis: "수면 단일 문항" },
  { key: "satisfaction", question: "오늘 교실의 날씨는 어땠나요?", hint: "천둥 ↔ 화창", labels: ["천둥", "비", "흐림", "맑음", "화창"], basis: "Kunin Faces(만족)" },
];

export function samDone(a: SamAnswer): boolean {
  return AXES.every((x) => a[x.key] !== null);
}
export function samAnswered(a: SamAnswer): number {
  return AXES.filter((x) => a[x.key] !== null).length;
}

/** 원형 모델 사분면 — HP 고각성·유쾌 / LP 저각성·유쾌 / HN 고각성·불쾌 / LN 저각성·불쾌 */
export type Quadrant = "HP" | "LP" | "HN" | "LN";

/**
 * 사분면 판정. 기분이 가운데(3)일 땐 긴장 축이 정한다 — 긴장되면 HN, 처지면 LN, 보통이면 LP(무난).
 * 유쾌한데 긴장 보통(3)이면 LP 로(들뜸이 아니라 평온으로 본다).
 */
export function quadrantOf(v: SamScore, a: SamScore): Quadrant {
  const pos = v >= 4, neg = v <= 2, high = a >= 4, low = a <= 2;
  if (neg) return high ? "HN" : "LN";
  if (pos) return high ? "HP" : "LP";
  if (high) return "HN";
  if (low) return "LN";
  return "LP";
}

/** 마음 컨디션 재료 — 기분 축만 본다(≤2 heavy, ≥4 light) */
export function samWeight(v: SamScore): "heavy" | "light" | "neutral" {
  return v <= 2 ? "heavy" : v >= 4 ? "light" : "neutral";
}

const L = (key: AxisKey, n: SamScore) => AXES.find((x) => x.key === key)!.labels[n - 1];

/** 첫 문단 — 고른 은유를 받아서 시작 + 사분면 상태 말 */
function opening(q: Quadrant, v: SamScore, a: SamScore): string {
  const lead = `오늘 하늘은 ${L("valence", v)}, 안의 물은 ${L("arousal", a)} — `;
  switch (q) {
    case "HP": return lead + (v === 5 || a === 5
      ? "기분이 좋고 에너지도 많이 올라와 있어요. 오늘은 힘이 나는 날이에요."
      : "기분이 좋은 편이고 에너지도 조금 올라와 있어요. 움직이고 싶은 날이에요.");
    case "LP": return lead + (v >= 4
      ? "기분이 좋은 편이고 몸은 편안해요. 애쓰지 않아도 하루가 잘 흘러가는 상태예요."
      : "특별히 좋지도 나쁘지도 않은, 무난한 상태예요. 몸도 크게 긴장하지 않았어요.");
    case "HN": return lead + (v <= 2
      ? "겉보다 안이 더 요동친 날이에요. 기분이 힘든 쪽이고 몸도 긴장해 있어요."
      : "기분은 그저 그런데 몸이 긴장해 있어요. 마음보다 몸이 먼저 신호를 보내는 상태예요.");
    case "LN": return lead + (v <= 2
      ? "기분이 힘든 쪽이고 힘도 빠져 있어요. 쌓인 피로가 마음까지 내려온 날이에요."
      : "기분은 그저 그런데 힘이 빠져 있어요. 에너지가 바닥에 가까워진 상태예요.");
  }
}

/** 사분면이 몸에서 어떻게 나타나는지 — 사용자가 확인할 수 있는 감각으로 */
const WHY: Record<Quadrant, string> = {
  HP: "이런 날은 몸이 먼저 움직이고 싶어 하고, 생각도 빨라져요. 다만 힘이 올라와 있을 때는 쉬는 타이밍을 놓치기 쉬워서, 저녁에 갑자기 방전되는 경우가 많아요.",
  LP: "이런 날은 숨이 고르고 어깨에 힘이 빠져 있어요. 특별히 애쓰지 않아도 하루가 잘 흘러가는 상태라, 무언가를 더 하기보다 지금 이 상태를 기억해 두는 게 좋아요.",
  HN: "이런 날은 어깨가 올라가고 턱에 힘이 들어가고, 같은 생각이 반복돼요. 몸이 먼저 긴장하고 있어서 생각으로는 잘 풀리지 않아요. 몸의 긴장을 풀어야 생각도 함께 가라앉습니다.",
  LN: "이런 날은 몸이 무겁고, 해야 할 일이 평소보다 크게 보이고, 시작이 제일 어려워요. 게을러서가 아니라 에너지가 바닥에 가까워서 그래요. 의지로 밀어붙이기보다 아주 작은 움직임으로 시동을 거는 게 효과가 있어요.",
};

/** 통제감이 낮을 때만 — 내가 정하는 아주 작은 선택 하나(통제감 회복) */
function dominanceLine(d: SamScore): string | null {
  if (d >= 3) return null;
  return `오늘은 ${L("dominance", d)}처럼 흘러갔다고 하셨어요. 하루가 나를 끌고 간 날엔 큰 결정보다 아주 작은 선택 하나가 통제감을 돌려줍니다 — 퇴근길 음악을 고르는 것, 저녁 메뉴를 내가 정하는 것 정도면 돼요.`;
}

/** 잠이 나빴으면 무엇보다 먼저 — 회복 우선 */
function sleepLine(sl: SamScore): string | null {
  if (sl >= 3) return null;
  return `어젯밤은 ${L("sleep", sl)}이었어요. 잠이 모자란 날은 기분도 긴장도 실제보다 나쁘게 느껴져요. 오늘 무엇을 하든 이 점을 먼저 감안하고, 저녁엔 잠들기 전 이완 호흡으로 밤을 챙기는 게 가장 큰 회복입니다.`;
}

/** 어제 신체 컨디션을 한 줄로 엮는다 */
function bodyLine(body: Level | null): string {
  if (body === null) return "어제 몸 기록이 아직 없어서, 오늘은 마음 쪽만 보고 제안드려요.";
  if (body <= 2) return "어제 몸 컨디션은 낮은 쪽이었어요. 마음이 어떻든 오늘은 몸이 먼저 쉬어야 하는 날입니다.";
  if (body === 3) return "어제 몸 컨디션은 보통이었어요. 무리하지 않는 선에서 조금 움직일 여유는 있어요.";
  return "어제 몸 컨디션은 좋은 편이었어요. 몸에 힘이 남아 있으니, 마음이 무거워도 몸부터 움직여 볼 수 있어요.";
}

/** 제안 — 사분면별 정서조절 전략 하나. HN 긴장 낮추기 / LN 아주 작은 행동 / HP 힘 쓸 곳 / LP 유지·기록 */
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

/** 다섯 답 → 문단 5~7개(지금 상태 · 몸에서 나타남 · [잠] · [통제감] · 어제 몸 · 제안 · 안심) */
export function directing(ans: Required<{ [K in AxisKey]: SamScore }>, body: Level | null, slot: number): Directing {
  const q = quadrantOf(ans.valence, ans.arousal);
  const paras = [
    opening(q, ans.valence, ans.arousal),
    WHY[q],
    sleepLine(ans.sleep),
    dominanceLine(ans.dominance),
    bodyLine(body),
    closing(q, body, slot),
    REASSURE[q],
  ].filter((p): p is string => !!p);
  return { quadrant: q, weight: samWeight(ans.valence), text: paras.join("\n\n") };
}
