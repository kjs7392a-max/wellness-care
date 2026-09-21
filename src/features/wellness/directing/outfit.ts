/**
 * 「오늘의 코디」 — 마음온도(figma.site ver.1.2) 규칙을 그대로(원본 iN/oN/aN/rN/nN/sN/tN/eN/wp · 2026-09-21 사용자 지시 "그대로 옮겨줘").
 * 입력 = 장면 4(출근·외출·데이트·모임) × 기온 × 성별 × 나이 × 비/눈. 문장은 원본 그대로 · 함수 이름만 읽히게 바꿨다.
 * ⚠ 원본은 OpenWeather 코드("Rain"·"Drizzle"·"Snow")를 본다 → 우리 날씨 키(rain)는 "Rain" 으로 넘긴다(WellnessApp 의 입력 조립 참고).
 * 순수 · 테스트 outfit.test.ts
 */
import { type AgeBand, type Gender, ageOfBand } from "./profile";

export type Scene = "work" | "casual" | "date" | "gathering";
export type WeatherCode = "Rain" | "Drizzle" | "Snow" | "Clear";
export interface Item { name: string; description: string }
export interface OutfitCard { scene: Scene; timeLabel: string; headline: string; description: string; outer: Item; pants: Item; shoes: Item; styleAnalysis: string; blogSearchKeyword: string; naverSearchQuery: string }
export interface OutfitInput { temperature: number; weatherCode: WeatherCode; gender: Gender; ageBand: AgeBand; mbti: string }

export const SCENES: readonly Scene[] = ["work", "casual", "date", "gathering"];

/** 원본 wp — 나이 → 「N대」. */
export const ageDecade = (e: number): string => e < 20 ? "10대" : e < 30 ? "20대" : e < 40 ? "30대" : e < 50 ? "40대" : e < 60 ? "50대" : "60대";

function styleWord(e: number): string {
  return e >= 10 && e <= 24 ? "trendy casual" : e >= 25 && e <= 39 ? "smart casual" : e >= 40 && e <= 49 ? "minimal clean" : e >= 50 && e <= 59 ? "classic elegant" : "comfortable clean";
}
function weatherWord(e: number, t: WeatherCode): string {
  return t === "Rain" || t === "Drizzle" ? "비 오는 날" : t === "Snow" ? "눈 오는 날" : e >= 28 ? "무더운 날씨" : e >= 20 ? "완벽한 날씨" : e >= 10 ? "선선한 날씨" : "추운 날씨";
}
function sceneCopy(e: Scene, t: number, r: WeatherCode): { label: string; description: string } {
  const n = weatherWord(t, r);
  return {
    work: {
      label: "출근은 기분좋게",
      description: `${n} 오늘 같은 날엔 단정하면서도 기분 좋은 스타일로 출근해보세요.`
    },
    casual: {
      label: "여유있는 외출",
      description: `${n} 편안한 마음으로 가볍게 나들이하기 좋은 코디예요.`
    },
    date: {
      label: "행복한 데이트",
      description: `${n} 설레는 마음이 드러나는 특별한 스타일을 준비했어요.`
    },
    gathering: {
      label: "오랜만의 모임",
      description: `${n} 반가운 사람들을 만날 때 부담 없이 입기 좋은 코디예요.`
    }
  }[e];
}
function styleAnalysis(e: Scene, r: number, n: number): string {
  const i = styleWord(r), a: Record<Scene, string> = {
    work: "출근 상황에 적합한 단정하면서도 편안한",
    casual: "여유로운 외출에 어울리는 자연스러운",
    date: "저녁 데이트에 잘 어울리는 세련된",
    gathering: "모임에 부담 없이 입기 좋은 편안한"
  };
  let o = "";
  return n >= 28 ? o = "더운 날씨에 시원한 소재" : n >= 20 ? o = "쾌적한 날씨에 자유로운 선택" : n >= 10 ? o = "선선한 날씨에 레이어드" : o = "추운 날씨에 따뜻한 레이어링", `${a[e]} ${i} 스타일이에요. ${o}으로 연출해보세요.`;
}
function blogKeyword(e: Scene, t: Gender, r: number, n: number, i: WeatherCode): string {
  const o = t === "male" ? "남자" : "여자";
  let s = "";
  r >= 10 && r <= 24 ? s = "20대" : r >= 25 && r <= 34 ? s = "30대" : r >= 35 && r <= 44 ? s = "40대" : r >= 45 && r <= 54 ? s = "50대" : s = "";
  const c = ({
    work: "출근룩",
    casual: "데일리룩",
    date: "데이트룩",
    gathering: "모임룩"
  } as Record<Scene, string>)[e];
  let u = "";
  return i === "Rain" || i === "Drizzle" ? u = "비오는날" : n >= 28 ? u = "여름" : n >= 20 ? u = "봄" : n >= 10 ? u = "가을" : u = "겨울", `${o} ${s} ${u} ${c} 코디`;
}
function pieces(e: Scene, t: Gender, r: number): { outer: Item; pants: Item; shoes: Item } {
  const i = t === "male";
  let a: Item;
  e === "work" ? r < 5 ? a = i ? { name: "울 코트", description: `추운 날씨에 따뜻하게 보온해주는 포멀한 울 코트예요.
단정한 라인으로 출근 시 신뢰감을 주는 아이템이에요.` } : { name: "울 코트", description: `겨울 출근길을 따뜻하고 우아하게 만들어주는 코트예요.
깔끔한 핏으로 전문적인 인상을 완성할 수 있어요.` } : r < 10 ? a = i ? { name: "트렌치 코트", description: `쌀쌀한 날씨에 적당한 보온감을 주는 클래식한 코트예요.
비즈니스 상황에 잘 어울리는 단정한 스타일이에요.` } : { name: "트렌치 코트", description: `겨울철 출근 스타일을 완성하는 필수 아이템이에요.
클래식한 디자인으로 어디서나 품격 있게 보여요.` } : r < 15 ? a = i ? { name: "비즈니스 재킷", description: `서늘한 날씨에 딱 맞는 가벼운 재킷이에요.
출근 시 활동하기 편하면서도 단정한 인상을 줘요.` } : { name: "블레이저", description: `봄/가을 출근룩의 완성품인 블레이저예요.
시원하면서도 전문적인 이미지를 만들어줘요.` } : a = i ? { name: "셔츠", description: `더운 날씨에 시원하게 입을 수 있는 포멀 셔츠예요.
통기성 좋은 소재로 하루 종일 쾌적하게 입을 수 있어요.` } : { name: "블라우스", description: `여름철 시원하고 깔끔한 출근룩을 위한 블라우스예요.
가벼운 소재로 무더운 날씨에도 편안해요.` } : e === "casual" ? r < 5 ? a = i ? { name: "패딩 재킷", description: `겨울 외출 시 보온성이 뛰어난 캐주얼 패딩이에요.
가볍지만 따뜻해서 활동하기 편한 아이템이에요.` } : { name: "롱 패딩", description: `추운 겨울 외출을 따뜻하게 만들��주는 롱 패딩이에요.
실용적이면서도 스타일리시한 디자인이 특징이에요.` } : r < 10 ? a = i ? { name: "봄버 재킷", description: `쌀쌀한 날씨에 편안한 캐주얼 재킷이에요.
자유로운 스타일로 어디든 가볍게 입고 나갈 수 있어요.` } : { name: "니트 가디건", description: `겨울 데일리룩에 자주 입게 되는 따뜻한 니트예요.
레이어드하기 좋고 포근한 느낌을 줘요.` } : r < 15 ? a = i ? { name: "데님 재킷", description: `봄/가을 캐주얼 스타일의 정석인 데님 재킷이에요.
어떤 스타일과도 잘 어울리는 만능 아이템이에요.` } : { name: "가디건", description: `선선한 날씨에 가볍게 걸치기 좋은 가디건이에요.
편안한 핏으로 데일리룩을 완성할 수 있어요.` } : a = i ? { name: "린넨 셔츠", description: `더운 날씨에 시원하고 자연스러운 린넨 셔츠예요.
통풍이 잘 되어 여름에 쾌적하게 입을 수 있어요.` } : { name: "코튼 블라우스", description: `여름 외출에 시원하고 편안한 블라우스예요.
가벼운 소재로 자유롭게 활동하기 좋아요.` } : e === "date" ? r < 5 ? a = i ? { name: "울 코트", description: `겨울 데이트를 따뜻하고 세련되게 만들어주는 코트예요.
클래식한 디자인으로 품격 있는 인상을 줘요.` } : { name: "롱 코트", description: `추운 겨울 데이트를 우아하게 만들어주는 코트예요.
따뜻하면서도 여성스러운 실루엣이 돋보여요.` } : r < 10 ? a = i ? { name: "스웨이드 재킷", description: `쌀쌀한 날씨에 세련된 분위기를 내는 재킷이에요.
데이트에 딱 맞는 감각적인 스타일이에요.` } : { name: "우아한 코트", description: `겨울 데이트를 특별하게 만들어주는 코트예요.
엘레강트한 라인으로 조명 아래 더 빛나요.` } : r < 15 ? a = i ? { name: "레더 재킷", description: `봄/가을 데이트에 스타일리시한 인상을 주는 재킷이에요.
자연스럽게 멋을 낼 수 있는 아이템이에요.` } : { name: "크롭 재킷", description: `데이트룩을 완성하는 세련된 크롭 재킷이에요.
균형 잡힌 비율로 스타일리시하게 보여요.` } : a = i ? { name: "폴로 셔츠", description: `더운 날씨에도 단정하고 스타일리시한 폴로 셔츠예요.
데이트에 적당한 격식과 편안함을 동시에 줘요.` } : { name: "우아한 블라우스", description: `여름 데이트에 여성스럽고 시원한 블라우스예요.
우아한 디테일이 특별함을 더해줘요.` } : r < 5 ? a = i ? { name: "캐주얼 패딩", description: `추운 날씨에 편안하게 입을 수 있는 캐주얼 패딩이에요.
모임에 부담 없이 입기 좋은 스타일이에요.` } : { name: "따뜻한 재킷", description: `겨울 모임에 따뜻하고 편안한 재킷이에요.
포근한 느낌으로 대화하기 좋은 분위기를 만들어요.` } : r < 10 ? a = i ? { name: "스웨트셔츠", description: `쌀쌀한 날씨에 편안한 스웨트셔츠예요.
부담 없는 스타일로 오랜만의 모임에 딱이에요.` } : { name: "니트 가디건", description: `겨울 모임에 포근하고 편안한 니트예요.
자연스러운 분위기로 편하게 대화할 수 있어요.` } : r < 15 ? a = i ? { name: "후디", description: `봄/가을 모임에 편안한 후디예요.
캐주얼한 스타일로 부담 없이 입기 좋아요.` } : { name: "캐주얼 재킷", description: `선선한 날씨의 모임에 편안한 재킷이에요.
자연스러운 스타일로 편하게 만남을 즐길 수 있어요.` } : a = i ? { name: "티셔츠", description: `더운 날씨에 시원하고 편안한 티셔츠예요.
모임에 가볍게 입고 나가기 좋은 아이템이에요.` } : { name: "블라우스", description: `여름 모임에 편안하고 시원한 블라우스예요.
자연스러운 스타일로 대화하기 좋아요.` };
  let o: Item;
  e === "work" ? r < 10 ? o = i ? { name: "울 슬랙스", description: `겨울 출근에 따뜻하고 단정한 울 슬랙스예요.
정장 느낌을 주면서도 보온성이 뛰어나요.` } : { name: "울 팬츠", description: `겨울 오피스룩을 완성하는 따뜻한 팬츠예요.
세련된 핏으로 전문적인 이미지를 만들어요.` } : r < 20 ? o = i ? { name: "치노 팬츠", description: `봄/가을 출근에 적합한 깔끔한 치노 팬츠예요.
편안한 착용감으로 하루 종일 활동하기 좋아요.` } : { name: "슬랙스", description: `출근룩의 정석인 깔끔한 슬랙스예요.
단정한 라인으로 어디서나 멋져 보여요.` } : o = i ? { name: "드레스 팬츠", description: `여름 출근에 시원하고 가벼운 드레스 팬츠예요.
통기성 좋은 소재로 더워도 쾌적해요.` } : { name: "여름 팬츠", description: `더운 날씨에도 단정하고 시원한 오피스 팬츠예요.
가벼운 소재로 편안하게 착용할 수 있어요.` } : e === "casual" ? r < 10 ? o = i ? { name: "청바지", description: `겨울 캐주얼의 정석인 따뜻한 청바지예요.
어떤 스타일과도 잘 어울리는 만능 아이템이에요.` } : { name: "따뜻한 팬츠", description: `겨울 외출에 따뜻하고 편안한 팬츠예요.
캐주얼한 느낌으로 데일리로 입기 좋아요.` } : r < 20 ? o = i ? { name: "캐주얼 치노", description: `봄/가을 데일리룩의 기본인 캐주얼 치노예요.
편안한 핏으로 어디든 자유롭게 갈 수 있어요.` } : { name: "청바지", description: `데일리룩의 필수 아이템인 편안한 청바지예요.
자연스러운 스타일로 활동하기 좋아요.` } : o = i ? { name: "반바지", description: `여름 외출에 시원하고 활동적인 반바지예요.
더운 날씨에 쾌적하게 입을 수 있어요.` } : { name: "린넨 팬츠", description: `여름에 시원하고 편안한 린넨 팬츠예요.
통풍이 잘 되어 더워도 쾌적해요.` } : e === "date" ? r < 10 ? o = i ? { name: "다크 진", description: `겨울 데이트에 세련되고 깔끔한 다크 진이에요.
슬림한 핏으로 스타일리시하게 보여요.` } : { name: "우아한 팬츠", description: `겨울 데이트를 특별하게 만들어주는 팬츠예요.
엘레강트한 라인으로 여성스러운 매력을 줘요.` } : r < 20 ? o = i ? { name: "테일러드 팬츠", description: `봄/가을 데이트에 세련된 테일러드 팬츠예요.
정돈된 핏으로 감각적인 스타일을 완성해요.` } : { name: "스타일리시 팬츠", description: `데이트에 딱 맞는 세련된 팬츠예요.
우아한 실루엣으로 특별한 순간을 빛내줘요.` } : o = i ? { name: "슬림 팬츠", description: `여름 데이트에 시원하고 스타일리시한 팬츠예요.
깔끔한 라인으로 단정하게 보여요.` } : { name: "스커트", description: `여름 데이트를 여성스럽게 만들어주는 스커트예요.
시원하면서도 우아한 느낌을 줘요.` } : r < 10 ? o = i ? { name: "편한 바지", description: `겨울 모임에 따뜻하고 편안한 바지예요.
부담 없는 스타일로 편하게 대화할 수 있어요.` } : { name: "포근한 팬츠", description: `겨울 모임에 따뜻하고 편안한 팬츠예요.
자연스러운 핏으로 오랜 시간 앉아있어도 편해요.` } : r < 20 ? o = i ? { name: "조거 팬츠", description: `봄/가을 모임에 편안한 조거 팬츠예요.
캐주얼한 느낌으로 부담 없이 입기 좋아요.` } : { name: "편한 청바지", description: `모임에 편안하게 입을 수 있는 청바지예요.
자연스러운 스타일로 대화하기 좋아요.` } : o = i ? { name: "반바지", description: `여름 모임에 시원하고 편안한 반바지예요.
더운 날씨에 가볍게 입기 좋은 아이템이에요.` } : { name: "여름 팬츠", description: `여름 모임에 시원하고 편안한 팬츠예요.
가벼운 소재로 더워도 쾌적해요.` };
  let s: Item;
  return e === "work" ? s = i ? { name: "옥스퍼드 슈즈", description: `출근룩을 완성하는 클래식한 정장 구두예요.
단정한 디자인으로 신뢰감을 주는 필수 아이템이에요.` } : { name: "로퍼", description: `오피스룩에 잘 어울리는 편안한 로퍼예요.
하루 종일 신어도 발이 편한 실용적인 슈즈예요.` } : e === "casual" ? s = i ? { name: "스니커즈", description: `데일리룩의 기본인 편안한 스니커즈예요.
어디든 가볍게 걸어 다니기 좋은 만능 슈즈예요.` } : { name: "캐주얼 스니커즈", description: `외출에 편안하고 활동적인 스니커즈예요.
자연스러운 스타일로 걷기 좋은 신발이에요.` } : e === "date" ? s = i ? { name: "더비 슈즈", description: `데이트에 세련되고 격식 있는 더비 슈즈예요.
스타일리시하면서도 편안한 착용감을 줘요.` } : { name: "힐", description: `데이트를 특별하게 만들어주는 우아한 힐이에요.
엘레강트한 디자인으로 조명 아래 더 빛나요.` } : s = i ? { name: "편한 스니커즈", description: `모임에 편안하게 신을 수 있는 스니커즈예요.
부담 없는 스타일로 오래 신어도 발이 편해요.` } : { name: "플랫 슈즈", description: `모임에 편안하고 자연스러운 플랫 슈즈예요.
편한 착용감으로 오랜 시간 신어도 발이 편해요.` }, { outer: a, pants: o, shoes: s };
}

/** 원본 oN — 장면 하나의 카드. 네이버 검색어는 원본 카드가 쓰던 `${나이대} ${MBTI} 추천 코디`. */
export function outfitCard(scene: Scene, input: OutfitInput): OutfitCard {
  const age = ageOfBand(input.ageBand);
  const c = sceneCopy(scene, input.temperature, input.weatherCode);
  const p = pieces(scene, input.gender, input.temperature);
  return {
    scene,
    timeLabel: c.label,
    headline: "오늘의 추천 코디",
    description: c.description,
    outer: p.outer,
    pants: p.pants,
    shoes: p.shoes,
    styleAnalysis: styleAnalysis(scene, age, input.temperature),
    blogSearchKeyword: blogKeyword(scene, input.gender, age, input.temperature, input.weatherCode),
    naverSearchQuery: [ageDecade(age), input.mbti, "추천 코디"].filter(Boolean).join(" "), // 유형 전(mbti "")엔 나이대만
  };
}

/** 원본 iN — 네 장면 전부. */
export const outfitCards = (input: OutfitInput): OutfitCard[] => SCENES.map((s) => outfitCard(s, input));
