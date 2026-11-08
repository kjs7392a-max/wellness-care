/** Scene choices are descriptive only: never convert them into mood/risk scores. */
export const RAIN_OPTIONS = ["가랑비", "보통 비", "굵은 비", "세찬 비"] as const;
export const PLACE_OPTIONS = ["우산 아래", "비 내리는 길", "처마 아래", "정류장 안"] as const;
export type SceneChoice = 0 | 1 | 2 | 3;
export type RainCardAnswer = { rain: SceneChoice | null; place: SceneChoice | null; note: string; finished: boolean };
export const EMPTY_RAIN_CARD: RainCardAnswer = { rain: null, place: null, note: "", finished: false };
export const RAIN_NOTE_MAX = 120;
export function sceneReady(a: RainCardAnswer) { return a.rain !== null && a.place !== null; }
export function changeScene(a: RainCardAnswer, key: "rain" | "place", value: SceneChoice | null): RainCardAnswer {
  // The previous note referred to a different scene: ask again instead of silently reusing it.
  return { ...a, [key]: value, note: "", finished: false };
}
export function finishRainCard(a: RainCardAnswer, skip = false): RainCardAnswer {
  return sceneReady(a) ? { ...a, note: skip ? "" : a.note.trim().slice(0, RAIN_NOTE_MAX), finished: true } : a;
}
export function sceneDescription(a: RainCardAnswer) {
  return sceneReady(a) ? `${RAIN_OPTIONS[a.rain!]}가 내리는 ${PLACE_OPTIONS[a.place!]} 장면` : "";
}
export function rainChatDraft(a: RainCardAnswer) {
  const scene = sceneDescription(a);
  return a.note.trim() ? `오늘 마음카드에서 ${scene}을 골랐어요. 그 장면이 마음에 닿은 이유는 ${a.note.trim()}` : `오늘 마음카드에서 ${scene}을 골랐어요. 이 장면에 대해 조금 이야기하고 싶어요.`;
}
