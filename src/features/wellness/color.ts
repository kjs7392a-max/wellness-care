import type { Quadrant } from "./sam";

/**
 * 「오늘의 마음카드」 색 고르기 — 2026-10-24 사용자 지시: 얼룩은 한 장만 하고 「지금 끌리는 색」을 넣는다.
 * 이미 아는 상태(기분×긴장 사분면)에 끌린 색을 접목해 피드백에 한 덩어리로 녹는다. 재미로 보는 마음 거울 —
 * 색으로 성격·상태를 읽는다는 근거는 약하므로 **점수·진단 없음**, 문장은 전부 「~일 수 있어요」로 열어 둔다.
 * 순수 · 테스트 color.test.ts
 */
export interface ColorChoice { id: number; label: string; hex: string; theme: string }
/** 색 여섯 — 어느 것도 좋고 나쁨이 없다. id 는 상태 저장용(−1 = 건너뛰기 · 문장 없음). */
export const COLOR_CHOICES: readonly ColorChoice[] = [
  { id: 0, label: "빨강", hex: "#e5675f", theme: "red" },
  { id: 1, label: "주황", hex: "#f0a05a", theme: "orange" },
  { id: 2, label: "노랑", hex: "#f2d15c", theme: "yellow" },
  { id: 3, label: "초록", hex: "#6fbf8e", theme: "green" },
  { id: 4, label: "파랑", hex: "#5b9bd5", theme: "blue" },
  { id: 5, label: "보라", hex: "#9a82d0", theme: "purple" },
];
export const COLOR_SKIP = -1;
export const COLOR_QUESTION = "지금 마음이 끌리는 색은?";

/** 「끌리는 색을 보면 」 뒤에 이어지는 한 덩어리 — 색 × 사분면. */
const LINE: Record<number, Record<Quadrant, string>> = {
  0: {
    HP: "힘을 쓰고 싶은 마음이 크게 올라와 있을 수 있어요.",
    LP: "여유 속에서도 뭔가 해 보고 싶은 불씨가 있을 수 있어요.",
    HN: "쌓인 답답함을 어딘가로 터뜨리고 싶은 마음일 수 있어요.",
    LN: "지친 가운데에도 다시 힘을 내고 싶은 마음이 남아 있을 수 있어요.",
  },
  1: {
    HP: "올라온 에너지를 사람들과 나누고 싶은 마음일 수 있어요.",
    LP: "따뜻하고 활기찬 시간을 바라는 마음일 수 있어요.",
    HN: "긴장을 풀어 줄 따뜻한 무언가가 필요한 마음일 수 있어요.",
    LN: "기운을 북돋아 줄 따뜻한 한마디가 반가운 날일 수 있어요.",
  },
  2: {
    HP: "기분 좋은 흐름을 더 이어 가고 싶은 마음일 수 있어요.",
    LP: "작은 기쁨을 찾고 싶은 마음일 수 있어요.",
    HN: "밝은 쪽으로 시선을 돌리고 싶은 마음일 수 있어요.",
    LN: "작은 희망 하나를 붙잡고 싶은 마음일 수 있어요.",
  },
  3: {
    HP: "들뜬 힘을 차분히 가라앉혀 균형을 잡고 싶은 마음일 수 있어요.",
    LP: "지금의 안정을 오래 지키고 싶은 마음일 수 있어요.",
    HN: "숨을 고르고 몸을 안정시키고 싶은 마음일 수 있어요.",
    LN: "천천히 회복할 시간이 필요한 마음일 수 있어요.",
  },
  4: {
    HP: "들뜬 마음을 차분히 식히고 싶은 마음일 수 있어요.",
    LP: "고요 속에서 생각을 정리하고 싶은 마음일 수 있어요.",
    HN: "복잡한 머릿속을 식히고 싶은 마음일 수 있어요.",
    LN: "아무 방해 없이 조용히 쉬고 싶은 마음일 수 있어요.",
  },
  5: {
    HP: "상상하고 만들어 내고 싶은 마음이 올라와 있을 수 있어요.",
    LP: "나만의 시간 속에서 감성에 젖고 싶은 마음일 수 있어요.",
    HN: "복잡한 감정을 말로 풀어내고 싶은 마음일 수 있어요.",
    LN: "감성이 예민해져 위로가 필요한 마음일 수 있어요.",
  },
};

const LEAD = "끌리는 색을 보면";

/** 색 하나 + 이미 아는 사분면 → 리드 없는 덩어리(요약 한 줄용). 건너뛰기·없음 = null. */
export function colorClause(choice: number | null | undefined, q: Quadrant): string | null {
  if (choice === null || choice === undefined || choice === COLOR_SKIP) return null;
  return LINE[choice]?.[q] ?? null;
}

/** 색 하나 + 이미 아는 사분면 → 피드백에 붙일 글 하나. 건너뛰기·없음 = null. */
export function colorText(choice: number | null | undefined, q: Quadrant): string | null {
  if (choice === null || choice === undefined || choice === COLOR_SKIP) return null;
  const c = LINE[choice]?.[q];
  return c ? `${LEAD} ${c}` : null;
}
