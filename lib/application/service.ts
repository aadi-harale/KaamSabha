import {
  activate,
  copy,
  dataset,
  propose,
  replayAssignment,
  simulate,
  simulateProposal,
  vote,
  type Job,
  type Policy,
} from '../engine';
import { dispatchBooking } from '../booking';
import {
  digest,
  rupees,
  type Actor,
  type AppEvent,
  type ApplicationState,
  type CancellationInput,
  type CourtCase,
  type DecisionPayload,
  type DecisionSnapshot,
  type JobStage,
  type LivePolicy,
  type Persona,
  type WorkOrder,
} from './model';
import type { ApplicationRepository, UnitOfWork } from './repositories';

export type NewBooking = {
  service: Job['category'];
  zone: number;
  requested: number;
  requirement: string;
  payout: number;
};
const customer: Actor = { role: 'customer', id: 'CUSTOMER-01' };
const operator: Actor = { role: 'operations', id: 'OPS-01' };
const now = () => new Date().toISOString();
const activePolicy = (u: UnitOfWork) => u.policies.get(u.state.activeVersion);
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
function workersForDispatch(u: UnitOfWork, declined: string[]) {
  return u.state.workers.map((w) =>
    declined.includes(w.id) ? { ...w, available: false } : w,
  );
}
async function assign(
  u: UnitOfWork,
  job: Job,
  declined: string[],
  dispatchId: string,
  actor: Actor,
) {
  const policy = activePolicy(u);
  const receipt = dispatchBooking(
    job,
    workersForDispatch(u, declined),
    bookedRecords(u, job.id),
    policy,
    u.state.rates,
  );
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
    const jobId = id(u, 'KMS-LIVE'),
      createdAt = now();
    const job: Job = {
      id: jobId,
      category: input.service,
      customer: 'Local customer',
      zone: input.zone,
      payout: input.payout,
      duration: 60,
      requested: input.requested,
      sla: 35,
      emergency: false,
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
    const assigned = await assign(u, job, [], id(u, 'DSP'), customer);
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
      completedAt: null,
      cancellationId: null,
      createdAt,
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
  arrived: ['working', 'cancelled'],
  working: ['completed', 'cancelled'],
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
  repo.transaction((u) =>
    move(u, jobId, workerId, 'accepted', 'Worker accepted the offer.'),
  );
export const startTravel = (
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
) =>
  repo.transaction((u) =>
    move(u, jobId, workerId, 'en-route', 'Worker started travelling.'),
  );
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
export async function declineOffer(
  repo: ApplicationRepository,
  jobId: string,
  workerId: string,
) {
  return repo.transaction(async (u) => {
    const order = u.jobs.get(jobId);
    if (order.stage !== 'offered' || order.workerId !== workerId)
      throw new Error('Only the member holding this offer can decline it.');
    order.declined.push(workerId);
    event(
      u,
      { role: 'worker', id: workerId },
      jobId,
      'offer-declined',
      'Worker declined; dispatch ran again.',
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
      levy = rupees((order.job.payout * policy.terms.levyBps) / 10000);
    const dividendPool = rupees((levy * policy.terms.dividendBps) / 10000);
    const activeMembers = u.state.workers.filter((w) => w.active);
    const perMember = rupees(dividendPool / activeMembers.length);
    u.ledger.append({
      id: id(u, 'LED'),
      jobId,
      workerId,
      kind: 'work',
      amount: rupees(candidate.net - levy),
      at: now(),
      decisionId: decision.id,
      detail: `Net contribution ${candidate.net}; cooperative levy ${levy}.`,
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
      amount: rupees(levy - perMember * activeMembers.length),
      at: now(),
      decisionId: decision.id,
      detail: 'Cooperative reserve after member dividend allocation.',
    });
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
    const charge =
      actor === 'worker' &&
      order.stage !== 'offered' &&
      order.stage !== 'unassigned'
        ? policy.terms.workerCancellationPenalty
        : 0;
    const decision = await snapshot(u, {
      jobId,
      kind: 'cancellation',
      at,
      actor:
        actor === 'worker' ? { role: 'worker', id: order.workerId! } : customer,
      policy,
      receipt: null,
      evidence,
      outcome: { workerId: order.workerId, charge, attribution: actor },
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
      `${actor} cancelled; worker penalty ${charge}.`,
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
  });
}
export const switchPersona = (
  repo: ApplicationRepository,
  persona: Persona,
  memberId?: string,
) =>
  repo.transaction((u) => {
    if (memberId && !u.state.workers.some((w) => w.id === memberId))
      throw new Error('Member not found.');
    u.state.session = {
      persona,
      memberId: memberId ?? u.state.session.memberId,
    };
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
) {
  return repo.transaction((u) => {
    if (u.state.proposalVersion)
      throw new Error('Finish the current proposal before drafting another.');
    const active = activePolicy(u),
      draft = {
        ...propose(active),
        parameters,
        votes: {},
        terms: copy(active.terms),
        historicalJobIds: [
          ...dataset().jobs.map((j) => j.id),
          ...u.state.jobs.map((j) => j.id),
        ],
      } as LivePolicy;
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
    const jobs = [
      ...dataset().jobs,
      ...u.state.jobs.map((x) => ({ ...x.job, status: 'requested' as const })),
    ];
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
export const castPolicyVote = (
  repo: ApplicationRepository,
  memberId: string,
  choice: 'support' | 'oppose',
) =>
  repo.transaction((u) => {
    if (!u.state.proposalVersion) throw new Error('No vote is open.');
    const proposal = u.policies.get(u.state.proposalVersion);
    u.policies.put(vote(proposal, memberId, choice) as LivePolicy);
    event(
      u,
      { role: 'worker', id: memberId },
      proposal.policyId,
      'vote-cast',
      `${memberId} voted ${choice}.`,
    );
  });
export const activatePolicy = (repo: ApplicationRepository) =>
  repo.transaction((u) => {
    if (!u.state.proposalVersion)
      throw new Error('No approved proposal exists.');
    const version = u.state.proposalVersion,
      active = activate(u.policies.get(version), now()) as LivePolicy;
    u.policies.put(
      activePolicy(u).status === 'active'
        ? { ...activePolicy(u), status: 'expired' }
        : activePolicy(u),
    );
    u.policies.put(active);
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
