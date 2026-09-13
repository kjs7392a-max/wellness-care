import { PROGRAM_VIDEOS, SHOULDER_RELEASE, type GuideVideo } from "./guide";

// 교직원 웰니스 케어 MVP — 데이터 상수.
// 원본: design_handoff_wellness_care/웰니스케어-design.dc.html 의 로직 상단 상수 그대로 이식.
// 문구·수치는 임상/디자인 감수를 거친 값이므로 임의 수정 금지.

export type Role = "teacher" | "admin" | "care";
export type ContentState =
  | "STABLE"
  | "SEDENTARY_LONG"
  | "ACTIVITY_LOW"
  | "RECOVERY_POOR"
  | "LOAD_ACCUMULATED";

// 「오늘의 마음카드」는 SAM(sam.ts)으로 묻는다 — 2026-09-12 에 추상 그림 6장(투사식)에서 교체. 그림 데이터 없음.

/** 홈 제안·라이브러리 항목이 공유하는 최소 형태. video 가 있으면 타이머 시트가 원형 시계 대신 가이드 영상을 튼다. */
export interface StretchItem {
  title: string;
  desc: string;
  video?: GuideVideo;
}

export interface RoleContent {
  label: string;
  hint: string;
  /**
   * 직군마다 다른 색 — 세 카드가 서로 달라 보이게(2026-09-13 사용자 지시 "카드 테두리 … 진하게하고 컬러를 나눠줘").
   * `line` = 카드 테두리(안 고른 카드는 같은 색을 옅게 · 고른 카드는 100% + 그 색 8% 배경).
   * ⚠ 진한 짝(`text`)도 있었는데, 그 색을 쓰던 「제안해 드려요」 줄이 2026-09-13 사용자 지시로 삭제되며 함께 뺐다.
   * 🚫 **새 색을 만들지 말 것** — 셋 다 앱이 이미 쓰는 색이다(보라=브랜드 · 청록=본문 · 테라코타=신체 건강 타일).
   *    옅은 판이 필요하면 새 hex 를 만들지 말고 **같은 색에 알파만** 붙인다(`line + "99"` 처럼).
   * 🚫 **새 색을 만들지 말 것** — 셋 다 앱이 이미 쓰는 색이다(보라=브랜드 · 청록=본문 · 테라코타=신체 건강 타일).
   *    `text` 는 흰 배경 대비 7:1 이상인 진한 짝이다.
   */
  accent: { line: string };
  items: StretchItem[];
  low: StretchItem[];
}

/**
 * 직군별 제안 항목.
 *
 * ★ `items[2]`·`low[2]`(= 퇴근 전)에는 **여섯 칸 전부 가이드 영상이 붙어 있어야 한다** — 시연이 그 시간대에 고정돼 있어
 *   「지금 바로 시작하기」가 타이머가 아니라 영상으로 열려야 하기 때문(2026-09-13 사용자 지시).
 *   `suggestion.test.ts` 의 「고정된 시간대의 항목은 … 전부 가이드 영상을 갖는다」가 막는다.
 *   붙인 근거: 교사 = SHOULDER_RELEASE(어깨) · 행정 = p4 「퇴근 전 허리 회복」/p5 「앉은 자리 허리 부담 덜기」(라이브러리와 같은 이름) ·
 *   영양·보건·조리 = p9 「발끝 당기고 뻗기」(부종을 빼는 발목 펌프. p8 종아리는 **서서** 하는 동작이라 "앉아서"와 어긋난다).
 * 🚫 이름과 안 맞는 영상을 채워 넣지 말 것 — 없는 것을 있는 척하는 화면이 타이머보다 나쁘다.
 * 🚫 **직군 선택 화면에 「이런 걸 제안해 드려요」를 적지 말 것**(2026-09-13 사용자 지시로 `picked` 삭제) —
 *    그 시점엔 걸음도 기록도 아무것도 없다. 직군만 고른 상태에서 제안부터 말하면 말이 안 된다.
 */
export const ROLES: Record<Role, RoleContent> = {
  teacher: {
    label: "교사 · 담임",
    hint: "수업 중 판서와 성대 부담, 학부모 민원과 생활지도",
    accent: { line: "#7a6bc4" }, // 보라(브랜드)
    items: [
      { title: "수업 전 목소리·후두 이완 호흡", desc: "교실에 들어가기 전 잠깐이면 돼요. 목을 열어두면 하루가 조금 수월해집니다." },
      { title: "4교시 후 목·어깨 긴장 이완", desc: "칠판 앞에 오래 서 계셨죠. 어깨부터 천천히 내려놓아 볼까요." },
      { title: "퇴근 전 어깨·목 풀기", desc: "하루 종일 굳어 있던 어깨와 목을 풀고 가볍게 퇴근하세요.", video: SHOULDER_RELEASE },
    ],
    low: [
      { title: "앉은 자리에서 하는 목소리 이완 호흡", desc: "의자에 기대앉아 숨만 고르면 됩니다. 일어나지 않으셔도 돼요." },
      { title: "앉은 채로 목·어깨 천천히 풀기", desc: "의자에 앉은 그대로, 고개를 아주 천천히 기울이는 동작만 있어요." },
      { title: "퇴근 전 목소리·숨 고르기", desc: "하루 종일 쓴 목을 숨으로 가라앉히는 시간이에요. 앉은 그대로 코로 4초, 입으로 6초.", video: PROGRAM_VIDEOS.p10 },
    ],
  },
  admin: {
    label: "행정 직군",
    hint: "장시간 화면 작업과 눈·손목 부담, 민원 응대와 마감",
    accent: { line: "#4d7c8c" }, // 청록
    items: [
      { title: "문서작업 중간 30초 눈 운동", desc: "화면에서 잠깐만 눈을 떼면 됩니다. 자리에서 그대로 할 수 있어요." },
      { title: "손목·거북목 예방 스트레칭", desc: "자판 앞에 오래 계셨죠. 손목과 목을 함께 풀어봐요." },
      { title: "퇴근 전 허리 회복 스트레칭", desc: "하루 종일 앉아 있던 허리를 되돌리고 나가는 시간이에요.", video: PROGRAM_VIDEOS.p4 },
    ],
    low: [
      { title: "앉은 자리에서 30초 눈 쉬기", desc: "먼 곳을 바라보는 것만으로 충분해요. 자리에서 그대로 하시면 됩니다." },
      { title: "앉은 채로 손목 가볍게 풀기", desc: "손목을 책상에 얹은 채 아주 작게 움직이는 동작이에요." },
      { title: "앉은 자리 허리 부담 덜기", desc: "등을 의자에 붙이고 자세만 바로잡습니다. 일어서지 않아요.", video: PROGRAM_VIDEOS.p5 },
    ],
  },
  care: {
    label: "영양 · 보건 · 조리",
    hint: "장시간 입식 근무와 하체 부담, 짧은 시간의 집중 대응",
    accent: { line: "#e0876c" }, // 테라코타(신체 건강 타일과 같은 색)
    items: [
      { title: "손목·관절 보호 이완 운동", desc: "반복해서 쓰실 손목을 미리 풀어두는 동작이에요." },
      { title: "서 있는 사이 종아리 풀기", desc: "오래 서 계셨죠. 종아리부터 천천히 풀어볼까요." },
      { title: "퇴근 전 다리 부종 덜어내기", desc: "하루 종일 버틴 다리를 가볍게 하고 나가는 시간이에요.", video: PROGRAM_VIDEOS.p9 },
    ],
    low: [
      { title: "앉은 채로 손목 쉬게 하기", desc: "손목을 무릎에 얹고 아주 작게 돌리는 동작이에요." },
      { title: "앉아서 하는 종아리 이완", desc: "의자에 앉아 발끝만 천천히 움직이면 됩니다." },
      { title: "퇴근 전 앉아서 숨 고르기", desc: "다리는 편하게 두고 숨만 천천히 고르면 됩니다. 배에 손을 얹어 보세요.", video: PROGRAM_VIDEOS.p11 },
    ],
  },
};

export const NUDGE: Record<ContentState, string> = {
  STABLE: "잠깐 몸을 풀고 갈 여유는 있으실까요?",
  SEDENTARY_LONG: "한 시간 반째 자리에 앉아 계셨어요. 따뜻한 물 한 잔 마시러 가면서 가볍게 몸을 털어볼까요?",
  ACTIVITY_LOW: "이번 주는 걸음이 평소보다 뜸했어요. 잠깐 걸어볼까요? 휴게실 앞 복도 창가도 좋은 코스예요.",
  RECOVERY_POOR: "요 며칠은 쉬어가는 시간이 뜸했어요. 오늘 1분 호흡부터 어떠세요?",
  LOAD_ACCUMULATED: "이번 주는 평소보다 많이 움직이셨어요. 오늘은 쉬어가는 쪽으로 가볼까요?",
};

export const NUDGE_LOW: Record<ContentState, string> = {
  STABLE: "의자에 기대앉은 그대로, 어깨만 천천히 내려놓아 볼까요?",
  SEDENTARY_LONG: "한 자리에 오래 앉아 계셨네요. 일어나지 않으셔도 돼요. 앉은 채로 목만 아주 천천히 돌려볼까요?",
  ACTIVITY_LOW: "오늘은 창밖만 잠깐 바라보는 것도 좋아요. 먼 곳을 30초만 보면 눈이 한결 편해집니다.",
  RECOVERY_POOR: "요 며칠 쉬어가는 시간이 뜸했어요. 앉은 자리에서 1분 호흡부터 어떠세요?",
  LOAD_ACCUMULATED: "이번 주는 꽤 애쓰셨어요. 오늘은 앉은 채로 숨만 고르는 쪽으로 가볼까요?",
};

export const AREAS = [
  { id: "all", label: "전체" },
  { id: "neck", label: "목·어깨" },
  { id: "back", label: "허리" },
  { id: "eye", label: "눈" },
  { id: "wrist", label: "손목" },
  { id: "leg", label: "다리" },
  { id: "breath", label: "호흡" },
  { id: "walk", label: "걷기" },
];

export interface Program extends StretchItem {
  id: string;
  area: string;
  /** 한 편 길이(분). 영상 한 편 = 1분이고 앱이 1분에서 멈춘다 — 전부 1(2026-09-12 사용자 확정). 걷기도 기본 1분, 타이머에서 늘릴 수 있다. */
  min: number;
  place: "indoor" | "outdoor";
  low: boolean;
}

export const PROGRAMS: Program[] = [
  { id: "p1", area: "neck", title: "목·어깨 긴장 이완", min: 1, place: "indoor", low: true, desc: "칠판 앞에 오래 서 계셨죠. 어깨부터 천천히 내려놓아 볼까요.", video: PROGRAM_VIDEOS.p1 },
  { id: "p2", area: "neck", title: "앉은 채로 목 천천히 풀기", min: 1, place: "indoor", low: true, desc: "의자에 앉은 그대로, 고개를 아주 천천히 기울이는 동작만 있어요.", video: PROGRAM_VIDEOS.p2 },
  { id: "p3", area: "neck", title: "거북목 되돌리기", min: 1, place: "indoor", low: false, desc: "화면 쪽으로 나온 목을 제자리로 데려오는 동작이에요.", video: PROGRAM_VIDEOS.p3 },
  { id: "p4", area: "back", title: "퇴근 전 허리 회복", min: 1, place: "indoor", low: false, desc: "하루 종일 앉아 있던 허리를 되돌리고 나가는 시간이에요.", video: PROGRAM_VIDEOS.p4 },
  { id: "p5", area: "back", title: "앉은 자리 허리 부담 덜기", min: 1, place: "indoor", low: true, desc: "등을 의자에 붙이고 자세만 바로잡습니다. 일어서지 않아요.", video: PROGRAM_VIDEOS.p5 },
  { id: "p6", area: "eye", title: "30초 눈 쉬기", min: 1, place: "indoor", low: true, desc: "화면에서 잠깐만 눈을 떼면 됩니다. 자리에서 그대로 할 수 있어요.", video: PROGRAM_VIDEOS.p6 },
  { id: "p7", area: "wrist", title: "손목·관절 보호 이완", min: 1, place: "indoor", low: true, desc: "반복해서 쓰신 손목을 쉬게 해주는 동작이에요.", video: PROGRAM_VIDEOS.p7 },
  { id: "p8", area: "leg", title: "종아리 피로 풀기", min: 1, place: "indoor", low: false, desc: "오래 서 계셨죠. 종아리부터 천천히 풀어볼까요.", video: PROGRAM_VIDEOS.p8 },
  { id: "p9", area: "leg", title: "앉아서 다리 부종 케어", min: 1, place: "indoor", low: true, desc: "의자에 앉아 발끝만 천천히 움직이면 됩니다.", video: PROGRAM_VIDEOS.p9 },
  { id: "p10", area: "breath", title: "수업 전 목소리 이완 호흡", min: 1, place: "indoor", low: true, desc: "교실에 들어가기 전 잠깐이면 돼요. 목을 열어두면 하루가 수월합니다.", video: PROGRAM_VIDEOS.p10 },
  { id: "p11", area: "breath", title: "숨 고르기", min: 1, place: "indoor", low: true, desc: "창가나 복도 끝, 어디든 좋아요. 숨만 천천히 쉬면 됩니다.", video: PROGRAM_VIDEOS.p11 },
  { id: "p12", area: "breath", title: "잠들기 전 이완 호흡", min: 1, place: "indoor", low: true, desc: "누운 채로 할 수 있어요. 하루를 닫는 시간입니다.", video: PROGRAM_VIDEOS.p12 },
  { id: "p13", area: "walk", title: "복도 한 바퀴 걷기", min: 1, place: "indoor", low: false, desc: "교실을 나와 복도 끝까지만 다녀오면 돼요." },
  { id: "p14", area: "walk", title: "해 진 뒤 저녁 산책", min: 1, place: "outdoor", low: false, desc: "더위가 가신 시간에 천천히 걷는 코스예요." },
  { id: "p15", area: "back", title: "전신 1분 기지개", min: 1, place: "indoor", low: true, desc: "자리에서 크게 한 번 펴는 것만으로 충분합니다.", video: PROGRAM_VIDEOS.p15 },
];

export type WeatherKey = "hot" | "cold" | "rain" | "dust" | "fine";
export interface Weather {
  word: string;
  label: string;
  dot: string;
  note: string;
  plain: string;
  line: string;
  prefer: "indoor" | "outdoor";
}

export const WEATHER: Record<WeatherKey, Weather> = {
  hot: { word: "무더움", label: "33° 무더움", dot: "#f5a98c", note: "체감 35° · 낮 외출 주의", plain: "낮 외출 주의", line: "오늘은 바깥이 많이 더워요. 낮에는 실내 그늘에서 하시고, 산책은 해가 진 뒤로 미뤄두시는 게 좋겠어요.", prefer: "indoor" },
  cold: { word: "추움", label: "영하 4° 추움", dot: "#a9c4e8", note: "찬바람 · 실내 권장", plain: "찬바람 · 실내 권장", line: "오늘은 바람이 찹니다. 바깥보다 복도나 실내에서 몸을 데우는 쪽이 나아요.", prefer: "indoor" },
  rain: { word: "비", label: "비", dot: "#8b9bc9", note: "오후까지 이어짐", plain: "오후까지 이어짐", line: "비가 내리고 있어요. 오늘은 실내에서 할 수 있는 것으로 준비했어요.", prefer: "indoor" },
  dust: { word: "미세먼지 나쁨", label: "미세먼지 나쁨", dot: "#c9a86c", note: "창문 닫고 실내 활동", plain: "창문 닫고 실내 활동", line: "공기가 좋지 않은 날이에요. 창문은 닫아두시고 실내에서만 움직이는 걸 권해요.", prefer: "indoor" },
  fine: { word: "맑음", label: "22° 맑음", dot: "#8fd0a8", note: "산책하기 좋은 날", plain: "산책하기 좋은 날", line: "바깥 공기가 좋은 날이에요. 잠깐 나가서 걷기에 딱 좋습니다.", prefer: "outdoor" },
};

export const LEAD_IN = ["오늘 하루가 이제 시작이네요.", "오전 내내 애쓰셨어요.", "오늘 하루도 고생 많으셨어요."];

/**
 * PAR-Q+ 에 「예」가 하나라도 있는 분께 하는 안내. **온보딩 판정 화면과 홈 제안 카드가 같은 문장을 쓴다**
 * — 두 곳에 따로 적으면 한쪽만 고쳐지는 날이 온다.
 *
 * ⚠ 2026-09-13 실측: 이 안내가 온보딩에서 한 번 스쳐 지나가고 끝이라, 홈에는 아무 표시가 없었다.
 *   「예」 1개와 7개가 화면상 글자 하나까지 같다(가중·게이팅 없음) — **시연용으로 그대로 두기로 한 값**이고,
 *   정식 발매 전 임상 감수에서 정해야 한다(사용자 확정).
 */
/**
 * PAR-Q+ 「예」 개수로 가르는 단계 (2026-09-13 사용자 지시: *"예가 2개 3개 4개 이상이면 다른 제안이 나와야 하는 거잖아"*).
 *   0 = 평소 강도(직군별 `items`) · 1 = 낮은 강도(직군별 `low`) · 2 = 숨 고르기만(직군 무관 `PARQ_REST_ITEM`)
 *
 * 🚫 **문턱 숫자는 임상 감수 대상이다.** 여기 값은 "몇 개부터 달라져야 한다"는 요구를 형태로 만든 것일 뿐,
 *    PAR-Q+ 표준이 정한 값이 아니다. 바꿀 일이 생기면 **이 상수 하나만** 고치면 제안·안내가 함께 따라온다.
 * 🚫 문항별 가중은 아직 없다 — 심장 「예」와 관절 「예」가 같은 무게다. 이것도 감수 몫.
 */
export const PARQ_TIER_AT = { low: 1, rest: 3 } as const;

export function parqTier(parqYes: number): 0 | 1 | 2 {
  if (parqYes >= PARQ_TIER_AT.rest) return 2;
  if (parqYes >= PARQ_TIER_AT.low) return 1;
  return 0;
}

/**
 * 3단계(「예」가 여러 개)에서 **직군과 무관하게** 내놓는 항목. 앉은 채로 숨만 고르는, 이 앱에서 가장 부하가 낮은 것.
 * ★ 새로 만들지 않고 라이브러리의 「숨 고르기」 영상을 그대로 쓴다(p11).
 */
export const PARQ_REST_ITEM: StretchItem = {
  title: "앉은 자리에서 이완 호흡",
  desc: "일어나지 않으셔도 돼요. 의자에 기대앉아 4초 들이쉬고 8초 길게 내쉬면 됩니다.",
  video: PROGRAM_VIDEOS.p12,
};

export const PARQ_LOW_NOTICE = "안전 확인에서 해당되는 항목이 있어 앉은 자리에서 하는 낮은 강도만 제안해 드려요.";
export const PARQ_CONSULT = "새로운 운동을 시작하기 전에는 주치의와 한 번 상의해 주세요.";
/** 3단계 — 「예」가 여러 개일 때. 강도를 낮추는 것으로 끝내지 않고 무엇을 내놓는지까지 바꿨음을 말한다. */
export const PARQ_REST_NOTICE = "안전 확인에서 해당되는 항목이 여러 개예요. 오늘은 몸에 부담이 없는 숨 고르기만 제안해 드려요.";
export const PARQ_REST_CONSULT = "운동을 시작하시기 전에 주치의와 꼭 먼저 상의해 주세요.";

export const PARQ = [
  "의사로부터 심장 질환이나 고혈압이 있다는 말을 들은 적이 있나요?",
  "쉬고 있을 때나 움직일 때 가슴에 통증을 느낀 적이 있나요?",
  "최근 어지럼증으로 균형을 잃거나 의식을 잃은 적이 있나요?",
  "당뇨·관절염·암 등 만성 질환을 진단받은 적이 있나요?",
  "만성 질환 때문에 처방약을 복용하고 계신가요?",
  "움직이면 나빠질 수 있는 관절이나 허리 문제가 있나요?",
  "의사가 의료진의 관리 아래에서만 운동하라고 한 적이 있나요?",
];

export const PRINCIPLES = [
  "기록은 암호화되어 본인 계정에만 저장되며, 본인 외에는 누구도 열어볼 수 없습니다",
  "학교와 교육청은 개인의 기록을 볼 수 없고, 개인을 식별할 수 없는 통계만 제공됩니다",
  "무엇을 왜 모으는지 언제든 확인할 수 있습니다",
  "수집은 언제든 중단할 수 있습니다",
  "전체 삭제는 즉시, 되돌릴 수 없게 이루어집니다",
];

export const COLLECT = [
  { name: "걸음과 활동", why: "평소의 움직임과 얼마나 달라졌는지만 봅니다." },
  { name: "함께한 몸풀기", why: "앱에서 직접 스트레칭을 따라 하실 수 있어요." },
  { name: "움직인 시간", why: "걷기와 계단처럼 몸을 움직인 시간만 셉니다. 어디에서 무엇을 하셨는지는 알 수 없어요." },
];

/** 이번 주 마음카드(SAM) 기록 목업 — 기분(valence)·긴장(arousal) 1~5. 기분 ≤2 = 무거운 날. */
export const MIND_DAYS: { day: string; reading: string; valence: 1 | 2 | 3 | 4 | 5; arousal: 1 | 2 | 3 | 4 | 5 }[] = [
  { day: "금", reading: "기분은 나쁘지 않고 몸도 차분한 날이었어요.", valence: 4, arousal: 2 },
  { day: "목", reading: "쌓인 피로가 마음까지 내려온 날이었어요.", valence: 2, arousal: 2 },
  { day: "수", reading: "몸이 먼저 움직이고 싶어 하던 날이었어요.", valence: 4, arousal: 4 },
  { day: "화", reading: "낮의 일이 가라앉지 않아 몸이 긴장해 있던 날이었어요.", valence: 2, arousal: 4 },
  { day: "월", reading: "특별히 좋지도 나쁘지도 않은 무난한 날이었어요.", valence: 3, arousal: 3 },
];

/**
 * 컨디션 단계 이력(목업) — 3주 전·2주 전·지난주. 이번 주는 실기록으로 계산한다(condition.ts).
 * 실데이터가 쌓이면 주간 스냅샷 저장으로 바꿀 자리. 값 1~5 = 휴식 필요~매우 좋음.
 */
export const CONDITION_HISTORY: { body: (1 | 2 | 3 | 4 | 5)[]; mind: (1 | 2 | 3 | 4 | 5)[]; prevStretch: number } = {
  body: [2, 3, 3],
  mind: [3, 2, 3],
  prevStretch: 1,
};

/**
 * 어제 하루 재료(목업) — 홈 「어제 종합 컨디션」과 상세의 신체·마음 근거. 실데이터 연동 시 어제 날짜로 집계해 채운다.
 * 스트레칭 2번·평소 수준 → 신체 좋음 / 그림 결 가벼움·대화 1번 → 마음 좋음 / 종합 좋음.
 */
export const YESTERDAY = {
  body: { stretchCount: 2, moveVsUsual: 0 as const, stepsVsUsual: 0 as const },
  mind: { pick: "light" as "heavy" | "light" | "none", chatCount: 1 },
};
// ⚠ 2026-09-13: 옛 `WEEK_FLOW`(이번 주 흐름 목업 상수)를 지웠다 — 같은 화면의 「하루씩 보기」가 원장을 보는데
//    바 그래프만 별도 상수를 보고 있어 **한 화면이 서로 다른 주를 말했다**. 이제 흐름도 원장에서 뽑는다.
//    🚫 되살리지 말 것(WellnessApp `weekDays` 참고).

export const DONE_WEEK = [
  { id: "p1", n: 4 },
  { id: "p11", n: 3 },
  { id: "p12", n: 2 },
  { id: "p6", n: 2 },
  { id: "p15", n: 2 },
  { id: "p13", n: 1 },
];

export function doneTotals() {
  let count = 0;
  let min = 0;
  for (const d of DONE_WEEK) {
    const pg = PROGRAMS.find((x) => x.id === d.id);
    if (!pg) continue;
    count += d.n;
    min += pg.min * d.n;
  }
  return { count, min };
}

// 한 편 = 1분이라 주별 합계 분 = 실행 횟수(2026-09-12 사용자: "현재는 전부 1분짜리").
export const WEEKLY_PAST = [
  { label: "3주 전", v: 11 },
  { label: "2주 전", v: 8 },
  { label: "지난주", v: 16 },
];

/** 온보딩 한 장. `id` 가 그 장의 이름이다 — 순서를 바꿔도 화면·조건이 따라오도록 번호 대신 이것으로 가른다. */
export type ObId = "promise" | "consent" | "parq" | "role";

export interface ObStep {
  id: ObId;
  kicker: string;
  title: string;
  body: string;
  btn: string;
}

export const OB: ObStep[] = [
  // 2026-09-12: 컨디션 「단계」가 생기면서 "등급도 만들지 않아요"는 거짓이 된다 → 점수·순위만 약속한다.
  { id: "promise", kicker: "먼저 약속드립니다", title: "이 앱은 선생님을 평가하지 않습니다", body: "점수나 순위를 매기지 않아요. 시작하기 전에 다섯 가지를 먼저 약속드립니다.", btn: "다음" },
  // 2026-09-12: 「동의」와 「권한」 페이지를 한 장으로 합침(사용자: "그렇게 많이 구분하면 귀찮아한다").
  // 2026-09-13: 「모으는 것은 이만큼이 전부예요」까지 같은 장으로 합침(사용자 지시) — 모으는 것·동의·권한이 한 화면에서 끝난다.
  { id: "consent", kicker: "동의·권한", title: "수집동의서 및 권한허용", body: "모으는 것은 아래 세 가지가 전부이고, 모두 선생님께 제안을 드리는 데만 쓰입니다. 권한을 허용하지 않아도 나머지는 그대로 동작하지만 허용하시면 더 정확한 결과를 얻을 수 있습니다.", btn: "동의하고 계속" },
  // 2026-09-12: 제목은 부드럽게, PAR-Q+ 는 표준 문항임을 앞세워 신뢰를 준다(사용자 지시).
  // 2026-09-13: 직군보다 앞으로 옮김(사용자 지시) — 안전 확인이 먼저 끝나야 직군별 제안의 강도가 정해진다.
  { id: "parq", kicker: "안전 확인", title: "PAR-Q+를 통해 몸 상태를 잠깐 여쭤볼게요", body: "캐나다운동생리학회가 만든 국제 표준 신체활동 준비 질문지예요. 일곱 가지 답에 따라 제안하는 강도만 달라지고, 몸에 무리가 가는 동작은 권하지 않습니다.", btn: "다음" },
  { id: "role", kicker: "직군", title: "어떤 직군이신가요?", body: "쌓이는 피로의 자리가 서로 달라서, 제안하는 내용도 달라집니다. 나중에 바꿀 수 있어요.", btn: "시작하기" },
];

/** 장 이름 → 번호. 순서를 바꾸면 여기가 따라오므로 화면·조건에 번호를 손으로 적지 않는다. */
export const OB_AT: Record<ObId, number> = OB.reduce((acc, st, i) => {
  acc[st.id] = i;
  return acc;
}, {} as Record<ObId, number>);

// 대화 첫 인사는 캐릭터마다 다르다 → characters.ts 의 intro.

// LLM 미가동/실패 시 폴백 시나리오 응답. 순차 진행.
export const CHAT_BEATS: string[][] = [
  ["그러셨군요. 조금 더 들려주실 수 있을까요?"],
  ["말씀해 주셔서 고마워요. 그중에서 오늘 가장 마음에 남는 건 어떤 부분이에요?"],
  ["그 마음이 어떤 건지 알 것 같아요. 지금 이 순간, 선생님을 위해 해줄 수 있는 아주 작은 일 하나만 떠올려 볼까요?"],
  ["좋아요. 그거면 충분합니다.", "혹시 마음이 무거운 날이 2주 넘게 이어진다면, 교육청 마음쉼 상담도 익명으로 신청할 수 있어요. 언제든 제가 안내해 드릴게요."],
  ["오늘 이야기해 주셔서 고마워요. 내일도 여기 있을게요."],
];

export const TEMP: Record<string, string> = { cold: "#8b9bc9", cool: "#9d8fe0", warm: "#f5c396", hot: "#f5a98c" };
export const WEEK_TEMP = [
  { day: "월", temp: "cool" },
  { day: "화", temp: "cold" },
  { day: "수", temp: "cool" },
  { day: "목", temp: "warm" },
  { day: "금", temp: "warm" },
  { day: "토", temp: "hot" },
  { day: "일", temp: "hot" },
];

/** 현재 시각 기준 시간대 슬롯: 0=아침(<11), 1=낮(11~15), 2=퇴근 전(>=15) */
export function slotForHour(hr: number): number {
  return hr < 11 ? 0 : hr < 15 ? 1 : 2;
}
