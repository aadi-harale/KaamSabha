import { describe, expect, it } from 'vitest';
import {
  cancellationProtection,
  canSettleChangeOrder,
  noShowConsequence,
  opportunityNeedScore,
  priceBands,
  ratingProtection,
  refusalConsequence,
  validatePrice,
  validateProtectionIntent,
  workloadSafetyReason,
} from '../lib/protections';
import {
  LocalApplicationRepository,
  type StoragePort,
} from '../lib/application/repositories';
import {
  acceptOffer,
  cancelJob,
  completeWork,
  createBooking,
  decideChangeOrder,
  declineOffer,
  disputeMaterialCharge,
  proposeChangeOrder,
  proposePolicy,
  recordArrival,
  startTravel,
  startWork,
  submitCustomerFeedback,
  updateWorkloadSettings,
  wallet,
} from '../lib/application/service';

class MemoryStorage implements StoragePort {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
const repository = () => new LocalApplicationRepository(new MemoryStorage());
const booking = {
  service: 'Electrician' as const,
  zone: 0,
  requested: 7 * 1440 + 690,
  requirement: 'Inspect the fan wiring',
  pricing: priceBands.Electrician,
};

describe('immutable Worker Protection Floor', () => {
  it('enforces the cooperative price minimum and a reconciled split', () => {
    expect(validatePrice(priceBands.Electrician).workerServicePay).toBe(760);
    expect(() =>
      validatePrice({
        ...priceBands.Electrician,
        workerServicePay: 649,
        customerTotal: 739,
      }),
    ).toThrow('below');
  });

  it.each([
    'rating-cutoff',
    'cheapest-bid',
    'unsafe-refusal-penalty',
    'sensitive-trait',
    'paid-priority',
    'workload-override',
  ] as const)('rejects exploitative proposal intent %s', (intent) => {
    expect(() => validateProtectionIntent(intent)).toThrow('Rejected');
  });

  it('accepts fair opportunity and rejects pay-to-rank in the policy command', async () => {
    expect(validateProtectionIntent('fair-opportunity')).toEqual({
      passed: true,
    });
    const repo = repository();
    await expect(
      proposePolicy(
        repo,
        { floor: 4500, maxDelay: 10, netPriority: true },
        'paid-priority',
      ),
    ).rejects.toThrow('cannot pay');
    expect(repo.read().proposalVersion).toBeNull();
  });

  it('treats a safe refusal as zero opportunity penalty and distinct from a no-show', () => {
    expect(refusalConsequence('unsafe')).toEqual({
      reason: 'unsafe',
      opportunityPenalty: 0,
      classification: 'declined-offer',
    });
    expect(noShowConsequence().classification).toBe('no-show-after-acceptance');
  });

  it('persists a safe refusal without changing member opportunity data', async () => {
    const repo = repository();
    await createBooking(repo, booking);
    const job = repo.read().jobs[0];
    const before = repo
      .read()
      .workers.find((worker) => worker.id === job.workerId);
    await declineOffer(repo, job.id, job.workerId!, 'unsafe');
    const state = repo.read();
    expect(state.jobs[0].refusals?.[0]).toMatchObject({
      reason: 'unsafe',
      opportunityPenalty: 0,
    });
    expect(state.workers.find((worker) => worker.id === job.workerId)).toEqual(
      before,
    );
    expect(
      state.opportunities.find((item) => item.workerId === job.workerId),
    ).toMatchObject({ valid: true, outcome: 'declined' });
  });

  it('counts only real selected offers and normalizes catch-up need by access', async () => {
    const repo = repository();
    await createBooking(repo, booking);
    const state = repo.read();
    expect(state.opportunities).toHaveLength(1);
    expect(state.opportunities[0]).toMatchObject({
      jobId: state.jobs[0].id,
      workerId: state.jobs[0].workerId,
      valid: true,
      outcome: 'offered',
    });
    expect(opportunityNeedScore(1000, 0)).toBeGreaterThan(
      opportunityNeedScore(1000, 4),
    );
  });

  it('blocks workload-unsafe offers before ranking without a worker penalty', async () => {
    const repo = repository();
    await repo.transaction((unit) => {
      unit.state.workers = unit.state.workers.map((worker) => ({
        ...worker,
        available: worker.id === 'W01',
      }));
    });
    await updateWorkloadSettings(repo, 'W01', {
      availableUntil: 19 * 60,
      minimumRestGap: 30,
      maximumJobsToday: 0,
      heavyServiceLimit: 0,
      unavailablePeriods: [],
    });
    await createBooking(repo, booking);
    const state = repo.read();
    const receipt = state.snapshots[0].receipt!;
    expect(state.jobs[0].stage).toBe('unassigned');
    expect(state.opportunities).toHaveLength(0);
    expect(
      receipt.candidates.find((candidate) => candidate.worker.id === 'W01')
        ?.failed,
    ).toContain('Workload safety: Maximum jobs today');
    expect(state.ledger).toHaveLength(0);
    expect(state.jobs[0].refusals).toEqual([]);
  });

  it('evaluates rest, heavy-work and unavailable-period safety limits', () => {
    const base = {
      requestedMinute: 700,
      availableUntil: 1140,
      minimumRestGap: 30,
      maximumJobsToday: 4,
      jobsToday: 0,
      heavyService: false,
      heavyJobsToday: 0,
      heavyServiceLimit: 2,
      lastJobEnd: null as number | null,
      unavailablePeriods: [] as { start: number; end: number }[],
    };
    expect(workloadSafetyReason({ ...base, lastJobEnd: 680 })).toBe(
      'Minimum rest gap',
    );
    expect(
      workloadSafetyReason({
        ...base,
        heavyService: true,
        heavyJobsToday: 2,
      }),
    ).toBe('Heavy-service safety limit');
    expect(
      workloadSafetyReason({
        ...base,
        unavailablePeriods: [{ start: 690, end: 720 }],
      }),
    ).toBe('Worker unavailable period');
  });

  it('protects travel after a customer cancellation with no worker penalty', async () => {
    expect(
      cancellationProtection({
        actor: 'customer',
        departedAt: 'now',
        workerPenalty: 100,
        travelCompensation: 70,
      }),
    ).toEqual({ workerPenalty: 0, workerCompensation: 70 });
    const repo = repository();
    await createBooking(repo, booking);
    const job = repo.read().jobs[0];
    await acceptOffer(repo, job.id, job.workerId!);
    await startTravel(repo, job.id, job.workerId!);
    await cancelJob(repo, job.id, 'customer');
    const state = repo.read();
    expect(
      state.ledger.find((entry) => entry.kind === 'penalty'),
    ).toBeUndefined();
    expect(
      state.ledger.find((entry) => entry.kind === 'travel-compensation')
        ?.amount,
    ).toBe(70);
    expect(wallet(state, job.workerId!).protections).toBe(70);
  });

  it('requires customer consent before extra scope can enter settlement', async () => {
    expect(canSettleChangeOrder('proposed')).toBe(false);
    expect(canSettleChangeOrder('declined')).toBe(false);
    expect(canSettleChangeOrder('approved')).toBe(true);
    const repo = repository();
    await createBooking(repo, booking);
    const job = repo.read().jobs[0];
    await acceptOffer(repo, job.id, job.workerId!);
    await startTravel(repo, job.id, job.workerId!);
    await recordArrival(repo, job.id, job.workerId!);
    const changeId = await proposeChangeOrder(
      repo,
      job.id,
      job.workerId!,
      'Add connector',
      120,
      80,
    );
    await decideChangeOrder(repo, changeId, 'declined');
    await startWork(repo, job.id, job.workerId!);
    await completeWork(repo, job.id, job.workerId!);
    expect(repo.read().settlements[0].approvedExtras).toBe(0);
  });

  it('shows every payment component and preserves undisputed pay during a material dispute', async () => {
    const repo = repository();
    await createBooking(repo, booking);
    const job = repo.read().jobs[0];
    await acceptOffer(repo, job.id, job.workerId!);
    await startTravel(repo, job.id, job.workerId!);
    await recordArrival(repo, job.id, job.workerId!);
    const changeId = await proposeChangeOrder(
      repo,
      job.id,
      job.workerId!,
      'Add connector',
      120,
      80,
    );
    await decideChangeOrder(repo, changeId, 'approved');
    await startWork(repo, job.id, job.workerId!);
    await completeWork(repo, job.id, job.workerId!);
    const before = wallet(repo.read(), job.workerId!).work;
    const settlement = repo.read().settlements[0];
    expect(settlement.customerTotal).toBe(1050);
    expect(settlement).toMatchObject({
      welfareContribution: 40,
      cooperativeOperations: 50,
      approvedExtras: 200,
    });
    await disputeMaterialCharge(repo, settlement.id);
    expect(repo.read().settlements[0]).toMatchObject({
      status: 'partially-disputed',
      disputedAmount: 80,
    });
    expect(wallet(repo.read(), job.workerId!).work).toBe(before);
  });

  it('records a one-star rating without automatic restriction', async () => {
    expect(ratingProtection(1)).toEqual({
      reviewRequired: true,
      restrictionApplied: false,
    });
    const repo = repository();
    await createBooking(repo, booking);
    const job = repo.read().jobs[0];
    await acceptOffer(repo, job.id, job.workerId!);
    await startTravel(repo, job.id, job.workerId!);
    await recordArrival(repo, job.id, job.workerId!);
    await startWork(repo, job.id, job.workerId!);
    await completeWork(repo, job.id, job.workerId!);
    await submitCustomerFeedback(repo, job.id, 1);
    expect(repo.read().feedback[0]).toMatchObject({
      reviewRequired: true,
      restrictionApplied: false,
    });
    expect(
      repo.read().workers.find((worker) => worker.id === job.workerId)?.active,
    ).toBe(true);
  });
});
