/**
 * 「오늘의 산책」 — 마음온도(figma.site ver.1.2) 원본 Mo/kN 그대로(2026-09-21 사용자 지시 "그대로 옮겨줘").
 * 원본도 MBTI·위치와 무관한 코스 3개 + 구글 지도 검색 링크(좌표가 있으면 그 자리로). 순수 · 테스트 walk.test.ts
 */
export interface WalkCourse { id: number; name: string; distance: string; duration: string; difficulty: "쉬움" | "보통" | "어려움"; description: string; features: string[]; searchQuery: string }

export const WALK_COURSES: readonly WalkCourse[] = [
  {
    id: 1,
    name: "근처 공원 산책로",
    distance: "2-3km",
    duration: "30-40분",
    difficulty: "쉬움",
    description: "가까운 공원을 천천히 걷기 좋은 코스예요. 나무 그늘 아래에서 여유롭게 산책할 수 있어요.",
    features: ["평탄한 길", "그늘 많음", "벤치 있음"],
    searchQuery: "공원 산책로",
  },
  {
    id: 2,
    name: "근처 산책로/둘레길",
    distance: "2-5km",
    duration: "30-60분",
    difficulty: "쉬움",
    description: "동네 주변의 산책로나 둘레길을 찾아보세요. 자연 속에서 편안하게 걸을 수 있어요.",
    features: ["자연 풍경", "평지", "경치 좋음"],
    searchQuery: "산책로 둘레길",
  },
  {
    id: 3,
    name: "하천변/강변 산책로",
    distance: "3-5km",
    duration: "40-60분",
    difficulty: "보통",
    description: "하천변이나 강변 산책로를 따라 걷는 코스예요. 물소리를 들으며 걷기 좋아요.",
    features: ["물가 풍경", "평탄한 길", "자전거 도로"],
    searchQuery: "하천 강변 산책로",
  },
];

/** 원본 kN — 구글 지도 검색. 좌표가 있으면 그 자리 14z. */
export const walkMapUrl = (lat?: number | null, lon?: number | null): string =>
  lat && lon ? `https://www.google.com/maps/search/산책로+공원+둘레길/@${lat},${lon},14z` : "https://www.google.com/maps/search/산책로+공원+둘레길";

/** 원본 EN — 난이도 표식. */
export const difficultyMark = (d: WalkCourse["difficulty"]): string => (d === "쉬움" ? "🟢" : d === "보통" ? "🔵" : "🟠");
