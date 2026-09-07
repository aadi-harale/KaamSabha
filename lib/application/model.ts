import {
  assumptions,
  constitution,
  copy,
  dataset,
  type Job,
  type Policy,
  type Receipt,
  type Worker,
} from '../engine';

export type Persona = 'customer' | 'worker' | 'operations';
export type Actor = { role: Persona; id: string };
export type JobStage =
  | 'offered'
  | 'unassigned'
  | 'accepted'
  | 'en-route'
  | 'arrived'
  | 'working'
  | 'completed'
  | 'cancelled';
export type Terms = {
  levyBps: number;
  dividendBps: number;
  workerCancellationPenalty: number;
};
export type LivePolicy = Policy & { terms: Terms; historicalJobIds: string[] };
export type WorkOrder = {
  id: string;
  job: Job;
  stage: JobStage;
  workerId: string | null;
  declined: string[];
  receiptIds: string[];
  dispatchId: string;
  acceptedAt: string | null;
  departedAt: string | null;
  completedAt: string | null;
  cancellationId: string | null;
  createdAt: string;
};
export type CancellationInput = {
  actor: 'customer' | 'worker';
  stage: JobStage;
  workerId: string | null;
  acceptedAt: string | null;
  departedAt: string | null;
  cancelledAt: string;
};
export type DecisionPayload = {
  id: string;
  jobId: string;
  kind: 'dispatch' | 'cancellation' | 'penalty';
  at: string;
  actor: Actor;
  policy: LivePolicy;
  previousHash: string;
  receipt: Receipt | null;
  evidence: CancellationInput | null;
  outcome: { workerId: string | null; charge: number; attribution: string };
};
export type DecisionSnapshot = DecisionPayload & { hash: string };
export type AppEvent = {
  id: string;
  at: string;
  actor: Actor;
  subject: string;
  type: string;
  detail: string;
};
export type LedgerEntry = {
  id: string;
  jobId: string;
  workerId: string | null;
  kind: 'work' | 'dividend' | 'reserve' | 'penalty' | 'remedy';
  amount: number;
  at: string;
  decisionId: string;
  detail: string;
};
export type CourtCase = {
  id: string;
  snapshotId: string;
  openedBy: Actor;
  reason: string;
  status:
    | 'open'
    | 'replayed'
    | 'confirmed'
    | 'violation'
    | 'human-review'
    | 'remedied'
    | 'closed';
  result: {
    verdict: 'confirmed' | 'violation' | 'human-review';
    explanation: string;
    expectedCharge: number | null;
    expectedWorker: string | null;
  } | null;
};
export type ApplicationState = {
  schema: 1;
  revision: number;
  sequence: number;
  workers: Worker[];
  jobs: WorkOrder[];
  policies: LivePolicy[];
  activeVersion: number;
  proposalVersion: number | null;
  snapshots: DecisionSnapshot[];
  events: AppEvent[];
  ledger: LedgerEntry[];
  challenges: CourtCase[];
  session: { persona: Persona; memberId: string };
  rates: typeof assumptions;
};
export function emptyApplication(): ApplicationState {
  return {
    schema: 1,
    revision: 0,
    sequence: 0,
    workers: dataset().workers,
    jobs: [],
    policies: [
      {
        ...copy(constitution),
        votes: {},
        terms: {
          levyBps: 500,
          dividendBps: 5000,
          workerCancellationPenalty: 100,
        },
        historicalJobIds: [],
      },
    ],
    activeVersion: 2,
    proposalVersion: null,
    snapshots: [],
    events: [],
    ledger: [],
    challenges: [],
    session: { persona: 'customer', memberId: 'W01' },
    rates: copy(assumptions),
  };
}
export const rupees = (n: number) => Math.round(n * 100) / 100;
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`,
      )
      .join(',')}}`;
  return JSON.stringify(value);
}
export async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical(value)),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function verifySnapshot(snapshot: DecisionSnapshot) {
  const { hash, ...payload } = snapshot;
  return hash === (await digest(payload));
}
export function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
