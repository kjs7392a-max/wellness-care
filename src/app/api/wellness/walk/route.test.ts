import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const quota = vi.hoisted(() => ({ reserve: vi.fn() }));
vi.mock("@/features/wellness/directing/walk-quota", () => ({ reserveWalkSearch: quota.reserve }));
import { POST } from "./route";
const mockedFetch = vi.fn();
const location = { lat: 36.5, lon: 127.2 };
const request = (body: unknown, headers?: HeadersInit) => new Request("http://localhost/api/wellness/walk", {
  method: "POST", headers, body: JSON.stringify(body),
});
beforeEach(() => { vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key"); vi.stubGlobal("fetch", mockedFetch); mockedFetch.mockReset(); quota.reserve.mockReset(); quota.reserve.mockResolvedValue(true); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("가까운 산책 장소 API", () => {
  it("무료 한도 도달 시 Google을 호출하지 않고 429로 차단한다", async () => {
    quota.reserve.mockResolvedValue(false);
    const response = await POST(request(location));
    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe("SEARCH_LIMIT_REACHED");
    expect(mockedFetch).not.toHaveBeenCalled();
  });
  it("카운터 저장소 장애 시 Google을 호출하지 않는다", async () => {
    quota.reserve.mockRejectedValue(new Error("private Redis token"));
    const response = await POST(request(location));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private Redis token");
    expect(mockedFetch).not.toHaveBeenCalled();
  });
  it("Google 요청 전에 횟수를 확보하고 실패해도 한도를 반환하지 않는다", async () => {
    let reserved = false;
    quota.reserve.mockImplementation(async () => { reserved = true; return true; });
    mockedFetch.mockImplementation(async () => { expect(reserved).toBe(true); throw new Error("timeout"); });
    expect((await POST(request(location))).status).toBe(502);
    expect(quota.reserve).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("정확한 현재 위치로 공원·산책 장소를 거리순 검색하고 키는 서버에 둔다", async () => {
    mockedFetch.mockResolvedValue(Response.json({ places: [{ id: "park-1", displayName: { text: "산책공원" },
      location: { latitude: 36.501, longitude: 127.2 } }] }));
    const response = await POST(request(location));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchNearby");
    expect(init.headers["X-Goog-Api-Key"]).toBe("test-key");
    const body = JSON.parse(init.body);
    expect(body.rankPreference).toBe("DISTANCE");
    expect(body.includedTypes).toEqual(["park", "hiking_area"]);
    expect(body.locationRestriction.circle.center).toEqual({ latitude: 36.5, longitude: 127.2 });
    const result = await response.json();
    expect(result.place.name).toBe("산책공원");
    expect(JSON.stringify(result)).not.toContain("test-key");
  });
  it("위치 권한을 얻은 유효 좌표만 받는다", async () => {
    for (const body of [null, {}, { lat: "36", lon: 127 }, { lat: 36, lon: 181 }]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(quota.reserve).not.toHaveBeenCalled();
  });
  it("깨진 JSON과 과도한 본문을 거부한다", async () => {
    expect((await POST(new Request("http://localhost/api/wellness/walk", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await POST(request({ ...location, extra: "x".repeat(300) }))).status).toBe(400);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
  it("외부 사이트의 브라우저 요청은 거부한다", async () => {
    expect((await POST(request(location, { origin: "https://elsewhere.example" }))).status).toBe(403);
    expect((await POST(request(location, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
  it("API 키 미설정이면 가짜 검색 없이 준비 중으로 안내한다", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    expect((await POST(request(location))).status).toBe(503);
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(quota.reserve).not.toHaveBeenCalled();
  });
  it("장소가 없을 때 명시적으로 빈 결과를 반환한다", async () => {
    mockedFetch.mockResolvedValue(Response.json({}));
    expect(await (await POST(request(location))).json()).toEqual({ place: null, radiusMeters: 5000 });
  });
  it("외부 서비스의 실패나 시간 초과에는 위치·키·오류 원문을 노출하지 않는다", async () => {
    mockedFetch.mockResolvedValue(Response.json({ error: "private upstream error" }, { status: 403 }));
    let response = await POST(request(location));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private");
    mockedFetch.mockRejectedValue(new Error("private coordinates or key"));
    response = await POST(request(location));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private");
  });
});
