import { describe, expect, it } from 'vitest';
import {
  activate,
  assumptions,
  baseline,
  cancellationCase,
  candidate,
  challenge,
  constitution,
  copy,
  dataset,
  dispatch,
  netContribution,
  openVote,
  propose,
  replay,
  replayAssignment,
  simulate,
  simulateProposal,
  vote,
} from '../lib/engine';
const { workers, jobs } = dataset();
const job = {
  ...jobs[1],
  category: 'Electrician' as const,
  zone: 0,
  emergency: false,
  requested: 600,
};
const pair = () => [
  { ...workers[0], net: 1000 },
  { ...workers[1], net: 5000 },
];
describe('hard dispatch invariants', () => {
  it('filters missing skills', () =>
    expect(
      candidate({ ...workers[0], skills: ['Plumber'] }, job, constitution)
        .failed,
    ).toContain('Required skill'));
  it('filters inactive and unavailable workers', () =>
    expect(
      candidate(
        { ...workers[0], active: false, available: false },
        job,
        constitution,
      ).failed,
    ).toEqual(expect.arrayContaining(['Inactive member', 'Unavailable'])));
  it('filters overlapping and out-of-shift work', () => {
    expect(
      candidate({ ...workers[0], busyUntil: 700 }, job, constitution).failed,
    ).toContain('Schedule conflict');
    expect(
      candidate({ ...workers[0], end: 610 }, job, constitution).failed,
    ).toContain('Schedule conflict');
  });
  it('enforces radius even below floor', () =>
    expect(
      candidate(workers[0], job, {
        ...constitution,
        constraints: { ...constitution.constraints, radius: 1 },
      }).failed,
    ).toContain('Service radius'));
  it('enforces both job and policy SLA', () => {
    expect(
      dispatch({ ...job, sla: 5 }, pair(), constitution).selected,
    ).toBeNull();
    expect(
      dispatch(job, pair(), {
        ...constitution,
        constraints: { ...constitution.constraints, sla: 5 },
      }).selected,
    ).toBeNull();
  });
  it('opportunity rule actually changes assignment', () => {
    expect(dispatch(job, pair(), baseline).selected).toBe('W02');
    expect(dispatch(job, pair(), constitution).selected).toBe('W01');
  });
  it('does not exceed the approved additional wait', () =>
    expect(
      dispatch(job, pair(), {
        ...constitution,
        parameters: { ...constitution.parameters, maxDelay: 0 },
      }).selected,
    ).toBe('W02'));
  it('emergency overrides opportunity preference', () =>
    expect(
      dispatch({ ...job, emergency: true }, pair(), constitution).selected,
    ).toBe('W02'));
  it('breaks identical ETA and rating ties by member ID', () => {
    const w = { ...workers[0], zone: 0, rating: 4.8 };
    expect(dispatch(job, [{ ...w, id: 'W02' }, w], baseline).selected).toBe(
      'W01',
    );
  });
});
describe('livelihood and reproducibility', () => {
  it('deducts round-trip travel/time, consumables and cancellation loss', () =>
    expect(
      netContribution(
        { ...job, payout: 900, consumables: 50, cancellationLoss: 100 },
        5,
        20,
        assumptions,
      ),
    ).toEqual({
      net: 630,
      costs: { travel: 60, time: 60, consumables: 50, cancellation: 100 },
    }));
  it('reproduces seed and simulation without modifying inputs', () => {
    const saved = copy({ workers, jobs });
    expect(dataset()).toEqual(saved);
    expect(simulate(jobs, workers, constitution)).toEqual(
      simulate(jobs, workers, constitution),
    );
    expect({ workers, jobs }).toEqual(saved);
  });
  it('produces changed assignments and no SLA violations', () => {
    const a = simulate(jobs, workers, baseline),
      b = simulate(jobs, workers, constitution);
    expect(
      b.receipts.some((r, i) => r.selected !== a.receipts[i].selected),
    ).toBe(true);
    expect(b.metrics.slaViolations).toBe(0);
    expect(b.metrics.fulfilled).toBeGreaterThan(80);
  });
  it('freezes inputs and reproduces assignment snapshots', () => {
    const mutable = pair(),
      r = dispatch(job, mutable, constitution);
    mutable[0].net = 99999;
    expect(r.candidates[0].worker.net).toBe(1000);
    expect(replayAssignment(r)).toEqual(r);
  });
});
describe('governance integration', () => {
  it('proposes, simulates, votes, activates and dispatches with a new version', () => {
    let p = propose(constitution);
    expect(p.version).toBe(3);
    expect(() => openVote(p)).toThrow();
    p = simulateProposal(p, constitution, jobs, workers);
    expect(p.simulation?.proposed).toEqual(simulate(jobs, workers, p).metrics);
    p = openVote(p);
    expect(() => activate(p, '2026-09-07')).toThrow();
    p = vote(p, 'W01', 'support');
    expect(p.status).toBe('approved');
    p = activate(p, '2026-09-07');
    expect(dispatch(job, pair(), p).policy.version).toBe(3);
    expect(
      simulate(jobs, workers, p).receipts.some(
        (r, i) =>
          r.selected !==
          simulate(jobs, workers, constitution).receipts[i].selected,
      ),
    ).toBe(true);
    expect(constitution.version).toBe(2);
  });
  it('rejects duplicate votes and unapproved activation', () => {
    const p = openVote(
      simulateProposal(propose(constitution), constitution, jobs, workers),
    );
    expect(() => vote(p, 'W02', 'support')).toThrow();
    expect(() => activate(p, 'today')).toThrow();
  });
});
describe('appeal integration', () => {
  it('records adverse cancellation, challenges, replays and remedies frozen violation', () => {
    const a = cancellationCase();
    const original = copy(a.frozen);
    expect(a.penalty).toBe(1);
    const result = replay(challenge(a));
    expect(result.result).toBe('Policy violation found');
    expect(result.penalty).toBe(0);
    expect(result.attribution).toBe('customer');
    expect(result.status).toBe('closed');
    expect(result.frozen).toEqual(original);
    expect(a.penalty).toBe(1);
  });
  it('confirms correctly attributed customer cancellation', () =>
    expect(
      replay(challenge(cancellationCase('customer', true, 0))).result,
    ).toBe('Decision confirmed'));
  it('requires human review when departure evidence is missing', () =>
    expect(replay(challenge(cancellationCase('unknown', null))).status).toBe(
      'review',
    ));
  it('requires an actual challenge', () =>
    expect(() => replay(cancellationCase())).toThrow());
});
