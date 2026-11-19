/**
 * Selection-based adaptation of PITR S1/S2 (rain), S5 (contact), R4/R5 (adequacy).
 * These are app-specific symbolic self-report indicators, not original PITR scores or clinical measures.
 */
export const RAIN_DIMENSIONS = [
  { key: "rain", title: "오늘의 부담을 비로 표현하면?", hint: "지금 느끼는 일이나 걱정의 크기와 가까운 비를 골라주세요.", image: "/wellness/rain-story/pitr-v2-rain.jpg", options: [
    { id: "light", label: "가늘게 내리는 비", detail: "부담이 한쪽에 머무는 느낌", alt: "같은 우산을 든 인물과 공원에 가늘고 성기게 내리는 비" },
    { id: "steady", label: "계속 내리는 비", detail: "신경 쓸 일이 이어지는 느낌", alt: "같은 우산을 든 인물과 공원에 꾸준히 내리는 비" },
    { id: "heavy", label: "세차게 쏟아지는 비", detail: "여러 부담이 몰려오는 느낌", alt: "같은 우산을 든 인물과 공원에 굵고 빽빽하게 내리는 비" },
  ] },
  { key: "exposure", title: "그 부담이 나에게 닿는 느낌은?", hint: "주변 상황의 크기와 별개로, 내가 받는 영향에 가까운 모습을 골라주세요.", image: "/wellness/rain-story/pitr-v2-exposure.jpg", options: [
    { id: "dry", label: "몸에 거의 닿지 않아요", detail: "부담과 거리를 둘 수 있는 느낌", alt: "넓은 처마 아래 서 있어 비가 몸에 닿지 않는 인물" },
    { id: "partial", label: "몸의 일부에 닿아요", detail: "부담이 조금씩 스며드는 느낌", alt: "작은 우산 밖 어깨와 바지 끝에 비가 닿는 인물" },
    { id: "soaked", label: "온몸으로 맞고 있어요", detail: "부담을 직접 받아내는 느낌", alt: "우산 없이 비를 맞아 겉옷과 바지가 젖은 인물" },
  ] },
  { key: "protection", title: "지금 내가 쓸 수 있는 보호는?", hint: "도움을 받을 사람, 내가 쓰는 방법, 쉴 여유를 떠올리며 골라주세요. 있으면 좋겠는 것보다 지금 쓸 수 있는 것에 가까운 그림이에요.", image: "/wellness/rain-story/pitr-v2-protection.jpg", options: [
    { id: "none", label: "비를 막아줄 것이 없어요", detail: "기댈 도움이나 여유가 적은 느낌", alt: "비를 막아줄 우산이나 지붕 없이 열린 길에 서 있는 인물" },
    { id: "limited", label: "있지만 충분하지 않아요", detail: "도움이 있어도 다 가려지지 않는 느낌", alt: "어깨를 충분히 가리지 못하는 작은 우산을 든 인물" },
    { id: "enough", label: "충분히 비를 피할 수 있어요", detail: "활용할 도움이나 여유가 있는 느낌", alt: "넓은 정자 지붕 아래 비를 피할 마른 공간이 있는 인물" },
  ] },
] as const;
export type RainDimension = typeof RAIN_DIMENSIONS[number]["key"];
export interface RainStoryAnswer {
  version: 2;
  rain: "light" | "steady" | "heavy" | null;
  exposure: "dry" | "partial" | "soaked" | null;
  protection: "none" | "limited" | "enough" | null;
  completedAt: string | null;
}
export function emptyRainStory(): RainStoryAnswer { return {version:2,rain:null,exposure:null,protection:null,completedAt:null}; }
export function rainStoryReady(a: RainStoryAnswer): boolean {
  return a.version === 2 && RAIN_DIMENSIONS.every(d => d.options.some(o => o.id === a[d.key]));
}
export function chooseRainOption(a: RainStoryAnswer, key: RainDimension, id: string): RainStoryAnswer {
  const dimension = RAIN_DIMENSIONS.find(d => d.key === key);
  if (!dimension?.options.some(o => o.id === id)) return a;
  return {...(a.version===2 ? a : emptyRainStory()),[key]:id,completedAt:null};
}
export function completeRainStory(a: RainStoryAnswer, now: Date): RainStoryAnswer {
  return rainStoryReady(a) ? {...a,completedAt:now.toISOString()} : a;
}

// Equal 1–3 directional coding follows the source's progression, NOT its drawing measurements/totals.
// The two burden dimensions are averaged to match the single resource dimension's range.
// No numeric values, category codes or cutoffs are returned to the view, stored, or transmitted.
const RAIN = {light:1,steady:2,heavy:3} as const;
const CONTACT = {dry:1,partial:2,soaked:3} as const;
const RESOURCE = {none:1,limited:2,enough:3} as const;
export interface RainStoryResult { title: string; text: string }
export function rainStoryResult(a: RainStoryAnswer): RainStoryResult | null {
  if (!a.completedAt || !rainStoryReady(a)) return null;
  const rain=a.rain!, contact=a.exposure!, resource=a.protection!;
  const burden=(RAIN[rain]+CONTACT[contact])/2;
  const balance=RESOURCE[resource]-burden;
  const opening={
    light:{
      dry:"작은 걱정은 있어도 하루 전체를 흔들 만큼 가까이 들어오지는 않습니다. 마음 한쪽에 걸리는 일과 내 생활 사이에 거리가 남아 있습니다.",
      partial:"크게 드러나는 일보다 작은 걱정이 틈틈이 마음을 건드립니다. 일상을 이어갈 수 있어도 신경 쓰이는 부분까지 말끔히 사라진 하루는 아닙니다.",
      soaked:"겉으로는 작은 일처럼 보여도 내가 느끼는 무게까지 가벼운 것은 아닙니다. 상황의 크기보다 마음에 남는 영향이 더 큰 하루입니다.",
    },
    steady:{
      dry:"신경 쓸 일이 계속 이어져도 모든 걱정을 하루 종일 끌어안고 있지는 않습니다. 일이 있는 자리와 내 마음이 쉬는 자리 사이에 경계가 남아 있습니다.",
      partial:"해야 할 일과 신경 쓰이는 일이 일상의 틈으로 조금씩 들어옵니다. 하루를 이어가고는 있지만, 마음 한편은 아직 끝나지 않은 일에 붙잡혀 있습니다.",
      soaked:"한 번의 큰 사건보다 계속 이어지는 부담이 마음을 차지하는 하루입니다. 하나를 마쳐도 다음 일이 남아 있어 긴장이 쉽게 끊기지 않습니다.",
    },
    heavy:{
      dry:"여러 일이 한꺼번에 몰려와도 그 모든 일이 마음 깊숙이 들어오지는 않습니다. 주변의 분주함과 내가 실제로 받는 영향 사이에 간격이 남아 있습니다.",
      partial:"한꺼번에 챙길 일이 많아 마음이 여러 방향으로 나뉩니다. 모든 부담을 그대로 떠안지는 않아도, 그중 일부는 내 생활과 마음에 남아 있습니다.",
      soaked:"한꺼번에 밀려오는 일들의 무게가 가까이 닿아 있습니다. 해야 할 일을 해내는 동안에도 피로와 긴장이 쉽게 가시지 않는 하루입니다.",
    },
  }[rain][contact];
  const support={
    none:"이를 나눌 도움이나 숨을 돌릴 여유가 선명하지 않아, 내 힘으로 감당해야 하는 몫이 더 크게 다가옵니다.",
    limited:"기댈 곳이나 쓸 수 있는 방법은 있지만, 필요한 만큼 부담을 덜어주지는 못합니다. 혼자 버티는 때보다는 낫지만 마음을 충분히 놓기에는 아쉬움이 남습니다.",
    enough:"부담을 나눌 도움이나 나를 지켜줄 방법은 갖고 있습니다. 그 버팀목이 있다는 사실과 지금 마음이 편안한지는 별개의 문제입니다.",
  }[resource];
  let title:string, conclusion:string;
  if(balance>0){
    title="걱정 속에도 나를 지킬 여유가 있는 하루";
    conclusion=contact==="soaked"
      ? "힘든 마음과 도움을 받을 수 있다는 사실이 함께 있는 하루입니다. 기댈 곳이 있어도 이미 쌓인 피로가 바로 사라지는 것은 아닙니다. 지금의 버팀목이 실제로 부담을 얼마나 덜어주고 있는지가 중요합니다."
      : "걱정이 있어도 그것이 내 생활을 전부 차지하지는 않습니다. 문제를 없애는 힘뿐 아니라 영향을 줄이고 다시 내 자리로 돌아올 여유가 함께 있는 하루입니다.";
  }else if(balance<0){
    title="나눌 곳보다 감당할 몫이 큰 하루";
    conclusion="마음이 버거운 이유를 개인의 능력에서만 찾을 필요는 없습니다. 받아내는 몫에 비해 나눌 수단이 적으면 같은 일도 더 무겁습니다. 지금 마음의 무게에는 일 자체의 부담과 혼자 떠안는 부담이 함께 들어 있습니다.";
  }else{
    title=burden===3 ? "버티고 있지만, 여유롭지는 않은 하루" : burden===1 ? "큰 걱정은 없어도 기댈 여유는 적은 하루" : "하루를 이어가지만 여유가 빠듯한 마음";
    conclusion=burden===1
      ? "지금 크게 힘들지 않은 것과 언제든 기댈 곳이 충분한 것은 다릅니다. 평온함을 지탱하는 바탕이 넉넉한지, 단지 감당할 일이 아직 많지 않은지를 구분할 필요가 있는 하루입니다."
      : burden===3
        ? "부담을 감당할 힘과 도움은 있어도 그 무게까지 가벼워진 건 아닙니다. ‘괜찮다’와 ‘힘들다’가 함께 있다는 점이 이 하루의 중심입니다. 버틸 수 있다는 이유로 힘들지 않은 것은 아닙니다."
        : "하루를 이어갈 힘은 있지만, 버티고 난 뒤 내게 남는 여유는 넉넉하지 않습니다. 해내고 있다는 사실만으로 마음까지 편안한 것은 아닙니다. 익숙하게 버티는 것과 충분히 회복되는 것 사이에 차이가 남아 있습니다.";
  }
  if(rain==="heavy"&&contact==="soaked"&&resource==="enough") return {
    title,
    text:"부담을 감당할 힘과 도움은 있어도, 그 무게까지 가벼워진 건 아닙니다. 해야 할 일을 해내는 동안에도 피로와 긴장은 남을 수 있습니다. ‘괜찮다’와 ‘힘들다’가 함께 있는 하루입니다. 버틸 수 있다는 이유로 힘들지 않은 것은 아닙니다.",
  };
  return {title,text:[opening,support,conclusion].join(" ")};
}
export function rainStoryNarrative(a: RainStoryAnswer): string { return rainStoryResult(a)?.text ?? ""; }
