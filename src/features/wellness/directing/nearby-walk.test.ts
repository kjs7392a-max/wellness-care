import { describe, expect, it } from "vitest";
import { isWalkLocation, nearestWalk, walkDistance, walkDistanceLabel } from "./nearby-walk";
const origin = { lat: 36.5, lon: 127.2 };
const place = { id: "nearby-park", displayName: { text: "동네 산책공원" }, formattedAddress: "충청남도", location: { latitude: 36.501, longitude: 127.2 } };

describe("가까운 산책 장소", () => {
  it("서울 기본 위치를 쓰지 않고 0도·한국 전역 좌표를 허용한다", () => {
    for (const p of [origin, { lat: 0, lon: 0 }, { lat: 37.2, lon: 127.1 }]) expect(isWalkLocation(p)).toBe(true);
    for (const p of [null, {}, { lat: "36", lon: 127 }, { lat: 91, lon: 127 }, { lat: 36, lon: Infinity }]) expect(isWalkLocation(p)).toBe(false);
  });
  it("직선거리를 계산하고 m/km로 표시한다", () => {
    expect(walkDistance(origin, origin)).toBe(0);
    expect(walkDistance(origin, { lat: 36.501, lon: 127.2 })).toBe(111);
    expect(walkDistanceLabel(111)).toBe("111m");
    expect(walkDistanceLabel(1520)).toBe("1.5km");
  });
  it("Google의 거리순 결과 첫 장소와 그 장소만 가리키는 링크를 반환한다", () => {
    const result = nearestWalk({ places: [place, { ...place, id: "farther" }] }, origin)!;
    expect(result.name).toBe("동네 산책공원");
    expect(result.distanceMeters).toBe(111);
    const url = new URL(result.mapUrl);
    expect(url.hostname).toBe("www.google.com");
    expect(url.searchParams.get("query_place_id")).toBe(place.id);
    expect(url.searchParams.get("query")).toBe("36.501,127.2");
  });
  it("결과 없음이나 잘못된 장소를 다른 지역 검색으로 대체하지 않는다", () => {
    expect(nearestWalk({}, origin)).toBeNull();
    expect(nearestWalk({ places: [] }, origin)).toBeNull();
    expect(nearestWalk({ places: [{ ...place, location: { latitude: 37.5, longitude: 127.2 } }, null, {}] }, origin)).toBeNull();
    expect(() => nearestWalk({ places: "bad" }, origin)).toThrow();
  });
  it("제공자 출처를 보존하고 실행 가능한 출처 URL을 제거한다", () => {
    const result = nearestWalk({ places: [{ ...place, attributions: [
      { provider: "출처", providerUri: "https://example.com/" },
      { provider: "잘못된 링크", providerUri: "javascript:alert(1)" },
    ] }] }, origin)!;
    expect(result.attributions).toEqual([{ name: "출처", url: "https://example.com/" }, { name: "잘못된 링크", url: null }]);
  });
});
