import {
  assumptions,
  constitution,
  copy,
  dataset,
  type Job,
  type Metrics,
  type Policy,
  type PolicyVote,
  type Receipt,
  type Worker,
} from '../engine';
import type { Locale } from '../i18n';
import type { RouteResult } from './route-service';

export type Persona = 'customer' | 'worker' | 'operations';
export type AppRole = 'customer' | 'worker' | 'admin';
export type Actor = { role: Persona; id: string };
export type JobStage =
  | 'offered'
  | 'unassigned'
  | 'accepted'
  | 'en-route'
  | 'arrived'
  | 'start-verification'
  | 'working'
  | 'completion-verification'
  | 'completed'
  | 'cancelled';
export type Terms = {
  levyBps: number;
  dividendBps: number;
  workerCancellationPenalty: number;
  customerTravelCompensation?: number;
};
export type ProtectionIntent =
  | 'fair-opportunity'
  | 'rating-cutoff'
  | 'cheapest-bid'
  | 'unsafe-refusal-penalty'
  | 'sensitive-trait'
  | 'paid-priority'
  | 'workload-override';
export type PolicyConsultation = {
  viewedAt: string;
  basisVersion: number;
  currentNet: number;
  currentJobs: number;
  proposedNet: number;
  proposedJobs: number;
};
export type LivePolicy = Policy & {
  terms: Terms;
  historicalJobIds: string[];
  consultations: Record<string, PolicyConsultation>;
  protectionIntent?: ProtectionIntent;
  protectionCheck?: { passed: true; checkedAt: string };
};
export type PriceBreakdown = {
  customerTotal: number;
  workerServicePay: number;
  welfareContribution: number;
  cooperativeOperations: number;
  minimumWorkerPay: number;
};
export type RefusalReason =
  | 'unsafe'
  | 'out-of-scope'
  | 'schedule-conflict'
  | 'outside-service-area'
  | 'other';
export type OfferRefusal = {
  workerId: string;
  reason: RefusalReason;
  at: string;
  opportunityPenalty: 0;
};
export type MemberProfile = {
  id: string;
  membership: 'verified';
  certificate: string;
  serviceAreas: string[];
  availability: 'available' | 'busy';
  representative: 'member' | 'welfare-representative';
  workload: {
    availableUntil: number;
    minimumRestGap: number;
    maximumJobsToday: number;
    heavyServiceLimit: number;
    unavailablePeriods: { start: number; end: number }[];
  };
};
export type OpportunityRecord = {
  id: string;
  jobId: string;
  decisionId: string;
  workerId: string;
  valid: true;
  outcome: 'offered' | 'accepted' | 'declined';
  at: string;
};
export type ChangeOrder = {
  id: string;
  jobId: string;
  workerId: string;
  description: string;
  labour: number;
  material: number;
  status: 'proposed' | 'approved' | 'declined';
  proposedAt: string;
  resolvedAt: string | null;
};
export type FeedbackRecord = {
  id: string;
  jobId: string;
  rating: number;
  note: string;
  reviewRequired: boolean;
  restrictionApplied: false;
  at: string;
};
export type WorkabilityRecord = {
  id: string;
  jobId: string;
  workerId: string;
  signal: 'clear-scope' | 'scope-changed' | 'safe-site' | 'safety-concern';
  sensitive: boolean;
  status: 'recorded' | 'operations-review';
  at: string;
};
export type SettlementRecord = {
  id: string;
  invoiceId: string;
  jobId: string;
  customerTotal: number;
  workerPay: number;
  welfareContribution: number;
  cooperativeOperations: number;
  approvedExtras: number;
  disputedAmount: number;
  status: 'settled' | 'partially-disputed';
  settledAt: string;
};
export type MetricChange = {
  lowestLivelihood: number;
  averageEta: number;
  fulfilledJobs: number;
};
export type AccountabilityRecord = {
  id: string;
  policyVersion: number;
  comparisonVersion: number;
  activatedAt: string;
  windowSize: 20;
  thresholdPercent: 25;
  status: 'measuring' | 'measured' | 'revote-required';
  basisJobIds: string[];
  forecast: {
    current: Metrics;
    proposed: Metrics;
    change: MetricChange;
  };
  actual: null | {
    measuredAt: string;
    current: Metrics;
    delivered: Metrics;
    change: MetricChange;
    gap: MetricChange;
    livelihoodDeviationPercent: number;
    outcomes: {
      jobId: string;
      workerId: string | null;
      eta: number | null;
      net: number | null;
    }[];
  };
};
export type CatchUpAllocation = {
  id: string;
  policyVersion: number;
  accountabilityId: string;
  beneficiaryId: string;
  amount: number;
  opportunityGap: number;
  availableReserveAtProposal: number;
  cap: 500;
  justification: string;
  status: 'voting' | 'approved' | 'posted';
  votes: Record<string, PolicyVote>;
  postedAt: string | null;
};
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
  arrivedAt?: string | null;
  workStartedAt?: string | null;
  completedAt: string | null;
  cancellationId: string | null;
  pricing?: PriceBreakdown;
  refusals?: OfferRefusal[];
  settlementId?: string | null;
  emergency?: boolean;
  route?: RouteResult | null;
  travelProgress?: number;
  createdAt: string;
};
export type OtpType = 'start' | 'completion';
export type JobOtp = {
  id: string;
  jobId: string;
  type: OtpType;
  codeHash: string;
  customerCode: string;
  issuedAt: string;
  expiresAt: string;
  attemptCount: number;
  usedAt: string | null;
  invalidatedAt: string | null;
};
export type EvidenceType =
  | 'customer-reference'
  | 'before'
  | 'during'
  | 'after'
  | 'variance';
export type JobEvidence = {
  id: string;
  jobId: string;
  type: EvidenceType;
  caption: string;
  dataUrl: string;
  mimeType: string;
  size: number;
  uploader: Actor;
  createdAt: string;
};
export type AppNotification = {
  id: string;
  recipient: Actor;
  messageKey: string;
  params: Record<string, string | number>;
  createdAt: string;
  readAt: string | null;
};
export type IssueType =
  | 'work-incomplete'
  | 'quality'
  | 'payment'
  | 'worker-no-show'
  | 'wrong-scope'
  | 'unpaid-extra-work'
  | 'unsafe-workplace'
  | 'customer-unavailable'
  | 'cancellation'
  | 'policy-suggestion'
  | 'other';
export type IssueStatus =
  | 'open'
  | 'under-review'
  | 'waiting-for-response'
  | 'resolved'
  | 'closed';
export type IssueComment = {
  id: string;
  author: Actor;
  message: string;
  createdAt: string;
};
export type IssueRecord = {
  id: string;
  jobId: string | null;
  raisedBy: Actor;
  issueType: IssueType;
  category: 'service' | 'scope' | 'payment' | 'safety' | 'policy' | 'other';
  description: string;
  status: IssueStatus;
  assignedAdminId: string | null;
  comments: IssueComment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
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
  outcome: {
    workerId: string | null;
    charge: number;
    attribution: string;
    compensation?: number;
  };
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
  kind:
    | 'work'
    | 'dividend'
    | 'reserve'
    | 'welfare'
    | 'travel-compensation'
    | 'penalty'
    | 'remedy';
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
  schema: 7;
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
  accountability: AccountabilityRecord[];
  catchUps: CatchUpAllocation[];
  members: MemberProfile[];
  changeOrders: ChangeOrder[];
  feedback: FeedbackRecord[];
  workability: WorkabilityRecord[];
  settlements: SettlementRecord[];
  opportunities: OpportunityRecord[];
  otps: JobOtp[];
  evidence: JobEvidence[];
  notifications: AppNotification[];
  issues: IssueRecord[];
  session: {
    persona: Persona;
    memberId: string;
    customerName: string;
    locale: Locale;
    onboardingDone: Record<string, boolean>;
    auth: {
      userId: string;
      role: AppRole;
      mode: 'offline' | 'supabase';
      authenticatedAt: string;
    } | null;
  };
  rates: typeof assumptions;
};
export function emptyApplication(): ApplicationState {
  return {
    schema: 7,
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
          customerTravelCompensation: 70,
        },
        historicalJobIds: [],
        consultations: {},
      },
    ],
    activeVersion: 2,
    proposalVersion: null,
    snapshots: [],
    events: [],
    ledger: [],
    challenges: [],
    accountability: [],
    catchUps: [],
    members: dataset().workers.map((worker, index) => ({
      id: worker.id,
      membership: 'verified',
      certificate: `${worker.skills[0]} skill record`,
      serviceAreas: [String(worker.zone)],
      availability: worker.available ? 'available' : 'busy',
      representative: index === 0 ? 'welfare-representative' : 'member',
      workload: {
        availableUntil: 19 * 60,
        minimumRestGap: 30,
        maximumJobsToday: 4,
        heavyServiceLimit: 2,
        unavailablePeriods: [],
      },
    })),
    changeOrders: [],
    feedback: [],
    workability: [],
    settlements: [],
    opportunities: [],
    otps: [],
    evidence: [],
    notifications: [],
    issues: [],
    session: {
      persona: 'customer',
      memberId: 'W01',
      customerName: 'Demo customer',
      locale: 'en',
      onboardingDone: {},
      auth: null,
    },
    rates: copy(assumptions),
  };
}
export function normalizeVote(value: PolicyVote | 'support' | 'oppose') {
  return typeof value === 'string' ? { choice: value, reason: '' } : value;
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
