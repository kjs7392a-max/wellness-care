import { SHOULDER_RELEASE, type GuideVideo } from "./guide";

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

export interface ProbeOption {
  label: string;
  read: string;
}
export interface Probe {
  id: string;
  n: string;
  title: string;
  question: string;
  slotHint: string;
  options: ProbeOption[];
}

export const PROBES: Probe[] = [
  {
    id: "afterimage",
    n: "1",
    title: "마음의 잔상",
    question: "이 형태가 가장 먼저 떠오르게 하는 것은?",
    slotHint: "좌우대칭 나무·먹번짐 같은 추상 형태",
    options: [
      { label: "뻗어나가는 힘", read: "안에 아직 밀고 나갈 힘이 남아 있어요." },
      { label: "뿌리와 무게", read: "버티는 쪽에 마음이 쏠려 있는 시기예요." },
      { label: "서로의 연결", read: "사람들 사이에 마음이 많이 놓여 있네요." },
      { label: "조용한 정지", read: "지금은 멈춰 있고 싶은 마음이 커요." },
    ],
  },
  {
    id: "mood",
    n: "2",
    title: "마음의 분위기",
    question: "이 패턴이 주는 느낌은?",
    slotHint: "방사형·만다라 같은 패턴 이미지",
    options: [
      { label: "질서와 균형", read: "흐트러진 것을 정돈하고 싶은 마음이 있어요." },
      { label: "생동하는 움직임", read: "몸이 먼저 움직이고 싶어 하는 날 같아요." },
      { label: "눈부신 소란", read: "주변의 자극이 조금 과하게 느껴지는 날이에요." },
      { label: "고요한 중심", read: "겉이 소란해도 안쪽은 꽤 차분한 상태예요." },
    ],
  },
  {
    id: "intuition",
    n: "3",
    title: "직관의 선택",
    question: "이 이미지를 보며 가장 먼저 드는 느낌은?",
    slotHint: "유체·대리석 결 같은 흐름 이미지",
    options: [
      { label: "자연스러운 흐름", read: "흐름에 맡겨도 되는 날이에요." },
      { label: "고요한 깊이", read: "말로 옮기기 전의 감정이 아래에 깔려 있어요." },
      { label: "엉킨 결", read: "정리되지 않은 채 쌓인 것이 있는 것 같아요." },
      { label: "강렬한 감정", read: "안에서 아직 식지 않은 감정이 있어요." },
    ],
  },
];

/** 홈 제안·라이브러리 항목이 공유하는 최소 형태. video 가 있으면 타이머 시트가 원형 시계 대신 가이드 영상을 튼다. */
export interface StretchItem {
  title: string;
  desc: string;
  video?: GuideVideo;
}

export interface RoleContent {
  label: string;
  hint: string;
  items: StretchItem[];
  low: StretchItem[];
}

export const ROLES: Record<Role, RoleContent> = {
  teacher: {
    label: "교사 · 담임",
    hint: "수업 중 판서와 성대 부담, 학부모 민원과 생활지도",
    items: [
      { title: "수업 전 목소리·후두 이완 호흡", desc: "교실에 들어가기 전 잠깐이면 돼요. 목을 열어두면 하루가 조금 수월해집니다." },
      { title: "4교시 후 목·어깨 긴장 이완", desc: "칠판 앞에 오래 서 계셨죠. 어깨부터 천천히 내려놓아 볼까요." },
      { title: "퇴근 전 어깨·목 풀기", desc: "하루 종일 굳어 있던 어깨와 목을 풀고 가볍게 퇴근하세요.", video: SHOULDER_RELEASE },
    ],
    low: [
      { title: "앉은 자리에서 하는 목소리 이완 호흡", desc: "의자에 기대앉아 숨만 고르면 됩니다. 일어나지 않으셔도 돼요." },
      { title: "앉은 채로 목·어깨 천천히 풀기", desc: "의자에 앉은 그대로, 고개를 아주 천천히 기울이는 동작만 있어요." },
      { title: "퇴근 전 앉은 채로 어깨 내려놓기", desc: "자리에 앉은 그대로, 어깨만 천천히 풀고 나가시면 돼요.", video: SHOULDER_RELEASE },
    ],
  },
  admin: {
    label: "행정 직군",
    hint: "장시간 화면 작업과 눈·손목 부담, 민원 응대와 마감",
    items: [
      { title: "문서작업 중간 30초 눈 운동", desc: "화면에서 잠깐만 눈을 떼면 됩니다. 자리에서 그대로 할 수 있어요." },
      { title: "손목·거북목 예방 3분 스트레칭", desc: "자판 앞에 오래 계셨죠. 손목과 목을 함께 풀어봐요." },
      { title: "퇴근 전 허리 회복 스트레칭", desc: "하루 종일 앉아 있던 허리를 되돌리고 나가는 시간이에요." },
    ],
    low: [
      { title: "앉은 자리에서 30초 눈 쉬기", desc: "먼 곳을 바라보는 것만으로 충분해요. 자리에서 그대로 하시면 됩니다." },
      { title: "앉은 채로 손목 가볍게 풀기", desc: "손목을 책상에 얹은 채 아주 작게 움직이는 동작이에요." },
      { title: "앉은 자리 허리 부담 덜기", desc: "등을 의자에 붙이고 자세만 바로잡습니다. 일어서지 않아요." },
    ],
  },
  care: {
    label: "영양 · 보건 · 조리",
    hint: "장시간 입식 근무와 하체 부담, 짧은 시간의 집중 대응",
    items: [
      { title: "손목·관절 보호 이완 운동", desc: "반복해서 쓰실 손목을 미리 풀어두는 동작이에요." },
      { title: "서 있는 사이 종아리 풀기", desc: "오래 서 계셨죠. 종아리부터 천천히 풀어볼까요." },
      { title: "퇴근 전 다리 부종 덜어내기", desc: "하루 종일 버틴 다리를 가볍게 하고 나가는 시간이에요." },
    ],
    low: [
      { title: "앉은 채로 손목 쉬게 하기", desc: "손목을 무릎에 얹고 아주 작게 돌리는 동작이에요." },
      { title: "앉아서 하는 종아리 이완", desc: "의자에 앉아 발끝만 천천히 움직이면 됩니다." },
      { title: "퇴근 전 앉아서 다리 쉬게 하기", desc: "자리에 앉은 채로 다리만 편하게 두면 되는 자세예요." },
    ],
  },
};

export const NUDGE: Record<ContentState, string> = {
  STABLE: "잠깐 몸을 풀고 갈 여유는 있으실까요?",
  SEDENTARY_LONG: "한 시간 반째 자리에 앉아 계셨어요. 따뜻한 물 한 잔 마시러 가면서 가볍게 몸을 털어볼까요?",
  ACTIVITY_LOW: "이번 주는 걸음이 평소보다 뜸했어요. 잠깐 걸어볼까요? 휴게실 앞 복도 창가도 좋은 코스예요.",
  RECOVERY_POOR: "요 며칠은 쉬어가는 시간이 뜸했어요. 오늘 3분 호흡부터 어떠세요?",
  LOAD_ACCUMULATED: "이번 주는 평소보다 많이 움직이셨어요. 오늘은 쉬어가는 쪽으로 가볼까요?",
};

export const NUDGE_LOW: Record<ContentState, string> = {
  STABLE: "의자에 기대앉은 그대로, 어깨만 천천히 내려놓아 볼까요?",
  SEDENTARY_LONG: "한 자리에 오래 앉아 계셨네요. 일어나지 않으셔도 돼요. 앉은 채로 목만 아주 천천히 돌려볼까요?",
  ACTIVITY_LOW: "오늘은 창밖만 잠깐 바라보는 것도 좋아요. 먼 곳을 30초만 보면 눈이 한결 편해집니다.",
  RECOVERY_POOR: "요 며칠 쉬어가는 시간이 뜸했어요. 앉은 자리에서 3분 호흡부터 어떠세요?",
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
  min: number;
  place: "indoor" | "outdoor";
  low: boolean;
}

export const PROGRAMS: Program[] = [
  { id: "p1", area: "neck", title: "목·어깨 긴장 이완", min: 3, place: "indoor", low: true, desc: "칠판 앞에 오래 서 계셨죠. 어깨부터 천천히 내려놓아 볼까요." },
  { id: "p2", area: "neck", title: "앉은 채로 목 천천히 풀기", min: 1, place: "indoor", low: true, desc: "의자에 앉은 그대로, 고개를 아주 천천히 기울이는 동작만 있어요." },
  { id: "p3", area: "neck", title: "거북목 되돌리기", min: 5, place: "indoor", low: false, desc: "화면 쪽으로 나온 목을 제자리로 데려오는 동작이에요." },
  { id: "p4", area: "back", title: "퇴근 전 허리 회복", min: 5, place: "indoor", low: false, desc: "하루 종일 앉아 있던 허리를 되돌리고 나가는 시간이에요." },
  { id: "p5", area: "back", title: "앉은 자리 허리 부담 덜기", min: 3, place: "indoor", low: true, desc: "등을 의자에 붙이고 자세만 바로잡습니다. 일어서지 않아요." },
  { id: "p6", area: "eye", title: "30초 눈 쉬기", min: 1, place: "indoor", low: true, desc: "화면에서 잠깐만 눈을 떼면 됩니다. 자리에서 그대로 할 수 있어요." },
  { id: "p7", area: "wrist", title: "손목·관절 보호 이완", min: 3, place: "indoor", low: true, desc: "반복해서 쓰신 손목을 쉬게 해주는 동작이에요." },
  { id: "p8", area: "leg", title: "종아리 피로 풀기", min: 5, place: "indoor", low: false, desc: "오래 서 계셨죠. 종아리부터 천천히 풀어볼까요." },
  { id: "p9", area: "leg", title: "앉아서 다리 부종 케어", min: 3, place: "indoor", low: true, desc: "의자에 앉아 발끝만 천천히 움직이면 됩니다." },
  { id: "p10", area: "breath", title: "수업 전 목소리 이완 호흡", min: 1, place: "indoor", low: true, desc: "교실에 들어가기 전 잠깐이면 돼요. 목을 열어두면 하루가 수월합니다." },
  { id: "p11", area: "breath", title: "3분 숨 고르기", min: 3, place: "indoor", low: true, desc: "창가나 복도 끝, 어디든 좋아요. 숨만 천천히 쉬면 됩니다." },
  { id: "p12", area: "breath", title: "잠들기 전 이완 호흡", min: 10, place: "indoor", low: true, desc: "누운 채로 할 수 있어요. 하루를 닫는 시간입니다." },
  { id: "p13", area: "walk", title: "복도 한 바퀴 걷기", min: 5, place: "indoor", low: false, desc: "교실을 나와 복도 끝까지만 다녀오면 돼요." },
  { id: "p14", area: "walk", title: "해 진 뒤 저녁 산책", min: 10, place: "outdoor", low: false, desc: "더위가 가신 시간에 천천히 걷는 코스예요." },
  { id: "p15", area: "back", title: "전신 1분 기지개", min: 1, place: "indoor", low: true, desc: "자리에서 크게 한 번 펴는 것만으로 충분합니다." },
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

export const MIND_DAYS = [
  { day: "금", reading: "안쪽은 생각보다 차분하게 버티고 있어요.", picked: "고요한 중심 · 자연스러운 흐름" },
  { day: "목", reading: "정리되지 않은 채 쌓인 것이 있는 것 같아요.", picked: "엉킨 결 · 뿌리와 무게" },
  { day: "수", reading: "몸이 먼저 움직이고 싶어 하는 날 같아요.", picked: "생동하는 움직임" },
  { day: "화", reading: "지금은 멈춰 있고 싶은 마음이 커요.", picked: "조용한 정지 · 눈부신 소란" },
  { day: "월", reading: "흐트러진 것을 정돈하고 싶은 마음이 있어요.", picked: "질서와 균형 · 서로의 연결" },
];

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
  const byMin: Record<number, number> = {};
  for (const d of DONE_WEEK) {
    const pg = PROGRAMS.find((x) => x.id === d.id);
    if (!pg) continue;
    count += d.n;
    min += pg.min * d.n;
    byMin[pg.min] = (byMin[pg.min] || 0) + d.n;
  }
  return { count, min, byMin };
}

export const WEEKLY_PAST = [
  { label: "3주 전", v: 51 },
  { label: "2주 전", v: 38 },
  { label: "지난주", v: 64 },
];

export interface ObStep {
  kicker: string;
  title: string;
  body: string;
  btn: string;
}

export const OB: ObStep[] = [
  { kicker: "먼저 약속드립니다", title: "이 앱은 선생님을 평가하지 않습니다", body: "점수도 등급도 순위도 만들지 않아요. 시작하기 전에 다섯 가지를 먼저 약속드립니다.", btn: "다음" },
  { kicker: "무엇을 모으나요", title: "모으는 것은 이만큼이 전부예요", body: "모두 선생님께 제안을 드리는 데만 쓰입니다.", btn: "다음" },
  { kicker: "동의", title: "수집·이용 동의서", body: "", btn: "동의하고 계속" },
  { kicker: "직군", title: "어떤 일을 하고 계신가요?", body: "쌓이는 피로의 자리가 서로 달라서, 제안하는 내용도 달라집니다. 나중에 바꿀 수 있어요.", btn: "다음" },
  { kicker: "안전 확인 (PAR-Q+)", title: "몸을 움직이기 전에 확인할 게 있어요", body: "운동을 시작하기 전 세계적으로 쓰이는 표준 확인 문항(PAR-Q+, 신체활동 준비 질문지) 7개예요. 몸에 무리가 가는 동작을 권하지 않기 위한 절차이고, 답에 따라 강도만 달라집니다.", btn: "다음" },
  { kicker: "권한", title: "이제 거의 다 왔어요", body: "권한을 허용하지 않아도 나머지는 그대로 동작하지만 허용하시면 더 정확한 결과를 얻을 수 있습니다.", btn: "시작하기" },
];

export const CHAT_INTRO = [
  "안녕하세요 선생님. 저는 소연이라고 해요. 정리해서 말하지 않아도 괜찮아요. 오늘 어떤 하루였는지 그냥 적어주세요.",
];

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
