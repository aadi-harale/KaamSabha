export type GeoPoint = { lat: number; lng: number };
export type RouteResult = {
  geometry: GeoPoint[];
  distanceMeters: number;
  durationSeconds: number;
  provider: string;
  isApproximate: boolean;
};

function haversine(a: GeoPoint, b: GeoPoint) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function approximateRoute(origin: GeoPoint, destination: GeoPoint): RouteResult {
  const direct = haversine(origin, destination);
  return {
    geometry: [origin, destination],
    distanceMeters: Math.round(direct),
    durationSeconds: Math.max(60, Math.round((direct / 1000 / 18) * 3600)),
    provider: 'direct-distance fallback',
    isApproximate: true,
  };
}

export async function fetchRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  fetcher: typeof fetch = fetch,
): Promise<RouteResult> {
  const configured = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_ROUTING_BASE_URL;
  const base = (configured || 'https://router.project-osrm.org').replace(/\/$/, '');
  const url = `${base}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  try {
    const response = await fetcher(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Routing returned ${response.status}`);
    const payload = (await response.json()) as {
      routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
    };
    const route = payload.routes?.[0];
    if (!route?.geometry?.coordinates?.length) throw new Error('No route geometry');
    return {
      geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      provider: 'OSRM road route',
      isApproximate: false,
    };
  } catch {
    return approximateRoute(origin, destination);
  }
}
