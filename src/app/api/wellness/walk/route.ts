import { NextResponse } from "next/server";
import { isWalkLocation, nearestWalk, WALK_SEARCH_RADIUS_METERS } from "@/features/wellness/directing/nearby-walk";

import { reserveWalkSearch } from "@/features/wellness/directing/walk-quota";

export const runtime = "nodejs";
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  // 외부 사이트가 방문자의 브라우저로 유료 검색을 호출하지 못하게 한다.
  const origin = req.headers.get("origin");
  if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(req.url).origin)) {
    return reply({ error: "허용되지 않은 요청이에요." }, 403);
  }
  let location: unknown;
  try {
    const text = await req.text();
    if (text.length > 256) return reply({ error: "요청이 너무 커요." }, 400);
    location = JSON.parse(text);
  } catch { return reply({ error: "현재 위치를 확인해 주세요." }, 400); }
  if (!isWalkLocation(location)) return reply({ error: "현재 위치를 확인해 주세요." }, 400);
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return reply({ error: "주변 산책로 검색을 준비 중이에요. 지도 서비스 연결 후 이용할 수 있어요." }, 503);
  // Google 요청 전 반드시 공용 저장소에서 검색 한 번을 확보한다.
  // 실패한 Google 요청도 한도를 돌려주지 않는다(외부에서 과금됐을 가능성).
  try {
    if (!await reserveWalkSearch()) return reply({
      error: "무료 검색 한도에 도달했어요. 이용 횟수가 다시 확보되면 검색할 수 있어요.", code: "SEARCH_LIMIT_REACHED",
    }, 429);
  } catch {
    return reply({ error: "검색 이용 횟수를 확인할 수 없어 잠시 검색을 중단했어요. 잠시 후 다시 시도해 주세요.", code: "SEARCH_QUOTA_UNAVAILABLE" }, 503);
  }
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.attributions" },
      body: JSON.stringify({ includedTypes: ["park", "hiking_area"], rankPreference: "DISTANCE", maxResultCount: 20,
        languageCode: "ko", locationRestriction: { circle: {
          center: { latitude: location.lat, longitude: location.lon }, radius: WALK_SEARCH_RADIUS_METERS,
        } } }),
    });
    if (!response.ok) throw new Error("places-unavailable");
    const place = nearestWalk(await response.json(), location);
    return reply({ place, radiusMeters: WALK_SEARCH_RADIUS_METERS });
  } catch {
    // API 오류·요청에는 위치와 키가 포함될 수 있으므로 기록하거나 응답에 담지 않는다.
    return reply({ error: "산책로를 찾지 못했어요. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
