export const SEED = 26089;
export const services = [
  'Electrician',
  'Plumber',
  'Home cleaning',
  'Appliance repair',
  'Caregiving',
] as const;
export type Service = (typeof services)[number];
export const zones = [
  'Kharadi',
  'Hadapsar',
  'Viman Nagar',
  'Kothrud',
  'Baner',
  'Wakad',
  'Shivajinagar',
  'Kondhwa',
  'Aundh',
  'Yerawada',
];
export type Worker = {
  id: string;
  name: string;
  skills: Service[];
  zone: number;
  active: boolean;
  available: boolean;
  rating: number;
  start: number;
  end: number;
  busyUntil: number;
  gross: number;
  net: number;
  jobs: number;
  travel: number;
  verified: boolean;
};
export type Job = {
  id: string;
  category: Service;
  customer: string;
  zone: number;
  payout: number;
  duration: number;
  requested: number;
  sla: number;
  emergency: boolean;
  consumables: number;
  cancellationLoss: number;
  status: 'requested' | 'assigned' | 'completed' | 'cancelled';
  requirement: string;
};
export type Assumptions = { perKm: number; perMinute: number };
export const assumptions: Assumptions = { perKm: 6, perMinute: 1.5 };
export type Policy = {
  policyId: string;
  version: number;
  name: string;
  description: string;
  status: 'draft' | 'simulated' | 'voting' | 'approved' | 'active' | 'expired';
  createdAt: string;
  effectiveAt: string | null;
  constraints: { radius: number; sla: number; emergency: true };
  parameters: { floor: number; maxDelay: number; netPriority: boolean };
  votes: Record<string, PolicyVote>;
  quorum: number;
  electorate: number;
  simulation: {
    current: Metrics;
    proposed: Metrics;
    assumptions: Assumptions;
  } | null;
};
export type PolicyVote = {
  choice: 'support' | 'oppose';
  /** Empty for legacy/demo support votes; required for application dissent. */
  reason: string;
};
export const constitution: Policy = {
  policyId: 'KMS-CONSTITUTION',
  version: 2,
  name: 'A fair share of work',
  description:
    'Prefer eligible members below the weekly net-livelihood floor within the approved extra wait.',
  status: 'active',
  createdAt: '2026-08-24T09:00:00+05:30',
  effectiveAt: '2026-08-31T00:00:00+05:30',
  constraints: { radius: 8, sla: 35, emergency: true },
  parameters: { floor: 3500, maxDelay: 8, netPriority: false },
  votes: {},
  quorum: 9,
  electorate: 12,
  simulation: null,
};
export const baseline: Policy = {
  ...constitution,
  version: 1,
  name: 'Standard dispatch',
  description: 'Shortest ETA, then service quality, then stable member ID.',
  parameters: { floor: 0, maxDelay: 0, netPriority: false },
};
export type Candidate = {
  worker: Worker;
  distance: number;
  eta: number;
  net: number;
  costs: {
    travel: number;
    time: number;
    consumables: number;
    cancellation: number;
  };
  failed: string[];
};
export type Receipt = {
  id: string;
  job: Job;
  policy: Policy;
  assumptions: Assumptions;
  candidates: Candidate[];
  selected: string | null;
  fastest: string | null;
  reason: string;
  tieBreak: string;
  timestamp: string;
};
export type Metrics = {
  avgEta: number;
  p90Eta: number;
  avgTravel: number;
  fulfilled: number;
  slaViolations: number;
  median: number;
  bottomDecile: number;
  lowest: number;
  highest: number;
  gap: number;
  net: number;
};
export type Simulation = {
  workers: Worker[];
  receipts: Receipt[];
  metrics: Metrics;
};
export const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const round = (n: number) => Math.round(n * 100) / 100;
export function dataset(seed = SEED) {
  let state = seed;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const names = [
    'Meena Jadhav',
    'Ravi Shinde',
    'Salim Shaikh',
    'Sunita Kamble',
    'Anil Pawar',
    'Farida Khan',
    'Suresh More',
    'Priya Gaikwad',
    'Rahul Chavan',
    'Asha Mane',
    'Imran Pathan',
    'Neha Patil',
  ];
  const workers: Worker[] = names.map((name, i) => ({
    id: `W${String(i + 1).padStart(2, '0')}`,
    name,
    skills:
      i < 2
        ? ['Electrician', 'Appliance repair']
        : [services[(i - 2) % 5], services[(i + 1) % 5]],
    zone: i === 0 ? 2 : i === 1 ? 0 : i % 10,
    active: true,
    available: true,
    rating: round(4.5 + rand() * 0.45),
    start: 8 * 60,
    end: 20 * 60,
    busyUntil: 0,
    gross: 0,
    net: 0,
    jobs: 0,
    travel: 0,
    verified: true,
  }));
  const jobs: Job[] = Array.from({ length: 100 }, (_, i) => ({
    id: `KMS-${1001 + i}`,
    category: i % 3 === 0 ? 'Electrician' : services[Math.floor(rand() * 5)],
    customer: `Household ${i + 1}`,
    zone: i % 3 === 0 ? 0 : Math.floor(rand() * 10),
    payout: 580 + Math.floor(rand() * 7) * 80,
    duration: 40 + Math.floor(rand() * 3) * 15,
    requested: Math.floor(i / 20) * 1440 + 540 + (i % 20) * 26,
    sla: 35,
    emergency: i % 17 === 0,
    consumables: 30 + Math.floor(rand() * 4) * 15,
    cancellationLoss: 0,
    status: 'requested',
    requirement: 'Household service visit',
  }));
  return { workers, jobs };
}
// An illustrative zone-distance matrix, not geographic routing or live traffic.
export function distance(a: number, b: number) {
  return a === b
    ? 1
    : round(1.5 + Math.min(Math.abs(a - b), 10 - Math.abs(a - b)) * 0.85);
}
export function netContribution(
  job: Job,
  km: number,
  eta: number,
  rates = assumptions,
) {
  const costs = {
    travel: round(km * 2 * rates.perKm),
    time: round(eta * 2 * rates.perMinute),
    consumables: job.consumables,
    cancellation: job.cancellationLoss,
  };
  return {
    net: round(job.payout - Object.values(costs).reduce((a, b) => a + b, 0)),
    costs,
  };
}
export function candidate(
  worker: Worker,
  job: Job,
  policy: Policy,
  rates = assumptions,
): Candidate {
  const km = distance(worker.zone, job.zone),
    eta = Math.ceil(6 + km * 3.2),
    minute = job.requested % 1440;
  const failed: string[] = [];
  if (!worker.skills.includes(job.category)) failed.push('Required skill');
  if (!worker.active) failed.push('Inactive member');
  if (!worker.available) failed.push('Unavailable');
  if (
    worker.busyUntil > job.requested ||
    minute < worker.start ||
    minute + eta + job.duration > worker.end
  )
    failed.push('Schedule conflict');
  if (km > policy.constraints.radius) failed.push('Service radius');
  if (eta > Math.min(job.sla, policy.constraints.sla))
    failed.push('Customer SLA');
  return {
    worker: copy(worker),
    distance: km,
    eta,
    ...netContribution(job, km, eta, rates),
    failed,
  };
}
export function dispatch(
  job: Job,
  workers: Worker[],
  policy: Policy,
  rates = assumptions,
): Receipt {
  const values = [
    policy.parameters.floor,
    policy.parameters.maxDelay,
    policy.constraints.radius,
    policy.constraints.sla,
    rates.perKm,
    rates.perMinute,
  ];
  if (
    values.some((n) => !Number.isFinite(n) || n < 0) ||
    policy.constraints.radius <= 0 ||
    policy.constraints.sla <= 0 ||
    !Number.isInteger(policy.version) ||
    policy.version < 1 ||
    policy.constraints.emergency !== true
  )
    throw new Error(
      'Policy parameters must be finite, non-negative and preserve emergency priority.',
    );
  const candidates = workers.map((w) => candidate(w, job, policy, rates));
  const efficient = (a: Candidate, b: Candidate) =>
    a.eta - b.eta ||
    b.worker.rating - a.worker.rating ||
    a.worker.id.localeCompare(b.worker.id);
  const eligible = candidates.filter((c) => !c.failed.length).sort(efficient);
  const fastest = eligible[0];
  let chosen = fastest;
  let reason = 'No eligible worker. Hard constraints prevented assignment.';
  if (fastest) {
    reason = job.emergency
      ? 'Emergency priority: selected the fastest eligible worker. Opportunity preference is exempt.'
      : 'Selected the fastest eligible worker, with service quality and member ID resolving ties.';
    if (!job.emergency && policy.parameters.floor > 0) {
      const below = eligible.filter(
        (c) =>
          c.worker.net < policy.parameters.floor &&
          c.eta - fastest.eta <= policy.parameters.maxDelay,
      );
      below.sort(
        (a, b) =>
          a.worker.net - b.worker.net ||
          (policy.parameters.netPriority ? b.net - a.net : 0) ||
          efficient(a, b),
      );
      if (below.length) {
        chosen = below[0];
        reason = `${chosen.worker.name} was below the ₹${policy.parameters.floor.toLocaleString('en-IN')} weekly net-livelihood floor. Choosing this member added ${chosen.eta - fastest.eta} minutes to ETA, within the approved ${policy.parameters.maxDelay}-minute limit and ${Math.min(job.sla, policy.constraints.sla)}-minute customer SLA.`;
      }
    }
  }
  return copy({
    id: `R-${job.id}-v${policy.version}`,
    job,
    policy,
    assumptions: rates,
    candidates,
    selected: chosen?.worker.id ?? null,
    fastest: fastest?.worker.id ?? null,
    reason,
    tieBreak:
      'Opportunity: lowest weekly net; optional highest job net; then ETA, rating descending, member ID ascending. Emergency: ETA, rating, ID.',
    timestamp: new Date(
      Date.UTC(2026, 7, 31) + job.requested * 60000 - 330 * 60000,
    ).toISOString(),
  });
}
export function simulate(
  jobs: Job[],
  initial: Worker[],
  policy: Policy,
  rates = assumptions,
): Simulation {
  const workers = copy(initial),
    receipts: Receipt[] = [];
  const ordered = [...jobs].sort(
    (a, b) =>
      a.requested - b.requested ||
      Number(b.emergency) - Number(a.emergency) ||
      a.id.localeCompare(b.id),
  );
  for (const job of ordered) {
    const receipt = dispatch(job, workers, policy, rates);
    receipts.push(receipt);
    const c = receipt.candidates.find((c) => c.worker.id === receipt.selected);
    if (c) {
      const w = workers.find((w) => w.id === c.worker.id)!;
      w.gross += job.payout;
      w.net = round(w.net + c.net);
      w.jobs++;
      w.travel = round(w.travel + c.distance * 2);
      w.busyUntil = job.requested + c.eta + job.duration + c.eta;
    }
  }
  const selected = receipts.flatMap((r) =>
    r.candidates.filter((c) => c.worker.id === r.selected),
  );
  const etas = selected.map((c) => c.eta).sort((a, b) => a - b),
    nets = workers.map((w) => w.net).sort((a, b) => a - b);
  const mean = (a: number[]) =>
    a.length ? round(a.reduce((s, n) => s + n, 0) / a.length) : 0;
  const lowest = nets[0] ?? 0,
    highest = nets.at(-1) ?? 0,
    middle = Math.floor(nets.length / 2);
  const median = !nets.length
    ? 0
    : nets.length % 2
      ? nets[middle]
      : (nets[middle - 1] + nets[middle]) / 2;
  return {
    workers,
    receipts,
    metrics: {
      avgEta: mean(etas),
      p90Eta: etas[Math.max(0, Math.ceil(etas.length * 0.9) - 1)] ?? 0,
      avgTravel: mean(selected.map((c) => c.distance * 2)),
      fulfilled: selected.length,
      slaViolations: receipts.filter((r) =>
        r.candidates.some(
          (c) =>
            c.worker.id === r.selected &&
            c.eta > Math.min(r.job.sla, r.policy.constraints.sla),
        ),
      ).length,
      median: round(median),
      bottomDecile: mean(
        nets.slice(0, Math.max(1, Math.ceil(nets.length * 0.1))),
      ),
      lowest,
      highest,
      gap: round(highest - lowest),
      net: round(nets.reduce((a, b) => a + b, 0)),
    },
  };
}
export function replayAssignment(r: Receipt) {
  return dispatch(
    r.job,
    r.candidates.map((c) => c.worker),
    r.policy,
    r.assumptions,
  );
}
export function propose(active: Policy): Policy {
  return {
    ...copy(active),
    version: active.version + 1,
    name: 'More room for opportunity',
    status: 'draft',
    createdAt: '2026-09-07T09:00:00+05:30',
    effectiveAt: null,
    parameters: { floor: 4500, maxDelay: 10, netPriority: true },
    votes: {},
    simulation: null,
  };
}
export function simulateProposal(
  p: Policy,
  current: Policy,
  jobs: Job[],
  workers: Worker[],
  rates = assumptions,
): Policy {
  if (p.version !== current.version + 1)
    throw new Error('A proposal must be the next policy version.');
  return {
    ...copy(p),
    status: 'simulated',
    votes: {},
    simulation: {
      assumptions: copy(rates),
      current: simulate(jobs, workers, current, rates).metrics,
      proposed: simulate(jobs, workers, p, rates).metrics,
    },
  };
}
export function openVote(p: Policy): Policy {
  if (p.status !== 'simulated' || !p.simulation)
    throw new Error('Simulate this proposal before voting.');
  return {
    ...copy(p),
    status: 'voting',
    votes: Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [
        `W${String(i + 2).padStart(2, '0')}`,
        {
          choice: i < 6 ? 'support' : 'oppose',
          reason:
            i < 6
              ? ''
              : 'The additional customer wait needs closer monitoring.',
        },
      ]),
    ),
  };
}
export function vote(
  p: Policy,
  member: string,
  choice: 'support' | 'oppose',
  reason = '',
): Policy {
  if (
    p.status !== 'voting' ||
    !/^W(0[1-9]|1[0-2])$/.test(member) ||
    p.votes[member]
  )
    throw new Error('Voting is closed or this member already voted.');
  const next = copy(p);
  next.votes[member] = { choice, reason: reason.trim() };
  if (
    Object.keys(next.votes).length >= next.quorum &&
    Object.values(next.votes).filter((v) => v.choice === 'support').length >
      next.electorate / 2
  )
    next.status = 'approved';
  return next;
}
export function activate(p: Policy, now: string): Policy {
  if (p.status !== 'approved') throw new Error('Member approval is required.');
  return { ...copy(p), status: 'active', effectiveAt: now };
}
export type Appeal = {
  id: string;
  jobId: string;
  workerId: string;
  frozen: {
    job: Job;
    policy: Policy;
    penaltyRule: string;
    actor: 'customer' | 'worker' | 'unknown';
    departed: boolean | null;
    cancelledAt: string;
    departedAt: string | null;
    policyVersion: number;
    protectCustomerCancellation: boolean;
    penalty: number;
  };
  status: 'recorded' | 'challenged' | 'closed' | 'review';
  penalty: number;
  attribution: 'customer' | 'worker' | 'unknown';
  result: string | null;
  reason: string | null;
};
export function cancellationCase(
  actor: Appeal['frozen']['actor'] = 'customer',
  departed: boolean | null = true,
  penalty = 1,
  jobId = 'KMS-C1048',
  workerId = 'W01',
  policyVersion = 2,
): Appeal {
  return {
    id: `CASE-${jobId}`,
    jobId,
    workerId,
    frozen: {
      job: {
        id: jobId,
        category: 'Electrician',
        customer: 'Illustrative household',
        zone: 0,
        payout: 780,
        duration: 60,
        requested: 4 * 1440 + 690,
        sla: 35,
        emergency: false,
        consumables: 45,
        cancellationLoss: 0,
        status: 'cancelled',
        requirement:
          'Fan wiring inspection; separate cancellation scenario, excluded from the 100-job comparison',
      },
      policy: { ...copy(constitution), version: policyVersion },
      penaltyRule:
        'Customer-initiated cancellation after worker departure must not reduce worker reliability.',
      actor,
      departed,
      cancelledAt: '2026-09-04T11:42:00+05:30',
      departedAt: departed ? '2026-09-04T11:30:00+05:30' : null,
      policyVersion,
      protectCustomerCancellation: true,
      penalty,
    },
    status: 'recorded',
    penalty,
    attribution: penalty ? 'worker' : actor,
    result: null,
    reason: null,
  };
}
export function challenge(a: Appeal): Appeal {
  if (a.status !== 'recorded') return a;
  return { ...copy(a), status: 'challenged' };
}
export function replay(a: Appeal): Appeal {
  if (a.status !== 'challenged')
    throw new Error('Challenge the recorded decision first.');
  const next = copy(a),
    f = next.frozen;
  if (
    f.actor === 'unknown' ||
    f.departed === null ||
    (f.departed &&
      (!f.departedAt ||
        !Number.isFinite(Date.parse(f.departedAt)) ||
        Date.parse(f.departedAt) > Date.parse(f.cancelledAt))) ||
    !Number.isFinite(Date.parse(f.cancelledAt)) ||
    f.policy.version !== f.policyVersion
  )
    return {
      ...next,
      status: 'review',
      result: 'Human review required',
      reason:
        'Cancellation evidence is incomplete. A committee member must review the event record.',
    };
  const exempt =
    f.actor === 'customer' && f.departed && f.protectCustomerCancellation;
  if (exempt && f.penalty > 0)
    return {
      ...next,
      status: 'closed',
      penalty: 0,
      attribution: 'customer',
      result: 'Policy violation found',
      reason:
        'The customer cancelled after worker departure. The frozen constitution prohibits a worker reliability penalty. Penalty removed; cancellation attributed to customer.',
    };
  return {
    ...next,
    status: 'closed',
    result: 'Decision confirmed',
    reason: exempt
      ? 'Customer cancellation was already attributed correctly. No worker penalty was applied.'
      : 'The frozen evidence does not meet the customer-after-departure exemption. The recorded decision follows this demo rule.',
  };
}
