/**
 * 마음 성향 테스트 — 문항·채점·16유형 원고. 순수 모듈(테스트 persona.test.ts).
 *
 * 근거(사용자 확정 2026-09-17 "근거가 있어야 … 엉터리라고 느끼는 순간 신뢰가 추락"):
 *   문항 = IPIP 50문항 Big-Five Factor Markers(Goldberg · 오리건연구소 · **공개 도메인**, 상업 이용·번역 허용)에서
 *          정서안정성 10문항을 뺀 **40문항**. 원문 번호를 `ipip` 에 남긴다(감수·대조용).
 *   축 대응 = McCrae & Costa(1989) — 외향성→E/I · 개방성(지성/상상)→N/S · 우호성→F/T · 성실성→J/P.
 *   채점 = 5점 척도(1 전혀 아니다 ~ 5 매우 그렇다) · 역채점(-)은 6-x · 축 합 10~50 · **31 이상이면 앞 글자**(E·N·F·J), 30 이하면 뒷글자.
 *   기울기 lean = (합-30)/20 → -1~1(막대로만 보여 준다 · 숫자·% 없음 — 앱 원칙).
 *
 * 🚫 화면·문구에 「MBTI」를 쓰지 않는다(등록상표). 「마음 성향 · 16가지」. 유형 코드(ISTJ 등)는 결과에 보여 준다.
 * 🚫 유형은 안전 확인·운동 제안·컨디션 판정에 들어가지 않는다 — 말투(마음카드 디렉팅 한 줄 · 대화)만 바꾼다.
 * 🚫 원고에 기전(호르몬·뇌)·예측(증폭·취약)·처방·권위(전문가 관점·연구·%) 문구 금지 — 테스트가 막는다.
 *
 * ⚠ 이 검사는 "재미로 보는 거울"이다. 결과 화면 고지(`PERSONA_NOTICE`)를 빼지 말 것.
 */
export type PersonaAxis = "E" | "N" | "F" | "J";
export type PersonaKeyed = "+" | "-";
/** 문항 번호(배열 인덱스) → 1~5. 안 답한 문항은 키가 없다. */
export type PersonaAnswers = Record<number, number>;

export const PERSONA_SCALE = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"] as const;

export const PERSONA_NOTICE = "성격 성향은 재미로 보는 거울이에요. 건강이나 치료를 판단하는 근거가 아닙니다.";
export const PERSONA_SOURCE = "문항은 공개 성격 문항 풀(IPIP)에서 가져왔고, 네 축의 대응은 Big Five–유형 대응 연구(McCrae & Costa, 1989)를 따랐습니다.";

/** IPIP 50 의 원문 순서 그대로(정서안정성 제외). 번역은 우리가 했다(IPIP 는 번역·수정을 허용). */
export const PERSONA_ITEMS: ReadonlyArray<{ ipip: number; text: string; axis: PersonaAxis; keyed: PersonaKeyed }> = [
  { ipip: 1, text: "모임에서 분위기를 이끄는 편이다", axis: "E", keyed: "+" },
  { ipip: 2, text: "다른 사람 일에 별로 신경 쓰지 않는다", axis: "F", keyed: "-" },
  { ipip: 3, text: "항상 준비되어 있다", axis: "J", keyed: "+" },
  { ipip: 5, text: "어휘가 풍부하다", axis: "N", keyed: "+" },
  { ipip: 6, text: "말을 많이 하지 않는다", axis: "E", keyed: "-" },
  { ipip: 7, text: "사람들에게 관심이 많다", axis: "F", keyed: "+" },
  { ipip: 8, text: "물건을 여기저기 놓아둔다", axis: "J", keyed: "-" },
  { ipip: 10, text: "추상적인 개념을 이해하기 어렵다", axis: "N", keyed: "-" },
  { ipip: 11, text: "사람들 사이에 있을 때 편안하다", axis: "E", keyed: "+" },
  { ipip: 12, text: "사람들에게 상처 주는 말을 하곤 한다", axis: "F", keyed: "-" },
  { ipip: 13, text: "세부 사항에 주의를 기울인다", axis: "J", keyed: "+" },
  { ipip: 15, text: "상상력이 풍부하다", axis: "N", keyed: "+" },
  { ipip: 16, text: "나서지 않고 뒤에 있는 편이다", axis: "E", keyed: "-" },
  { ipip: 17, text: "다른 사람의 감정에 공감한다", axis: "F", keyed: "+" },
  { ipip: 18, text: "일을 엉망으로 만들곤 한다", axis: "J", keyed: "-" },
  { ipip: 20, text: "추상적인 개념에 관심이 없다", axis: "N", keyed: "-" },
  { ipip: 21, text: "먼저 대화를 시작한다", axis: "E", keyed: "+" },
  { ipip: 22, text: "다른 사람의 문제에 관심이 없다", axis: "F", keyed: "-" },
  { ipip: 23, text: "해야 할 일을 바로 처리한다", axis: "J", keyed: "+" },
  { ipip: 25, text: "좋은 아이디어가 많다", axis: "N", keyed: "+" },
  { ipip: 26, text: "할 말이 별로 없는 편이다", axis: "E", keyed: "-" },
  { ipip: 27, text: "마음이 여린 편이다", axis: "F", keyed: "+" },
  { ipip: 28, text: "물건을 제자리에 두는 것을 자주 잊는다", axis: "J", keyed: "-" },
  { ipip: 30, text: "상상력이 부족한 편이다", axis: "N", keyed: "-" },
  { ipip: 31, text: "모임에서 여러 사람과 두루 이야기한다", axis: "E", keyed: "+" },
  { ipip: 32, text: "사실 다른 사람에게 별 관심이 없다", axis: "F", keyed: "-" },
  { ipip: 33, text: "정돈된 것을 좋아한다", axis: "J", keyed: "+" },
  { ipip: 35, text: "이해가 빠른 편이다", axis: "N", keyed: "+" },
  { ipip: 36, text: "눈에 띄는 것을 좋아하지 않는다", axis: "E", keyed: "-" },
  { ipip: 37, text: "다른 사람을 위해 시간을 낸다", axis: "F", keyed: "+" },
  { ipip: 38, text: "해야 할 일을 미루거나 피한다", axis: "J", keyed: "-" },
  { ipip: 40, text: "어려운 단어를 쓰는 편이다", axis: "N", keyed: "+" },
  { ipip: 41, text: "주목받는 것이 싫지 않다", axis: "E", keyed: "+" },
  { ipip: 42, text: "다른 사람의 감정이 느껴진다", axis: "F", keyed: "+" },
  { ipip: 43, text: "일정에 따라 움직인다", axis: "J", keyed: "+" },
  { ipip: 45, text: "생각에 잠기는 시간을 갖는다", axis: "N", keyed: "+" },
  { ipip: 46, text: "낯선 사람 앞에서는 조용해진다", axis: "E", keyed: "-" },
  { ipip: 47, text: "사람들을 편안하게 해 준다", axis: "F", keyed: "+" },
  { ipip: 48, text: "일을 꼼꼼하게 한다", axis: "J", keyed: "+" },
  { ipip: 50, text: "아이디어가 넘친다", axis: "N", keyed: "+" },
];

export interface PersonaResult {
  type: string;                        // 예 "ISTJ"
  lean: Record<PersonaAxis, number>;   // -1~1 · 양수면 앞 글자(E·N·F·J) 쪽
}

const LETTERS: Record<PersonaAxis, [string, string]> = { E: ["E", "I"], N: ["N", "S"], F: ["F", "T"], J: ["J", "P"] };
const ORDER: PersonaAxis[] = ["E", "N", "F", "J"]; // 코드 표기 순서 = E/I · S/N · T/F · J/P

export function personaResult(a: PersonaAnswers): PersonaResult | null {
  if (PERSONA_ITEMS.some((_, i) => a[i] === undefined)) return null;
  const sum: Record<PersonaAxis, number> = { E: 0, N: 0, F: 0, J: 0 };
  PERSONA_ITEMS.forEach((it, i) => { const x = a[i]; sum[it.axis] += it.keyed === "+" ? x : 6 - x; });
  const lean = { E: 0, N: 0, F: 0, J: 0 } as Record<PersonaAxis, number>;
  let type = "";
  for (const ax of ORDER) {
    lean[ax] = (sum[ax] - 30) / 20;
    type += sum[ax] >= 31 ? LETTERS[ax][0] : LETTERS[ax][1];
  }
  return { type, lean };
}

export interface PersonaType {
  name: string;      // 우리식 이름
  traits: string;    // 성향(묘사만)
  comfort: string;   // 위로 한 조각
  quote: string;     // 마음과 닮은 문장(자체 창작)
  books: [string, string];
  directing: string; // 마음카드 디렉팅 끝에 붙는 한 줄
  /** 「오늘 해볼 것」 3가지 — 제안이지 지시가 아니다(제목이 「~하세요」로 끝나지 않는다 · 테스트). why 는 이 성향에 왜 맞는지 한 줄. 2026-09-19. */
  todo: [PersonaTodo, PersonaTodo, PersonaTodo];
}
export interface PersonaTodo { title: string; why: string }

/** 16유형 원고 — docs/content/2026-09-17-persona-test.md 와 같은 내용(정본은 여기). */
export const PERSONA_TYPES: Readonly<Record<string, PersonaType>> = {
  ISTJ: { name: "든든한 기둥", traits: "맡은 일은 끝까지 지키는 편이에요. 정해진 절차와 약속이 있을 때 마음이 편하고, 갑작스러운 변경엔 먼저 불편함이 오죠. 말수는 적어도 교무실에서 \"그 선생님이 맡으면 된다\"는 신뢰를 받는 쪽입니다. 다만 잘 해낸 것을 스스로 당연하게 여겨 칭찬을 잘 못 받는 편이라면, 그것도 이 성향의 한 면이에요.", comfort: "오늘 지킨 것들은 작아 보여도 누군가에겐 그날의 안전이었어요. 그 일을 당연하게 넘기지 않아도 됩니다.", quote: "매일 같은 자리에 있어 주는 것도 하나의 재능이에요.", books: ["『스토너』 존 윌리엄스", "『불편한 편의점』 김호연"], directing: "오늘 지킨 것 하나를 적어 두는 것도 좋아요.", todo: [{ title: "오늘 끝낸 일 세 줄 적기", why: "정해진 것을 지켜 낸 하루를 눈으로 보면 스스로 인정하기가 쉬워져요." }, { title: "내일 일정 한 번 훑고 닫기", why: "미리 그려 두면 갑작스러운 변경에 덜 흔들려요." }, { title: "퇴근길 늘 가던 길 말고 한 블록 돌아가기", why: "작은 변화를 안전한 크기로 겪어 보는 연습이에요." }] },
  ISFJ: { name: "조용한 돌봄이", traits: "주변 사람의 작은 변화를 먼저 알아채는 편이에요. 부탁을 거절하기 어렵고, 챙기다 보면 정작 자기 몫은 뒤로 미루기 쉽죠. 교실에서는 조용히 뒤에서 아이들을 살피는 선생님으로 기억됩니다. 티 내지 않고 하는 일이 많다면, 그게 바로 이 성향이에요.", comfort: "챙겨 준 사람들이 기억하지 못해도, 그 돌봄은 없어지지 않았어요. 오늘은 자기 자신도 그 명단에 넣어 주세요.", quote: "남을 살피는 눈으로, 가끔은 나를 봐 주세요.", books: ["『긴긴밤』 루리", "『나는 나로 살기로 했다』 김수현"], directing: "오늘은 챙길 사람 명단에 자신도 넣어 보세요.", todo: [{ title: "오늘 챙긴 사람 옆에 내 이름 적기", why: "돌봄 명단에 자신을 넣는 연습이에요." }, { title: "부탁 하나에 「내일 답할게요」 해 보기", why: "바로 들어주지 않아도 관계가 무너지지 않는다는 걸 확인해요." }, { title: "따뜻한 것 한 잔 천천히 마시기", why: "누굴 위해서가 아니라 나를 위해 쓰는 10분이에요." }] },
  INFJ: { name: "깊은 등불", traits: "겉으로는 조용한데 속에서는 생각이 오래 이어지는 편이에요. 사람의 마음을 읽는 감이 있고, 그래서 남의 힘듦을 자기 것처럼 느끼기도 하죠. 의미 없는 일에는 힘이 안 나고, 의미가 있으면 오래 버팁니다. 혼자 있는 시간이 꼭 필요한 편이라면 맞을 거예요.", comfort: "다 이해하려 애쓰지 않아도 됩니다. 이해되지 않는 날도 그냥 지나가도 돼요.", quote: "깊이 느끼는 사람은 그만큼 깊이 쉬어야 해요.", books: ["『데미안』 헤르만 헤세", "『달러구트 꿈 백화점』 이미예"], directing: "오늘은 남의 마음보다 내 마음을 먼저 읽어 보셔도 돼요.", todo: [{ title: "하루 중 가장 오래 남은 생각 한 줄 적기", why: "속에서 이어지는 생각을 밖에 두면 밤이 가벼워져요." }, { title: "혼자 있는 15분 미리 확보하기", why: "혼자 있는 시간이 이 성향엔 충전이에요." }, { title: "남의 힘듦 대신 내 마음 먼저 한 번 묻기", why: "남을 읽는 감을 자신에게도 써 보는 거예요." }] },
  INTJ: { name: "조용한 설계자", traits: "큰 그림을 먼저 그리고 그에 맞춰 움직이는 편이에요. 비효율을 견디기 어렵고, 말보다 결과로 보여 주는 쪽이죠. 회의에서 말이 적어도 머릿속엔 이미 계획이 있습니다. 감정 표현이 서툴다는 말을 듣는다면, 표현이 없는 것이지 마음이 없는 건 아니에요.", comfort: "계획대로 안 된 날이 실패는 아니에요. 설계도는 고쳐 그리라고 있는 거니까요.", quote: "멀리 보는 눈도 가끔은 가까운 오늘에 쉬어야 해요.", books: ["『월든』 헨리 데이비드 소로", "『생각에 관한 생각』 대니얼 카너먼"], directing: "계획에서 벗어난 하루였다면, 그것도 설계의 일부로 두세요.", todo: [{ title: "계획에서 벗어난 일 하나 「예외」로 표시만 하기", why: "고치지 않고 두는 연습 — 설계도는 고쳐 그려도 돼요." }, { title: "오늘 결과 대신 과정 한 줄 적기", why: "결과로만 말하는 습관에 과정을 한 번 끼워 넣어요." }, { title: "동료에게 짧은 감사 한마디", why: "표현이 없는 것이 마음이 없는 건 아니란 걸 밖으로 보여 주는 연습이에요." }] },
  ISTP: { name: "차분한 해결사", traits: "문제가 생기면 말보다 손이 먼저 가는 편이에요. 감정보다 사실을 보고, 필요한 만큼만 말하죠. 급한 상황에서 오히려 침착해지는 쪽입니다. 사람들 속에 오래 있으면 조용한 데로 가고 싶어진다면 맞을 거예요.", comfort: "티 안 나게 해결한 일들, 누가 안 알아줘도 그 자리가 잘 돌아간 이유였어요.", quote: "조용히 고치는 손이 세상을 굴러가게 해요.", books: ["『노인과 바다』 어니스트 헤밍웨이", "『아몬드』 손원평"], directing: "오늘 조용히 해결한 일 하나를 스스로 인정해 주세요.", todo: [{ title: "조용히 해결한 일 하나 스스로 인정하기", why: "티 안 나게 한 일도 한 일이에요." }, { title: "손으로 하는 것 10분(정리·손질·만들기)", why: "말보다 손이 먼저 가는 성향엔 손이 쉼이에요." }, { title: "오늘 느낀 것 한 단어만 적기", why: "감정을 길게 말하지 않아도 한 단어면 충분해요." }] },
  ISFP: { name: "따뜻한 관찰자", traits: "눈에 띄지 않는 자리에서 좋은 것을 발견하는 편이에요. 경쟁보다 자기 속도가 편하고, 갈등이 생기면 물러서서 지켜보죠. 아이들의 그림이나 작은 변화를 잘 알아보는 선생님입니다. 남에게 맞추다 정작 하고 싶은 말을 삼킨다면, 그것도 이 성향이에요.", comfort: "조용한 방식도 분명한 방식이에요. 큰 소리를 내지 않았다고 없었던 일이 되지 않습니다.", quote: "천천히 보는 사람만 보이는 것이 있어요.", books: ["『어린 왕자』 생텍쥐페리", "『죽고 싶지만 떡볶이는 먹고 싶어』 백세희"], directing: "삼킨 말 하나를 여기 적어 두는 것만으로도 가벼워질 수 있어요.", todo: [{ title: "오늘 본 좋은 것 하나 사진으로 남기기", why: "작은 것을 발견하는 눈을 기록으로 이어 봐요." }, { title: "삼킨 말 하나 여기 적어 두기", why: "말하지 않은 말도 어디엔가 두면 가벼워져요." }, { title: "내 속도로 걷는 10분", why: "경쟁 없는 시간이 이 성향의 회복이에요." }] },
  INFP: { name: "마음의 정원사", traits: "자기만의 가치가 분명하고, 그것이 흔들리면 오래 마음이 쓰이는 편이에요. 겉으론 온순한데 속으론 단단하죠. 아이 한 명 한 명의 사정을 마음에 담는 선생님입니다. 자책이 잦다면, 그건 기준이 높아서예요.", comfort: "잘하고 싶은 마음이 크면 자책도 커져요. 오늘은 잘하고 싶었던 마음만 남기고 나머진 내려놓아도 됩니다.", quote: "마음을 많이 쓰는 사람에겐 마음을 쉬는 날이 필요해요.", books: ["『모모』 미하엘 엔데", "『연금술사』 파울로 코엘료"], directing: "오늘의 자책 하나는 내일로 넘기지 말고 여기 두고 가세요.", todo: [{ title: "오늘의 자책 하나 여기 두고 가기", why: "기준이 높아 생기는 자책은 내일로 안 가져가도 돼요." }, { title: "좋아하는 문장 하나 다시 읽기", why: "자기만의 가치가 흔들린 날엔 그 문장이 닻이 돼요." }, { title: "아이 한 명의 좋은 점 한 줄 적기", why: "마음에 담는 습관을 무거운 쪽 대신 밝은 쪽으로 한 번 써 봐요." }] },
  INTP: { name: "호기심의 탐구자", traits: "\"왜?\"가 먼저 떠오르는 편이에요. 정답보다 원리에 끌리고, 규칙이 이유 없이 있으면 답답하죠. 수업 자료를 만들다 원래 목적을 잊고 파고들어 본 적이 있다면 맞을 거예요. 감정 이야기는 서툴러도 생각은 누구보다 많습니다.", comfort: "다 이해하고 나서 움직이려 하면 오늘이 끝나요. 이해가 덜 된 채로도 하루는 충분히 괜찮았어요.", quote: "질문이 많은 사람은 답이 없는 날도 견딜 수 있어요.", books: ["『코스모스』 칼 세이건", "『이기적 유전자』 리처드 도킨스"], directing: "답이 안 나온 질문은 그대로 두고 오늘은 쉬어도 돼요.", todo: [{ title: "답 안 나온 질문 하나 「보류」 상자에 넣기", why: "다 이해하고 움직이려는 마음을 잠시 내려놓는 연습이에요." }, { title: "오늘 궁금했던 것 한 줄 적기", why: "질문이 많은 건 이 성향의 힘이에요 — 흘려보내지 말고 남겨요." }, { title: "감정 단어 하나 골라 보기", why: "생각은 많은데 감정은 서툰 성향엔 단어 하나가 시작이에요." }] },
  ESTP: { name: "현장의 해결사", traits: "생각보다 움직임이 빠른 편이에요. 지금 눈앞의 문제를 바로 처리하고, 긴 계획보다 즉석 대응이 편하죠. 체험학습·행사처럼 현장이 있는 일에서 살아납니다. 가만히 앉아 있는 회의가 제일 힘들다면 맞을 거예요.", comfort: "빨리 움직이는 사람도 멈추는 순간이 필요해요. 오늘 한 번쯤 아무것도 처리하지 않는 시간을 가져도 됩니다.", quote: "몸이 먼저 아는 사람은 몸을 쉬게 하는 것도 알아야 해요.", books: ["『걷기의 인문학』 리베카 솔닛", "『불편한 편의점』 김호연"], directing: "오늘은 처리하지 않고 그냥 둔 시간이 있었다면 그것도 잘한 거예요.", todo: [{ title: "처리하지 않고 그냥 둔 10분 갖기", why: "빨리 움직이는 사람에게 멈춤은 연습이 필요해요." }, { title: "몸을 쓰는 것 하나(계단·산책·기지개)", why: "몸이 먼저 아는 성향엔 몸이 곧 회복이에요." }, { title: "오늘 즉석에서 해결한 일 하나 적기", why: "현장에서 살아나는 힘을 스스로 알아봐 주는 거예요." }] },
  ESFP: { name: "교실의 햇살", traits: "분위기를 밝게 만드는 편이에요. 사람들과 있을 때 힘이 나고, 아이들 앞에서 표정이 살아나죠. 즐거운 일은 잘 기억하고 무거운 일은 오래 담아 두지 않으려 합니다. 다만 혼자 있는 저녁이 유난히 조용하게 느껴진다면, 그것도 이 성향이에요.", comfort: "남을 밝게 하느라 자기 불은 꺼 두지 않아도 돼요. 오늘은 당신을 위해 켜 두세요.", quote: "웃게 하는 사람에게도 조용히 웃어 줄 사람이 필요해요.", books: ["『달러구트 꿈 백화점』 이미예", "『빨강 머리 앤』 루시 모드 몽고메리"], directing: "오늘 남을 웃게 한 만큼, 나를 위한 한 가지도 챙겨 보세요.", todo: [{ title: "나를 위한 한 가지 챙기기", why: "남을 밝게 한 만큼 자기 불도 켜 두는 거예요." }, { title: "오늘 웃었던 장면 하나 적기", why: "즐거운 기억을 잘 남기는 성향의 장점을 그대로 써요." }, { title: "조용한 저녁에 한 사람에게 연락하기", why: "혼자 있는 저녁이 조용하게 느껴질 때 쓰는 카드예요." }] },
  ENFP: { name: "반짝이는 불꽃", traits: "새로운 아이디어에 금방 불이 붙는 편이에요. 사람을 좋아하고 가능성을 먼저 보죠. 시작은 잘하는데 마무리에서 힘이 빠진다면 맞을 거예요. 교실에서는 아이들의 엉뚱한 말을 가장 재밌어하는 선생님입니다.", comfort: "다 끝내지 못한 것들은 실패가 아니라 씨앗이에요. 오늘 심어 둔 걸로 충분합니다.", quote: "불꽃은 계속 타지 않아요. 꺼졌다 켜지는 게 정상이에요.", books: ["『연금술사』 파울로 코엘료", "『빨강 머리 앤』 루시 모드 몽고메리"], directing: "시작만 한 일이 있어도 괜찮아요. 오늘은 씨앗을 심은 날로 두세요.", todo: [{ title: "시작만 한 일 하나를 「씨앗」으로 적기", why: "끝내지 못한 것은 실패가 아니라 심어 둔 것이에요." }, { title: "떠오른 아이디어 한 줄 메모", why: "불이 붙은 생각을 붙잡아 두면 다음에 다시 켜져요." }, { title: "오늘 만난 사람 중 한 명의 좋은 점 떠올리기", why: "사람과 가능성을 먼저 보는 힘을 자신에게도 돌려요." }] },
  ENTP: { name: "질문하는 개척자", traits: "당연한 것에 \"꼭 그래야 해?\"라고 묻는 편이에요. 토론이 즐겁고 새 방식을 실험해 보는 걸 좋아하죠. 관행이 많은 조직에서 답답함을 자주 느낀다면 맞을 거예요. 재치가 있어 회의 분위기를 바꾸기도 합니다.", comfort: "바꾸고 싶은 게 많은 사람은 그만큼 자주 부딪혀요. 오늘 못 바꾼 건 당신 탓이 아니에요.", quote: "질문은 틀린 게 아니라 아직 답이 오지 않은 것뿐이에요.", books: ["『사피엔스』 유발 하라리", "『생각의 탄생』 로버트 루트번스타인"], directing: "오늘 던진 질문 하나를 그대로 남겨 두세요. 답은 나중에 와도 돼요.", todo: [{ title: "오늘 던진 질문 하나 그대로 남겨 두기", why: "답은 나중에 와도 돼요." }, { title: "바꾸고 싶은 것 하나를 「다음에」 칸으로", why: "오늘 못 바꾼 건 당신 탓이 아니에요." }, { title: "아무 실험도 안 하는 저녁 한 번", why: "새로운 것을 쫓는 성향엔 멈춤이 오히려 새로워요." }] },
  ESTJ: { name: "믿음직한 관리자", traits: "일을 체계로 만들어 굴리는 편이에요. 책임을 맡으면 끝을 보고, 기준이 흐릿하면 먼저 정리하죠. 부장·담당 업무가 자연스럽게 모이는 쪽입니다. 남들도 자기만큼 해 주길 바라다 서운해진다면, 그것도 이 성향이에요.", comfort: "다 챙기는 사람은 자기가 빠진 걸 늦게 알아요. 오늘은 목록 맨 위에 당신을 적어 두세요.", quote: "기준을 세우는 사람도 기준 밖에서 쉴 자격이 있어요.", books: ["『원칙』 레이 달리오", "『나는 나로 살기로 했다』 김수현"], directing: "오늘 목록 맨 위에 나를 위한 한 줄을 적어 보세요.", todo: [{ title: "목록 맨 위에 나를 위한 한 줄", why: "다 챙기는 사람은 자기가 빠진 걸 늦게 알아요." }, { title: "남에게 넘긴 일 하나는 확인하지 않기", why: "기준대로 안 돼도 굴러간다는 걸 한 번 겪어 봐요." }, { title: "오늘 체계 덕에 잘 굴러간 일 하나 적기", why: "당연하게 넘긴 성과를 스스로 알아봐 주는 거예요." }] },
  ESFJ: { name: "다정한 연결자", traits: "사람 사이를 잇는 편이에요. 분위기를 살피고 빠진 사람을 챙기죠. 교무실 생일이나 경조사를 먼저 기억하는 쪽입니다. 다른 사람의 평가에 마음이 오래 머문다면, 그것도 이 성향이에요.", comfort: "모두를 만족시키는 날은 원래 없어요. 오늘 한 사람에게 따뜻했다면 충분합니다.", quote: "잇는 사람은 가끔 스스로에게도 이어져야 해요.", books: ["『긴긴밤』 루리", "『미움받을 용기』 기시미 이치로·고가 후미타케"], directing: "오늘 따뜻하게 대한 한 사람을 떠올리면 그걸로 충분해요.", todo: [{ title: "오늘 따뜻하게 대한 한 사람 떠올리기", why: "모두를 만족시키는 날은 없어요 — 한 사람이면 충분해요." }, { title: "남의 평가 하나를 「그 사람 몫」으로 돌려 두기", why: "마음에 오래 머무는 평가를 내려놓는 연습이에요." }, { title: "나에게 하는 생일 축하처럼 작은 선물 하나", why: "먼저 챙기는 사람이 자기도 챙겨 보는 거예요." }] },
  ENFJ: { name: "이끄는 조력자", traits: "사람을 성장시키는 데서 보람을 느끼는 편이에요. 앞에 서서 이끌면서도 뒤처진 사람을 놓치지 않죠. 아이들의 가능성을 먼저 보고 말해 주는 선생님입니다. 남의 기대에 맞추다 자기 기대는 잊는다면, 그것도 이 성향이에요.", comfort: "이끄는 사람도 누군가에게 기대도 돼요. 오늘은 기대는 쪽이어도 괜찮습니다.", quote: "남을 키우는 사람은 자기도 자라는 중이에요.", books: ["『죽은 시인의 사회』 N. H. 클라인바움", "『모리와 함께한 화요일』 미치 앨봄"], directing: "오늘은 누군가에게 기대 본 순간이 있었는지 떠올려 보세요.", todo: [{ title: "누군가에게 기대 본 순간 떠올리기", why: "이끄는 사람도 기대는 쪽이어도 괜찮아요." }, { title: "내 기대 한 줄 적기(남의 기대 아님)", why: "남의 기대에 맞추다 잊은 자기 기대를 꺼내요." }, { title: "아이의 가능성을 말해 준 순간 하나 기억하기", why: "그 힘이 오늘도 있었다는 걸 확인해요." }] },
  ENTJ: { name: "앞서가는 조타수", traits: "목표가 정해지면 길을 만들어 가는 편이에요. 결정이 빠르고 책임을 피하지 않죠. 회의에서 결론을 내는 역할이 자주 돌아옵니다. 속도가 느린 상황에서 답답함을 참기 어렵다면 맞을 거예요.", comfort: "앞서 가는 사람은 뒤를 돌아볼 틈이 없어요. 오늘은 한 번 멈춰서 지나온 길을 봐도 됩니다.", quote: "키를 잡은 사람도 바람이 잦아드는 시간을 가져야 해요.", books: ["『프로젝트 헤일메리』 앤디 위어", "『원칙』 레이 달리오"], directing: "오늘 지나온 길을 한 번만 돌아보고 쉬어도 돼요.", todo: [{ title: "지나온 길 한 번 돌아보기(1분)", why: "앞서 가는 사람은 뒤를 볼 틈이 없어요." }, { title: "결정 하나를 내일로 미뤄 두기", why: "속도를 늦춰도 괜찮다는 걸 한 번 겪어 봐요." }, { title: "오늘 결론 낸 일 하나 스스로 인정하기", why: "책임을 피하지 않은 하루를 알아봐 주는 거예요." }] },
};

/** 16유형 코드 — 직접 고르는 격자의 순서(사이트 마음온도와 같은 배열: I 줄 → E 줄). 2026-09-19. */
export const PERSONA_CODES = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"] as const;
export type PersonaCode = (typeof PERSONA_CODES)[number];

/**
 * 저장되는 성향 — 테스트 결과(lean 있음) 또는 직접 선택(lean null). 2026-09-19 사용자 확정
 * "직접 선택하게 하고 테스트는 모르면 하게 — 사용자가 찾을 때만". 직접 고른 사람에겐 축 막대를 그릴 근거가 없어 lean 을 null 로 둔다.
 */
export interface PersonaDone { type: string; lean: Record<PersonaAxis, number> | null; source: "test" | "picked"; at: string }

export function pickedPersona(code: string, at: Date = new Date()): PersonaDone {
  if (!(PERSONA_CODES as readonly string[]).includes(code)) throw new Error(`unknown persona code: ${code}`);
  return { type: code, lean: null, source: "picked", at: at.toISOString() };
}

/**
 * 유형 기기 저장(2026-09-22 사용자 지시) — 그전엔 화면 메모리뿐이라 앱을 닫으면 사라져 디렉팅이 매번 잠긴 채 시작했다.
 * localStorage(이 폰에만) · 접근은 WellnessApp 의 storage() 로 · 깨진 값은 null(저장소 때문에 앱이 죽지 않는다). 전체 파기 때 함께 지운다.
 */
export const PERSONA_STORE_KEY = "wellness-care:persona:v1";
const PERSONA_AXES: readonly PersonaAxis[] = ["E", "N", "F", "J"];
export const serializePersonaDone = (d: PersonaDone): string => JSON.stringify({ type: d.type, lean: d.lean, source: d.source, at: d.at });
export function parsePersonaDone(raw: string | null): PersonaDone | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { type?: unknown; lean?: unknown; source?: unknown; at?: unknown };
    if (typeof j.type !== "string" || !(PERSONA_CODES as readonly string[]).includes(j.type)) return null;
    if (j.source !== "test" && j.source !== "picked") return null;
    if (typeof j.at !== "string") return null;
    let lean: Record<PersonaAxis, number> | null = null;
    if (j.lean !== null && j.lean !== undefined) {
      if (typeof j.lean !== "object") return null;
      const l = j.lean as Record<string, unknown>;
      if (!PERSONA_AXES.every((k) => typeof l[k] === "number")) return null;
      lean = { E: l.E as number, N: l.N as number, F: l.F as number, J: l.J as number };
    }
    return { type: j.type, lean, source: j.source, at: j.at };
  } catch {
    return null;
  }
}

/** 시간대 마무리 — greeting.ts 와 같은 다섯 구간(5~11 아침 · 11~14 점심 · 14~18 오후 · 18~22 저녁 · 그 밖 밤). 유형 디렉팅 뒤에 붙는다. */
export function slotClosing(hour: number): string {
  if (hour >= 5 && hour < 11) return "아침이니 오늘 하루 한 가지만 골라 두셔도 충분해요.";
  if (hour >= 11 && hour < 14) return "점심 무렵엔 5분만 자리를 비워도 오후가 달라져요.";
  if (hour >= 14 && hour < 18) return "오후엔 남은 일을 다 하려 하지 말고 하나만 마무리해도 돼요.";
  if (hour >= 18 && hour < 22) return "저녁엔 오늘 것을 내일로 넘겨도 괜찮아요.";
  return "밤엔 더 하지 않는 것이 오늘의 한 가지예요.";
}

/** 마음카드 디렉팅 밑에 붙는 한 줄 = 유형 디렉팅 + 시간대 마무리. 유형이 없으면 부르지 않는다(화면이 판단). */
export function personaDirecting(code: string, hour: number): string {
  const t = PERSONA_TYPES[code];
  return `${t.directing} ${slotClosing(hour)}`;
}

/** 추천 도서 → 네이버 책 검색 링크(API 없음 · 『』만 떼고 제목+저자를 검색어로). 2026-09-19. */
export function bookSearchUrl(book: string): string {
  const q = book.replace(/[『』]/g, "").replace(/\s+/g, " ").trim();
  return `https://search.naver.com/search.naver?where=book&query=${encodeURIComponent(q)}`;
}
