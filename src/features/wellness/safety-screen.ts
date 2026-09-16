/**
 * 안전 확인(사전운동 문진) — 문항과 판정. 순수 모듈(테스트 `safety-screen.test.ts`).
 *
 * 2026-09-16 사용자 확정: PAR-Q+ 를 **쓰지 않는다**(실측 — 한국어 공식판 없음 · 문항 수정 금지 · 앱 탑재는 서면 승인).
 *   대신 호주 ESSA·SMA·AUSactive 의 APSS v2(2019) 1단계 6문항을 뼈대로, ACSM 2015 사전참여 알고리즘의
 *   논리(징후·의사 지시 → 의학적 확인 권고 / 알려진 질환·무증상 → 가벼운 강도로 시작)를 판정에 썼다.
 *   🚫 화면·문항 어디에도 「PAR-Q+」·「캐나다운동생리학회」 이름을 쓰지 말 것(테스트가 막는다).
 *
 * 판정은 **개수를 세지 않는다.** 2026-09-13 까지의 「예 1~2개 → 낮은 강도, 3개 이상 → 숨 고르기」는
 *   PAR-Q+ 규칙도 APSS 규칙도 아니었고(주석에 "임상 감수 대상"이라 박혀 있던 임시값), 심장 「예」와 관절 「예」를
 *   같은 무게로 셌다. 지금은 문항의 **성격(kind)** 이 정한다:
 *     flag(징후·의사 지시) 하나라도 예 → 2 = 숨 고르기만 + 「운동 전 주치의와 꼭 상의」
 *     caution(근골격·기타 만성) 만 예     → 1 = 앉아서 하는 낮은 강도 + 「새 운동 전 한 번 상의」
 *     전부 아니오 / 미답                  → 0 = 평소 강도
 *   caution 이 둘이어도 1 이다(합산 없음). 문항을 더하거나 문구를 바꿔도 kind 만 맞으면 판정은 그대로다.
 *
 * ⚠ 문항 문구와 판정 규칙은 정식 발매 전 운동처방 전문가 감수 대상이다 — 무료 문진이라는 것과 우리 매핑이 맞다는 것은 다른 문제.
 */
export type SafetyKind = "flag" | "caution";
export type SafetyTier = 0 | 1 | 2;
/** 문항 번호(배열 인덱스) → 예(true)/아니오(false). 아직 안 답한 문항은 키가 없다. */
export type SafetyAnswers = Record<number, boolean>;

export const SAFETY_QUESTIONS: ReadonlyArray<{ text: string; kind: SafetyKind }> = [
  { text: "의사에게 심장 질환이 있다는 말을 들었거나, 뇌졸중을 겪은 적이 있나요?", kind: "flag" },          // APSS 1
  { text: "쉬고 있을 때나 움직일 때 원인을 알 수 없는 가슴 통증이나 답답함을 느낀 적이 있나요?", kind: "flag" }, // APSS 2
  { text: "움직일 때 어지럽거나 균형을 잃거나 정신을 잃은 적이 있나요?", kind: "flag" },                    // APSS 3
  { text: "최근 12개월 안에 응급 처치가 필요했던 천식 발작이 있었나요?", kind: "flag" },                    // APSS 4
  { text: "당뇨가 있고, 최근 3개월 동안 혈당 조절이 잘 안 됐나요?", kind: "flag" },                         // APSS 5
  { text: "의사가 의료진의 관리 아래에서만 운동하라고 한 적이 있나요?", kind: "flag" },                     // ACSM 의학적 확인
  { text: "움직이면 나빠질 수 있는 관절이나 허리 문제가 있나요?", kind: "caution" },                        // 근골격
  { text: "그 밖에 진단받은 만성 질환이나 복용 중인 처방약처럼, 운동할 때 고려해야 할 것이 있나요?", kind: "caution" }, // APSS 6
];

export function safetyTier(answers: SafetyAnswers): SafetyTier {
  let tier: SafetyTier = 0;
  SAFETY_QUESTIONS.forEach((q, i) => {
    if (!answers[i]) return;
    if (q.kind === "flag") tier = 2;
    else if (tier === 0) tier = 1;
  });
  return tier;
}
