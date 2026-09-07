import { dispatchBooking } from './booking';
import {
  assumptions,
  constitution,
  copy,
  dataset,
  type Job,
  type Policy,
  type Receipt,
  type Worker,
} from './engine';

export type FederationCooperative = {
  id: string;
  name: string;
  locality: string;
  lat: number;
  lng: number;
  active: boolean;
};

export type FederationCapacity = {
  cooperativeId: string;
  service: Job['category'];
  availableWorkers: number;
  activeWorkers: number;
  workloadBlocked: number;
  earliestEta: number;
  demand: 'low' | 'balanced' | 'high';
};

export type ProtectionCovenant = {
  payoutFloor: number;
  reverseBiddingBlocked: true;
  welfareContributionRequired: true;
  scopeLockRequired: true;
  cancellationProtectionRequired: true;
  ratingFirewallRequired: true;
  workloadSafetyRequired: true;
  safeRefusalRequired: true;
  challengeRightsRequired: true;
};

export type FederationCandidate = {
  cooperativeId: string;
  availableWorkers: number;
  eta: number;
  protectionCompatible: boolean;
  slaCompatible: boolean;
  eligible: boolean;
  exclusionReason: string | null;
};

export type FederationMatch = {
  selectedCooperativeId: string | null;
  candidates: FederationCandidate[];
};

export const federationCooperatives: FederationCooperative[] = [
  { id: 'COOP-KHARADI', name: 'Kharadi Labour Cooperative', locality: 'Kharadi', lat: 18.5515, lng: 73.9348, active: true },
  { id: 'COOP-YERAWADA', name: 'Yerawada Labour Cooperative', locality: 'Yerawada', lat: 18.5529, lng: 73.8797, active: true },
  { id: 'COOP-HADAPSAR', name: 'Hadapsar Labour Cooperative', locality: 'Hadapsar', lat: 18.5089, lng: 73.9259, active: true },
  { id: 'COOP-VIMAN', name: 'Viman Nagar Labour Cooperative', locality: 'Viman Nagar', lat: 18.5679, lng: 73.9143, active: true },
];

export const federationCovenant: ProtectionCovenant = {
  payoutFloor: 650,
  reverseBiddingBlocked: true,
  welfareContributionRequired: true,
  scopeLockRequired: true,
  cancellationProtectionRequired: true,
  ratingFirewallRequired: true,
  workloadSafetyRequired: true,
  safeRefusalRequired: true,
  challengeRightsRequired: true,
};

export const goldenFederationCapacity: FederationCapacity[] = [
  { cooperativeId: 'COOP-KHARADI', service: 'Electrician', availableWorkers: 0, activeWorkers: 4, workloadBlocked: 2, earliestEta: 52, demand: 'high' },
  { cooperativeId: 'COOP-YERAWADA', service: 'Electrician', availableWorkers: 2, activeWorkers: 4, workloadBlocked: 1, earliestEta: 24, demand: 'balanced' },
  { cooperativeId: 'COOP-HADAPSAR', service: 'Electrician', availableWorkers: 1, activeWorkers: 3, workloadBlocked: 0, earliestEta: 39, demand: 'balanced' },
  { cooperativeId: 'COOP-VIMAN', service: 'Electrician', availableWorkers: 0, activeWorkers: 2, workloadBlocked: 1, earliestEta: 21, demand: 'low' },
];

export function matchFederationCooperative(input: {
  homeCooperativeId: string;
  service: Job['category'];
  sla: number;
  workerPayout: number;
  capacities: FederationCapacity[];
  incompatibleCooperatives?: string[];
}): FederationMatch {
  const incompatible = new Set(input.incompatibleCooperatives ?? []);
  const candidates = federationCooperatives
    .filter((cooperative) => cooperative.id !== input.homeCooperativeId && cooperative.active)
    .map((cooperative): FederationCandidate => {
      const capacity = input.capacities.find(
        (item) => item.cooperativeId === cooperative.id && item.service === input.service,
      );
      const protectionCompatible =
        input.workerPayout >= federationCovenant.payoutFloor && !incompatible.has(cooperative.id);
      const availableWorkers = capacity?.availableWorkers ?? 0;
      const eta = capacity?.earliestEta ?? 999;
      const slaCompatible = eta <= input.sla;
      let exclusionReason: string | null = null;
      if (!capacity) exclusionReason = 'Required service capacity is unavailable.';
      else if (!availableWorkers && capacity.workloadBlocked > 0)
        exclusionReason = 'Workload protection is active.';
      else if (!availableWorkers) exclusionReason = 'No qualified member is safely available.';
      else if (!protectionCompatible) exclusionReason = 'Federation protection covenant is not compatible.';
      else if (!slaCompatible) exclusionReason = `The ${eta}-minute arrival is outside the customer promise.`;
      return {
        cooperativeId: cooperative.id,
        availableWorkers,
        eta,
        protectionCompatible,
        slaCompatible,
        eligible: exclusionReason === null,
        exclusionReason,
      };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.eta - b.eta || a.cooperativeId.localeCompare(b.cooperativeId));
  return { selectedCooperativeId: candidates.find((candidate) => candidate.eligible)?.cooperativeId ?? null, candidates };
}

export function receivingCooperativeDispatch(job: Job, policy: Policy = constitution): Receipt {
  const workers: Worker[] = dataset().workers
    .filter((worker) => ['W01', 'W02'].includes(worker.id))
    .map((worker) =>
      worker.id === 'W02' ? { ...worker, net: 8200, gross: 9000, jobs: 11 } : { ...worker, net: 1200, gross: 1500, jobs: 2 },
    );
  return dispatchBooking(job, copy(workers), [], policy, assumptions);
}

export type FederationTwinMetrics = {
  served: number;
  unfilled: number;
  averageEta: number;
  p90Eta: number;
  slaViolations: number;
  crossCooperative: number;
  protectionViolations: number;
};

export function simulateFederationTwin(): { localOnly: FederationTwinMetrics; mesh: FederationTwinMetrics } {
  const scenarios = Array.from({ length: 12 }, (_, index) => ({
    sla: index % 4 === 0 ? 22 : 35,
    localEta: 38 + (index % 5) * 4,
    payout: 760,
    capacities: goldenFederationCapacity.map((capacity) => ({
      ...capacity,
      earliestEta: capacity.cooperativeId === 'COOP-YERAWADA' ? 20 + (index % 7) : capacity.earliestEta,
    })),
  }));
  const localEtas = scenarios.filter((scenario) => scenario.localEta <= scenario.sla).map((scenario) => scenario.localEta);
  const meshEtas = scenarios.flatMap((scenario) => {
    if (scenario.localEta <= scenario.sla) return [scenario.localEta];
    const match = matchFederationCooperative({
      homeCooperativeId: 'COOP-KHARADI', service: 'Electrician', sla: scenario.sla,
      workerPayout: scenario.payout, capacities: scenario.capacities,
    });
    const selected = match.candidates.find((candidate) => candidate.cooperativeId === match.selectedCooperativeId);
    return selected ? [selected.eta] : [];
  });
  const metric = (etas: number[], crossCooperative: number): FederationTwinMetrics => ({
    served: etas.length,
    unfilled: scenarios.length - etas.length,
    averageEta: Math.round((etas.reduce((sum, eta) => sum + eta, 0) / Math.max(etas.length, 1)) * 10) / 10,
    p90Eta: [...etas].sort((a, b) => a - b)[Math.max(0, Math.ceil(etas.length * .9) - 1)] ?? 0,
    slaViolations: 0,
    crossCooperative,
    protectionViolations: 0,
  });
  return { localOnly: metric(localEtas, 0), mesh: metric(meshEtas, meshEtas.length - localEtas.length) };
}
