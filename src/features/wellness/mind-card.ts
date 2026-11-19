/** Picture responses are expressive only. They never contribute to a clinical score. */
export const MIND_IMAGES = [
  { id: "scene-forest", src: "/wellness/mind-card/scene-forest.jpg", alt: "나무 사이로 밝은 길이 이어지고 작은 새가 날아가는 수채화", question: "이 길을 바라보면 지금 어떤 마음이 드나요?", choices: ["차분해지는 느낌", "어딘가 가보고 싶어요", "잠시 멈추고 싶어요", "막막하게 느껴져요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-bird", src: "/wellness/mind-card/scene-bird.jpg", alt: "날개를 펼친 흰 새와 둥글게 휘어진 잎사귀가 어우러진 수채화", question: "이 새의 모습에서 어떤 느낌이 드나요?", choices: ["가벼움", "기대감", "조심스러움", "애쓰는 느낌", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-people", src: "/wellness/mind-card/scene-people.jpg", alt: "큰 나무 아래 벤치 양쪽에 두 사람이 앉아 있는 수채화", question: "이 장면을 보며 어떤 느낌이 드나요?", choices: ["편안한 동행", "혼자만의 여유", "조금 서먹한 느낌", "누군가를 기다리는 마음", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-window", src: "/wellness/mind-card/scene-window.jpg", alt: "열린 창문 옆 빈 안락의자와 찻잔이 놓인 수채화", question: "지금 이 공간에 있다면 어떤 기분일까요?", choices: ["편안하게 쉬고 싶어요", "조용히 생각하고 싶어요", "누군가와 함께 있고 싶어요", "밖으로 나가고 싶어요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-water", src: "/wellness/mind-card/scene-water.jpg", alt: "잔잔한 호수의 작은 나무배와 선착장, 멀리 펼쳐진 언덕의 수채화", question: "이 풍경을 바라보면 어떤 느낌이 드나요?", choices: ["잔잔하고 편안해요", "천천히 떠나보고 싶어요", "그 자리에 머물고 싶어요", "조금 쓸쓸해요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-paths", src: "/wellness/mind-card/scene-paths.jpg", alt: "풀밭에서 나무 그늘과 낮은 언덕 쪽으로 두 갈래 길이 이어지는 수채화", question: "이 갈림길 앞에서 어떤 마음이 드나요?", choices: ["새로운 길이 기대돼요", "천천히 골라보고 싶어요", "익숙한 길이 편해요", "결정을 잠시 미루고 싶어요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-bridge", src: "/wellness/mind-card/scene-bridge.jpg", alt: "나무 사이 맑은 개울을 건너는 작은 나무다리의 수채화", question: "이 다리를 바라보면 어떤 마음이 드나요?", choices: ["건너편이 기대돼요", "조심스럽게 가고 싶어요", "여기서 잠시 머물고 싶어요", "건너기가 망설여져요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-sea", src: "/wellness/mind-card/scene-sea.jpg", alt: "낮은 파도와 넓은 하늘이 펼쳐진 조용한 모래 해변의 수채화", question: "이 바다를 보면 어떤 느낌이 드나요?", choices: ["마음이 시원해져요", "느긋하게 쉬고 싶어요", "조금 쓸쓸해요", "너무 넓어 막막해요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-garden", src: "/wellness/mind-card/scene-garden.jpg", alt: "화분과 꽃, 물뿌리개가 놓인 작은 정원의 수채화", question: "이 정원에서 어떤 기분이 드나요?", choices: ["생기가 느껴져요", "천천히 돌보고 싶어요", "가만히 바라보고 싶어요", "무언가 달라지길 기다려요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-cafe", src: "/wellness/mind-card/scene-cafe.jpg", alt: "창가의 빈 카페 테이블에 찻잔과 닫힌 공책이 놓인 수채화", question: "이 자리에 앉는다면 어떤 마음일까요?", choices: ["혼자 조용히 쉬고 싶어요", "누군가와 이야기하고 싶어요", "하루를 정리하고 싶어요", "아무 생각 없이 있고 싶어요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-mountain", src: "/wellness/mind-card/scene-mountain.jpg", alt: "낮은 산으로 이어지는 산책길과 길가의 벤치를 그린 수채화", question: "이 산길 앞에서 어떤 마음이 드나요?", choices: ["한 걸음 내딛고 싶어요", "내 속도로 천천히 가고 싶어요", "아직 멀게 느껴져요", "벤치에서 잠시 쉬고 싶어요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },
  { id: "scene-lantern", src: "/wellness/mind-card/scene-lantern.jpg", alt: "해 질 녘 열린 정원 문 옆에 따뜻한 등이 켜진 수채화", question: "이 불빛을 보면 어떤 느낌이 드나요?", choices: ["마음이 놓여요", "누군가 기다려주는 것 같아요", "혼자 생각에 잠기고 싶어요", "새로운 시작이 떠올라요", "다른 느낌이 들어요", "아직 잘 모르겠어요"] },

] as const;

/** Four distinct pictures per test; answers stay indexed by the canonical image catalogue. */
export const MIND_TEST_IMAGE_COUNT = 4;
export function drawMindImageOrder(random: () => number = Math.random): number[] {
  const order = MIND_IMAGES.map((_,index) => index);
  for(let i=order.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [order[i],order[j]]=[order[j],order[i]];
  }
  return order.slice(0,MIND_TEST_IMAGE_COUNT);
}

export type DailyValue = 1 | 2 | 3 | 4 | 5;
export type DailyAnswer = DailyValue | "skip" | null;
export type DailyKey = "mood" | "stress" | "energy";
export const DAILY_QUESTIONS: readonly { key: DailyKey; question: string; labels: readonly string[] }[] = [
  { key: "mood", question: "오늘 하루, 전반적인 기분은 어땠나요?", labels: ["많이 가라앉았어요", "조금 가라앉았어요", "보통이었어요", "대체로 좋았어요", "아주 좋았어요"] },
  { key: "stress", question: "오늘 느낀 스트레스는 어느 정도였나요?", labels: ["거의 없었어요", "조금 있었어요", "보통이었어요", "많이 있었어요", "아주 많이 있었어요"] },
  { key: "energy", question: "지금 몸과 마음에 남은 힘은 어떤가요?", labels: ["쉬고 싶어요", "힘이 적은 편이에요", "보통이에요", "힘이 남아 있어요", "충분해요"] },
];
export const MIND_CAUSES = ["수업", "학생과의 관계", "학부모와의 소통", "업무", "동료와의 관계", "개인생활", "특별한 일 없음", "기타"] as const;
export type MindCause = typeof MIND_CAUSES[number];
export type MindDestination = "space" | "talk" | "walk";
export interface MindCardAnswer {
  version: 1;
  images: (number | null)[];
  imageOrder: number[];
  mood: DailyAnswer;
  stress: DailyAnswer;
  energy: DailyAnswer;
  causes: MindCause[];
  completedAt: string | null;
}
export function emptyMindCard(random: () => number = Math.random): MindCardAnswer {
  return { version: 1, images: MIND_IMAGES.map(() => null), imageOrder: drawMindImageOrder(random), mood: null, stress: null, energy: null, causes: [], completedAt: null };
}
export function imagesComplete(a: MindCardAnswer): boolean {
  if (!Array.isArray(a.imageOrder) || a.imageOrder.length !== MIND_TEST_IMAGE_COUNT || new Set(a.imageOrder).size !== MIND_TEST_IMAGE_COUNT) return false;
  if (!a.imageOrder.every(i => Number.isInteger(i) && i >= 0 && i < MIND_IMAGES.length)) return false;
  return Array.isArray(a.images) && a.images.length === MIND_IMAGES.length && MIND_IMAGES.every((image,i) => a.imageOrder.includes(i)
    ? Number.isInteger(a.images[i]) && a.images[i]! >= 0 && a.images[i]! < image.choices.length
    : a.images[i] === null);
}
export function dailyComplete(a: Pick<MindCardAnswer, "mood" | "stress" | "energy">): boolean {
  return DAILY_QUESTIONS.every(({key}) => a[key] === "skip" || (Number.isInteger(a[key]) && Number(a[key]) >= 1 && Number(a[key]) <= 5));
}
export function completeMindCard(a: MindCardAnswer, now: Date): MindCardAnswer {
  return imagesComplete(a) && dailyComplete(a) ? { ...a, completedAt: now.toISOString() } : a;
}
export interface MindSolution {
  title: string;
  message: string;
  steps: readonly string[];
  destination: MindDestination;
  action: string;
}
/** Suggestions use explicit daily self-report, never the image's shape, colour or associations. */
export function mindSolution(a: MindCardAnswer, allowWalk = true): MindSolution | null {
  if (!a.completedAt || !imagesComplete(a) || !dailyComplete(a)) return null;
  return dailyMindSolution(a, allowWalk);
}
/** Shared self-report suggestions; picture choices never select an activity. */
export function dailyMindSolution(a: Pick<MindCardAnswer, "mood" | "stress" | "energy">, allowWalk = true): MindSolution | null {
  if (!dailyComplete(a)) return null;
  if (typeof a.stress === "number" && a.stress >= 4) return {
    title: "잠시, 나를 위한 여백을 만들어요",
    message: "오늘 해야 할 일에서 잠깐 떨어져 있어도 괜찮아요. 지금은 편안하게 머무를 공간부터 골라 보세요.",
    steps: ["화면에서 잠시 눈을 떼고 편한 자세를 찾아보세요.", "어깨와 손에 들어간 힘을 편안한 만큼 풀어보세요.", "마음쉼터에서 원하는 공간과 소리를 직접 골라보세요."],
    destination: "space", action: "마음쉼터에서 잠시 쉬기",
  };
  if (typeof a.energy === "number" && a.energy <= 2) return {
    title: "오늘의 마무리는 작고 편안하게",
    message: "무언가 더 해내지 않아도 괜찮아요. 새로운 일보다 부담 없이 쉬어갈 시간을 제안해요.",
    steps: ["지금 하던 일을 잠시 멈춰도 되는지 살펴보세요.", "물 한 잔을 천천히 마시며 잠깐 쉬어보세요.", "마음쉼터에서 조용히 머물러도 좋아요."],
    destination: "space", action: "편안한 공간 고르기",
  };
  if (typeof a.mood === "number" && a.mood <= 2) return {
    title: "마음을 말로 풀어볼 시간",
    message: "오늘 마음에 남은 일을 한 문장으로 꺼내보는 건 어떨까요? 정리된 이야기일 필요는 없어요.",
    steps: ["오늘 마음에 남아 있는 순간 하나를 떠올려보세요.", "하고 싶은 말부터 편하게 시작해 보세요.", "말하고 싶지 않으면 조용히 쉬어가도 괜찮아요."],
    destination: "talk", action: "대화로 마음 풀어보기",
  };
  if (typeof a.mood === "number" && a.mood >= 3 && typeof a.energy === "number" && a.energy >= 3 && typeof a.stress === "number" && a.stress <= 3 && allowWalk) return {
    title: "잠깐의 바깥 풍경을 더해봐요",
    message: "여건이 괜찮다면 가까운 곳의 풍경을 바라보며 잠깐 걸어보세요. 멀리 가거나 목표를 채울 필요는 없어요.",
    steps: ["현재 날씨와 몸 상태를 먼저 살펴보세요.", "오늘의 산책에서 주변 산책로를 찾아보세요.", "불편하면 멈추고 편안한 곳으로 돌아오세요."],
    destination: "walk", action: "오늘의 산책 살펴보기",
  };
  return {
    title: "지금 끌리는 쉼부터 골라봐요",
    message: "마음을 꼭 설명하지 않아도 괜찮아요. 조용한 공간에서 잠깐 쉬거나 대화하며 오늘을 마무리해 보세요.",
    steps: ["잠깐 머물고 싶은 공간을 골라보세요.", "소리는 원할 때만 켜고 편한 만큼 머물러보세요.", "다른 도움이 필요하면 대화로 이어가도 좋아요."],
    destination: "space", action: "나에게 맞는 쉼 고르기",
  };
}

/** Draft only: opening chat does not send this text or the raw answers. */
export function mindChatDraft(a: MindCardAnswer): string {
  const causes = a.causes.filter(c => c !== "특별한 일 없음");
  return causes.length ? `오늘 마음카드를 마쳤어요. ${causes.join(", ")}에 관해 이야기하고 싶어요.` : "오늘 마음카드를 마쳤어요. 오늘 하루에 대해 편하게 이야기하고 싶어요.";
}
