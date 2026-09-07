import {
  candidate,
  copy,
  dispatch,
  type Assumptions,
  type Job,
  type Policy,
  type Receipt,
  type Worker,
} from './engine';
export type BookingRecord = { job: Job; receipt: Receipt };
/** Reserve complete outbound + service + return intervals, including requests made out of order. */
export function dispatchBooking(
  job: Job,
  initial: Worker[],
  bookings: BookingRecord[],
  policy: Policy,
  rates: Assumptions,
) {
  const workers = copy(initial),
    active = bookings.filter((b) => b.job.status !== 'cancelled');
  for (const w of workers) {
    const eta = candidate(w, job, policy, rates).eta;
    for (const b of active) {
      if (b.receipt.selected !== w.id) continue;
      const c = b.receipt.candidates.find((c) => c.worker.id === w.id)!;
      if (
        Math.floor(b.job.requested / 10080) ===
        Math.floor(job.requested / 10080)
      ) {
        w.net += c.net;
        w.gross += b.job.payout;
        w.jobs++;
      }
      if (
        job.requested < b.job.requested + b.job.duration + 2 * c.eta &&
        job.requested + job.duration + 2 * eta > b.job.requested
      )
        w.busyUntil = job.requested + 1;
    }
  }
  return dispatch(job, workers, policy, rates);
}
