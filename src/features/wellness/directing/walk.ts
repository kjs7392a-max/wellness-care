/**
 * 「오늘의 산책」 — 마음온도(figma.site ver.1.2) 원본 Mo/kN 그대로(2026-09-21 사용자 지시 "그대로 옮겨줘").
 * 원본은 코스 3개였으나 2026-10-24 사용자 지시로 「내 주변 산책 코스」 하나로 통합 + 구글 지도 검색 링크(좌표가 있으면 그 자리로). 순수 · 테스트 walk.test.ts
 */
export interface WalkCourse { id: number; name: string; distance: string; duration: string; difficulty: "쉬움" | "보통" | "어려움"; description: string; features: string[]; searchQuery: string }

export const WALK_COURSES: readonly WalkCourse[] = [
  {
    id: 1,
    name: "내 주변 산책 코스",
    distance: "2-5km",
    duration: "30-60분",
    difficulty: "쉬움",
    description: "가까운 공원·산책로·둘레길·하천변 중 마음 가는 곳을 천천히 걸어보세요. 자연 속에서 편안하게 걸을 수 있어요.",
    features: ["평탄한 길", "자연 풍경", "벤치·그늘"],
    searchQuery: "산책로 공원 둘레길 하천",
  },
];

/** 원본 kN — 구글 지도 검색. 좌표가 있으면 그 자리 14z. */
export const walkMapUrl = (lat?: number | null, lon?: number | null): string =>
  lat && lon ? `https://www.google.com/maps/search/산책로+공원+둘레길/@${lat},${lon},14z` : "https://www.google.com/maps/search/산책로+공원+둘레길";

/** 원본 EN — 난이도 표식. */
export const difficultyMark = (d: WalkCourse["difficulty"]): string => (d === "쉬움" ? "🟢" : d === "보통" ? "🔵" : "🟠");
