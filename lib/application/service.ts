import {
  activate,
  copy,
  dataset,
  propose,
  replayAssignment,
  simulate,
  simulateProposal,
  vote,
  SEED,
  type Job,
  type Metrics,
  type Policy,
} from '../engine';
import { dispatchBooking } from '../booking';
import {
  cancellationProtection,
  canSettleChangeOrder,
  opportunityNeedScore,
  priceBands,
  ratingProtection,
  refusalConsequence,
  validatePrice,
  validateProtectionIntent,
  workloadSafetyReason,
} from '../protections';
import {
  digest,
  rupees,
  type Actor,
  type AppEvent,
  type ApplicationState,
  type AccountabilityRecord,
  type CancellationInput,
  type CatchUpAllocation,
  type CourtCase,
  type DecisionPayload,
  type DecisionSnapshot,
  type JobStage,
  type LivePolicy,
  type Persona,
  type PriceBreakdown,
  type ProtectionIntent,
  type RefusalReason,
  type WorkOrder,
  type JobEvidence,
  type OtpType,
  type AppRole,
  type IssueType,
  type IssueStatus,
} from './model';
import type { ApplicationRepository, UnitOfWork } from './repositories';
import { presentReceiptMap } from '../map';
import { fetchRoute } from './route-service';
import { authenticateUser, endAuthenticatedSession } from './auth';
import {
  federationCovenant,
  matchFederationCooperative,
  receivingCooperativeDispatch,
  simulateFederationTwin,
} from '../federation';

export type NewBooking = {
  service: Job['category'];
  zone: number;
  requested: number;
  requirement: string;
  payout?: number;
  pricing?: PriceBreakdown;
  emergency?: boolean;
};
const customer: Actor = { role: 'customer', id: 'CUSTOMER-01' };
const operator: Actor = { role: 'operations', id: 'OPS-01' };
const now = () => new Date().toISOString();
const activePolicy = (u: UnitOfWork) => u.policies.get(u.state.activeVersion);
function comparisonJobs(u: UnitOfWork) {
  return [
    ...dataset().jobs,
    ...u.state.jobs.map((x) => ({ ...x.job, status: 'requested' as const })),
  ];
}
function metricChange(current: Metrics, proposed: Metrics) {
  return {
    lowestLivelihood: rupees(proposed.lowest - current.lowest),
    averageEta: rupees(proposed.avgEta - current.avgEta),
    fulfilledJobs: proposed.fulfilled - current.fulfilled,
  };
}
function id(u: UnitOfWork, prefix: string) {
  u.state.sequence++;
  return `${prefix}-${String(u.state.sequence).padStart(5, '0')}`;
}
function event(
  u: UnitOfWork,
  actor: Actor,
  subject: string,
  type: string,
  detail: string,
  at = now(),
) {
  const value: AppEvent = {
    id: id(u, 'EVT'),
    at,
    actor,
    subject,
    type,
    detail,
  };
  u.events.append(value);
}
async function snapshot(
  u: UnitOfWork,
  payload: Omit<DecisionPayload, 'id' | 'previousHash'>,
) {
  const body: DecisionPayload = {
    ...copy(payload),
    id: id(u, 'DEC'),
    previousHash: u.state.snapshots.at(-1)?.hash ?? 'GENESIS',
  };
  const value: DecisionSnapshot = { ...body, hash: await digest(body) };
  u.snapshots.append(value);
  return value;
}
function bookedRecords(u: UnitOfWork, except?: string) {
  return u.jobs
    .all()
    .filter((x) => x.id !== except && x.stage !== 'cancelled')
    .map((x) => ({
      job: x.job,
      receipt: u.snapshots.get(x.receiptIds.at(-1)!).receipt!,
    }));
}
function workersForDispatch(u: UnitOfWork, job: Job, declined: string[]) {
  const blocked = new Map<string, string>();
  const workers = u.state.workers.map((worker) => {
    const profile = u.members.get(worker.id);
    const sameDay = u.jobs
      .all()
      .filter(
        (order) =>
          order.id !== job.id &&
          order.workerId === worker.id &&
          order.stage !== 'cancelled' &&
          Math.floor(order.job.requested / 1440) ===
            Math.floor(job.requested / 1440),
      );
    const prior = sameDay
      .filter((order) => order.job.requested <= job.requested)
      .sort((a, b) => b.job.requested - a.job.requested)[0];
    const reason = workloadSafetyReason({
      requestedMinute: job.requested,
      availableUntil: profile.workload.availableUntil,
      minimumRestGap: profile.workload.minimumRestGap,
      maximumJobsToday: profile.workload.maximumJobsToday,
      jobsToday: sameDay.length,
      heavyService: ['Home cleaning', 'Caregiving'].includes(job.category),
      heavyJobsToday: sameDay.filter((order) =>
        ['Home cleaning', 'Caregiving'].includes(order.job.category),
      ).length,
      heavyServiceLimit: profile.workload.heavyServiceLimit,
      lastJobEnd: prior ? prior.job.requested + prior.job.duration : null,
      unavailablePeriods: profile.workload.unavailablePeriods,
    });
    if (reason) blocked.set(worker.id, reason);
    return declined.includes(worker.id) || reason
      ? { ...worker, available: false }
      : worker;
  });
  return { workers, blocked };
}
async function assign(
  u: UnitOfWork,
  job: Job,
  declined: string[],
  dispatchId: string,
  actor: Actor,
) {
  const policy = activePolicy(u);
  const workload = workersForDispatch(u, job, declined);
  const receipt = dispatchBooking(
    job,
    workload.workers,
    bookedRecords(u, job.id),
    policy,
    u.state.rates,
  );
  receipt.candidates = receipt.candidates.map((candidate) => {
    const reason = workload.blocked.get(candidate.worker.id);
    if (!reason) return candidate;
    return {
      ...candidate,
      failed: candidate.failed.map((failure) =>
        failure === 'Unavailable' ? `Workload safety: ${reason}` : failure,
      ),
    };
  });
  const decision = await snapshot(u, {
    jobId: job.id,
    kind: 'dispatch',
    at: now(),
    actor,
    policy,
    receipt,
    evidence: null,
    outcome: {
      workerId: receipt.selected,
      charge: 0,
      attribution: 'dispatch engine',
    },
  });
  event(
    u,
    actor,
    job.id,
    receipt.selected ? 'worker-offered' : 'dispatch-unassigned',
    receipt.selected
      ? `Offered to ${receipt.selected} under policy v${policy.version}.`
      : 'No eligible worker.',
    decision.at,
  );
  if (receipt.selected)
    u.opportunities.put({
      id: id(u, 'OPP'),
      jobId: job.id,
      decisionId: decision.id,
      workerId: receipt.selected,
      valid: true,
      outcome: 'offered',
      at: decision.at,
    });
  if (receipt.selected)
    u.notifications.put({
      id: id(u, 'NTF'), recipient: { role: 'worker', id: receipt.selected },
      messageKey: 'NEW_OFFER', params: { jobId: job.id }, createdAt: decision.at, readAt: null,
    });
  return { receipt, decision, dispatchId };
}
export async function createBooking(
  repo: ApplicationRepository,
  input: NewBooking,
) {
  if (
    !input.requirement.trim() ||
    input.zone < 0 ||
    input.zone > 9 ||
    !Number.isInteger(input.requested)
  )
    throw new Error('Enter a valid service request, locality and time.');
  return repo.transaction(async (u) => {
    const pricing = validatePrice(input.pricing ?? priceBands[input.service]);
    const jobId = id(u, 'KMS-LIVE'),
      createdAt = now();
    const job: Job = {
      id: jobId,
      category: input.service,
      customer: u.state.session.customerName,
      zone: input.zone,
      payout: pricing.workerServicePay,
      duration: 60,
      requested: input.requested,
      sla: 35,
      emergency: input.emergency ?? false,
      consumables: 45,
      cancellationLoss: 0,
      status: 'requested',
      requirement: input.requirement.trim(),
    };
    event(
      u,
      customer,
      jobId,
      'booking-created',
      `${job.category} requested.`,
      createdAt,
    );
    let assigned = await assign(u, job, [], id(u, 'DSP'), customer);
    let federationOpportunityId: string | null = null;
    if (!assigned.receipt.selected) {
      const match = matchFederationCooperative({
        homeCooperativeId: 'COOP-KHARADI', service: job.category, sla: job.sla,
        workerPayout: pricing.workerServicePay, capacities: u.state.federation.capacities,
      });
      if (match.selectedCooperativeId) {
        const workerReceipt = receivingCooperativeDispatch(job, activePolicy(u));
        if (workerReceipt.selected) {
          federationOpportunityId = id(u, 'FED-OPP');
          const opportunity = {
            id: federationOpportunityId, jobId, homeCooperativeId: 'COOP-KHARADI',
            selectedCooperativeId: match.selectedCooperativeId, service: job.category,
            customerSlaMinutes: job.sla, reasonForOverflow: 'No local safe capacity within the customer promise.',
            status: 'accepted' as const, candidates: match.candidates, covenant: federationCovenant,
            workerId: workerReceipt.selected, workerReceipt, createdAt, resolvedAt: createdAt,
          };
          u.state.federation.opportunities.push(opportunity);
          const workerDecision = await snapshot(u, {
            jobId, kind: 'dispatch', at: createdAt, actor: operator, policy: activePolicy(u),
            receipt: workerReceipt, evidence: null,
            outcome: { workerId: workerReceipt.selected, charge: 0, attribution: 'receiving cooperative constitution' },
          });
          const federationBody = {
            id: id(u, 'FED-DEC'), opportunityId: federationOpportunityId, at: createdAt,
            previousHash: u.state.federation.snapshots.at(-1)?.hash ?? 'FEDERATION-GENESIS',
            payload: copy(opportunity),
          };
          u.state.federation.snapshots.push({ ...federationBody, hash: await digest(federationBody) });
          event(u, operator, jobId, 'FEDERATION_OVERFLOW_OPENED', 'Local dispatch had no safe assignment; federation capacity check opened.');
          event(u, operator, jobId, 'COOPERATIVE_SELECTED', `${match.selectedCooperativeId} selected by capacity, covenant and SLA.`);
          event(u, operator, jobId, 'FEDERATION_WORKER_SELECTED', `${workerReceipt.selected} selected by the receiving cooperative constitution.`);
          assigned = { receipt: workerReceipt, decision: workerDecision, dispatchId: federationOpportunityId };
        }
      }
    }
    const order: WorkOrder = {
      id: jobId,
      job: {
        ...job,
        status: assigned.receipt.selected ? 'assigned' : 'requested',
      },
      stage: assigned.receipt.selected ? 'offered' : 'unassigned',
      workerId: assigned.receipt.selected,
      declined: [],
      receiptIds: [assigned.decision.id],
      dispatchId: assigned.dispatchId,
      acceptedAt: null,
      departedAt: null,
      arrivedAt: null,
      workStartedAt: null,
      completedAt: null,
      cancellationId: null,
      pricing,
      refusals: [],
      settlementId: null,
      emergency: input.emergency ?? false,
      route: null,
      travelProgress: 0,
      createdAt,
      federationOpportunityId,
    };
    u.jobs.put(order);
    return order.id;
  });
}
const transitions: Record<JobStage, JobStage[]> = {
  offered: ['accepted', 'cancelled'],
  unassigned: ['cancelled'],
  accepted: ['en-route', 'cancelled'],
  'en-route': ['arrived', 'cancelled'],
  arrived: ['start-verification', 'working', 'cancelled'],
  'start-verification': ['working', 'cancelled'],
  working: ['completion-verification', 'completed', 'cancelled'],
  'completion-verification': ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
function move(
  u: UnitOfWork,
  jobId: string,
  expectedWorker: string,
  next: JobStage,
  detail: string,
) {
  const job = u.jobs.get(jobId);
  if (job.workerId !== expectedWorker)
    throw new Error('This offer belongs to another member.');
  if (!transitions[job.stage].includes(next))
    throw new Error(`A ${job.stage} job cannot move to ${next}.`);
  job.stage = next;
  if (next === 'accepted') job.acceptedAt = now();
  if (next === 'en-route') job.departedAt = now();
  if (next === 'arrived') {
    job.arrivedAt = now();
    job.travelProgress = 1;
  }
  if (next === 'working') job.workStartedAt = now();
  if (next === 'completed') {
    job.completedAt = now();
    job.job.status = 'completed';
  }
  u.jobs.put(job);
  event(u, { role: 'worker', id: expectedWorker }, jobId, next, detail);
  return job;
}
export const acceptOffer = (
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
) =>
  repo.transaction((u) => {
    const order = move(
      u,
      jobId,
      workerId,
      'accepted',
      'Worker accepted the offer.',
    );
    const opportunity = u.opportunities
      .all()
      .filter((item) => item.jobId === jobId && item.workerId === workerId)
      .at(-1);
    if (opportunity) {
      opportunity.outcome = 'accepted';
      u.opportunities.put(opportunity);
    }
    return order;
  });
export const startTravel = (
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
) =>
  repo.transaction((u) =>
    move(u, jobId, workerId, 'en-route', 'Worker started travelling.'),
  );
export async function startTravelWithRoute(
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
) {
  const state = repo.read();
  const order = state.jobs.find((item) => item.id === jobId);
  const receipt = state.snapshots.find(
    (item) => item.id === order?.receiptIds.at(-1),
  )?.receipt;
  if (!order || !receipt) throw new Error('The frozen dispatch route is unavailable.');
  const map = presentReceiptMap(receipt);
  const origin = map.points.find((point) => point.id === workerId);
  const destination = map.points.find((point) => point.kind === 'customer');
  if (!origin || !destination) throw new Error('Route endpoints are unavailable.');
  const route = await fetchRoute(origin, destination);
  return repo.transaction((u) => {
    const value = move(u, jobId, workerId, 'en-route', 'Worker started travelling; one shared route was recorded.');
    value.route = route;
    value.travelProgress = 0;
    u.jobs.put(value);
    event(
      u,
      { role: 'worker', id: workerId },
      jobId,
      'route-recorded',
      `${route.provider}; ${route.distanceMeters} m; ${route.durationSeconds} s; approximate ${route.isApproximate}.`,
    );
    u.notifications.put({ id: id(u, 'NTF'), recipient: customer, messageKey: 'WORKER_TRAVELLING', params: { jobId }, createdAt: now(), readAt: null });
    return value;
  });
}

export const advanceTravel = (
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
) =>
  repo.transaction((u) => {
    const value = u.jobs.get(jobId);
    if (value.workerId !== workerId || value.stage !== 'en-route')
      throw new Error('Travel progress can update only for your active route.');
    const current = value.travelProgress ?? 0;
    value.travelProgress = Math.min(1, current < 0.34 ? 0.34 : current < 0.67 ? 0.67 : 1);
    if (value.travelProgress === 1) {
      value.stage = 'arrived';
      value.arrivedAt = now();
      event(u, { role: 'worker', id: workerId }, jobId, 'arrived', 'Worker arrived at the service address.');
      u.notifications.put({ id: id(u, 'NTF'), recipient: customer, messageKey: 'WORKER_ARRIVED', params: { jobId }, createdAt: now(), readAt: null });
    } else {
      event(u, { role: 'worker', id: workerId }, jobId, 'travel-progress', `Simulated demo travel is ${Math.round(value.travelProgress * 100)}% complete.`);
    }
    u.jobs.put(value);
    return value;
  });
export const recordArrival = (
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
) =>
  repo.transaction((u) =>
    move(
      u,
      jobId,
      workerId,
      'arrived',
      'Worker arrived at the service address.',
    ),
  );
export const startWork = (
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
) =>
  repo.transaction((u) =>
    move(u, jobId, workerId, 'working', 'Worker started the service.'),
  );

function randomSixDigitCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

export async function requestJobOtp(
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
  type: OtpType,
) {
  let code = randomSixDigitCode();
  const priorCodes = repo.read().otps.filter((item) => item.jobId === jobId).map((item) => item.customerCode);
  while (priorCodes.includes(code)) code = randomSixDigitCode();
  const codeHash = await digest({ jobId, type, code });
  await repo.transaction((u) => {
    const order = u.jobs.get(jobId);
    const expected = type === 'start' ? 'arrived' : 'working';
    const next = type === 'start' ? 'start-verification' : 'completion-verification';
    if (order.workerId !== workerId || order.stage !== expected)
      throw new Error(`The ${type} code cannot be requested from the ${order.stage} state.`);
    for (const existing of u.otps.all().filter((item) => item.jobId === jobId && item.type === type && !item.usedAt)) {
      existing.invalidatedAt = now();
      u.otps.put(existing);
    }
    move(u, jobId, workerId, next, `${type === 'start' ? 'Start' : 'Completion'} code requested.`);
    const issuedAt = now();
    u.otps.put({
      id: id(u, 'OTP'), jobId, type, codeHash, customerCode: code, issuedAt,
      expiresAt: new Date(Date.parse(issuedAt) + 5 * 60_000).toISOString(),
      attemptCount: 0, usedAt: null, invalidatedAt: null,
    });
    u.notifications.put({
      id: id(u, 'NTF'), recipient: customer,
      messageKey: type === 'start' ? 'START_OTP_ISSUED' : 'COMPLETION_OTP_ISSUED',
      params: { jobId, workerId }, createdAt: issuedAt, readAt: null,
    });
  });
  return code;
}

export async function verifyJobOtp(
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
  type: OtpType,
  code: string,
) {
  const codeHash = await digest({ jobId, type, code: code.trim() });
  const verificationError = await repo.transaction((u) => {
    const order = u.jobs.get(jobId);
    const expected = type === 'start' ? 'start-verification' : 'completion-verification';
    if (order.workerId !== workerId || order.stage !== expected)
      throw new Error(`This ${type} code does not match the current job state.`);
    const otp = u.otps.all().filter((item) => item.jobId === jobId && item.type === type).at(-1);
    if (!otp || otp.invalidatedAt) return 'Ask the customer for a new code.';
    if (otp.usedAt) return 'This code was already used. Ask for a new code.';
    if (Date.parse(otp.expiresAt) < Date.now()) return 'The code expired. Ask the customer for a new code.';
    if (otp.attemptCount >= 5) return 'Too many attempts. Ask the customer for a new code.';
    otp.attemptCount += 1;
    if (otp.codeHash !== codeHash) {
      u.otps.put(otp);
      return 'That code is incorrect. Check the six digits with the customer.';
    }
    otp.usedAt = now();
    u.otps.put(otp);
    event(u, { role: 'worker', id: workerId }, jobId, `${type}-otp-verified`, `${type === 'start' ? 'Start' : 'Completion'} code verified.`);
    if (type === 'start') move(u, jobId, workerId, 'working', 'Start code verified; work started.');
    return null;
  });
  if (verificationError) throw new Error(verificationError);
  if (type === 'completion') return completeWork(repo, jobId, workerId);
}

export async function addJobEvidence(
  repo: ApplicationRepository,
  input: Omit<JobEvidence, 'id' | 'createdAt'>,
) {
  if (!input.mimeType.startsWith('image/') || input.size <= 0 || input.size > 2_000_000)
    throw new Error('Use a valid compressed image smaller than 2 MB.');
  return repo.transaction((u) => {
    const order = u.jobs.get(input.jobId);
    if (input.uploader.role === 'worker' && order.workerId !== input.uploader.id)
      throw new Error('Only the assigned member can add work proof.');
    if (input.uploader.role === 'customer' && input.type !== 'customer-reference')
      throw new Error('Customer uploads are saved as reference evidence.');
    const value: JobEvidence = { ...input, id: id(u, 'EVD'), createdAt: now() };
    u.evidence.put(value);
    event(u, input.uploader, input.jobId, 'evidence-added', `${input.type} evidence added: ${input.caption || 'No caption'}.`);
    return value;
  });
}
export async function declineOffer(
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
  reason: RefusalReason = 'other',
) {
  return repo.transaction(async (u) => {
    const order = u.jobs.get(jobId);
    if (order.stage !== 'offered' || order.workerId !== workerId)
      throw new Error('Only the member holding this offer can decline it.');
    order.declined.push(workerId);
    const consequence = refusalConsequence(reason);
    order.refusals ??= [];
    order.refusals.push({ workerId, reason, at: now(), opportunityPenalty: 0 });
    const opportunity = u.opportunities
      .all()
      .filter((item) => item.jobId === jobId && item.workerId === workerId)
      .at(-1);
    if (opportunity) {
      opportunity.outcome = 'declined';
      u.opportunities.put(opportunity);
    }
    event(
      u,
      { role: 'worker', id: workerId },
      jobId,
      'offer-declined',
      `Worker declined (${reason}); opportunity penalty ${consequence.opportunityPenalty}. Dispatch ran again.`,
    );
    const assigned = await assign(
      u,
      { ...order.job, status: 'requested' },
      order.declined,
      order.dispatchId,
      operator,
    );
    order.workerId = assigned.receipt.selected;
    order.receiptIds.push(assigned.decision.id);
    order.stage = assigned.receipt.selected ? 'offered' : 'unassigned';
    order.job.status = assigned.receipt.selected ? 'assigned' : 'requested';
    u.jobs.put(order);
  });
}
export async function completeWork(
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
) {
  return repo.transaction((u) => {
    const order = move(
      u,
      jobId,
      workerId,
      'completed',
      'Service completed; settlement journal posted.',
    );
    if (u.ledger.all().some((x) => x.jobId === jobId && x.kind === 'work'))
      throw new Error('This job is already settled.');
    const decision = u.snapshots.get(order.receiptIds.at(-1)!);
    const candidate = decision.receipt?.candidates.find(
      (c) => c.worker.id === workerId,
    );
    if (!candidate)
      throw new Error(
        'Frozen dispatch costs are unavailable; settlement blocked.',
      );
    const policy = decision.policy,
      pricing = order.pricing ?? priceBands[order.job.category],
      approvedExtras = rupees(
        u.changeOrders
          .all()
          .filter(
            (change) =>
              change.jobId === jobId && canSettleChangeOrder(change.status),
          )
          .reduce((sum, change) => sum + change.labour + change.material, 0),
      ),
      operations = pricing.cooperativeOperations,
      dividendPool = rupees((operations * policy.terms.dividendBps) / 10000);
    const activeMembers = u.state.workers.filter((w) => w.active);
    const perMember = rupees(dividendPool / activeMembers.length);
    u.ledger.append({
      id: id(u, 'LED'),
      jobId,
      workerId,
      kind: 'work',
      amount: rupees(candidate.net + approvedExtras),
      at: now(),
      decisionId: decision.id,
      detail: `Frozen net ${candidate.net}; approved extras ${approvedExtras}; no worker deduction.`,
    });
    for (const member of activeMembers)
      u.ledger.append({
        id: id(u, 'LED'),
        jobId,
        workerId: member.id,
        kind: 'dividend',
        amount: perMember,
        at: now(),
        decisionId: decision.id,
        detail: `Equal share of ${dividendPool} distributable surplus.`,
      });
    u.ledger.append({
      id: id(u, 'LED'),
      jobId,
      workerId: null,
      kind: 'reserve',
      amount: rupees(operations - perMember * activeMembers.length),
      at: now(),
      decisionId: decision.id,
      detail: 'Cooperative reserve after member dividend allocation.',
    });
    u.ledger.append({
      id: id(u, 'LED'),
      jobId,
      workerId: null,
      kind: 'welfare',
      amount: pricing.welfareContribution,
      at: now(),
      decisionId: decision.id,
      detail: 'Customer-funded cooperative welfare contribution.',
    });
    const settlementId = id(u, 'SET');
    u.settlements.put({
      id: settlementId,
      invoiceId: id(u, 'INV'),
      jobId,
      customerTotal: pricing.customerTotal + approvedExtras,
      workerPay: rupees(candidate.net + approvedExtras),
      welfareContribution: pricing.welfareContribution,
      cooperativeOperations: operations,
      approvedExtras,
      disputedAmount: 0,
      status: 'settled',
      settledAt: now(),
    });
    order.settlementId = settlementId;
    u.jobs.put(order);
  });
}
export async function cancelJob(
  repo: ApplicationRepository,
  jobId: string,
  actor: CancellationInput['actor'],
) {
  return repo.transaction(async (u) => {
    const order = u.jobs.get(jobId);
    if (order.stage === 'completed' || order.stage === 'cancelled')
      throw new Error('This job is already closed.');
    const policy = activePolicy(u),
      at = now(),
      evidence: CancellationInput = {
        actor,
        stage: order.stage,
        workerId: order.workerId,
        acceptedAt: order.acceptedAt,
        departedAt: order.departedAt,
        cancelledAt: at,
      };
    const consequence = cancellationProtection({
      actor,
      departedAt: order.departedAt,
      workerPenalty:
        order.stage !== 'offered' && order.stage !== 'unassigned'
          ? policy.terms.workerCancellationPenalty
          : 0,
      travelCompensation: policy.terms.customerTravelCompensation ?? 70,
    });
    const charge = consequence.workerPenalty;
    const decision = await snapshot(u, {
      jobId,
      kind: 'cancellation',
      at,
      actor:
        actor === 'worker' ? { role: 'worker', id: order.workerId! } : customer,
      policy,
      receipt: null,
      evidence,
      outcome: {
        workerId: order.workerId,
        charge,
        compensation: consequence.workerCompensation,
        attribution: actor,
      },
    });
    order.stage = 'cancelled';
    order.job.status = 'cancelled';
    order.cancellationId = decision.id;
    u.jobs.put(order);
    event(
      u,
      decision.actor,
      jobId,
      'cancelled',
      `${actor} cancelled; worker penalty ${charge}; travel compensation ${consequence.workerCompensation}.`,
      at,
    );
    if (charge && order.workerId) {
      const penalty = await snapshot(u, {
        jobId,
        kind: 'penalty',
        at,
        actor: operator,
        policy,
        receipt: null,
        evidence,
        outcome: {
          workerId: order.workerId,
          charge,
          attribution: 'worker cancellation penalty',
        },
      });
      u.ledger.append({
        id: id(u, 'LED'),
        jobId,
        workerId: order.workerId,
        kind: 'penalty',
        amount: -charge,
        at,
        decisionId: penalty.id,
        detail: 'Worker cancellation after acceptance.',
      });
    }
    if (consequence.workerCompensation && order.workerId)
      u.ledger.append({
        id: id(u, 'LED'),
        jobId,
        workerId: order.workerId,
        kind: 'travel-compensation',
        amount: consequence.workerCompensation,
        at,
        decisionId: decision.id,
        detail:
          'Customer cancelled after travel began; worker travel protected.',
      });
  });
}
export const proposeChangeOrder = (
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
  description: string,
  labour: number,
  material: number,
) =>
  repo.transaction((u) => {
    const order = u.jobs.get(jobId);
    if (
      order.workerId !== workerId ||
      !['arrived', 'working'].includes(order.stage)
    )
      throw new Error(
        'A scope change can be raised only by the assigned member on site.',
      );
    if (
      !description.trim() ||
      labour < 0 ||
      material < 0 ||
      labour + material <= 0
    )
      throw new Error('Describe the extra work and enter a valid amount.');
    if (
      u.changeOrders
        .all()
        .some(
          (change) => change.jobId === jobId && change.status === 'proposed',
        )
    )
      throw new Error('This job already has a change order awaiting consent.');
    const value = {
      id: id(u, 'SCOPE'),
      jobId,
      workerId,
      description: description.trim(),
      labour: rupees(labour),
      material: rupees(material),
      status: 'proposed' as const,
      proposedAt: now(),
      resolvedAt: null,
    };
    u.changeOrders.put(value);
    event(
      u,
      { role: 'worker', id: workerId },
      jobId,
      'scope-change-proposed',
      `${value.description}; customer approval required before extra work.`,
    );
    return value.id;
  });

export const decideChangeOrder = (
  repo: ApplicationRepository,
  changeOrderId: string,
  decision: 'approved' | 'declined',
) =>
  repo.transaction((u) => {
    const value = u.changeOrders.get(changeOrderId);
    if (value.status !== 'proposed')
      throw new Error('This scope change is already decided.');
    value.status = decision;
    value.resolvedAt = now();
    u.changeOrders.put(value);
    event(
      u,
      customer,
      value.jobId,
      `scope-change-${decision}`,
      decision === 'approved'
        ? 'Customer approved the quoted extra work.'
        : 'Customer declined; refusal cannot harm the worker.',
    );
  });

export const submitCustomerFeedback = (
  repo: ApplicationRepository,
  jobId: string,
  rating: number,
  note = '',
) =>
  repo.transaction((u) => {
    const order = u.jobs.get(jobId);
    if (order.stage !== 'completed')
      throw new Error('Complete the service before rating it.');
    if (u.feedback.all().some((item) => item.jobId === jobId))
      throw new Error('Feedback is already recorded for this job.');
    const protection = ratingProtection(rating);
    u.feedback.put({
      id: id(u, 'RATE'),
      jobId,
      rating,
      note: note.trim(),
      ...protection,
      at: now(),
    });
    event(
      u,
      customer,
      jobId,
      'customer-feedback-recorded',
      `Rating ${rating}/5 recorded; automatic worker restriction false${protection.reviewRequired ? '; operations review opened' : ''}.`,
    );
  });

export const submitWorkabilitySignal = (
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
  signal: 'clear-scope' | 'scope-changed' | 'safe-site' | 'safety-concern',
) =>
  repo.transaction((u) => {
    const order = u.jobs.get(jobId);
    if (
      order.workerId !== workerId ||
      !['completed', 'cancelled'].includes(order.stage)
    )
      throw new Error('Close the assigned job before recording workability.');
    if (u.workability.all().some((item) => item.jobId === jobId))
      throw new Error('Workability is already recorded for this job.');
    const sensitive = signal === 'safety-concern';
    u.workability.put({
      id: id(u, 'WORK'),
      jobId,
      workerId,
      signal,
      sensitive,
      status: sensitive ? 'operations-review' : 'recorded',
      at: now(),
    });
    event(
      u,
      { role: 'worker', id: workerId },
      jobId,
      'workability-recorded',
      sensitive
        ? 'Sensitive safety signal routed privately to operations.'
        : `Structured signal recorded: ${signal}.`,
    );
  });

export const disputeMaterialCharge = (
  repo: ApplicationRepository,
  settlementId: string,
) =>
  repo.transaction((u) => {
    const value = u.settlements.get(settlementId);
    if (value.status === 'partially-disputed')
      throw new Error('Material charge is already under review.');
    const materials = u.changeOrders
      .all()
      .filter(
        (change) =>
          change.jobId === value.jobId && change.status === 'approved',
      )
      .reduce((sum, change) => sum + change.material, 0);
    if (!materials)
      throw new Error(
        'This invoice has no approved material charge to dispute.',
      );
    value.status = 'partially-disputed';
    value.disputedAmount = rupees(materials);
    u.settlements.put(value);
    event(
      u,
      customer,
      value.jobId,
      'material-charge-disputed',
      `₹${value.disputedAmount} material charge sent to review; ₹${value.workerPay} settled labour remains posted.`,
    );
  });
export const switchPersona = (
  repo: ApplicationRepository,
  persona: Persona,
  memberId?: string,
) =>
  repo.transaction((u) => {
    if (memberId && !u.state.workers.some((w) => w.id === memberId))
      throw new Error('Member not found.');
    u.state.session = {
      ...u.state.session,
      persona,
      memberId: memberId ?? u.state.session.memberId,
    };
  });
export async function signInApplication(
  repo: ApplicationRepository,
  credentials: { userId: string; password: string; role: AppRole },
) {
  const identity = await authenticateUser(
    credentials.userId,
    credentials.password,
    credentials.role,
  );
  await repo.transaction((u) => {
    if (
      identity.memberId &&
      !u.state.workers.some((worker) => worker.id === identity.memberId)
    )
      throw new Error('The worker-member account is not part of this cooperative.');
    u.state.session.auth = {
      userId: identity.userId,
      role: identity.role,
      mode: identity.mode,
      authenticatedAt: now(),
    };
    u.state.session.persona =
      identity.role === 'admin' ? 'operations' : identity.role;
    if (identity.memberId) u.state.session.memberId = identity.memberId;
    if (identity.customerName)
      u.state.session.customerName = identity.customerName;
  });
  return identity;
}
export async function signOutApplication(repo: ApplicationRepository) {
  await endAuthenticatedSession();
  await repo.transaction((u) => {
    u.state.session.auth = null;
  });
}
export const setLocale = (
  repo: ApplicationRepository,
  locale: 'en' | 'hi' | 'mr',
) =>
  repo.transaction((u) => {
    u.state.session.locale = locale;
  });
export const setCustomerName = (
  repo: ApplicationRepository,
  customerName: string,
) =>
  repo.transaction((u) => {
    const clean = customerName.trim();
    if (!clean) throw new Error('Enter the customer name.');
    u.state.session.customerName = clean;
  });
export const finishWorkerOnboarding = (
  repo: ApplicationRepository,
  memberId: string,
) =>
  repo.transaction((u) => {
    u.state.session.onboardingDone[memberId] = true;
  });
export const markNotificationsRead = (
  repo: ApplicationRepository,
  actor: Actor,
) =>
  repo.transaction((u) => {
    for (const item of u.notifications.all().filter((value) =>
      !value.readAt && value.recipient.role === actor.role && value.recipient.id === actor.id,
    )) {
      item.readAt = now();
      u.notifications.put(item);
    }
  });
export const raiseIssue = (
  repo: ApplicationRepository,
  input: {
    actor: Actor;
    jobId?: string | null;
    issueType: IssueType;
    description: string;
  },
) =>
  repo.transaction((u) => {
    const description = input.description.trim();
    if (description.length < 8)
      throw new Error('Describe what happened in a little more detail.');
    const job = input.jobId ? u.jobs.get(input.jobId) : null;
    if (
      input.actor.role === 'worker' &&
      job &&
      job.workerId !== input.actor.id
    )
      throw new Error('You can report an issue only for your own job.');
    const category =
      input.issueType === 'policy-suggestion'
        ? 'policy'
        : input.issueType === 'payment'
          ? 'payment'
          : input.issueType === 'wrong-scope' ||
              input.issueType === 'unpaid-extra-work'
            ? 'scope'
            : input.issueType === 'unsafe-workplace'
              ? 'safety'
              : ['work-incomplete', 'quality', 'worker-no-show'].includes(
                    input.issueType,
                  )
                ? 'service'
                : 'other';
    const at = now();
    const value = {
      id: id(u, 'ISS'),
      jobId: job?.id ?? null,
      raisedBy: input.actor,
      issueType: input.issueType,
      category: category as
        | 'service'
        | 'scope'
        | 'payment'
        | 'safety'
        | 'policy'
        | 'other',
      description,
      status: 'open' as const,
      assignedAdminId: null,
      comments: [],
      createdAt: at,
      updatedAt: at,
      resolvedAt: null,
    };
    u.issues.put(value);
    u.notifications.put({
      id: id(u, 'NOT'),
      recipient: operator,
      messageKey: 'issue-raised',
      params: { issueId: value.id, role: input.actor.role },
      createdAt: at,
      readAt: null,
    });
    if (input.actor.role === 'customer' && job?.workerId)
      u.notifications.put({
        id: id(u, 'NOT'),
        recipient: { role: 'worker', id: job.workerId },
        messageKey: 'customer-issue-raised',
        params: { issueId: value.id, jobId: job.id },
        createdAt: at,
        readAt: null,
      });
    event(
      u,
      input.actor,
      value.id,
      'issue-raised',
      `${input.issueType} issue recorded${job ? ` for ${job.id}` : ''}. No automatic worker penalty applied.`,
      at,
    );
    return value.id;
  });
export const addIssueResponse = (
  repo: ApplicationRepository,
  issueId: string,
  actor: Actor,
  message: string,
) =>
  repo.transaction((u) => {
    const issue = u.issues.get(issueId);
    const clean = message.trim();
    if (clean.length < 3) throw new Error('Enter a response.');
    issue.comments.push({
      id: id(u, 'COM'),
      author: actor,
      message: clean,
      createdAt: now(),
    });
    issue.status = actor.role === 'operations' ? 'under-review' : 'waiting-for-response';
    issue.updatedAt = now();
    u.issues.put(issue);
    event(u, actor, issue.id, 'issue-updated', 'A response was added to the issue.');
  });
export const updateIssueStatus = (
  repo: ApplicationRepository,
  issueId: string,
  status: IssueStatus,
) =>
  repo.transaction((u) => {
    const issue = u.issues.get(issueId);
    issue.status = status;
    issue.updatedAt = now();
    issue.resolvedAt = ['resolved', 'closed'].includes(status) ? now() : null;
    u.issues.put(issue);
    event(u, operator, issue.id, 'issue-status-changed', `Issue is now ${status}.`);
  });
export const updateWorkloadSettings = (
  repo: ApplicationRepository,
  memberId: string,
  settings: {
    availableUntil: number;
    minimumRestGap: number;
    maximumJobsToday: number;
    heavyServiceLimit: number;
    unavailablePeriods: { start: number; end: number }[];
  },
) =>
  repo.transaction((u) => {
    if (
      !Number.isInteger(settings.availableUntil) ||
      settings.availableUntil < 0 ||
      settings.availableUntil > 1439 ||
      !Number.isInteger(settings.minimumRestGap) ||
      settings.minimumRestGap < 0 ||
      !Number.isInteger(settings.maximumJobsToday) ||
      settings.maximumJobsToday < 0 ||
      !Number.isInteger(settings.heavyServiceLimit) ||
      settings.heavyServiceLimit < 0 ||
      settings.unavailablePeriods.some(
        (period) =>
          !Number.isInteger(period.start) ||
          !Number.isInteger(period.end) ||
          period.start < 0 ||
          period.end > 1440 ||
          period.start >= period.end,
      )
    )
      throw new Error('Enter valid workload and rest limits.');
    const profile = u.members.get(memberId);
    profile.workload = { ...profile.workload, ...settings };
    u.members.put(profile);
    event(
      u,
      { role: 'worker', id: memberId },
      memberId,
      'workload-limits-updated',
      `Available until ${Math.floor(settings.availableUntil / 60)}:${String(settings.availableUntil % 60).padStart(2, '0')}; ${settings.minimumRestGap}-minute rest; ${settings.maximumJobsToday} jobs; ${settings.heavyServiceLimit} heavy services.`,
    );
  });
export function wallet(state: ApplicationState, memberId: string) {
  const rows = state.ledger.filter((x) => x.workerId === memberId);
  return {
    work: rupees(
      rows.filter((x) => x.kind === 'work').reduce((s, x) => s + x.amount, 0),
    ),
    dividends: rupees(
      rows
        .filter((x) => x.kind === 'dividend')
        .reduce((s, x) => s + x.amount, 0),
    ),
    penalties: rupees(
      rows
        .filter((x) => x.kind === 'penalty' || x.kind === 'remedy')
        .reduce((s, x) => s + x.amount, 0),
    ),
    protections: rupees(
      rows
        .filter((x) => x.kind === 'travel-compensation')
        .reduce((s, x) => s + x.amount, 0),
    ),
    total: rupees(rows.reduce((s, x) => s + x.amount, 0)),
    rows,
  };
}
export function projection(
  state: ApplicationState,
  policyVersion = state.activeVersion,
) {
  const policy = state.policies.find((p) => p.version === policyVersion)!;
  const jobs = [
    ...dataset().jobs,
    ...state.jobs
      .filter((x) => x.stage !== 'cancelled')
      .map((x) => ({ ...x.job, status: 'requested' as const })),
  ];
  return simulate(jobs, dataset().workers, policy, state.rates);
}
export async function proposePolicy(
  repo: ApplicationRepository,
  parameters: Policy['parameters'],
  protectionIntent: ProtectionIntent = 'fair-opportunity',
) {
  return repo.transaction((u) => {
    validateProtectionIntent(protectionIntent);
    if (u.state.proposalVersion)
      throw new Error('Finish the current proposal before drafting another.');
    const active = activePolicy(u);
    if (
      active.parameters.floor === parameters.floor &&
      active.parameters.maxDelay === parameters.maxDelay &&
      active.parameters.netPriority === parameters.netPriority
    )
      throw new Error(
        'Change at least one dispatch parameter before proposing.',
      );
    const draft = {
      ...propose(active),
      parameters,
      votes: {},
      terms: copy(active.terms),
      historicalJobIds: [
        ...dataset().jobs.map((j) => j.id),
        ...u.state.jobs.map((j) => j.id),
      ],
      protectionIntent,
      protectionCheck: { passed: true, checkedAt: now() },
    } as LivePolicy;
    draft.consultations = {};
    u.policies.put(draft);
    u.state.proposalVersion = draft.version;
    event(
      u,
      operator,
      draft.policyId,
      'policy-proposed',
      `Policy v${draft.version} proposed.`,
    );
  });
}
export const simulatePolicy = (repo: ApplicationRepository) =>
  repo.transaction((u) => {
    if (!u.state.proposalVersion) throw new Error('Propose a policy first.');
    const current = activePolicy(u),
      proposal = u.policies.get(u.state.proposalVersion);
    const jobs = comparisonJobs(u);
    const simulated = simulateProposal(
      proposal,
      current,
      jobs,
      dataset().workers,
      u.state.rates,
    ) as LivePolicy;
    simulated.terms = proposal.terms;
    simulated.historicalJobIds = jobs.map((j) => j.id);
    u.policies.put(simulated);
    event(
      u,
      operator,
      proposal.policyId,
      'policy-simulated',
      `${jobs.length} identical historical jobs replayed.`,
    );
  });
export const openPolicyVote = (repo: ApplicationRepository) =>
  repo.transaction((u) => {
    if (!u.state.proposalVersion) throw new Error('No proposal is ready.');
    const proposal = u.policies.get(u.state.proposalVersion);
    if (proposal.status !== 'simulated')
      throw new Error('Simulate this proposal before voting.');
    u.policies.put({ ...proposal, status: 'voting', votes: {} });
    event(
      u,
      operator,
      proposal.policyId,
      'vote-opened',
      'Member ballot opened with no votes recorded.',
    );
  });
export const recordPolicyImpactView = (
  repo: ApplicationRepository,
  memberId: string,
) =>
  repo.transaction((u) => {
    if (!u.state.proposalVersion) throw new Error('No proposal is open.');
    const proposal = u.policies.get(u.state.proposalVersion);
    if (!['voting', 'approved'].includes(proposal.status))
      throw new Error('Open the member ballot before reviewing impacts.');
    if (proposal.consultations[memberId]) return;
    const current = activePolicy(u),
      jobs = comparisonJobs(u),
      currentMember = simulate(
        jobs,
        dataset().workers,
        current,
        u.state.rates,
      ).workers.find((worker) => worker.id === memberId),
      proposedMember = simulate(
        jobs,
        dataset().workers,
        proposal,
        u.state.rates,
      ).workers.find((worker) => worker.id === memberId);
    if (!currentMember || !proposedMember)
      throw new Error('This member is outside the current electorate.');
    proposal.consultations[memberId] = {
      viewedAt: now(),
      basisVersion: current.version,
      currentNet: currentMember.net,
      currentJobs: currentMember.jobs,
      proposedNet: proposedMember.net,
      proposedJobs: proposedMember.jobs,
    };
    u.policies.put(proposal);
    event(
      u,
      { role: 'worker', id: memberId },
      proposal.policyId,
      'policy-impact-viewed',
      `${memberId} reviewed their v${current.version} to v${proposal.version} livelihood projection.`,
    );
  });
export const castPolicyVote = (
  repo: ApplicationRepository,
  memberId: string,
  choice: 'support' | 'oppose',
  reason = '',
) =>
  repo.transaction((u) => {
    if (!u.state.proposalVersion) throw new Error('No vote is open.');
    const proposal = u.policies.get(u.state.proposalVersion);
    if (!proposal.consultations[memberId])
      throw new Error(
        'Review this member’s projected outcome before recording their vote.',
      );
    if (choice === 'oppose' && !reason.trim())
      throw new Error('Record the member’s reason for opposing this version.');
    u.policies.put(vote(proposal, memberId, choice, reason) as LivePolicy);
    event(
      u,
      { role: 'worker', id: memberId },
      proposal.policyId,
      'vote-cast',
      `${memberId} voted ${choice}${reason.trim() ? `: ${reason.trim()}` : '.'}`,
    );
  });
export const activatePolicy = (repo: ApplicationRepository) =>
  repo.transaction((u) => {
    if (!u.state.proposalVersion)
      throw new Error('No approved proposal exists.');
    const version = u.state.proposalVersion,
      previous = activePolicy(u),
      activatedAt = now(),
      active = activate(u.policies.get(version), activatedAt) as LivePolicy;
    if (!active.simulation)
      throw new Error('The approved simulation forecast is missing.');
    u.policies.put(
      activePolicy(u).status === 'active'
        ? { ...activePolicy(u), status: 'expired' }
        : activePolicy(u),
    );
    u.policies.put(active);
    const accountability: AccountabilityRecord = {
      id: id(u, 'ACC'),
      policyVersion: active.version,
      comparisonVersion: previous.version,
      activatedAt,
      windowSize: 20,
      thresholdPercent: 25,
      status: 'measuring',
      basisJobIds: [...active.historicalJobIds],
      forecast: {
        current: copy(active.simulation.current),
        proposed: copy(active.simulation.proposed),
        change: metricChange(
          active.simulation.current,
          active.simulation.proposed,
        ),
      },
      actual: null,
    };
    u.accountability.put(accountability);
    u.state.activeVersion = version;
    u.state.proposalVersion = null;
    event(
      u,
      operator,
      active.policyId,
      'policy-activated',
      `Policy v${version} is active for subsequent dispatches.`,
    );
  });

function measurementJobs(version: number): Job[] {
  return dataset(SEED + version * 997)
    .jobs.slice(0, 20)
    .map((job, index) => ({
      ...job,
      id: `KMS-MEASURE-v${version}-${String(index + 1).padStart(2, '0')}`,
      customer: 'Accountability measurement window',
      requested: 6 * 1440 + 540 + index * 26,
      status: 'requested' as const,
    }));
}
function jobsById(u: UnitOfWork, jobIds: string[]) {
  const source = new Map([
    ...dataset().jobs.map((job) => [job.id, job] as const),
    ...u.state.jobs.map((order) => [order.id, order.job] as const),
  ]);
  return jobIds.map((jobId) => {
    const job = source.get(jobId);
    if (!job) throw new Error(`Forecast basis job ${jobId} is unavailable.`);
    return { ...job, status: 'requested' as const };
  });
}
export const completeAccountabilityWindow = (
  repo: ApplicationRepository,
  accountabilityId: string,
) =>
  repo.transaction((u) => {
    const record = u.accountability.get(accountabilityId);
    if (record.status !== 'measuring')
      throw new Error('This measurement window is already closed.');
    const policy = u.policies.get(record.policyVersion),
      comparison = u.policies.get(record.comparisonVersion),
      basis = jobsById(u, record.basisJobIds),
      window = measurementJobs(policy.version),
      jobs = [...basis, ...window],
      current = simulate(jobs, dataset().workers, comparison, u.state.rates),
      delivered = simulate(jobs, dataset().workers, policy, u.state.rates),
      change = metricChange(current.metrics, delivered.metrics),
      gap = {
        lowestLivelihood: rupees(
          change.lowestLivelihood - record.forecast.change.lowestLivelihood,
        ),
        averageEta: rupees(
          change.averageEta - record.forecast.change.averageEta,
        ),
        fulfilledJobs:
          change.fulfilledJobs - record.forecast.change.fulfilledJobs,
      },
      deviation = rupees(
        (Math.abs(gap.lowestLivelihood) /
          Math.max(Math.abs(record.forecast.change.lowestLivelihood), 1)) *
          100,
      );
    record.actual = {
      measuredAt: now(),
      current: copy(current.metrics),
      delivered: copy(delivered.metrics),
      change,
      gap,
      livelihoodDeviationPercent: deviation,
      outcomes: window.map((job) => {
        const receipt = delivered.receipts.find(
            (item) => item.job.id === job.id,
          ),
          candidate = receipt?.candidates.find(
            (item) => item.worker.id === receipt.selected,
          );
        return {
          jobId: job.id,
          workerId: receipt?.selected ?? null,
          eta: candidate?.eta ?? null,
          net: candidate?.net ?? null,
        };
      }),
    };
    record.status =
      deviation > record.thresholdPercent ? 'revote-required' : 'measured';
    u.accountability.put(record);
    event(
      u,
      operator,
      policy.policyId,
      'policy-outcome-measured',
      `Policy v${policy.version} measured over 20 deterministic jobs; lowest-livelihood deviation ${deviation}%.`,
    );
  });

export const proposeCatchUpAllocation = (
  repo: ApplicationRepository,
  accountabilityId: string,
) =>
  repo.transaction((u) => {
    const accountability = u.accountability.get(accountabilityId);
    if (!accountability.actual)
      throw new Error('Close the 20-job measurement window first.');
    if (
      u.catchUps
        .all()
        .some((item) => item.accountabilityId === accountabilityId)
    )
      throw new Error('This measurement period already has an allocation.');
    const policy = u.policies.get(accountability.policyVersion),
      jobs = [
        ...jobsById(u, accountability.basisJobIds),
        ...measurementJobs(policy.version),
      ],
      after = simulate(jobs, dataset().workers, policy, u.state.rates).workers,
      highestLivelihood = Math.max(...after.map((worker) => worker.net)),
      opportunity = after
        .map((worker) => {
          const access = u.opportunities
            .all()
            .filter((item) => item.workerId === worker.id).length;
          const livelihoodGap = rupees(highestLivelihood - worker.net);
          return {
            worker,
            access,
            livelihoodGap,
            need: opportunityNeedScore(livelihoodGap, access),
          };
        })
        .sort(
          (a, b) => b.need - a.need || a.worker.id.localeCompare(b.worker.id),
        )[0],
      reserve = rupees(
        u.ledger
          .all()
          .filter((entry) => entry.kind === 'reserve')
          .reduce((sum, entry) => sum + entry.amount, 0),
      );
    if (!opportunity || opportunity.need <= 0)
      throw new Error(
        'This period shows no bounded opportunity loss to remedy.',
      );
    const amount = rupees(Math.min(500, reserve, opportunity.need * 0.1));
    if (amount <= 0)
      throw new Error(
        'No cooperative reserve is available for a catch-up vote.',
      );
    const value: CatchUpAllocation = {
      id: id(u, 'CATCH'),
      policyVersion: policy.version,
      accountabilityId,
      beneficiaryId: opportunity.worker.id,
      amount,
      opportunityGap: opportunity.need,
      availableReserveAtProposal: reserve,
      cap: 500,
      justification: `${opportunity.worker.name} had a ${moneyForEvent(opportunity.livelihoodGap)} livelihood gap and ${opportunity.access} valid local opportunities. Access-normalized need: ${moneyForEvent(opportunity.need)}.`,
      status: 'voting',
      votes: {},
      postedAt: null,
    };
    u.catchUps.put(value);
    event(
      u,
      operator,
      value.id,
      'catch-up-proposed',
      `${moneyForEvent(amount)} reserve-backed catch-up proposed for ${opportunity.worker.name}.`,
    );
  });

const moneyForEvent = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const castCatchUpVote = (
  repo: ApplicationRepository,
  allocationId: string,
  memberId: string,
  choice: 'support' | 'oppose',
) =>
  repo.transaction((u) => {
    const item = u.catchUps.get(allocationId);
    if (
      item.status !== 'voting' ||
      !/^W(0[1-9]|1[0-2])$/.test(memberId) ||
      item.votes[memberId]
    )
      throw new Error('Voting is closed or this member already voted.');
    item.votes[memberId] = { choice, reason: '' };
    const votes = Object.values(item.votes),
      support = votes.filter((entry) => entry.choice === 'support').length;
    if (votes.length >= 9 && support >= 7) item.status = 'approved';
    u.catchUps.put(item);
    event(
      u,
      { role: 'worker', id: memberId },
      item.id,
      'catch-up-vote-cast',
      `${memberId} voted ${choice} on the bounded catch-up.`,
    );
  });

export const postCatchUpAllocation = (
  repo: ApplicationRepository,
  allocationId: string,
) =>
  repo.transaction((u) => {
    const item = u.catchUps.get(allocationId);
    if (item.status !== 'approved')
      throw new Error('Member approval is required before posting catch-up.');
    const reserve = rupees(
      u.ledger
        .all()
        .filter((entry) => entry.kind === 'reserve')
        .reduce((sum, entry) => sum + entry.amount, 0),
    );
    if (reserve < item.amount)
      throw new Error('The approved amount exceeds the available reserve.');
    const at = now();
    u.ledger.append({
      id: id(u, 'LED'),
      jobId: item.id,
      workerId: item.beneficiaryId,
      kind: 'remedy',
      amount: item.amount,
      at,
      decisionId: item.id,
      detail: `One-time catch-up approved for policy v${item.policyVersion}.`,
    });
    u.ledger.append({
      id: id(u, 'LED'),
      jobId: item.id,
      workerId: null,
      kind: 'reserve',
      amount: -item.amount,
      at,
      decisionId: item.id,
      detail: 'Cooperative reserve funded the bounded catch-up allocation.',
    });
    item.status = 'posted';
    item.postedAt = at;
    u.catchUps.put(item);
    event(
      u,
      operator,
      item.id,
      'catch-up-posted',
      `${moneyForEvent(item.amount)} posted to ${item.beneficiaryId}; reserve debited equally.`,
    );
  });
export const openChallenge = (
  repo: ApplicationRepository,
  snapshotId: string,
  openedBy: Actor,
  reason: string,
) =>
  repo.transaction((u) => {
    const snap = u.snapshots.get(snapshotId);
    if (
      u.challenges
        .all()
        .some((x) => x.snapshotId === snapshotId && x.status !== 'closed')
    )
      throw new Error('An open challenge already exists for this decision.');
    const value: CourtCase = {
      id: id(u, 'CASE'),
      snapshotId,
      openedBy,
      reason: reason.trim() || 'Please verify this decision.',
      status: 'open',
      result: null,
    };
    u.challenges.put(value);
    event(u, openedBy, snap.jobId, 'challenge-opened', value.reason);
    return value.id;
  });
export const replayChallenge = (repo: ApplicationRepository, caseId: string) =>
  repo.transaction(async (u) => {
    const item = u.challenges.get(caseId);
    if (item.status !== 'open')
      throw new Error('Only an open challenge can be replayed.');
    const snap = u.snapshots.get(item.snapshotId);
    const valid =
      (await digest((({ hash: _, ...rest }) => rest)(snap))) === snap.hash;
    let result: CourtCase['result'];
    if (!valid)
      result = {
        verdict: 'human-review',
        explanation: 'Snapshot integrity verification failed.',
        expectedCharge: null,
        expectedWorker: null,
      };
    else if (snap.kind === 'dispatch' && snap.receipt) {
      const replayed = replayAssignment(snap.receipt);
      const match = replayed.selected === snap.outcome.workerId;
      result = {
        verdict: match ? 'confirmed' : 'violation',
        explanation: match
          ? 'Frozen candidates and policy reproduce the recorded worker.'
          : 'Frozen dispatch inputs produce a different worker.',
        expectedCharge: 0,
        expectedWorker: replayed.selected,
      };
    } else if (
      (snap.kind === 'cancellation' || snap.kind === 'penalty') &&
      snap.evidence
    ) {
      const expected =
        snap.evidence.actor === 'worker' &&
        !['offered', 'unassigned'].includes(snap.evidence.stage)
          ? snap.policy.terms.workerCancellationPenalty
          : 0;
      result = {
        verdict: expected === snap.outcome.charge ? 'confirmed' : 'violation',
        explanation:
          expected === snap.outcome.charge
            ? 'Frozen cancellation evidence reproduces the recorded consequence.'
            : 'Recorded charge conflicts with the frozen constitution.',
        expectedCharge: expected,
        expectedWorker: snap.outcome.workerId,
      };
    } else
      result = {
        verdict: 'human-review',
        explanation: 'The frozen evidence is incomplete for automatic replay.',
        expectedCharge: null,
        expectedWorker: null,
      };
    item.status = 'replayed';
    item.result = result;
    u.challenges.put(item);
    event(u, operator, snap.jobId, 'challenge-replayed', result.explanation);
  });
export const adjudicateChallenge = (
  repo: ApplicationRepository,
  caseId: string,
) =>
  repo.transaction((u) => {
    const item = u.challenges.get(caseId);
    if (item.status !== 'replayed' || !item.result)
      throw new Error('Replay the frozen decision first.');
    item.status = item.result.verdict;
    u.challenges.put(item);
    event(
      u,
      operator,
      item.snapshotId,
      'challenge-decided',
      item.result.explanation,
    );
  });
export const remedyChallenge = (repo: ApplicationRepository, caseId: string) =>
  repo.transaction((u) => {
    const item = u.challenges.get(caseId);
    if (!['confirmed', 'violation'].includes(item.status) || !item.result)
      throw new Error(
        'A confirmed or violated decision must be recorded first.',
      );
    const snap = u.snapshots.get(item.snapshotId);
    if (
      item.status === 'violation' &&
      item.result.expectedCharge !== null &&
      snap.outcome.workerId
    ) {
      const correction = rupees(
        snap.outcome.charge - item.result.expectedCharge,
      );
      if (correction)
        u.ledger.append({
          id: id(u, 'LED'),
          jobId: snap.jobId,
          workerId: snap.outcome.workerId,
          kind: 'remedy',
          amount: correction,
          at: now(),
          decisionId: snap.id,
          detail: 'Replay Court correction; original snapshot preserved.',
        });
    }
    item.status = 'remedied';
    u.challenges.put(item);
    event(
      u,
      operator,
      snap.jobId,
      'remedy-applied',
      item.result.verdict === 'confirmed'
        ? 'No financial change; decision confirmed.'
        : 'Corrective ledger entry posted.',
    );
  });
export const closeChallenge = (repo: ApplicationRepository, caseId: string) =>
  repo.transaction((u) => {
    const item = u.challenges.get(caseId);
    if (!['remedied', 'human-review'].includes(item.status))
      throw new Error('Complete adjudication before closing.');
    item.status = 'closed';
    u.challenges.put(item);
    event(
      u,
      operator,
      item.snapshotId,
      'challenge-closed',
      'Case closed; frozen decision retained.',
    );
  });

export const createFederationDemo = (repo: ApplicationRepository) =>
  repo.transaction(async (u) => {
    const existing = u.state.federation.opportunities.find((item) => item.status !== 'expired');
    if (existing) return existing.id;
    const createdAt = now();
    const jobId = id(u, 'KMS-FED');
    const job: Job = {
      id: jobId,
      category: 'Electrician',
      customer: u.state.session.customerName,
      zone: 0,
      payout: 760,
      duration: 60,
      requested: 7 * 1440 + 18 * 60,
      sla: 35,
      emergency: false,
      consumables: 45,
      cancellationLoss: 0,
      status: 'assigned',
      requirement: 'Evening switchboard safety check',
    };
    event(u, operator, jobId, 'LOCAL_CAPACITY_EXHAUSTED', 'No Kharadi member could safely arrive within 35 minutes.');
    const match = matchFederationCooperative({
      homeCooperativeId: 'COOP-KHARADI',
      service: job.category,
      sla: job.sla,
      workerPayout: job.payout,
      capacities: u.state.federation.capacities,
    });
    const workerReceipt = receivingCooperativeDispatch(job, activePolicy(u));
    const opportunityId = id(u, 'FED-OPP');
    const opportunity = {
      id: opportunityId,
      jobId,
      homeCooperativeId: 'COOP-KHARADI',
      selectedCooperativeId: match.selectedCooperativeId,
      service: job.category,
      customerSlaMinutes: job.sla,
      reasonForOverflow: 'No local safe capacity within the customer promise.',
      status: 'accepted' as const,
      candidates: match.candidates,
      covenant: federationCovenant,
      workerId: workerReceipt.selected,
      workerReceipt,
      createdAt,
      resolvedAt: createdAt,
    };
    if (!opportunity.selectedCooperativeId || !opportunity.workerId)
      throw new Error('The deterministic federation scenario did not produce a protected assignment.');
    u.state.federation.opportunities.push(opportunity);
    event(u, operator, jobId, 'FEDERATION_OVERFLOW_OPENED', 'Kharadi opened a protected capacity request.');
    event(u, operator, jobId, 'FEDERATION_CANDIDATES_EVALUATED', `${match.candidates.length} member cooperatives checked for capacity, protection and SLA.`);
    event(u, operator, jobId, 'COOPERATIVE_SELECTED', 'Yerawada Labour Cooperative selected without wage bidding.');
    const workerDecision = await snapshot(u, {
      jobId,
      kind: 'dispatch',
      at: createdAt,
      actor: operator,
      policy: activePolicy(u),
      receipt: workerReceipt,
      evidence: null,
      outcome: { workerId: opportunity.workerId, charge: 0, attribution: 'receiving cooperative constitution' },
    });
    const federationBody = {
      id: id(u, 'FED-DEC'),
      opportunityId,
      at: createdAt,
      previousHash: u.state.federation.snapshots.at(-1)?.hash ?? 'FEDERATION-GENESIS',
      payload: copy(opportunity),
    };
    u.state.federation.snapshots.push({ ...federationBody, hash: await digest(federationBody) });
    u.jobs.put({
      id: jobId, job, stage: 'offered', workerId: opportunity.workerId, declined: [],
      receiptIds: [workerDecision.id], dispatchId: opportunityId, acceptedAt: null,
      departedAt: null, arrivedAt: null, workStartedAt: null, completedAt: null,
      cancellationId: null, pricing: { customerTotal: 900, workerServicePay: 760, welfareContribution: 40, cooperativeOperations: 100, minimumWorkerPay: 650 },
      refusals: [], settlementId: null, emergency: false, route: null, travelProgress: 0,
      createdAt, federationOpportunityId: opportunityId,
    });
    u.notifications.put({ id: id(u, 'NTF'), recipient: { role: 'worker', id: opportunity.workerId }, messageKey: 'FEDERATION_JOB', params: { jobId }, createdAt, readAt: null });
    u.state.federation.settlements.push({
      id: id(u, 'FED-SET'), jobId, homeCooperativeId: opportunity.homeCooperativeId,
      fulfillingCooperativeId: opportunity.selectedCooperativeId, customerTotal: 900,
      workerAmount: 760, welfareAmount: 40, fulfillingCooperativeAmount: 100,
      status: 'illustrative', createdAt,
    });
    event(u, operator, jobId, 'FEDERATION_WORKER_SELECTED', `${opportunity.workerId} selected by Yerawada constitution v${activePolicy(u).version}.`);
    return opportunityId;
  });

export const runFederationTwin = (repo: ApplicationRepository) =>
  repo.transaction((u) => {
    u.state.federation.twin = simulateFederationTwin();
    event(u, operator, u.state.federation.id, 'FEDERATION_TWIN_SIMULATED', 'Identical capacity scenarios compared in local-only and federation modes.');
  });

export const replayFederationDecision = (repo: ApplicationRepository, snapshotId: string) =>
  repo.transaction(async (u) => {
    const snapshot = u.state.federation.snapshots.find((item) => item.id === snapshotId);
    if (!snapshot) throw new Error('Federation receipt not found.');
    const { hash, ...body } = snapshot;
    const integrity = (await digest(body)) === hash;
    const match = matchFederationCooperative({
      homeCooperativeId: snapshot.payload.homeCooperativeId,
      service: snapshot.payload.service,
      sla: snapshot.payload.customerSlaMinutes,
      workerPayout: snapshot.payload.workerReceipt?.job.payout ?? 0,
      capacities: u.state.federation.capacities,
    });
    const confirmed = integrity && match.selectedCooperativeId === snapshot.payload.selectedCooperativeId;
    const value = {
      id: id(u, 'FED-REPLAY'), snapshotId,
      status: (integrity ? (confirmed ? 'confirmed' : 'violation') : 'human-review') as 'confirmed' | 'violation' | 'human-review',
      explanation: !integrity ? 'Frozen federation receipt failed integrity verification.' : confirmed ? 'Frozen capacity, protection and SLA checks reproduce the receiving cooperative.' : 'Frozen inputs produce a different receiving cooperative.',
      createdAt: now(),
    };
    const index = u.state.federation.replays.findIndex((item) => item.snapshotId === snapshotId);
    if (index < 0) u.state.federation.replays.push(value); else u.state.federation.replays[index] = value;
    event(u, operator, snapshot.payload.jobId, 'FEDERATION_DECISION_REPLAYED', value.explanation);
  });
