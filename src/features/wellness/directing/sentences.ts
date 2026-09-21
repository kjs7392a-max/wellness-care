/**
 * 「마음과 닮은 문장」 — 마음온도(figma.site ver.1.2) 원본 x2/Eb 를 그대로(2026-09-21 사용자 지시 "그대로 옮겨줘").
 * 원본 입력 = 마음 상태(happy/calm/anxious/stressed) · 수면 시간 · 걸음 · 기분(1~10) · 점수(0~100).
 * 우리 앱엔 수면·걸음·점수 축이 없어(실측 — 마음카드 SAM 5축뿐) **오늘 마음카드의 기분·잠**으로 상태를 정하고, 나머지 축은 조건이
 * 안 걸리는 값으로 둔다(걸음 5000 · 점수 60). 마음카드를 안 했으면 calm 세트(사용자 확정 2026-09-21).
 * 순수 · 테스트 sentences.test.ts
 */
import type { SamAnswer } from "../sam";

export type MoodState = "happy" | "calm" | "anxious" | "stressed";
export interface SentenceInput { state: MoodState; sleepHours: number; steps: number; mood: number; score: number }

/** 원본 x2 — 문장 3개. 문장·순서·조건 그대로. */
export function sentencesFor(t: SentenceInput): string[] {
  const e = t.state, r = t.score;
  const n: string[] = [];
  if (e === "stressed" || e === "anxious") n.push(
    '"오늘 하루, 당신의 마음은 얼마나 애썼나요? 이제 그 마음에게 가장 따뜻한 이불을 덮어주세요."',
    '"당신이 짊어진 무게가 너무 무겁다면, 잠시 내려놓아도 괜찮습니다. 무게를 덜어내는 것도 용기입니다."',
    '"모든 구름 뒤에는 햇살이 숨어있듯, 당신의 오늘은 잠시 지나가는 날씨일 뿐입니다."',
  );
  else if (e === "calm") n.push(
    '"나를 아끼는 일은 가장 작은 순간부터 시작됩니다. 차 한 잔 마시는 시간, 조용히 숨 쉬는 시간."',
    '"때로는 멈춰 서서 스스로에게 물어봐야 합니다. 지금 이 길은, 내가 가고 싶은 길인가요?"',
    '"평온한 하루는 당신이 스스로를 돌보고 있다는 증거입니다. 이 균형을 소중히 여기세요."',
  );
  else if (e === "happy") n.push(
    '"좋은 날은 기억하고, 기록하고, 감사해야 합니다. 이 순간이 내일의 힘이 되니까요."',
    '"당신의 웃음이 만드는 작은 파동이 누군가에게는 큰 위로가 됩니다."',
    '"밝은 에너지는 나누면 나눌수록 더 커집니다. 오늘의 기쁨을 주변과 나눠보세요."',
  );
  if (t.sleepHours < 6 && n.length < 3) n.push('"잠은 마음의 빨래입니다. 오늘 밤만큼은 조금 일찍, 스스로에게 휴식을 선물하세요."');
  if (t.steps < 3e3 && n.length < 3) n.push('"움직임은 생각을 정리하는 가장 좋은 방법입니다. 짧은 산책이 복잡한 마음을 풀어줄 거예요."');
  if (r < 40 && n.length < 3) n.push(
    '"내일의 걱정은 내일에게 맡기고, 오늘은 오롯이 당신의 몫으로 남겨두세요."',
    '"완벽하지 않아도 괜찮아요. 불안은 당신이 더 나아지려고 노력하고 있다는 증거니까요."',
  );
  if (r >= 80 && n.length < 3) n.push('"당신의 마음속에 심은 좋은 생각 한 조각이 결국 가장 아름다운 숲을 이룰 것입니다."');
  if (t.mood <= 3 && n.length < 3) n.push('"어두운 밤이 가장 길게 느껴질 때, 새벽은 이미 가까이 와 있습니다. 조금만 더 견뎌요."');
  return n.slice(0, 3);
}

/**
 * 오늘 마음카드(SAM) → 원본 입력. 기분(valence 1~5) → mood 1~10(×2) · 잠(sleep 1~5) → 시간(3·5·7·8·9).
 * 상태 = 원본 Eb 의 축을 우리 값으로: 기분 ≤2 stressed · 3 calm · ≥4 happy. 마음카드가 없으면 calm(기분 6).
 */
export function sentenceInputFromSam(sam: SamAnswer | null): SentenceInput {
  const v = sam?.valence ?? null;
  const mood = v === null ? 6 : v * 2;
  const sleepHours = sam?.sleep ? [3, 5, 7, 8, 9][sam.sleep - 1] : 7;
  const state: MoodState = v === null ? "calm" : v <= 2 ? "stressed" : v === 3 ? "calm" : "happy";
  return { state, sleepHours, steps: 5000, mood, score: 60 };
}
