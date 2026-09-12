import type { Tone } from "./data";
import type { Level } from "./condition";

/**
 * 「오늘의 마음카드」 종합 디렉팅 — 그림 6장에서 고른 결(Tone)을 모아 한 편의 글로.
 * 2026-09-12 사용자 확정: 문항 없이 그림 6장을 순서대로, 장마다 4지선다, 6개를 모아 디렉팅 하나.
 * 규칙 기반(즉시·일관·비용 0). 점수·등급·진단 없음. 대화 내용은 안 쓴다.
 */

export const TONES: Tone[] = ["활력", "안정", "연결", "무게", "정지", "격동"];
/** 무거운 쪽 결 — 마음 컨디션 재료(heavy/light) 판정에 쓴다 */
export const HEAVY_TONES: Tone[] = ["무게", "정지", "격동"];

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

/** 6장 중 무거운 결이 3장 이상이면 heavy, 하나도 없으면 light, 그 사이는 neutral */
export function pickWeight(picks: Tone[]): "heavy" | "light" | "neutral" {
  const h = picks.filter((p) => HEAVY_TONES.includes(p)).length;
  if (h >= 3) return "heavy";
  if (h === 0) return "light";
  return "neutral";
}

const OPENING: Record<Tone, string> = {
  활력: "오늘 고른 그림들엔 앞으로 밀고 나가려는 힘이 가장 많이 보여요.",
  안정: "오늘은 안쪽이 꽤 차분한 날이에요. 고른 그림들이 대체로 균형 쪽을 향해 있어요.",
  연결: "오늘 마음은 사람들 사이에 많이 놓여 있어요. 혼자보다 누군가와 함께 있을 때 힘이 나는 날이에요.",
  무게: "오늘 고른 그림들엔 쌓이고 눌린 것이 많이 보여요. 정리되지 않은 채 남아 있는 게 있는 것 같아요.",
  정지: "오늘은 멈춰 있고 싶은 마음이 가장 커요. 그건 게으름이 아니라 몸과 마음이 쉬자고 보내는 신호예요.",
  격동: "오늘 고른 그림들엔 아직 식지 않은 감정이 많아요. 밖에서 온 일이 안에서 계속 움직이고 있어요.",
};

const SECOND: Record<Tone, string> = {
  활력: "그 밑에 움직이고 싶은 힘도 함께 있어요.",
  안정: "그래도 중심은 흔들리지 않고 있어요.",
  연결: "그 옆에 누군가를 향한 마음도 같이 있고요.",
  무게: "다만 그 아래에 눌린 무게가 조금 깔려 있어요.",
  정지: "동시에 잠깐 멈추고 싶은 마음도 있어요.",
  격동: "그리고 아직 가라앉지 않은 감정이 한켠에 있어요.",
};

const MIXED = "여섯 장이 고르게 갈렸어요. 한 가지로 정해지지 않는 날은 그 자체로 괜찮아요.";

/** 마무리 — 결의 무게 × 어제 신체 컨디션. 지시가 아니라 제안 하나. */
function closing(weight: "heavy" | "light" | "neutral", body: Level | null, slot: number): string {
  const evening = slot === 2;
  if (weight === "heavy") {
    if (body !== null && body <= 2) return "몸도 마음도 쉬어가야 하는 날이에요. 오늘은 아무것도 더하지 말고, 잠들기 전 이완 호흡 하나면 충분해요.";
    return evening
      ? "머리는 복잡한데 몸은 남아 있는 날이에요. 생각을 정리하려 들지 말고 퇴근 전 어깨·목 풀기 1분으로 몸부터 풀어 보세요."
      : "생각을 붙잡으려 하지 말고, 잠깐 창가에서 숨 고르기 3분으로 몸부터 풀어 보세요.";
  }
  if (weight === "light") {
    return evening
      ? "좋은 흐름이에요. 퇴근 전 1분 기지개로 오늘을 가볍게 닫아 보세요."
      : "좋은 흐름이에요. 지금 하던 대로 이어가되, 오후에 짧게 한 번 몸을 풀어 두면 더 오래 갑니다.";
  }
  return evening
    ? "무난한 하루예요. 퇴근 전 몸풀기 하나만 더하면 오늘은 충분합니다."
    : "무난한 하루예요. 오후에 1분만 몸을 풀어 두면 저녁이 조금 가벼워져요.";
}

export interface Directing {
  weight: "heavy" | "light" | "neutral";
  top: Tone[];
  text: string;
}

/** picks 는 고른 순서대로 6개(부족해도 동작 — 있는 만큼으로 씀) */
export function directing(picks: Tone[], body: Level | null, slot: number): Directing {
  const t = tally(picks);
  const r = ranked(t);
  const weight = pickWeight(picks);
  const parts: string[] = [];
  if (r.length === 0) return { weight, top: [], text: "" };
  const spread = r.length >= 4 && t[r[0]] <= 2;
  if (spread) parts.push(MIXED);
  else {
    parts.push(OPENING[r[0]]);
    if (r[1] && t[r[1]] >= 1 && r[1] !== r[0]) parts.push(SECOND[r[1]]);
  }
  parts.push(closing(weight, body, slot));
  return { weight, top: r.slice(0, 2), text: parts.join(" ") };
}
