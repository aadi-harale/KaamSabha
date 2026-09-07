import { describe, expect, it } from 'vitest';
import {
  LocalApplicationRepository,
  APPLICATION_KEY,
  type StoragePort,
} from '../lib/application/repositories';
import {
  acceptOffer,
  activatePolicy,
  adjudicateChallenge,
  cancelJob,
  castPolicyVote,
  closeChallenge,
  completeWork,
  createBooking,
  openChallenge,
  openPolicyVote,
  projection,
  proposePolicy,
  recordArrival,
  remedyChallenge,
  replayChallenge,
  simulatePolicy,
  startTravel,
  startWork,
  wallet,
} from '../lib/application/service';
import { verifySnapshot } from '../lib/application/model';

class MemoryStorage implements StoragePort {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
describe('complete persisted application lifecycle', () => {
  it('books, works, settles, governs, dispatches v3, challenges, closes and reloads', async () => {
    const storage = new MemoryStorage(),
      repo = new LocalApplicationRepository(storage);
    await createBooking(repo, {
      service: 'Electrician',
      zone: 0,
      requested: 7 * 1440 + 690,
      requirement: 'Fan wiring inspection',
      payout: 680,
    });
    let state = repo.read();
    const first = state.jobs[0],
      member = first.workerId!;
    expect(first.stage).toBe('offered');
    expect(await verifySnapshot(state.snapshots[0])).toBe(true);
    await acceptOffer(repo, first.id, member);
    await startTravel(repo, first.id, member);
    await recordArrival(repo, first.id, member);
    await startWork(repo, first.id, member);
    await completeWork(repo, first.id, member);
    state = repo.read();
    expect(state.jobs[0].stage).toBe('completed');
    expect(wallet(state, member).work).toBeGreaterThan(0);
    expect(wallet(state, member).dividends).toBeGreaterThan(0);
    const before = projection(state).workers.map((w) => [w.id, w.net, w.jobs]);
    await proposePolicy(repo, { floor: 4500, maxDelay: 10, netPriority: true });
    await simulatePolicy(repo);
    await openPolicyVote(repo);
    for (const id of ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07'])
      await castPolicyVote(repo, id, 'support');
    for (const id of ['W08', 'W09']) await castPolicyVote(repo, id, 'oppose');
    state = repo.read();
    const proposal = state.policies.find(
      (p) => p.version === state.proposalVersion,
    )!;
    expect([
      proposal.status,
      Object.values(proposal.votes).filter((v) => v === 'support').length,
      Object.values(proposal.votes).filter((v) => v === 'oppose').length,
    ]).toEqual(['approved', 7, 2]);
    await activatePolicy(repo);
    state = repo.read();
    expect(state.activeVersion).toBe(3);
    expect(
      projection(state).workers.map((w) => [w.id, w.net, w.jobs]),
    ).not.toEqual(before);
    await createBooking(repo, {
      service: 'Electrician',
      zone: 0,
      requested: 7 * 1440 + 840,
      requirement: 'Switch board check',
      payout: 680,
    });
    state = repo.read();
    const second = state.jobs[1],
      dispatch = state.snapshots.find((s) => s.id === second.receiptIds[0])!;
    expect(dispatch.policy.version).toBe(3);
    expect(dispatch.receipt?.policy.parameters.floor).toBe(4500);
    await acceptOffer(repo, second.id, second.workerId!);
    await startTravel(repo, second.id, second.workerId!);
    await cancelJob(repo, second.id, 'customer');
    state = repo.read();
    const cancellation = state.jobs[1].cancellationId!;
    const caseId = (await openChallenge(
      repo,
      cancellation,
      { role: 'worker', id: second.workerId! },
      'Check cancellation attribution',
    ))!;
    await replayChallenge(repo, caseId);
    await adjudicateChallenge(repo, caseId);
    await remedyChallenge(repo, caseId);
    await closeChallenge(repo, caseId);
    state = repo.read();
    expect(state.challenges[0].status).toBe('closed');
    expect(state.challenges[0].result?.verdict).toBe('confirmed');
    const restored = new LocalApplicationRepository(storage).read();
    expect(restored).toEqual(state);
    expect(storage.getItem(APPLICATION_KEY)).not.toBeNull();
    expect({
      jobs: restored.jobs.length,
      completed: restored.jobs.filter((j) => j.stage === 'completed').length,
      open: restored.challenges.filter((c) => c.status !== 'closed').length,
      events: restored.events.length,
    }).toEqual({ jobs: 2, completed: 1, open: 0, events: 30 });
  });
  it('serializes concurrent transactions without duplicate settlement', async () => {
    const repo = new LocalApplicationRepository(new MemoryStorage());
    await createBooking(repo, {
      service: 'Electrician',
      zone: 0,
      requested: 7 * 1440 + 690,
      requirement: 'Test',
      payout: 680,
    });
    const job = repo.read().jobs[0];
    await acceptOffer(repo, job.id, job.workerId!);
    await startTravel(repo, job.id, job.workerId!);
    await recordArrival(repo, job.id, job.workerId!);
    await startWork(repo, job.id, job.workerId!);
    const results = await Promise.allSettled([
      completeWork(repo, job.id, job.workerId!),
      completeWork(repo, job.id, job.workerId!),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      repo.read().ledger.filter((x) => x.jobId === job.id && x.kind === 'work'),
    ).toHaveLength(1);
  });
  it('records worker cancellation and penalty as separate frozen decisions', async () => {
    const repo = new LocalApplicationRepository(new MemoryStorage());
    await createBooking(repo, {
      service: 'Electrician',
      zone: 0,
      requested: 7 * 1440 + 690,
      requirement: 'Test',
      payout: 680,
    });
    const job = repo.read().jobs[0];
    await acceptOffer(repo, job.id, job.workerId!);
    await cancelJob(repo, job.id, 'worker');
    const state = repo.read();
    expect(state.snapshots.map((snapshot) => snapshot.kind)).toEqual([
      'dispatch',
      'cancellation',
      'penalty',
    ]);
    expect(state.ledger.find((entry) => entry.kind === 'penalty')?.amount).toBe(
      -100,
    );
    expect(await Promise.all(state.snapshots.map(verifySnapshot))).toEqual([
      true,
      true,
      true,
    ]);
  });
});
