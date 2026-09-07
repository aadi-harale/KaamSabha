import { describe, expect, it, vi } from 'vitest';
import { approximateRoute, fetchRoute } from '../lib/application/route-service';

const origin = { lat: 18.5515, lng: 73.947 };
const destination = { lat: 18.5679, lng: 73.9143 };

describe('shared route service', () => {
  it('normalizes road geometry, distance and duration from one provider response', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      routes: [{ distance: 2910.4, duration: 1019.5, geometry: { coordinates: [[73.947,18.5515],[73.93,18.56],[73.9143,18.5679]] } }],
    }), { status: 200 })) as unknown as typeof fetch;
    const route = await fetchRoute(origin, destination, fetcher);
    expect(route).toEqual({
      geometry: [origin, { lat: 18.56, lng: 73.93 }, destination],
      distanceMeters: 2910, durationSeconds: 1020,
      provider: 'OSRM road route', isApproximate: false,
    });
  });

  it('returns a clearly approximate direct path when routing fails', async () => {
    const fetcher = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    const route = await fetchRoute(origin, destination, fetcher);
    expect(route.isApproximate).toBe(true);
    expect(route.geometry).toEqual(approximateRoute(origin, destination).geometry);
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.durationSeconds).toBeGreaterThan(0);
  });
});
