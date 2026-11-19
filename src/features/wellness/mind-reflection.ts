import { MIND_IMAGES, mindSolution, type MindCardAnswer, type MindCause } from "./mind-card";

const PICTURE_NAMES: Record<string, string> = {
  "scene-forest": "숲길", "scene-bird": "새", "scene-people": "두 사람",
  "scene-window": "창가", "scene-water": "호수", "scene-paths": "갈림길",
  "scene-bridge": "다리", "scene-sea": "바다", "scene-garden": "정원",
  "scene-cafe": "카페", "scene-mountain": "산길", "scene-lantern": "불빛",
};
const CAUSE_PROMPTS: Record<MindCause, string> = {
  "수업": "수업에서 마음에 남은 장면과 다음에 바라는 모습을 하나씩 떠올려보세요.",
  "학생과의 관계": "학생과 실제로 나눈 말과 그때 내가 바랐던 것을 나눠 돌아봐도 좋아요.",
  "학부모와의 소통": "주고받은 연락에서 지금 확인할 일과 다음 업무 시간에 살펴볼 일을 나눠보세요.",
  "업무": "끝낸 일은 인정해 주고, 남은 일 하나는 다음 업무 시간으로 옮겨두어도 좋아요.",
  "동료와의 관계": "실제로 오간 말과 내가 바랐던 반응을 구분하고, 다음에 전하고 싶은 말을 떠올려보세요.",
  "개인생활": "일 밖에서 마음을 차지한 것 중 지금 조정할 수 있는 작은 부분부터 살펴보세요.",
  "특별한 일 없음": "특별한 이유가 없어도 하루의 느낌은 달라질 수 있어요.",
  "기타": "무슨 일이 있었는지와 그때의 느낌을 내 말로 짧게 풀어봐도 좋아요.",
};

function dayReading(a: MindCardAnswer): string {
  const lowMood = typeof a.mood === "number" && a.mood <= 2;
  const goodMood = typeof a.mood === "number" && a.mood >= 4;
  const busy = typeof a.stress === "number" && a.stress >= 4;
  const tired = typeof a.energy === "number" && a.energy <= 2;
  if (a.mood === "skip" && a.stress === "skip" && a.energy === "skip") return "오늘의 상태는 따로 남기지 않으셔서 마음을 추측하지 않고, 그림 앞에서 직접 고른 느낌과 원하는 쉼을 함께 살펴볼게요.";
  let text = busy && goodMood ? "오늘은 좋았던 기분과 신경 쓸 일이 많았던 하루를 함께 남기셨어요. 보람을 느낀 순간과 잠시 내려놓고 싶은 일이 함께 있었는지 돌아봐도 좋아요."
    : busy && lowMood ? "오늘은 기분이 가라앉았고 스트레스도 많았다고 남기셨어요. 바로 이유를 찾거나 하루를 평가하기보다 가장 마음에 남은 순간 하나부터 살펴봐도 괜찮아요."
    : busy ? "오늘 스트레스가 많았다고 남기셨어요. 계속 신경 쓰이던 일 중 오늘은 더 챙기지 않아도 되는 것 하나를 골라보세요."
    : lowMood && tired ? "오늘은 가라앉은 기분과 남은 힘이 적다는 답을 함께 남기셨어요. 지금은 더 해내려 애쓰기보다 편하게 쉬어갈 시간을 먼저 가져도 괜찮아요."
    : lowMood ? "오늘 기분은 가라앉은 쪽에 가까웠다고 남기셨어요. 바로 이름이나 이유를 붙이지 않아도 괜찮아요. 그때 듣고 싶었던 말이나 미처 하지 못한 말이 있었는지 천천히 돌아보세요."
    : tired ? "지금 남은 힘이 적다고 남기셨어요. 오늘 끝낸 일을 하나 떠올리고, 다음 일로 넘어가기 전에 잠깐의 빈 시간을 남겨봐도 좋아요."
    : goodMood ? "오늘 기분은 좋은 쪽에 가까웠다고 남기셨어요. 그 느낌을 계속 유지하려 애쓰기보다 마음에 들었던 순간 하나를 기억해 두세요."
    : "오늘의 마음을 한 가지로 정할 필요는 없어요. 편했던 순간과 신경 쓰였던 순간 가운데 지금 먼저 떠오르는 장면부터 돌아보세요.";
  if (busy && tired) text += " 남은 힘도 적은 편이라고 고르신 만큼, 지금은 잠시 쉬는 쪽에 무게를 두었어요.";
  return text;
}

/** One continuous reading, grounded in reported answers; pictures never supply an assessment. */
export function mindNarrative(a: MindCardAnswer, allowWalk = true): string {
  const solution = mindSolution(a, allowWalk);
  if (!solution) return "";
  const selected = a.imageOrder.flatMap(i => {
    const image = MIND_IMAGES[i];
    const choice = a.images[i];
    const label = choice === null ? undefined : image.choices[choice];
    return label && !/다른 느낌|잘 모르/.test(label) ? [`${PICTURE_NAMES[image.id]}에서 ‘${label}’`] : [];
  });
  const picture = selected.length
    ? `그림을 보며 ${selected.slice(0, 3).join(", ")} 같은 표현을 골랐어요. 이 표현 중 실제 오늘과 닮은 것이 있다면, 그 느낌이 들었던 순간과 연결해 보세요.`
    : "그림에서 느낀 마음은 아직 잘 모르거나 다른 느낌이라고 고르셨어요. 정해진 감정을 찾아 맞추지 않아도 괜찮아요.";
  const causes = a.causes.slice(0, 2).map(c => c === "특별한 일 없음" ? CAUSE_PROMPTS[c] : `‘${c}’도 마음에 영향을 주었다고 남기셨어요. ${CAUSE_PROMPTS[c]}`).join(" ");
  const next = solution.destination === "walk"
    ? "직접 남긴 오늘의 상태와 신체 안전 확인을 바탕으로 가까운 풍경을 잠깐 만나보는 산책을 제안해요. 실제 날씨와 몸 상태를 살피고, 거리나 시간을 채우려 애쓰지 않아도 괜찮아요."
    : solution.destination === "talk"
      ? "지금은 오늘 마음에 남은 일을 한 문장으로 꺼내볼 수 있는 대화를 제안해요. 잘 정리된 이야기일 필요는 없고, 아직 말하고 싶지 않다면 마음쉼터에서 조용히 쉬어가도 좋아요."
      : "지금은 마음쉼터에서 편하게 머무를 공간을 골라보는 건 어떨까요? 잠시 내려놓을 일 하나를 정하고, 소리와 머무는 시간은 편한 만큼 골라보세요. 대화가 더 끌린다면 하고 싶은 말 한 문장으로 시작해도 좋아요.";
  return [dayReading(a), picture, causes, next].filter(Boolean).join(" ");
}
