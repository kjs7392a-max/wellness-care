import type { Tone } from "./data";
import type { Level } from "./condition";

/**
 * 「오늘의 마음카드」 종합 디렉팅 — 그림 6장에서 고른 결(Tone)을 모아 한 편의 글로.
 * 2026-09-12 사용자 확정: 문항 없이 그림 6장을 순서대로, 장마다 4지선다, 6개를 모아 디렉팅 하나.
 *
 * 근거(같은 날 사용자 "근거 있는 디렉팅이냐" → 세운 틀):
 * - 그림은 검사가 아니라 매개다. 선택지의 결은 정서의 원형 모델(Russell, 1980 circumplex — 각성 높/낮 × 유쾌/불쾌)의
 *   사분면으로 읽는다. 즉 사용자가 "지금 어느 사분면인가"를 스스로 고르는 자가보고이지, 그림이 무엇을 측정하지 않는다.
 * - 디렉팅의 제안은 사분면별로 근거가 있는 정서조절 전략만 쓴다:
 *   고각성·불쾌(격동) → 각성 낮추기(호흡·이완) / 저각성·불쾌(무게·정지) → 아주 작은 행동 하나(행동활성화)
 *   유쾌(활력·안정·연결) → 유지·기록·연결. 우리 콘텐츠(호흡 3종·1분 기지개·복도 걷기·대화)가 그 자리에 대응한다.
 * - 규칙 기반(즉시·일관·비용 0). 점수·등급·진단 없음. 대화 내용은 안 쓴다.
 */

export const TONES: Tone[] = ["활력", "안정", "연결", "무게", "정지", "격동"];
/** 무거운 쪽 결 = 불쾌 사분면 — 마음 컨디션 재료(heavy/light) 판정에 쓴다 */
export const HEAVY_TONES: Tone[] = ["무게", "정지", "격동"];

/** 원형 모델 사분면 — HP 고각성·유쾌 / LP 저각성·유쾌 / HN 고각성·불쾌 / LN 저각성·불쾌 */
export type Quadrant = "HP" | "LP" | "HN" | "LN";
export const TONE_QUADRANT: Record<Tone, Quadrant> = {
  활력: "HP",
  안정: "LP",
  연결: "LP", // 사회적 유쾌 — 각성은 낮은 쪽으로 본다
  무게: "LN",
  정지: "LN",
  격동: "HN",
};

export type Tally = Record<Tone, number>;

export function tally(picks: Tone[]): Tally {
  const t = { 활력: 0, 안정: 0, 연결: 0, 무게: 0, 정지: 0, 격동: 0 } as Tally;
  for (const p of picks) t[p] += 1;
  return t;
}

/** 많이 나온 순(동률이면 TONES 순서) */
export function ranked(t: Tally): Tone[] {
  return [...TONES].sort((a, b) => t[b] - t[a] || TONES.indexOf(a) - TONES.indexOf(b)).filter((k) => t[k] > 0);
}

/** 사분면 집계 — 유쾌는 HP/LP 로 갈라 세되, 판정은 '불쾌가 우세한가'부터 본다 */
export function quadrantTally(picks: Tone[]): Record<Quadrant, number> {
  const q: Record<Quadrant, number> = { HP: 0, LP: 0, HN: 0, LN: 0 };
  for (const p of picks) q[TONE_QUADRANT[p]] += 1;
  return q;
}

/** 우세 사분면. 불쾌(HN+LN)가 절반 이상이면 그중 많은 쪽, 아니면 유쾌 중 많은 쪽. 동률은 낮은 각성 쪽(휴식 우선). */
export function dominantQuadrant(picks: Tone[]): Quadrant | null {
  if (picks.length === 0) return null;
  const q = quadrantTally(picks);
  const neg = q.HN + q.LN;
  if (neg * 2 >= picks.length) return q.HN > q.LN ? "HN" : "LN";
  return q.HP > q.LP ? "HP" : "LP";
}

/** 6장 중 무거운 결이 3장 이상이면 heavy, 하나도 없으면 light, 그 사이는 neutral */
export function pickWeight(picks: Tone[]): "heavy" | "light" | "neutral" {
  const h = picks.filter((p) => HEAVY_TONES.includes(p)).length;
  if (h >= 3) return "heavy";
  if (h === 0) return "light";
  return "neutral";
}

/** 첫 문장 — 우세 사분면을 상태 말로(용어 없이) */
const OPENING: Record<Quadrant, string> = {
  HP: "오늘 고른 그림들엔 앞으로 밀고 나가려는 힘이 가장 많이 보여요. 에너지가 위로 올라와 있는 날이에요.",
  LP: "오늘은 안쪽이 꽤 차분한 날이에요. 고른 그림들이 대체로 편안하고 이어져 있는 쪽을 향해 있어요.",
  HN: "오늘 고른 그림들엔 아직 식지 않은 감정이 많아요. 밖에서 온 일이 안에서 계속 움직이고 있어서, 몸도 같이 긴장해 있기 쉬워요.",
  LN: "오늘 고른 그림들엔 쌓이고 눌린 것이 많이 보여요. 힘이 빠지고 멈춰 있고 싶은 쪽에 마음이 가 있어요.",
};

/** 둘째 문장 — 두 번째로 많은 결 하나를 짚어 준다(같은 사분면이면 생략) */
const SECOND: Record<Tone, string> = {
  활력: "그 밑에 움직이고 싶은 힘도 함께 있어요.",
  안정: "그래도 중심은 흔들리지 않고 있어요.",
  연결: "그 옆에 누군가를 향한 마음도 같이 있고요.",
  무게: "다만 그 아래에 눌린 무게가 조금 깔려 있어요.",
  정지: "동시에 잠깐 멈추고 싶은 마음도 있어요.",
  격동: "그리고 아직 가라앉지 않은 감정이 한켠에 있어요.",
};

const MIXED = "여섯 장이 고르게 갈렸어요. 한 가지로 정해지지 않는 날은 그 자체로 괜찮아요. 여러 마음이 한꺼번에 있는 건 이상한 게 아니라, 하루가 그만큼 여러 장면으로 이루어져 있었다는 뜻이에요.";

/** 사분면이 몸에서 어떻게 나타나는지 — 용어 없이, 사용자가 확인할 수 있는 감각으로 */
const WHY: Record<Quadrant, string> = {
  HP: "이런 날은 몸이 먼저 움직이고 싶어 하고, 생각도 빨리 돌아요. 다만 힘이 올라와 있을 때는 쉬는 타이밍을 놓치기 쉬워서, 저녁에 갑자기 방전되는 경우가 많아요.",
  LP: "이런 날은 숨이 고르고 어깨가 내려가 있어요. 특별히 애쓰지 않아도 하루가 굴러가는 상태라, 오늘은 무언가를 더하기보다 이 결을 알아채 두는 게 의미가 있어요.",
  HN: "이런 날은 어깨가 올라가고 턱에 힘이 들어가고, 같은 생각이 반복돼요. 마음이 아니라 몸이 먼저 긴장 상태에 들어가 있어서, 생각으로는 잘 안 풀리고 몸을 내려놓아야 생각도 따라 내려옵니다.",
  LN: "이런 날은 몸이 무겁고, 해야 할 일이 평소보다 크게 보이고, 시작이 제일 어려워요. 마음이 게을러서가 아니라 에너지가 바닥에 가까워서 그런 거라, 의지로 밀기보다 아주 작은 움직임으로 시동을 거는 쪽이 통합니다.",
};

/** 어제 신체 컨디션을 한 줄로 엮는다 — 오늘 제안의 근거 */
function bodyLine(body: Level | null): string {
  if (body === null) return "어제 몸 기록이 아직 없어서, 오늘은 마음 쪽만 보고 제안드려요.";
  if (body <= 2) return "어제 몸 컨디션은 낮은 쪽이었어요. 마음이 어떻든 오늘은 몸이 먼저 쉬어야 하는 날입니다.";
  if (body === 3) return "어제 몸 컨디션은 보통이었어요. 무리하지 않는 선에서 조금 움직일 여유는 있어요.";
  return "어제 몸 컨디션은 좋은 편이었어요. 몸에는 쓸 힘이 남아 있으니, 마음이 무거워도 몸부터 움직이는 길이 열려 있어요.";
}

/** 마지막 한 줄 — 안심. 사분면별. */
const REASSURE: Record<Quadrant, string> = {
  HP: "오늘의 힘을 다 쓰지 않아도 됩니다. 조금 남겨 두는 것도 잘하는 거예요.",
  LP: "이런 날이 쌓이는 게 회복이에요. 지금처럼만 가면 됩니다.",
  HN: "감정이 큰 건 그만큼 진심이었다는 뜻이에요. 지금은 판단하지 말고 내려놓는 것만 하면 됩니다.",
  LN: "오늘 아무것도 못 했다고 느껴져도, 여기까지 온 것 자체가 한 일이에요. 작은 것 하나면 충분합니다.",
};

/**
 * 마무리 — 사분면별 정서조절 전략 + 어제 신체 컨디션. 지시가 아니라 제안 하나.
 * HN 각성 낮추기(호흡·이완) / LN 아주 작은 행동 하나 / HP 힘 쓸 곳 / LP 유지·기록
 */
function closing(quad: Quadrant, body: Level | null, slot: number): string {
  const evening = slot === 2;
  const tired = body !== null && body <= 2;
  switch (quad) {
    case "HN":
      return tired
        ? "이럴 땐 생각을 정리하려 들수록 더 올라와요. 몸부터 내려앉히는 게 먼저예요 — 잠들기 전 이완 호흡(4초 들이쉬고 8초 내쉬기)이면 충분합니다."
        : evening
          ? "이럴 땐 생각을 정리하려 들수록 더 올라와요. 먼저 숨으로 각성을 내려 보세요 — 3분 숨 고르기, 그다음 퇴근 전 어깨·목 풀기 1분."
          : "이럴 땐 생각을 정리하려 들수록 더 올라와요. 지금 창가에서 3분 숨 고르기로 각성을 먼저 내려 보세요.";
    case "LN":
      return tired
        ? "이런 날은 큰 걸 하려 하면 더 가라앉아요. 아주 작은 것 하나만 — 앉은 채로 1분 기지개, 그걸로 오늘은 충분해요."
        : evening
          ? "이런 날은 기다린다고 힘이 돌아오지 않아요. 아주 작은 행동 하나가 먼저예요 — 퇴근 전 복도 한 바퀴, 그다음에 마음이 조금 따라옵니다."
          : "이런 날은 기다린다고 힘이 돌아오지 않아요. 아주 작은 행동 하나가 먼저예요 — 자리에서 1분 기지개, 그다음에 마음이 조금 따라옵니다.";
    case "HP":
      return tired
        ? "마음은 올라와 있는데 몸은 어제 많이 썼어요. 오늘은 힘을 아껴 쓰는 날 — 앉아서 하는 낮은 강도만."
        : evening
          ? "이 힘은 쓸 곳이 있을 때 오래 가요. 퇴근 전 복도 한 바퀴 걷기로 오늘을 가볍게 닫아 보세요."
          : "이 힘은 쓸 곳이 있을 때 오래 가요. 오후에 짧게 걷거나 몸을 한 번 풀어 두면 저녁까지 갑니다.";
    case "LP":
    default:
      return evening
        ? "좋은 흐름이에요. 지금 상태를 기록해 두면 힘든 날에 돌아올 자리가 생겨요. 퇴근 전 1분 기지개로 오늘을 닫아 보세요."
        : "좋은 흐름이에요. 지금 상태를 기록해 두면 힘든 날에 돌아올 자리가 생겨요. 하던 대로 이어가세요.";
  }
}

export interface Directing {
  weight: "heavy" | "light" | "neutral";
  quadrant: Quadrant | null;
  top: Tone[];
  text: string;
}

/** picks 는 고른 순서대로 6개(부족해도 동작 — 있는 만큼으로 씀) */
export function directing(picks: Tone[], body: Level | null, slot: number): Directing {
  const t = tally(picks);
  const r = ranked(t);
  const weight = pickWeight(picks);
  const quad = dominantQuadrant(picks);
  if (r.length === 0 || quad === null) return { weight, quadrant: null, top: [], text: "" };
  // 문단 4~5개: ① 지금 마음(+둘째 결) ② 몸에서 어떻게 나타나는지 ③ 어제 몸과 엮기 ④ 오늘의 제안 ⑤ 안심 한 줄
  const paras: string[] = [];
  const spread = r.length >= 4 && t[r[0]] <= 2;
  if (spread) paras.push(MIXED);
  else {
    const second = r.find((k) => TONE_QUADRANT[k] !== quad); // 다른 사분면의 결만 따로 짚는다
    paras.push([OPENING[quad], second ? SECOND[second] : ""].filter(Boolean).join(" "));
  }
  paras.push(WHY[quad]);
  paras.push(bodyLine(body));
  paras.push(closing(quad, body, slot));
  paras.push(REASSURE[quad]);
  return { weight, quadrant: quad, top: r.slice(0, 2), text: paras.join("\n\n") };
}
