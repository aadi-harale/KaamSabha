import { SEED, zones, type Candidate, type Receipt } from './engine';

export type DispatchMapPoint = {
  id: string;
  kind: 'customer' | 'worker';
  label: string;
  lat: number;
  lng: number;
  selected: boolean;
  distance: number | null;
  eta: number | null;
  service: string;
};

export type DispatchMapPresentation = {
  receiptId: string;
  selectedId: string | null;
  points: DispatchMapPoint[];
  summary: string;
  locality: string;
  allowedExtraMinutes: number;
  actualExtraMinutes: number;
  slaMinutes: number;
};

const anchors: Record<string, [number, number]> = {
  Kharadi: [18.5515, 73.947],
  Hadapsar: [18.5089, 73.9259],
  'Viman Nagar': [18.5679, 73.9143],
  Kothrud: [18.5074, 73.8077],
  Baner: [18.559, 73.7868],
  Wakad: [18.598, 73.762],
  Shivajinagar: [18.5308, 73.8475],
  Kondhwa: [18.4602, 73.891],
  Aundh: [18.5597, 73.8075],
  Yerawada: [18.552, 73.889],
};

function bearing(workerId: string, zone: number) {
  const numeric = Number(workerId.replace(/\D/g, '')) || 1;
  return ((SEED + numeric * 137 + zone * 53) % 360) * (Math.PI / 180);
}

export function workerCoordinate(
  workerId: string,
  zone: number,
  distanceKm: number,
) {
  const locality = zones[zone] ?? zones[0];
  const [lat, lng] = anchors[locality];
  const angle = bearing(workerId, zone);
  const latitudeOffset = (distanceKm / 111) * Math.cos(angle);
  const longitudeOffset =
    (distanceKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
  return {
    lat: Number((lat + latitudeOffset).toFixed(6)),
    lng: Number((lng + longitudeOffset).toFixed(6)),
  };
}

function relevantCandidates(receipt: Receipt, limit: number) {
  return receipt.candidates
    .filter((candidate) => !candidate.failed.length)
    .sort(
      (a, b) =>
        Number(b.worker.id === receipt.selected) -
          Number(a.worker.id === receipt.selected) ||
        a.eta - b.eta ||
        a.worker.id.localeCompare(b.worker.id),
    )
    .slice(0, Math.max(2, Math.min(4, limit)));
}

export function presentReceiptMap(
  receipt: Receipt,
  candidateLimit = 4,
): DispatchMapPresentation {
  const locality = zones[receipt.job.zone] ?? zones[0];
  const [lat, lng] = anchors[locality];
  const candidates = relevantCandidates(receipt, candidateLimit);
  const fastestEta = candidates.length
    ? Math.min(...candidates.map((candidate) => candidate.eta))
    : 0;
  const selected = candidates.find(
    (candidate) => candidate.worker.id === receipt.selected,
  );
  const workerPoints = candidates.map((candidate) => ({
    id: candidate.worker.id,
    kind: 'worker' as const,
    label: candidate.worker.name,
    ...workerCoordinate(
      candidate.worker.id,
      receipt.job.zone,
      candidate.distance,
    ),
    selected: candidate.worker.id === receipt.selected,
    distance: candidate.distance,
    eta: candidate.eta,
    service: receipt.job.category,
  }));
  const descriptions = candidates.map(
    (candidate) =>
      `${candidate.worker.name} is ${candidate.distance} km away with a ${candidate.eta}-minute ETA`,
  );
  const actualExtraMinutes = selected ? selected.eta - fastestEta : 0;
  return {
    receiptId: receipt.id,
    selectedId: receipt.selected,
    points: [
      {
        id: receipt.job.id,
        kind: 'customer',
        label: `Service request in ${locality}`,
        lat,
        lng,
        selected: false,
        distance: null,
        eta: null,
        service: receipt.job.category,
      },
      ...workerPoints,
    ],
    summary: `Service request in ${locality}. ${descriptions.length ? `${descriptions.join('. ')}.` : 'No worker passed every eligibility and workload check.'} ${selected?.worker.name ?? 'No worker'} was selected. The ${actualExtraMinutes}-minute difference is within the cooperative’s ${receipt.policy.parameters.maxDelay}-minute fair-work allowance and ${Math.min(receipt.job.sla, receipt.policy.constraints.sla)}-minute SLA.`,
    locality,
    allowedExtraMinutes: receipt.policy.parameters.maxDelay,
    actualExtraMinutes,
    slaMinutes: Math.min(receipt.job.sla, receipt.policy.constraints.sla),
  };
}

export function selectedCandidate(receipt: Receipt): Candidate | undefined {
  return receipt.candidates.find(
    (candidate) => candidate.worker.id === receipt.selected,
  );
}
