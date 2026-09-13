import { LEAD_IN, type Role } from "./data";

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
 * 🚫 low 일 때 걷기·산책·일어서기를 권하지 말 것 — `daySolution.test.ts` 가 36가지 조합을 전부 훑어 막는다.
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

function closing(a: DaySolutionArgs): string {
  const indoor = a.weatherPrefer === "indoor";
  if (a.isWeekend) {
    if (a.low) {
      return indoor
        ? "바깥은 " + a.feelsTxt + "라 무리해서 나가지 않으셔도 돼요. 앉은 자리에서 가볍게 풀어두는 것만으로 충분합니다."
        : "날이 좋지만 무리하지 않으셔도 돼요. 앉은 자리에서 숨만 천천히 고르셔도 충분합니다.";
    }
    return indoor
      ? "바깥은 " + a.feelsTxt + "라 무리한 외출은 권하지 않아요. 집에서 3분만 가볍게 풀어보는 건 어떨까요?"
      : "날이 좋으니 잠깐 바깥 공기를 쐬며 걸어보기에도 좋은 날이에요.";
  }
  if (a.slot === 2) {
    if (a.low) {
      return indoor
        ? "바깥은 " + a.feelsTxt + "라 나가시는 건 권하지 않아요. 퇴근 전에 자리에 앉은 그대로 어깨만 천천히 풀고 나가셔도 충분합니다."
        : "공기가 좋은 날이지만 무리하지 않으셔도 돼요. 퇴근 전에 앉은 그대로 어깨만 천천히 풀고 나가시면 충분합니다.";
    }
    return indoor
      ? "바깥은 " + a.feelsTxt + "라 나가시는 건 권하지 않아요. 대신 시원한 실내에서 3분만 풀어두시고, 걷고 싶으시면 해가 진 뒤가 좋겠어요."
      : "공기가 좋은 날이니 퇴근 전 복도 창가까지만 천천히 걸어보셔도 좋아요. 5분이면 충분합니다.";
  }
  if (a.low) {
    return indoor
      ? "바깥은 " + a.feelsTxt + "라 낮 외출은 권하지 않아요. 앉은 자리에서 3분이면 충분합니다."
      : "일어서지 않으셔도 돼요. 앉은 자리에서 숨만 천천히 고르시면 충분합니다.";
  }
  return indoor
    ? "바깥은 " + a.feelsTxt + "라 낮 외출은 권하지 않아요. 시원한 실내에서 3분이면 충분해요."
    : "공기가 좋으니 잠깐 창가나 복도에서 숨을 고르거나 짧게 걸어보셔도 좋아요.";
}

export function buildDaySolution(a: DaySolutionArgs): string {
  if (a.isWeekend) return WEEKEND_REST + closing(a);
  const body = (a.low ? BODY_LOW[a.role]?.[a.slot] : undefined) ?? BODY[a.role][a.slot];
  return LEAD_IN[a.slot] + " " + body + closing(a);
}
