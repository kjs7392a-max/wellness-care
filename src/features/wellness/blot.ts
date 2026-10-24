import type { Quadrant } from "./sam";

/**
 * 「오늘의 마음카드」 얼룩 둘 — 2026-10-24 사용자 지시: 마음그림은 기분·긴장 둘만 묻고(sam.ts), 그 뒤에 색 있는 얼룩 둘을 보여 준다.
 * 이미 아는 상태(기분×긴장 사분면)에 얼룩 답을 접목해 피드백에 녹인다. 로르샤흐처럼 호기심을 끌되 **점수·진단 없음** —
 * 문장은 전부 「~일 수 있어요」로 열어 둔다. 얼룩은 직접 만든 것(원본 도판 아님) · 보기의 뜻은 그림이 아니라 보기 글자에 붙어 있다
 * (어떤 얼룩이 나와도 해석은 같다 — 그래서 얼룩은 매번 무작위로 돌려도 된다). 순수 · 테스트 blot.test.ts
 */
export const BLOT_COUNT = 12;
export const BLOT_STEPS = 2;

export interface BlotChoice { id: number; label: string; theme: string }
/** 보기 다섯 — 어느 것도 좋고 나쁨이 없다. id 는 상태 저장용(−1 = 건너뛰기 · 문장 없음). */
export const BLOT_CHOICES: readonly BlotChoice[] = [
  { id: 0, label: "마주 보는 두 사람", theme: "connect" },
  { id: 1, label: "날개를 편 새", theme: "release" },
  { id: 2, label: "가면", theme: "guard" },
  { id: 3, label: "나무와 숲", theme: "shelter" },
  { id: 4, label: "번지는 불꽃", theme: "fire" },
];
export const BLOT_UNSURE = -1;

/** 인터넷 재미 테스트 말투의 질문 — 두 번 나오는 얼룩에 서로 다른 문구를 붙인다. */
export const BLOT_QUESTIONS: readonly string[] = [
  "이 그림을 보고 제일 먼저 떠오르는 건?",
  "눈을 가늘게 뜨고 보면 뭐가 보이나요?",
  "이 그림 속에 숨은 건?",
];

/** 이번 카드에 쓸 얼룩 둘(서로 다른 그림 · 직전 카드의 첫 장은 피한다) + 질문 문구 둘(서로 다름). rnd 는 테스트용 주입(0 이상 1 미만). */
export interface BlotDeal { images: [number, number]; questions: [number, number] }
export function dealBlots(prevFirst: number | null = null, rnd: () => number = Math.random): BlotDeal {
  const pick = (n: number, not: number[]) => { let v = Math.floor(rnd() * n); while (not.includes(v)) v = (v + 1) % n; return v; };
  const a = pick(BLOT_COUNT, prevFirst === null ? [] : [prevFirst - 1]);
  const b = pick(BLOT_COUNT, [a]);
  const qa = pick(BLOT_QUESTIONS.length, []);
  const qb = pick(BLOT_QUESTIONS.length, [qa]);
  return { images: [a + 1, b + 1], questions: [qa, qb] };
}
export const INITIAL_BLOT_DEAL: BlotDeal = { images: [1, 2], questions: [0, 1] };

/** 「얼룩에서 떠올린 걸 보면 」 뒤에 이어지는 한 덩어리 — 보기 × 사분면. 보기 이름은 되풀이하지 않는다(화면에 고른 줄이 이미 남아 있다). */
const LINE: Record<number, Record<Quadrant, string>> = {
  0: {
    HP: "오늘은 이 힘을 함께 나눌 사람이 떠오르는 날일 수 있어요.",
    LP: "여유가 있는 만큼 사람 곁에서 시간을 보내고 싶은 마음이 있을 수 있어요.",
    HN: "혼자 안고 있던 걸 누군가에게 꺼내 놓고 싶은 마음일 수 있어요.",
    LN: "곁에 있어 줄 사람이 그리운 날일 수 있어요.",
  },
  1: {
    HP: "에너지가 뻗어 나갈 곳을 찾고 있는 마음일 수 있어요.",
    LP: "마음이 한결 가벼워져 있다는 느낌이 보이기도 해요.",
    HN: "지금 상황에서 잠깐 벗어나고 싶은 마음일 수 있어요.",
    LN: "무거운 것을 잠시 내려놓고 가벼워지고 싶은 마음일 수 있어요.",
  },
  2: {
    HP: "밖에 보이는 모습 뒤에 아직 말하지 않은 마음이 있을 수 있어요.",
    LP: "사람들 앞의 나와 혼자 있을 때의 나를 나눠 두고 싶은 마음일 수 있어요.",
    HN: "속을 드러내지 않고 버티는 데 힘을 쓰고 있을 수 있어요.",
    LN: "괜찮은 척하는 데 힘을 많이 쓰고 있을 수 있어요. 오늘은 그 힘을 아껴도 돼요.",
  },
  3: {
    HP: "힘이 넘치는 가운데서도 마음 한쪽은 쉴 곳을 찾고 있을 수 있어요.",
    LP: "지금의 고요함이 마음에 잘 맞는 날일 수 있어요. 잠시 누려도 좋아요.",
    HN: "조용히 몸을 숨길 곳이 필요한 마음일 수 있어요.",
    LN: "아무것도 하지 않고 기댈 곳이 필요한 마음일 수 있어요.",
  },
  4: {
    HP: "에너지가 열기로 느껴지는 날일 수 있어요.",
    LP: "편안한 가운데에도 하고 싶은 일이 은근히 마음에 남아 있을 수 있어요.",
    HN: "쌓인 열기를 어딘가로 내보내고 싶은 마음일 수 있어요.",
    LN: "지쳐 있어도 완전히 꺼지지 않은 힘이 남아 있을 수 있어요.",
  },
};

const LEAD = "얼룩에서 떠올린 걸 보면";

/** 보기 하나 + 이미 아는 사분면 → 이어 붙는 한 덩어리. 건너뛰기·없음 = null. */
export function blotClause(choice: number | null | undefined, q: Quadrant): string | null {
  if (choice === null || choice === undefined || choice === BLOT_UNSURE) return null;
  return LINE[choice]?.[q] ?? null;
}

/**
 * 두 답 → 피드백에 붙일 글 하나. 같은 보기를 두 번 골랐으면 한 번만, 서로 다르면 「또」로 잇는다. 둘 다 건너뛰면 null.
 * (문단을 나누지 않는다 — sam.ts directing 의 약속.)
 */
export function blotText(blots: readonly (number | null)[] | undefined, q: Quadrant): string | null {
  const parts: string[] = [];
  for (const b of blots ?? []) {
    const c = blotClause(b, q);
    if (c && !parts.includes(c)) parts.push(c);
  }
  return parts.length ? `${LEAD} ${parts.join(" 또 ")}` : null;
}
