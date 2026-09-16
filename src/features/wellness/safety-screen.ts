/**
 * 안전 확인(사전운동 문진) — 문항과 판정. 순수 모듈(테스트 `safety-screen.test.ts`).
 *
 * 2026-09-16 사용자 확정: PAR-Q+ 문항은 **쓰지 않는다**(실측 — 한국어 공식판 없음 · 문항 수정 금지 · 앱 탑재는 서면 승인).
 *   대신 오리지널 PAR-Q+(2025판 4쪽을 실물로 읽음)의 **2단 논리**를 우리 문항으로 옮겼다:
 *     1단 = 「질환이 있는가 / 증상이 있는가」(오리지널 1쪽 7문항 → 우리 9문항)
 *     2단 = 「예」한 질환 묶음만 「지금 통제되는가」(오리지널 2·3쪽 10묶음 33문항 → 우리 6묶음 2~3문항)
 *   ★오리지널은 1단에 「예」가 있으면 **10묶음을 전부** 지나가며 묶음마다 「이 질환이 있나요」를 또 묻는다.
 *     우리는 1단 답이 곧 묶음 선택이라 해당 묶음만 띄운다(같은 정보를 두 번 안 묻는다).
 *   판정(오리지널 4쪽 그대로):
 *     1단 전부 아니오                    → 0 = 평소 강도(후속 안 뜸)
 *     질환 예 + 해당 후속 전부 아니오      → 1 = 낮은 강도(「천천히 낮은~중간 강도」)
 *     후속 하나라도 예                    → 2 = 숨 고르기만 + 「운동 전 주치의와 꼭 상의」(「ePARmed-X+·전문가 상담」)
 *     증상·의사 지시(symptom) 예          → 2 즉시, 후속 없음 — ⚠오리지널과 다른 한 곳. 오리지널은 증상만 있는 사람이
 *                                          「기타」 묶음까지 아니오면 낮은 강도로 통과하지만 ACSM 2015 는 증상을 의학적 확인
 *                                          대상으로 본다. 안전 쪽을 택했다(사용자 확정).
 *   🚫 화면·문항 어디에도 「PAR-Q+」·「캐나다운동생리학회」 이름을 쓰지 말 것(테스트가 막는다).
 *   🚫 「예 개수」로 갈랐던 09-13 방식으로 되돌리지 말 것 — 질환 둘이어도 후속이 전부 아니오면 1 이다.
 *
 * ⚠ 문항 문구와 판정 규칙은 정식 발매 전 운동처방 전문가 감수 대상이다.
 */
export type SafetyKind = "condition" | "symptom";
export type SafetyTier = 0 | 1 | 2;
/** 1단: 문항 번호(배열 인덱스) → 예/아니오. 아직 안 답한 문항은 키가 없다. */
export type SafetyAnswers = Record<number, boolean>;
/** 2단: `"<묶음>.<하위 인덱스>"` → 예/아니오. 안 뜬 묶음의 옛 답이 남아 있을 수 있다 — 판정은 뜬 묶음만 본다. */
export type FollowUpAnswers = Record<string, boolean>;

export const SAFETY_QUESTIONS: ReadonlyArray<{ text: string; kind: SafetyKind; group?: string }> = [
  { text: "심장 질환이나 고혈압 진단을 받은 적이 있나요?", kind: "condition", group: "heart" },
  { text: "뇌졸중(일과성 허혈 발작 포함)을 겪은 적이 있나요?", kind: "condition", group: "stroke" },
  { text: "천식·만성폐쇄성폐질환(COPD) 같은 호흡기 질환이 있나요?", kind: "condition", group: "resp" },
  { text: "당뇨(전당뇨 포함) 같은 대사질환이 있나요?", kind: "condition", group: "meta" },
  { text: "최근 12개월 안에, 움직이면 나빠질 수 있는 뼈·관절·허리 문제가 있었나요?", kind: "condition", group: "msk" },
  { text: "그 밖에 진단받은 만성 질환이 있거나 처방약을 복용 중인가요?", kind: "condition", group: "other" },
  { text: "쉬고 있을 때나 움직일 때 원인을 알 수 없는 가슴 통증이나 답답함을 느끼나요?", kind: "symptom" },
  { text: "최근 12개월 안에 어지러워 균형을 잃거나 정신을 잃은 적이 있나요?", kind: "symptom" },
  { text: "의사가 의료진의 관리 아래에서만 운동하라고 한 적이 있나요?", kind: "symptom" },
];

/** 2단 묶음 — 「그 질환이 지금 통제되는가」. 오리지널 하위 문항의 뜻을 2~3개로 압축(문구는 우리 것). */
export const FOLLOW_UPS: Readonly<Record<string, { title: string; items: ReadonlyArray<string> }>> = {
  heart: { title: "심장·혈압에 대해 조금 더", items: [
    "심장 질환이나 혈압이 약이나 치료로 조절이 잘 안 되나요?",
    "부정맥이나 심부전 진단을 받았나요?",
    "안정 시 혈압이 160/90 이상인가요? (모르시면 「예」)",
  ] },
  stroke: { title: "뇌졸중에 대해 조금 더", items: [
    "최근 6개월 안에 뇌졸중이 있었거나 신경 증상이 남아 있나요?",
    "걷거나 이동하는 데 불편이 있나요?",
  ] },
  resp: { title: "호흡기에 대해 조금 더", items: [
    "지난 한 주 동안 쌕쌕거림·가슴 조임이 있었거나 구조약을 2회 넘게 썼나요?",
    "안정 시 산소 수치가 낮다고 들었거나 산소 치료를 받나요?",
  ] },
  meta: { title: "혈당에 대해 조금 더", items: [
    "혈당 조절이 잘 안 되나요?",
    "운동 중이나 후에 저혈당 증상(떨림·식은땀·어지럼)이 있나요?",
    "눈·신장·발 감각 같은 합병증이 있나요?",
  ] },
  msk: { title: "뼈·관절·허리에 대해 조금 더", items: [
    "그 문제가 약이나 치료로 조절이 잘 안 되나요?",
    "최근 골절이 있었거나 통증이 심한 관절 문제가 있나요?",
    "스테로이드 약을 3개월 넘게 쓰고 있나요?",
  ] },
  other: { title: "그 밖의 상태에 대해 조금 더", items: [
    "최근 12개월 안에 머리를 다쳐 정신을 잃거나 뇌진탕 진단을 받았나요?",
    "질환이 둘 이상인가요?",
    "그 질환이 약이나 치료로 잘 조절되지 않나요?",
  ] },
};

/** 1단 답에서 띄워야 할 후속 묶음 — 1단 순서대로. */
export function followUpGroupsFor(a1: SafetyAnswers): string[] {
  const out: string[] = [];
  SAFETY_QUESTIONS.forEach((q, i) => { if (a1[i] && q.group && !out.includes(q.group)) out.push(q.group); });
  return out;
}

export function safetyTier(a1: SafetyAnswers, a2: FollowUpAnswers): SafetyTier {
  if (SAFETY_QUESTIONS.some((q, i) => q.kind === "symptom" && a1[i])) return 2;
  const groups = followUpGroupsFor(a1);
  if (groups.length === 0) return 0;
  for (const g of groups) if (FOLLOW_UPS[g].items.some((_, j) => a2[`${g}.${j}`])) return 2;
  return 1;
}

/** 1단 전부 + 띄운 후속 전부에 답했는가. 판정문·「다음」은 이때만 연다. */
export function safetyComplete(a1: SafetyAnswers, a2: FollowUpAnswers): boolean {
  if (SAFETY_QUESTIONS.some((_, i) => a1[i] === undefined)) return false;
  return followUpGroupsFor(a1).every((g) => FOLLOW_UPS[g].items.every((_, j) => a2[`${g}.${j}`] !== undefined));
}
