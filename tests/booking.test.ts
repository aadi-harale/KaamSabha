import { describe, expect, it } from 'vitest';
import { dispatchBooking } from '../lib/booking';
import {
  assumptions,
  cancellationCase,
  challenge,
  constitution,
  dataset,
  dispatch,
  replay,
} from '../lib/engine';
const data = dataset(),
  workers = [data.workers[1]];
const job = {
  ...data.jobs[0],
  category: 'Electrician' as const,
  emergency: false,
  requested: 7 * 1440 + 690,
  duration: 60,
  zone: 0,
};
describe('live booking invariants', () => {
  it('blocks overlapping bookings and releases cancelled slots', () => {
    const receipt = dispatchBooking(
      job,
      workers,
      [],
      constitution,
      assumptions,
    );
    expect(receipt.selected).toBe('W02');
    const b = { job: { ...job, status: 'assigned' as const }, receipt };
    expect(
      dispatchBooking(
        { ...job, id: 'second', requested: job.requested - 20 },
        workers,
        [b],
        constitution,
        assumptions,
      ).selected,
    ).toBeNull();
    expect(
      dispatchBooking(
        { ...job, id: 'third' },
        workers,
        [{ ...b, job: { ...b.job, status: 'cancelled' } }],
        constitution,
        assumptions,
      ).selected,
    ).toBe('W02');
  });
  it('allows a non-overlapping later booking', () => {
    const b = {
      job,
      receipt: dispatchBooking(job, workers, [], constitution, assumptions),
    };
    expect(
      dispatchBooking(
        { ...job, requested: job.requested + 180 },
        workers,
        [b],
        constitution,
        assumptions,
      ).selected,
    ).toBe('W02');
  });
  it('rejects ambiguous non-finite policies', () =>
    expect(() =>
      dispatch(job, workers, {
        ...constitution,
        parameters: { ...constitution.parameters, floor: NaN },
      }),
    ).toThrow());
  it('keeps job, policy and event evidence frozen through remedy', () => {
    const a = cancellationCase();
    const result = replay(challenge(a));
    expect(result.frozen.job.id).toBe(a.jobId);
    expect(result.frozen.policy.version).toBe(2);
    expect(result.frozen.penalty).toBe(1);
    expect(result.penalty).toBe(0);
  });
  it('sends contradictory departure timestamps to a human', () => {
    const a = cancellationCase();
    a.frozen.departedAt = '2026-09-05T12:00:00+05:30';
    expect(replay(challenge(a)).status).toBe('review');
  });
});
