/**
 * 「오늘의 메이크업」 — 마음온도(figma.site ver.1.2) 4문항 퀵 체크(피부 질감·톤·고민·외출 목적) → 단계별 표.
 * 2026-09-21 사용자 지시 "마음온도에서 나오는 것을 그대로 옮겨줘" — 문항·문구·선택 규칙(원본 J2/V2/X2/Y2/Cb/Sp)을 그대로.
 * 성별로 표가 갈린다(여성 = 메이크업 · 남성 = 그루밍 「데일리케어」) → 성별은 directing/profile.ts.
 * ⚠ 원본 여성 표엔 목적 「오늘 모임」(gathering) 줄이 없어 원본 화면은 빈 결과였다 → 여기선 casual 줄을 대신 준다(내 판단 · 사용자 고지).
 * 순수 · 테스트 makeup.test.ts
 */
import { FEMALE_LOOKS, FEMALE_NONE, MALE_LOOKS, MALE_NONE, type MakeupLook } from "./makeup-data";
import type { Gender } from "./profile";

export interface MakeupOption { id: string; emoji: string; label: string; sub?: string }
export interface MakeupQuestion { key: "texture" | "tone" | "concern" | "occasion"; title: string; options: MakeupOption[] }
export interface MakeupAnswers { texture: string; tone: string; concern: string; occasion: string }
export interface MakeupWeather { temperature: number; humidity: number }

const TONE: MakeupOption[] = [
  { id: "warm", emoji: "🌞", label: "웜톤" },
  { id: "cool", emoji: "🌙", label: "쿨톤" },
  { id: "neutral", emoji: "⚖️", label: "뉴트럴톤" },
];

/** 문항·선택지 — 원본 화면 글자 그대로(이모지 포함). */
export const MAKEUP_QUESTIONS: Readonly<Record<Gender, MakeupQuestion[]>> = {
  female: [
    { key: "texture", title: "피부 질감", options: [
      { id: "dry", emoji: "🌵", label: "푸석하고 건조함" },
      { id: "normal", emoji: "💧", label: "매끈하고 보통" },
      { id: "oily", emoji: "🍳", label: "번들거리는 유분" },
    ] },
    { key: "tone", title: "피부 톤", options: TONE },
    { key: "concern", title: "오늘의 고민", options: [
      { id: "dullness", emoji: "🎞️", label: "빛 바랜 안색", sub: "(노란기/칙칙함)" },
      { id: "redness", emoji: "🍎", label: "예민한 붉은기", sub: "(홍조/민감)" },
      { id: "puffiness", emoji: "☁️", label: "포근한 부기", sub: "(부기/퉁퉁함)" },
      { id: "none", emoji: "🌟", label: "고민 없음", sub: "(건강한 피부)" },
    ] },
    { key: "occasion", title: "외출 목적", options: [
      { id: "daily", emoji: "☕", label: "출근은 기분좋게" },
      { id: "special", emoji: "📸", label: "행복한 데이트" },
      { id: "casual", emoji: "🧘", label: "여유있는 외출" },
      { id: "gathering", emoji: "👥", label: "오늘 모임, 뭐 입지?" },
    ] },
  ],
  male: [
    { key: "texture", title: "피부 질감", options: [
      { id: "rough", emoji: "❄️", label: "푸석하고 거친 피부" },
      { id: "smooth", emoji: "🧊", label: "매끈하고 깔끔함" },
      { id: "oily", emoji: "🛢️", label: "번들거리는 개기름" },
    ] },
    { key: "tone", title: "피부 톤", options: TONE },
    { key: "concern", title: "오늘의 고민", options: [
      { id: "beard", emoji: "🪒", label: "수염 자국", sub: "(안색 저하)" },
      { id: "dull", emoji: "🌚", label: "칙칙하고 어두운 톤", sub: "(피로함)" },
      { id: "trouble", emoji: "🍎", label: "울긋불긋 트러블", sub: "(여드름)" },
      { id: "none", emoji: "🌟", label: "고민 없음", sub: "(건강한 피부)" },
    ] },
    { key: "occasion", title: "외출 목적", options: [
      { id: "business", emoji: "💼", label: "출근은 기분좋게" },
      { id: "date", emoji: "🕺", label: "행복한 데이트" },
      { id: "casual", emoji: "🧢", label: "여유있는 외출" },
      { id: "gathering", emoji: "👥", label: "오늘 모임, 뭐 입지?" },
    ] },
  ],
};

/** 원본 Cb — 여성 톤 팁. */
function femaleToneTip(tone: string): string {
  return ({
    warm: "웜톤에는 코랄, 피치, 골드 계열이 잘 어울려요! 따뜻한 컬러로 생기를 더하세요.",
    cool: "쿨톤에는 핑크, 로즈, 실버 계열이 잘 어울려요! 시원한 컬러로 청순한 이미지를 연출하세요.",
    neutral: "뉴트럴톤은 모든 색상이 잘 어울려요! 뉴드, 베이지, MLBB 컬러가 특히 자연스러워요.",
  } as Record<string, string>)[tone] || "";
}
/** 원본 V2 안의 남성 톤 팁. */
function maleToneTip(tone: string): string {
  return tone === "warm" ? "웜톤에는 베이지, 브라운 계열의 톤업 제품이 자연스러워요!"
    : tone === "cool" ? "쿨톤에는 핑크 베이스, 아이보리 계열이 화사한 피부톤을 만들어줘요!"
    : "뉴트럴톤은 대부분의 톤업 제품이 잘 어울려요. 자연스러운 베이지 계열을 추천드려요!";
}

export interface MakeupResult { title: string; emoji: string; steps: MakeupLook["steps"]; tip: string }

/** 원본 J2(여성)/V2(남성) + X2/Y2(고민 없음). 결과가 없는 조합은 만들지 않는다 — 어느 조합이든 표 한 줄을 준다. */
export function pickMakeup(gender: Gender, a: MakeupAnswers): MakeupResult {
  const toneTip = gender === "female" ? femaleToneTip(a.tone) : maleToneTip(a.tone);
  const withTip = (tip: string) => `${tip}\n\n💡 ${toneTip}`;
  if (a.concern === "none") {
    const table = gender === "female" ? FEMALE_NONE : MALE_NONE;
    const fallback = gender === "female" ? "normal-daily" : "smooth-casual"; // 원본 X2/Y2 의 기본 줄
    const o = table[`${a.texture}-${a.occasion}`] || table[fallback];
    return { title: o.title, emoji: o.emoji, steps: o.steps, tip: withTip(o.tip) };
  }
  const looks = gender === "female" ? FEMALE_LOOKS : MALE_LOOKS;
  const find = (occasion: string) => looks.find((l) => l.skinTexture === a.texture && l.skinConcern === a.concern && l.occasion === occasion);
  // 여성 gathering 은 원본 표에 없다(머리 주석) → casual 로.
  const hit = find(a.occasion) || (gender === "female" && a.occasion === "gathering" ? find("casual") : undefined) || looks[0];
  return { title: hit.title, emoji: hit.emoji, steps: hit.steps, tip: withTip(hit.tip) };
}

/** 원본 Sp — 기온·습도로 한 줄. 날씨를 모르면 빈 문장(원본도 그렇다). */
export function weatherAnalysis(w: MakeupWeather | null, texture: string, concern: string): string {
  if (!w) return "";
  const { temperature: n, humidity: i } = w;
  return (texture === "dry" || texture === "rough") && i > 70 ? `현재 습도가 ${i}%로 높아요. 무거운 크림 대신 수분 레이어링을 추천드려요. 여러 층의 수분 제품이 더 효과적이에요.`
    : texture === "oily" && i > 70 ? `습도가 ${i}%로 높아 피지 분비가 더 활발할 수 있어요. 매트 제품으로 완벽히 조절하세요!`
    : (texture === "dry" || texture === "rough") && n < 5 ? `현재 ${n}°C로 추운 날씨예요. 피부가 더 건조해질 수 있으니 보습을 충분히 해주세요.`
    : concern === "puffiness" && n < 10 ? `${n}°C의 추운 날씨지만 림프 순환을 위해 마사지는 필수예요!`
    : concern === "trouble" && n > 25 ? `${n}°C로 더운 날씨는 트러블을 악화시킬 수 있어요. 진정 제품을 충분히 사용하세요.`
    : concern === "beard" && n < 5 ? `${n}°C의 추운 날씨는 면도 후 피부를 더 예민하게 만들 수 있어요. 애프터쉐이브는 필수입니다!`
    : concern === "dull" && i > 60 ? `습도 ${i}%의 흐린 날씨는 피부를 더 칙칙해 보이게 만들 수 있어요. 브라이트닝 제품으로 생기를 더하세요!`
    : `현재 기온 ${n}°C, 습도 ${i}%를 고려한 맞춤 솔루션입니다.`;
}
