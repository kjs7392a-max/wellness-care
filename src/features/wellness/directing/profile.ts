/**
 * 디렉팅 프로필 — 성별·나이대. 마음온도의 코디·메이크업이 이 둘로 갈린다(남성 = 그루밍 표 · 나이대 = 검색어·스타일 축).
 * 2026-09-21 사용자 확정: 온보딩이 아니라 **코디·메이크업 탭에 처음 들어갈 때 한 번** 묻고 기기에 저장(설정에서 변경).
 * 저장 = localStorage(이 폰에만) · 깨진 값은 null(저장소 때문에 앱이 죽지 않는다). 순수 · 테스트 profile.test.ts
 */
export type Gender = "female" | "male";
export type AgeBand = "10대" | "20대" | "30대" | "40대" | "50대" | "60대";
export interface DirectingProfile { gender: Gender; ageBand: AgeBand }

export const AGE_BANDS: readonly AgeBand[] = ["10대", "20대", "30대", "40대", "50대", "60대"];
export const GENDER_LABEL: Readonly<Record<Gender, string>> = { female: "여성", male: "남성" };
export const PROFILE_STORE_KEY = "wellness-care:directing-profile:v1";

/** 나이대 → 원본 규칙(tN·rN·wp)이 받는 대표 나이. 대(帶)의 가운데. */
export function ageOfBand(b: AgeBand): number {
  return ({ "10대": 17, "20대": 25, "30대": 35, "40대": 45, "50대": 55, "60대": 65 } as const)[b];
}

export function parseProfile(raw: string | null): DirectingProfile | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { gender?: unknown; ageBand?: unknown };
    if ((j.gender === "female" || j.gender === "male") && typeof j.ageBand === "string" && (AGE_BANDS as readonly string[]).includes(j.ageBand)) {
      return { gender: j.gender, ageBand: j.ageBand as AgeBand };
    }
    return null;
  } catch {
    return null;
  }
}

export const serializeProfile = (p: DirectingProfile): string => JSON.stringify({ gender: p.gender, ageBand: p.ageBand });
