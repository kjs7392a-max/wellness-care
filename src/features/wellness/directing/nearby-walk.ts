/** Google Places 주변 검색 결과. 위치·결과는 브라우저 세션에만 둔다. */
export interface WalkLocation { lat: number; lon: number }
export interface NearbyWalk {
  name: string;
  address: string;
  distanceMeters: number;
  mapUrl: string;
  attributions: { name: string; url: string | null }[];
}
export const WALK_SEARCH_RADIUS_METERS = 5000;

export function isWalkLocation(value: unknown): value is WalkLocation {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<WalkLocation>;
  return typeof p.lat === "number" && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 &&
    typeof p.lon === "number" && Number.isFinite(p.lon) && Math.abs(p.lon) <= 180;
}

/** 경로 길이가 아닌 두 좌표 사이의 직선거리(m). */
export function walkDistance(a: WalkLocation, b: WalkLocation): number {
  const rad = (x: number) => x * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h))));
}

export function walkDistanceLabel(meters: number): string {
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}

function safeWebUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; }
  catch { return null; }
}

/** DISTANCE 순으로 받은 결과에서 표시 가능한 첫 장소. 일반 검색 링크로 대체하지 않는다. */
export function nearestWalk(data: unknown, origin: WalkLocation): NearbyWalk | null {
  if (!data || typeof data !== "object") throw new Error("invalid-response");
  const places = (data as { places?: unknown }).places;
  if (places === undefined) return null;
  if (!Array.isArray(places)) throw new Error("invalid-response");
  for (const raw of places) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const loc = p.location as { latitude?: unknown; longitude?: unknown } | undefined;
    const target = { lat: loc?.latitude, lon: loc?.longitude };
    const name = (p.displayName as { text?: unknown } | undefined)?.text;
    if (typeof p.id !== "string" || !p.id || typeof name !== "string" || !name || !isWalkLocation(target)) continue;
    const distanceMeters = walkDistance(origin, target);
    if (distanceMeters > WALK_SEARCH_RADIUS_METERS) continue;
    const params = new URLSearchParams({ api: "1", query: `${target.lat},${target.lon}`, query_place_id: p.id });
    const attributions: NearbyWalk["attributions"] = [];
    for (const rawAttribution of Array.isArray(p.attributions) ? p.attributions : []) {
      if (!rawAttribution || typeof rawAttribution !== "object") continue;
      const attribution = rawAttribution as Record<string, unknown>;
      if (typeof attribution.provider === "string") attributions.push({ name: attribution.provider, url: safeWebUrl(attribution.providerUri) });
    }
    return { name, address: typeof p.formattedAddress === "string" ? p.formattedAddress : "", distanceMeters,
      mapUrl: `https://www.google.com/maps/search/?${params}`, attributions };
  }
  return null;
}
