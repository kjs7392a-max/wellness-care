import type { Read } from "./needs";
import type { Quadrant } from "./sam";

/**
 * 「오늘 해볼 것」 셋 — 2026-10-24 사용자 지시: 이런 테스트는 성향(MBTI)을 따라가면 안 된다. 성향은 잘 안 변해 같은 말이 매일 나오고,
 * 같은 사람이 다시 해도 결과가 달라지는 비판이 있어 **오늘의 상태**를 다루는 데 맞지 않는다.
 * → 유형 없이 열리고, 오늘 마음카드(기분×긴장 사분면 + 그림·색이 가리키는 방향 needs.ts)로 셋을 고른다. 같은 상태라도 날짜(seed)마다 다르다.
 * 마음카드를 안 했으면 「NONE」 풀(누구에게나 무난한 작은 것).
 * 규칙: 톤(calm 차분 · move 움직임 · connect 사람 · mind 적어 두기)을 방향에 맞춰 고르고, 톤마다 한 가지씩 — 셋이 서로 다른 결이 된다.
 * 순수 · 테스트 todo.test.ts · 진단·치료 말투 금지(작은 일상 행동만).
 */
export type Tone = "calm" | "move" | "connect" | "mind";
export interface TodoItem { title: string; why: string; tone: Tone }
export type PoolKey = Quadrant | "NONE";

const t = (tone: Tone, title: string, why: string): TodoItem => ({ tone, title, why });

export const TODO_POOL: Record<PoolKey, readonly TodoItem[]> = {
  HP: [
    t("calm", "힘이 올라온 만큼 숨 한 번 고르기", "에너지가 높을 땐 쉬는 타이밍을 놓치기 쉬워요."),
    t("calm", "물 한 잔 천천히 마시기", "달아오른 몸에 잠깐 쉼표를 줘요."),
    t("move", "복도 한 바퀴 가볍게 걷기", "남는 힘을 쓰면 저녁까지 이어져요."),
    t("move", "계단 한 층 걸어 오르기", "짧게 힘을 쓰면 좋은 흐름이 오래 가요."),
    t("connect", "고마운 사람에게 한마디 보내기", "좋은 기분은 나눌 때 더 오래 가요."),
    t("mind", "오늘 잘된 일 한 줄 적기", "좋은 날을 적어 두면 힘든 날의 기준이 돼요."),
  ],
  LP: [
    t("calm", "지금의 여유 3분 그냥 누리기", "애쓰지 않아도 되는 시간이에요."),
    t("calm", "창밖을 한 번 오래 바라보기", "잔잔한 날엔 천천히 보는 게 쉼이에요."),
    t("move", "스트레칭 1분", "굳기 쉬운 곳을 미리 풀어 두면 저녁이 가벼워요."),
    t("move", "한 정거장 먼저 내려 걷기", "무리 없는 움직임이 이 흐름을 지켜 줘요."),
    t("connect", "오랜만에 안부 하나 보내기", "여유 있을 때 하는 안부가 가장 편해요."),
    t("mind", "지금 상태 한 줄 적어 두기", "나중에 돌아볼 기준이 생겨요."),
  ],
  HN: [
    t("calm", "4초 들이쉬고 8초 내쉬기 세 번", "긴 날숨이 몸의 긴장을 먼저 풀어 줘요."),
    t("calm", "어깨와 턱의 힘 빼 보기", "긴장은 어깨와 턱에 먼저 쌓여요."),
    t("move", "자리에서 일어나 1분 걷기", "몸을 움직이면 같은 생각의 반복이 끊겨요."),
    t("move", "찬물에 손 씻기", "감각이 바뀌면 긴장이 한 박자 내려가요."),
    t("connect", "믿는 사람에게 지금 상태 한 줄 털어놓기", "혼자 안고 있으면 더 커지기 쉬워요."),
    t("mind", "걱정 세 가지를 종이에 적어 접어 두기", "밖에 꺼내 두면 머릿속이 덜 복잡해져요."),
  ],
  LN: [
    t("calm", "따뜻한 물 한 잔 천천히 마시기", "몸이 따뜻해지면 마음도 조금 풀려요."),
    t("calm", "눈을 감고 1분 가만히 있기", "아무것도 안 하는 시간도 회복이에요."),
    t("move", "자리에서 1분 기지개 켜기", "아주 작은 움직임이 시동이 돼요."),
    t("move", "창문을 열고 바람 쐬기", "환기만으로도 처진 기분이 조금 올라와요."),
    t("connect", "편한 사람에게 이모티콘 하나 보내기", "말이 없어도 닿는 연결이 있어요."),
    t("mind", "오늘 한 일 중 가장 작은 것 하나 적기", "작은 것도 분명히 한 일이에요."),
  ],
  NONE: [
    t("calm", "숨 고르기 1분", "잠깐 멈추면 하루의 속도가 한 번 내려가요."),
    t("calm", "물 한 잔 천천히 마시기", "작은 쉼표가 오후를 가볍게 해요."),
    t("move", "자리에서 1분 기지개 켜기", "굳은 몸을 풀면 기분도 따라와요."),
    t("move", "잠깐 밖을 걷고 오기", "걷는 것만으로도 머리가 환기돼요."),
    t("connect", "안부 한마디 보내기", "짧은 연락이 하루를 따뜻하게 해요."),
    t("mind", "오늘 기분을 한 단어로 적기", "이름을 붙이면 마음이 조금 정리돼요."),
  ],
};

const DEFAULT_ORDER: Record<PoolKey, readonly Tone[]> = {
  HP: ["move", "connect", "mind"],
  LP: ["calm", "mind", "connect"],
  HN: ["calm", "move", "connect"],
  LN: ["move", "calm", "mind"],
  NONE: ["calm", "move", "mind"],
};

/** 방향(needs.ts Read)이 있으면 그쪽 톤을 앞에 둔다 — 차분을 찾으면 차분·적기·움직임, 활기를 찾으면 움직임·사람·적기, 두 갈래면 차분·움직임·적기. */
function order(key: PoolKey, read: Read | null): Tone[] {
  let o: Tone[];
  switch (read?.kind) {
    case "calm": o = ["calm", "mind", "move"]; break;
    case "energize": o = ["move", "connect", "mind"]; break;
    case "split": o = ["calm", "move", "mind"]; break;
    default: o = [...DEFAULT_ORDER[key]];
  }
  if (read?.social === "connect" && !o.includes("connect")) o[2] = "connect";
  if (read?.social === "solo") o = o.map((x) => (x === "connect" ? "calm" : x)).filter((x, i, a) => a.indexOf(x) === i);
  const fill: Tone[] = ["calm", "move", "mind", "connect"];
  for (const f of fill) if (o.length < 3 && !o.includes(f)) o.push(f);
  return o.slice(0, 3);
}

/** 오늘의 셋 — q 없음(마음카드 안 함) = NONE 풀. seed = 날짜(일 수). 같은 날 같은 답이면 같다. */
export function todoFor(q: Quadrant | null, read: Read | null, seed = 0): TodoItem[] {
  const key: PoolKey = q ?? "NONE";
  const pool = TODO_POOL[key];
  return order(key, read).map((tone, i) => {
    const items = pool.filter((x) => x.tone === tone);
    return items[Math.abs(Math.floor(seed) + i * 3 + (read ? Math.round((read.act + 1) * 5) : 0)) % items.length];
  });
}
