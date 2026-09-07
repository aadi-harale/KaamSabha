'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { Receipt } from '../lib/engine';
import { presentReceiptMap, type DispatchMapPoint } from '../lib/map';
import type { RouteResult } from '../lib/application/route-service';
import { translate, type Locale } from '../lib/i18n';
import './dispatch-map.css';

type MapMode = 'customer' | 'decision' | 'governance';

function markerHtml(point: DispatchMapPoint) {
  if (point.kind === 'customer')
    return '<span class="dispatch-marker job-marker">Job</span>';
  return `<span class="dispatch-marker ${point.selected ? 'selected-worker-marker' : 'eligible-worker-marker'}"><b>${point.selected ? '✓' : ''}</b>${point.id.replace('W0', '').replace('W', '')}</span>`;
}

function FallbackMap({ points }: { points: DispatchMapPoint[] }) {
  const titleId = useId();
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const locate = (point: DispatchMapPoint) => ({
    x: 36 + ((point.lng - minLng) / Math.max(maxLng - minLng, 0.01)) * 328,
    y: 226 - ((point.lat - minLat) / Math.max(maxLat - minLat, 0.01)) * 178,
  });
  const customer = points.find((point) => point.kind === 'customer')!;
  return (
    <div className="map-fallback">
      <svg viewBox="0 0 400 260" aria-labelledby={titleId}>
        <title id={titleId}>Illustrative service-area view</title>
        <path d="M18 58 92 25l83 27 73-31 130 45-23 80 25 74-109 28-79-24-94 29-80-55 31-68Z" />
        <text x="22" y="28">
          Pune service area
        </text>
        {points
          .filter((point) => point.kind === 'worker')
          .map((point) => {
            const from = locate(customer);
            const to = locate(point);
            return (
              <line
                key={`line-${point.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              />
            );
          })}
        {points.map((point) => {
          const position = locate(point);
          return (
            <g
              className={`${point.kind} ${point.selected ? 'selected' : ''}`}
              key={point.id}
            >
              <circle
                cx={position.x}
                cy={position.y}
                r={point.selected ? 15 : 12}
              />
              <text x={position.x} y={position.y + 4} textAnchor="middle">
                {point.kind === 'customer'
                  ? 'J'
                  : point.selected
                    ? '✓'
                    : point.id.slice(1)}
              </text>
            </g>
          );
        })}
      </svg>
      <span>Illustrative service-area view</span>
    </div>
  );
}

export function DispatchDecisionMap({
  receipt,
  mode = 'customer',
  forceFallback = false,
  className = '',
}: {
  receipt: Receipt;
  mode?: MapMode;
  forceFallback?: boolean;
  className?: string;
}) {
  const presentation = useMemo(() => presentReceiptMap(receipt), [receipt]);
  const visiblePoints = useMemo(
    () =>
      mode === 'customer'
        ? presentation.points.filter(
            (point) => point.kind === 'customer' || point.selected,
          )
        : presentation.points,
    [mode, presentation],
  );
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [tileFailed, setTileFailed] = useState(forceFallback);
  const [loading, setLoading] = useState(!forceFallback);
  const initialPoint =
    visiblePoints.find((point) => point.selected) ?? visiblePoints[0];
  const [activeChoice, setActiveChoice] = useState({
    receiptId: presentation.receiptId,
    pointId: initialPoint.id,
  });
  const active =
    visiblePoints.find(
      (point) =>
        activeChoice.receiptId === presentation.receiptId &&
        point.id === activeChoice.pointId,
    ) ?? initialPoint;
  const choosePoint = (point: DispatchMapPoint) =>
    setActiveChoice({
      receiptId: presentation.receiptId,
      pointId: point.id,
    });

  useEffect(() => {
    if (!host.current || forceFallback) return;
    let cancelled = false;
    void import('leaflet')
      .then((L) => {
        if (cancelled || !host.current) return;
        const instance = L.map(host.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false,
        });
        map.current = instance;
        const tiles = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18,
            crossOrigin: true,
          },
        );
        let failures = 0;
        tiles.on('tileload', () => setLoading(false));
        tiles.on('load', () => setLoading(false));
        tiles.on('tileerror', () => {
          failures += 1;
          if (failures >= 2) {
            setTileFailed(true);
            setLoading(false);
          }
        });
        tiles.addTo(instance);
        const bounds = L.latLngBounds([]);
        for (const point of visiblePoints) {
          const position = L.latLng(point.lat, point.lng);
          bounds.extend(position);
          L.marker(position, {
            keyboard: true,
            title: point.label,
            icon: L.divIcon({
              className: 'dispatch-div-icon',
              html: markerHtml(point),
              iconSize: point.kind === 'customer' ? [38, 38] : [34, 34],
              iconAnchor: point.kind === 'customer' ? [19, 19] : [17, 17],
            }),
          })
            .on('click', () =>
              setActiveChoice({
                receiptId: presentation.receiptId,
                pointId: point.id,
              }),
            )
            .addTo(instance);
        }
        const customer = presentation.points.find(
          (point) => point.kind === 'customer',
        );
        if (customer)
          L.circle([customer.lat, customer.lng], {
            radius: 8000,
            color: '#006B60',
            weight: 1,
            dashArray: '5 6',
            fillColor: '#006B60',
            fillOpacity: 0.035,
            interactive: false,
          }).addTo(instance);
        if (bounds.isValid())
          instance.fitBounds(bounds, { padding: [42, 42], maxZoom: 13 });
        requestAnimationFrame(() => instance.invalidateSize(false));
      })
      .catch(() => {
        if (!cancelled) {
          setTileFailed(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [forceFallback, presentation, visiblePoints]);

  const workers = visiblePoints.filter(
    (point) => point.kind === 'worker',
  );
  return (
    <section
      className={`real-dispatch-map ${className}`}
      aria-label="Dispatch decision map"
    >
      <div className="map-heading">
        <div>
          <strong>{presentation.locality} dispatch board</strong>
          <span>Illustrative service positions</span>
        </div>
        <span>{presentation.slaMinutes}-minute SLA</span>
      </div>
      <p className="sr-only">
        {mode === 'customer'
          ? `${active.label} is assigned and expected in ${active.eta} minutes.`
          : presentation.summary}
      </p>
      <div className="map-viewport">
        {!tileFailed && <div ref={host} className="leaflet-host" />}
        {tileFailed && <FallbackMap points={visiblePoints} />}
        {loading && !tileFailed && (
          <div className="map-loading" aria-live="polite">
            Loading Pune service area…
          </div>
        )}
      </div>
      <div className="map-selection" aria-live="polite">
        <div>
          <span>
            {active.kind === 'customer'
              ? 'Service request'
              : active.selected
                ? 'Selected worker'
                : 'Eligible worker'}
          </span>
          <strong>{active.label}</strong>
        </div>
        {active.kind === 'worker' && (
          <dl>
            <div>
              <dt>Distance</dt>
              <dd>{active.distance} km</dd>
            </div>
            <div>
              <dt>ETA</dt>
              <dd>{active.eta} min</dd>
            </div>
            <div>
              <dt>Checks</dt>
              <dd>Qualified / available / within SLA</dd>
            </div>
            {mode !== 'customer' && (
              <div>
                <dt>Rule</dt>
                <dd>
                  {active.selected
                    ? `Selected under v${receipt.policy.version}`
                    : 'Eligible, not selected'}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
      {mode !== 'customer' && (
        <div className="map-candidate-strip">
          {workers.map((point) => (
            <button
              key={point.id}
              onClick={() => choosePoint(point)}
              aria-pressed={active.id === point.id}
            >
              <span>{point.selected ? 'Selected' : 'Eligible'}</span>
              <strong>{point.label}</strong>
              <small>
                {point.distance} km / {point.eta} min
              </small>
            </button>
          ))}
        </div>
      )}
      <p className="map-rule-line">
        {mode === 'customer' ? (
          <>Assignment confirmed within the cooperative’s service promise.</>
        ) : (
          <>
            Actual difference{' '}
            <strong>+{presentation.actualExtraMinutes} min</strong> / member
            rule allows{' '}
            <strong>+{presentation.allowedExtraMinutes} min</strong>.
            Approximate service distance; no road route shown.
          </>
        )}
      </p>
    </section>
  );
}

function pointOnRoute(route: RouteResult, progress: number) {
  const points = route.geometry;
  if (!points.length) return null;
  const index = Math.min(points.length - 1, Math.round((points.length - 1) * progress));
  return points[index];
}

export function ActiveTravelMap({
  receipt,
  route,
  progress = 0,
  locale = 'en',
}: {
  receipt: Receipt;
  route: RouteResult;
  progress?: number;
  locale?: Locale;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const presentation = useMemo(() => presentReceiptMap(receipt), [receipt]);
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [failed, setFailed] = useState(false);
  const worker = pointOnRoute(route, progress) ?? route.geometry[0];
  const customer = route.geometry.at(-1);
  const remainingSeconds = Math.max(0, Math.round(route.durationSeconds * (1 - progress)));
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  useEffect(() => {
    if (!host.current || !worker || !customer) return;
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !host.current) return;
      const instance = L.map(host.current, { scrollWheelZoom: false });
      map.current = instance;
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 18, crossOrigin: true,
      });
      let errors = 0;
      tiles.on('tileerror', () => { if (++errors >= 2) setFailed(true); });
      tiles.addTo(instance);
      const line = route.geometry.map((point) => [point.lat, point.lng] as [number, number]);
      L.polyline(line, {
        color: route.isApproximate ? '#526779' : '#006B60',
        weight: 5,
        dashArray: route.isApproximate ? '9 8' : undefined,
        opacity: 0.9,
      }).addTo(instance);
      L.marker([worker.lat, worker.lng], {
        icon: L.divIcon({ className: 'dispatch-div-icon', html: '<span class="dispatch-marker selected-worker-marker"><b>✓</b>W</span>', iconSize: [34,34], iconAnchor: [17,17] }),
        title: 'Assigned member position',
      }).addTo(instance);
      L.marker([customer.lat, customer.lng], {
        icon: L.divIcon({ className: 'dispatch-div-icon', html: '<span class="dispatch-marker job-marker">Job</span>', iconSize: [38,38], iconAnchor: [19,19] }),
        title: 'Service address',
      }).addTo(instance);
      instance.fitBounds(L.latLngBounds(line), { padding: [42, 42], maxZoom: 15 });
      requestAnimationFrame(() => instance.invalidateSize(false));
    }).catch(() => setFailed(true));
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, [customer, route, worker]);
  if (!worker || !customer) return null;
  const fallbackPoints: DispatchMapPoint[] = [
    { id: receipt.job.id, kind: 'customer', label: `Service request in ${presentation.locality}`, ...customer, selected: false, distance: null, eta: null, service: receipt.job.category },
    { id: receipt.selected ?? 'worker', kind: 'worker', label: receipt.candidates.find((item) => item.worker.id === receipt.selected)?.worker.name ?? 'Assigned member', ...worker, selected: true, distance: Number((route.distanceMeters / 1000).toFixed(1)), eta: remainingMinutes, service: receipt.job.category },
  ];
  return (
    <section className="real-dispatch-map active-route-map" aria-label="Active service route">
      <div className="map-heading"><div><strong>{presentation.locality} service route</strong><span>{route.isApproximate ? t('approximatePath') : t('roadRoute')}</span></div><span>{progress >= 1 ? t('arrival') : `${remainingMinutes} min`}</span></div>
      <p className="sr-only">Assigned member travelling to the service request. {Math.round(route.distanceMeters / 100) / 10} kilometres, {remainingMinutes} minutes remaining. {route.isApproximate ? 'Approximate route.' : 'Road route from OSRM.'}</p>
      <div className="map-viewport">
        {!failed && <div ref={host} className="leaflet-host" />}
        {failed && <FallbackMap points={fallbackPoints} />}
      </div>
      <div className="route-facts">
        <strong>{(route.distanceMeters / 1000).toFixed(1)} km</strong>
        <span>{progress >= 1 ? t('memberArrived') : `${remainingMinutes} min`}</span>
        <small>{route.isApproximate ? 'Approximate ETA' : route.provider}</small>
      </div>
      <progress className="travel-progress" aria-label="Travel progress" max={1} value={progress} />
      <small className="model-note">{t('simulatedTravel')}</small>
    </section>
  );
}
