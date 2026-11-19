import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reserveWalkSearch, WALK_SEARCH_LIMIT, WALK_QUOTA_WINDOW_SECONDS } from "./walk-quota";
const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://quota.example.com");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-secret");
  vi.stubGlobal("fetch", mockFetch); mockFetch.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("산책 검색 공용 사용량 제한", () => {
  it("원자적 예약 승인만 허용한다", async () => {
    mockFetch.mockResolvedValue(Response.json({ result: 1 }));
    expect(await reserveWalkSearch()).toBe(true);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toBe("https://quota.example.com/");
    expect(init.headers.Authorization).toBe("Bearer test-secret");
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("error");
    const command = JSON.parse(init.body);
    expect(command[0]).toBe("EVAL");
    expect(Number(command[4])).toBe(32 * 86400);
    expect(Number(command[5])).toBe(4500);
    expect(init.body).not.toContain("latitude");
    expect(WALK_SEARCH_LIMIT).toBeLessThan(5000);
    expect(WALK_QUOTA_WINDOW_SECONDS).toBeGreaterThan(31 * 86400);
  });
  it("한도 도달 시 거부한다", async () => {
    mockFetch.mockResolvedValue(Response.json({ result: 0 }));
    expect(await reserveWalkSearch()).toBe(false);
  });
  it("별도 요청·서버는 같은 키를 쓰고 각각 유일한 예약을 보낸다", async () => {
    mockFetch.mockImplementation(async () => Response.json({ result: 1 }));
    await Promise.all(Array.from({ length: 20 }, () => reserveWalkSearch()));
    const commands = mockFetch.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(new Set(commands.map((c) => c[3])).size).toBe(1);
    expect(new Set(commands.map((c) => c[6])).size).toBe(20);
  });
  it("저장소 설정 누락·잘못된 URL은 호출을 허용하지 않는다", async () => {
    for (const url of ["", "http://quota.example.com", "not-a-url", "https://user:secret@quota.example.com"]) {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", url);
      await expect(reserveWalkSearch()).rejects.toThrow();
    }
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://quota.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    await expect(reserveWalkSearch()).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });
  it("HTTP 오류·손상된 응답·Redis 오류는 전부 차단한다", async () => {
    for (const response of [Response.json({}, { status: 503 }), Response.json({ error: "ERR" }),
      Response.json({ result: "1" }), Response.json(null), new Response("not json")]) {
      mockFetch.mockResolvedValueOnce(response);
      await expect(reserveWalkSearch()).rejects.toThrow();
    }
  });
  it("응답 손실·시간 초과는 재시도하지 않아 Google 호출을 허용하지 않는다", async () => {
    mockFetch.mockRejectedValue(new Error("timeout"));
    await expect(reserveWalkSearch()).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
