import { randomUUID } from "node:crypto";

// 어느 달/시간대의 달력 월도 32일 창 안에 들어간다. 월 경계의 요청도 중복 허용하지 않는다.
export const WALK_SEARCH_LIMIT = 4500;
export const WALK_QUOTA_WINDOW_SECONDS = 32 * 24 * 60 * 60;
const QUOTA_KEY = "wellness:google-places:nearby-pro:reservations:v1";

/** Redis에서 시간 확인·오래된 기록 제거·한도 검사·예약을 한 번에 실행한다. */
export const RESERVE_WALK_SEARCH = `
local clock = redis.call('TIME')
local now = tonumber(clock[1])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - tonumber(ARGV[1]))
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then
  return 0
end
redis.call('ZADD', KEYS[1], now, ARGV[3])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]) + 86400)
return 1
`;

/** 위치나 장소 정보는 보내지 않는다. 저장소 장애/설정 누락 시 유료 호출을 허용하지 않는다. */
export async function reserveWalkSearch(): Promise<boolean> {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!endpoint || !token) throw new Error("quota-unavailable");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("quota-unavailable");
  const response = await fetch(url, {
    method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    // 자동 재시도·예약 취소를 하지 않는다. 응답이 없어도 사용했을 가능성을 보수적으로 센다.
    body: JSON.stringify(["EVAL", RESERVE_WALK_SEARCH, "1", QUOTA_KEY,
      String(WALK_QUOTA_WINDOW_SECONDS), String(WALK_SEARCH_LIMIT), randomUUID()]),
  });
  if (!response.ok) throw new Error("quota-unavailable");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || "error" in data) throw new Error("quota-unavailable");
  const result = (data as { result?: unknown }).result;
  if (result === 1) return true;
  if (result === 0) return false;
  throw new Error("quota-unavailable");
}
