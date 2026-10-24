import { BLOT_UNSURE } from "./blot";
import { COLOR_SKIP } from "./color";
import type { SamScore } from "./sam";

/**
 * 선택 조합 → 피드백 계산 — 2026-10-24 사용자 지시: 「이미지를 고르는 문항의 수와 조합을 계산해서 신빙성 있는 피드백」.
 *
 * 근거를 두 층으로 나눈다(화면 안내에도 그대로 적는다):
 *   ① 기분·긴장(SAM · Russell 정서 원형) = 검증된 척도 → 상태 문장(sam.ts)
 *   ② 얼룩·색 = 재미 요소. 색·모양으로 성격을 읽는다는 근거는 약하므로 **무슨 뜻인지 풀이하지 않고**,
 *      끌린 방향 두 가지(차분 ↔ 활기 · 혼자 ↔ 사람)만 계산한다. 사람은 기분을 조절하려고 자극을 고른다는
 *      기분 관리 이론(Zillmann 1988)에 기대어, 「지금 상태에서 어느 쪽으로 가고 싶은가」를 현재 긴장과 비교한다.
 * 계산(순수 · 테스트 needs.test.ts):
 *   act(−1 차분 … +1 활기) · soc(−1 혼자 … +1 사람) 를 얼룩·색마다 한 쌍씩 두고, 고른 것들의 평균을 낸다.
 *   현재 긴장(1~5 → −1~+1)과의 차이가 크면 「차분을 찾는 중 / 활기를 찾는 중」, 작으면 「지금 상태와 같은 결」.
 *   얼룩과 색이 서로 반대쪽을 가리키면 「두 갈래」. 둘 다 건너뛰면 아무 줄도 만들지 않는다.
 */
export interface Dir { act: number; soc: number }

/** 얼룩 보기(blot.ts BLOT_CHOICES id 순서) */
export const BLOT_DIR: Record<number, Dir> = {
  0: { act: 0.2, soc: 1 },    // 따뜻하고 가까운
  1: { act: 0.5, soc: 0 },    // 자유롭고 가벼운
  2: { act: -0.3, soc: -1 },  // 조심스럽고 숨고 싶은
  3: { act: -1, soc: -0.3 },  // 고요하고 포근한
  4: { act: 1, soc: 0.3 },    // 뜨겁고 힘이 솟는
};
/** 색(color.ts COLOR_CHOICES id 순서) */
export const COLOR_DIR: Record<number, Dir> = {
  0: { act: 1, soc: 0.2 },    // 빨강
  1: { act: 0.6, soc: 0.8 },  // 주황
  2: { act: 0.5, soc: 0.4 },  // 노랑
  3: { act: -0.6, soc: 0 },   // 초록
  4: { act: -1, soc: -0.3 },  // 파랑
  5: { act: -0.2, soc: -0.5 },// 보라
};

export type Kind = "none" | "calm" | "energize" | "steady" | "split";
export type Social = "none" | "connect" | "solo";
export interface Read {
  kind: Kind;
  social: Social;
  /** 어떤 선택이 계산에 들어갔나 */
  from: "none" | "blot" | "color" | "both";
  /** 평균 방향(디버그·테스트용) */
  act: number;
  soc: number;
  /** 현재 긴장 −1~+1 */
  state: number;
}

const GAP = 0.6;      // 현재 긴장과의 차이가 이 이상이면 방향이 있다
const SPLIT = 1.0;    // 얼룩·색의 act 차이가 이 이상이면 두 갈래
const SOC_MIN = 0.5;  // 사람/혼자 쪽이 이 이상이면 말한다

const valid = (v: number | null | undefined, skip: number) => v !== null && v !== undefined && v !== skip;

export function readPicks(arousal: SamScore, blots: readonly (number | null)[] | undefined, color: number | null | undefined): Read {
  const state = (arousal - 3) / 2;
  const b = (blots ?? []).filter((x): x is number => valid(x, BLOT_UNSURE)).map((x) => BLOT_DIR[x]).filter(Boolean);
  const c = valid(color, COLOR_SKIP) ? COLOR_DIR[color as number] : undefined;
  const list = [...b, ...(c ? [c] : [])];
  if (!list.length) return { kind: "none", social: "none", from: "none", act: 0, soc: 0, state };
  const act = list.reduce((s, d) => s + d.act, 0) / list.length;
  const soc = list.reduce((s, d) => s + d.soc, 0) / list.length;
  const from = b.length && c ? "both" : b.length ? "blot" : "color";
  const split = b.length > 0 && !!c && Math.abs(b.reduce((s, d) => s + d.act, 0) / b.length - c.act) >= SPLIT && Math.sign(b[0].act) !== Math.sign(c.act);
  const gap = act - state;
  const kind: Kind = split ? "split" : gap <= -GAP ? "calm" : gap >= GAP ? "energize" : "steady";
  const social: Social = soc >= SOC_MIN ? "connect" : soc <= -SOC_MIN ? "solo" : "none";
  return { kind, social, from, act, soc, state };
}

const what = (from: Read["from"]) => (from === "both" ? "고른 그림과 색" : from === "blot" ? "고른 그림" : "고른 색");

/** 방향 줄 — 계산한 사실(무엇이 어느 쪽을 가리키나) + 현재 상태와 견준 풀이 한 덩어리. 풀이는 열어 둔다. */
export function needLine(r: Read, arousal: SamScore, pick = 0): string | null {
  if (r.kind === "none") return null;
  const hi = arousal >= 4, lo = arousal <= 2;
  const w = what(r.from);
  const tilt = r.from === "both" ? `${w}을 합치면` : `${w}은`;
  const same = r.from === "both" ? `${w}을 합쳐도` : `${w}도`;
  switch (r.kind) {
    case "calm":
      return [
        `${w}이 차분한 쪽을 가리켜요. ${hi ? "몸은 달아올랐는데 마음은 진정을 찾고 있는 것 같아요." : lo ? "이미 가라앉은 상태에서 더 깊이 쉬고 싶은 마음일 수 있어요." : "지금보다 한 단계 더 차분해지고 싶은 마음일 수 있어요."}`,
        `${tilt} 차분한 쪽으로 기울어요. ${hi ? "올라온 긴장을 내려놓고 싶은 마음일 수 있어요." : lo ? "쉬는 시간이 필요하다는 신호일 수 있어요." : "숨 돌릴 틈을 바라는 마음일 수 있어요."}`,
      ][pick % 2];
    case "energize":
      return [
        `${w}이 활기를 내는 쪽을 가리켜요. ${lo ? "가라앉은 상태에서 기운을 끌어올리고 싶은 마음일 수 있어요." : hi ? "이미 힘이 있는데 쓸 곳을 찾는 마음일 수 있어요." : "지금보다 조금 더 움직이고 싶은 마음일 수 있어요."}`,
        `${tilt} 활기 쪽으로 기울어요. ${lo ? "기운이 돌아오길 바라는 마음일 수 있어요." : hi ? "올라온 에너지를 어딘가에 쏟고 싶은 마음일 수 있어요." : "작게라도 움직여 보고 싶은 마음일 수 있어요."}`,
      ][pick % 2];
    case "steady":
      return [
        `${w}이 지금 상태와 비슷한 결이에요. 마음이 지금의 자리에 잘 맞춰져 있는 것 같아요.`,
        `${same} 지금 상태와 크게 다르지 않아요. 지금 흐름을 그대로 두어도 괜찮아 보여요.`,
      ][pick % 2];
    case "split":
      return [
        `${r.from === "both" ? "그림은 한쪽, 색은 반대쪽" : "고른 것들이 서로 다른 쪽"}을 가리켜요. 마음 안에 두 가지 바람이 함께 있을 수 있어요.`,
        `고른 그림과 색이 서로 다른 쪽이에요. 쉬고 싶은 마음과 움직이고 싶은 마음이 함께 있는 날일 수 있어요.`,
      ][pick % 2];
    default:
      return null;
  }
}

/** 사람/혼자 줄 — 뚜렷할 때만. */
export function socialLine(r: Read): string | null {
  if (r.social === "connect") return "사람 곁에 있고 싶은 마음도 함께 보여요.";
  if (r.social === "solo") return "혼자 있는 시간이 필요하다는 신호도 함께 보여요.";
  return null;
}

/** 방향이 있으면 방향에 맞춘 제안 후보 — 없으면(null) 상태(사분면) 제안을 쓴다. */
export function needAdvice(r: Read): readonly string[] | null {
  switch (r.kind) {
    case "calm": return ["숨을 천천히 길게 내쉬며 1분만 쉬어 보세요.", "조용한 곳에서 잠깐 눈을 감아 보세요.", "따뜻한 차 한 잔을 천천히 마셔 보세요."];
    case "energize": return ["가볍게 몸을 움직여 기운을 깨워 보세요.", "자리에서 1분 기지개를 켜 보세요.", "좋아하는 노래 한 곡 들으며 걸어 보세요."];
    case "split": return ["두 마음 중 지금 더 끌리는 쪽부터 5분만 해 보세요.", "쉬는 5분과 움직이는 5분을 하나씩 해 보세요."];
    default: return null;
  }
}
