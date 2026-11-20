/**
 * 마음 쉼터 실시간(Supabase · 2026-11-20) 연결 정보.
 * Publishable key 는 브라우저에 그대로 실리는 **공개용 키**다(Supabase 설계 · 권한은 docs/space-realtime-setup.sql 의 RLS 가 막는다).
 * 🚫 secret key·service_role 키는 절대 여기 넣지 말 것.
 * 환경변수(NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)가 있으면 그게 먼저다(다른 프로젝트로 바꿀 때). 둘 다 비면 기능이 화면에 안 나온다.
 */
/** Supabase 조직 wellness-care(무료) · 프로젝트 wellness-care-space(서울) — 2026-11-20. 병원 ERP 와 별개. */
const PROJECT_URL = "https://mppjvoxhoqjthgmokggx.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_YDDhcAz0vOtmK7Tm-b76SQ_W89UwaZL";
export const SPACE_SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL || PROJECT_URL;
export const SPACE_SUPABASE_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLISHABLE_KEY;
export const spaceRealtimeReady = (): boolean => SPACE_SUPABASE_URL.startsWith("https://") && SPACE_SUPABASE_KEY.length > 20;
