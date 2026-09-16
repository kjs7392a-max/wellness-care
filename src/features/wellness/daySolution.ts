import { LEAD_IN, PARQ_CONSULT, PARQ_LOW_NOTICE, PARQ_REST_CONSULT, PARQ_REST_NOTICE, type Role } from "./data";
import type { SafetyTier } from "./safety-screen";

/**
 * 홈 「AI 오늘의 제안」 본문 한 단락.
 *
 * ★ 2026-09-13: 이 함수가 생기기 전까지 이 문구는 **PAR-Q+ 답을 전혀 보지 않았다.**
 *   그래서 「예」를 답해 「앉은 자리에서 하는 낮은 강도만 제안해 드립니다」라고 약속받은 분이
 *   같은 화면에서 "퇴근 전 복도 창가까지만 천천히 걸어보셔도 좋아요" 를 읽고 있었다
 *   (제안 **항목**·라이브러리는 이미 낮은 강도로 걸러지고 있었는데 본문만 빠져 있었다).
 *   화면이 스스로를 뒤집는 자리라, 화면 안에 두지 않고 순수 함수로 빼서 테스트로 못박는다
 *   — 이 저장소엔 jsdom 이 없어 JSX 안에 있는 한 영원히 미검증이다.
 *
 * 🚫 **어느 강도에서도 걷기·산책을 권하지 말 것** — 이 문구 바로 아래 버튼이 늘 「몸풀기(스트레칭)」라서,
 *    본문이 걷기를 권하면 한 카드 안에서 서로 다른 말을 하게 된다(2026-09-13 사용자 지적).
 * 🚫 **1분 말고 다른 시간을 말하지 말 것** — 한 편은 1분이고 영상도 1분에서 멈춘다(2026-09-12 사용자 확정).
 *    그 전까지 "3분만"·"5분이면 충분합니다"가 남아 있었다.
 * 🚫 low 일 때 일어서기를 권하지 말 것.
 *    셋 다 `daySolution.test.ts` 가 36가지 조합을 전부 훑어 막는다.
 */
export interface DaySolutionArgs {
  role: Role;
  /** 0=아침(11시 전) · 1=낮(15시 전) · 2=퇴근 전 */
  slot: number;
  isWeekend: boolean;
  /** PAR-Q+ 에 하나라도 「예」가 있으면 true = 낮은 강도만 권한다. */
  low: boolean;
  weatherPrefer: "indoor" | "outdoor";
  /** "체감 25° · 산책하기 좋은 날" 같은 체감 문구. */
  feelsTxt: string;
}

/** 평일 시간대별 본문(추정형) — 걸음·활동 수치가 아직 목업이라 단정("~했어요") 대신 추정("~기 쉬워요"). */
const BODY: Record<Role, string[]> = {
  teacher: [
    "수업이 시작되기 전에 목·어깨를 미리 풀어두면 하루가 한결 수월해요. ",
    "오전 수업으로 목과 어깨가 뭉치기 쉬운 시간대예요. 점심 전후로 잠깐 풀어볼까요. ",
    "오후엔 오래 서 계셨을 시간대라 어깨가 굳기 쉬워요. ",
  ],
  admin: [
    "오전 화면 작업이 길어지기 쉬운 시간대예요. 시작 전에 눈과 손목을 잠깐 풀어두면 좋아요. ",
    "오전 내내 앉아 계시기 쉬운 시간대예요. 점심 전후로 잠깐 일어나 몸을 풀어볼까요. ",
    "오늘은 자리에 앉아 계신 시간이 길기 쉬운 하루죠. 걸음도 평소보다 적기 쉬워요. ",
  ],
  care: [
    "오전 준비로 분주하기 쉬운 시간대예요. 시작 전에 손목과 다리를 가볍게 풀어두면 좋아요. ",
    "오전 입식 근무로 다리가 뻐근하기 쉬운 시간대예요. 잠깐 앉아 풀어볼까요. ",
    "오래 서서 일하신 시간대라 다리가 뻐근하기 쉬워요. ",
  ],
};

/**
 * 낮은 강도일 때만 갈아 끼우는 본문. **다른 것과 달라야 하는 칸만** 적는다 —
 * 전부 베껴 두면 한쪽만 고쳐지는 날이 온다. 빠뜨린 것은 가드 테스트가 잡는다.
 */
const BODY_LOW: Partial<Record<Role, Record<number, string>>> = {
  // 유일하게 "일어나" 를 권하던 칸.
  admin: { 1: "오전 내내 앉아 계시기 쉬운 시간대예요. 점심 전후로 앉은 자리에서 잠깐 풀어볼까요. " },
};

const WEEKEND_REST = "오늘은 쉬는 날이네요. 학교 일은 잠시 내려놓으셔도 돼요. 몸이 뻐근하면 그때 잠깐만 움직여도 충분해요. ";

/**
 * 마무리 문장 — **직군을 인자로 받지 않는다.** 세 직군이 같은 문장을 쓰므로
 * 여기서 부위(어깨·허리·다리…)를 말하면 어느 직군에선 반드시 틀린 말이 된다.
 * ⚠ 2026-09-13: 저강도 문구를 "어깨만 천천히 풀고"로 써 놨다가, 시간대 고정으로 행정(허리)·영양(다리) 제안이
 *    같은 문장을 받으면서 드러났다. `daySolution.test.ts` 의 「마무리 문장은 부위를 말하지 않는다」가 막는다.
 */
function closing(a: DaySolutionArgs): string {
  const indoor = a.weatherPrefer === "indoor";
  if (a.isWeekend) {
    if (a.low) {
      return indoor
        ? "바깥은 " + a.feelsTxt + "라 무리해서 나가지 않으셔도 돼요. 앉은 자리에서 가볍게 풀어두는 것만으로 충분합니다."
        : "날이 좋지만 무리하지 않으셔도 돼요. 앉은 자리에서 숨만 천천히 고르셔도 충분합니다.";
    }
    return indoor
      ? "바깥은 " + a.feelsTxt + "라 무리한 외출은 권하지 않아요. 집에서 1분만 가볍게 풀어보는 건 어떨까요?"
      : "날이 좋은 날이에요. 그래도 오늘은 1분만 가볍게 풀고 쉬어가셔도 충분합니다.";
  }
  if (a.slot === 2) {
    if (a.low) {
      return indoor
        ? "바깥은 " + a.feelsTxt + "라 나가시는 건 권하지 않아요. 퇴근 전에 자리에 앉은 그대로 가볍게 풀고 나가셔도 충분합니다."
        : "공기가 좋은 날이지만 무리하지 않으셔도 돼요. 퇴근 전에 앉은 그대로 천천히 풀고 나가시면 충분합니다.";
    }
    return indoor
      ? "바깥은 " + a.feelsTxt + "라 나가시는 건 권하지 않아요. 대신 시원한 실내에서 1분만 풀고 나가시면 충분합니다."
      : "공기가 좋은 날이에요. 그래도 퇴근 전 1분만 풀고 나가시면 오늘 몫은 충분합니다.";
  }
  if (a.low) {
    return indoor
      ? "바깥은 " + a.feelsTxt + "라 낮 외출은 권하지 않아요. 앉은 자리에서 1분이면 충분합니다."
      : "일어서지 않으셔도 돼요. 앉은 자리에서 숨만 천천히 고르시면 충분합니다.";
  }
  return indoor
    ? "바깥은 " + a.feelsTxt + "라 낮 외출은 권하지 않아요. 시원한 실내에서 1분이면 충분해요."
    : "공기가 좋은 날이에요. 잠깐 창가에서 1분만 풀어보셔도 좋아요.";
}

export function buildDaySolution(a: DaySolutionArgs): string {
  if (a.isWeekend) return WEEKEND_REST + closing(a);
  const body = (a.low ? BODY_LOW[a.role]?.[a.slot] : undefined) ?? BODY[a.role][a.slot];
  return LEAD_IN[a.slot] + " " + body + closing(a);
}

/**
 * PAR-Q+ 결과 안내 — 「예」가 하나라도 있으면 홈에 **상시로** 붙는다(null 이면 안 그린다).
 *
 * 단계는 `safetyTier`(safety-screen.ts) 한 곳에서 정한다(2026-09-16: 개수 → 문항 성격) — 1단계는 강도를 낮추고, 2단계는 **내놓는 것 자체를 숨 고르기로 바꾼다.**
 * 여기는 이미 정해진 단계를 받는다 — 개수를 받아 다시 계산하지 않는다.
 * 🚫 문항별 가중은 아직 없다(심장 「예」와 관절 「예」가 같은 무게) — 문턱과 함께 임상 감수 몫.
 */
export function parqNotice(tier: SafetyTier): string | null {
  if (tier === 0) return null;
  if (tier === 2) return PARQ_REST_NOTICE + " " + PARQ_REST_CONSULT;
  return PARQ_LOW_NOTICE + " " + PARQ_CONSULT;
}
