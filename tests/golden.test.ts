import { describe, expect, it } from 'vitest';
import {
  baseline,
  constitution,
  dataset,
  openVote,
  propose,
  simulate,
  simulateProposal,
  vote,
} from '../lib/engine';

const data = dataset();
const outcomes = (version: 1 | 2 | 3) => {
  const policy =
    version === 1
      ? baseline
      : version === 2
        ? constitution
        : propose(constitution);
  return simulate(data.jobs, data.workers, policy);
};
describe('SIH26089 frozen golden vectors', () => {
  it.each([
    [1, 'Meena Jadhav', 5642.2, 8],
    [2, 'Meena Jadhav', 5693.4, 8],
    [3, 'Meena Jadhav', 5413.2, 8],
    [1, 'Ravi Shinde', 19726.4, 27],
    [2, 'Ravi Shinde', 11753, 16],
    [3, 'Ravi Shinde', 9281, 12],
    [1, 'Salim Shaikh', 573, 1],
    [2, 'Salim Shaikh', 4526.6, 7],
    [3, 'Salim Shaikh', 4546, 6],
  ] as const)('v%i %s has exact net and jobs', (version, name, net, jobs) => {
    const worker = outcomes(version).workers.find((w) => w.name === name)!;
    expect([worker.net, worker.jobs]).toEqual([net, jobs]);
    expect([Math.round(worker.net), worker.jobs]).toEqual([
      Math.round(net),
      jobs,
    ]);
  });
  it('freezes the KMS-1055 paise-level costs and named rejected candidates', () => {
    const receipt = outcomes(3).receipts.find((r) => r.job.id === 'KMS-1055')!;
    const selected = receipt.candidates.find(
      (c) => c.worker.id === receipt.selected,
    )!;
    expect({
      payout: receipt.job.payout,
      costs: selected.costs,
      net: selected.net,
    }).toEqual({
      payout: 740,
      costs: { travel: 38.4, time: 51, consumables: 75, cancellation: 0 },
      net: 575.6,
    });
    expect([
      Math.round(selected.costs.travel),
      Math.round(selected.costs.time),
      selected.costs.consumables,
      Math.round(selected.net),
    ]).toEqual([38, 51, 75, 576]);
    const rejected = receipt.candidates.filter((c) =>
      ['Imran Pathan', 'Neha Patil'].includes(c.worker.name),
    );
    expect(
      rejected.map((c) => ({
        name: c.worker.name,
        failed: c.failed,
        eta: c.eta,
        netBefore: Math.round(c.worker.net),
      })),
    ).toEqual([
      {
        name: 'Imran Pathan',
        failed: ['Required skill', 'Schedule conflict'],
        eta: 10,
        netBefore: 2971,
      },
      {
        name: 'Neha Patil',
        failed: ['Required skill'],
        eta: 14,
        netBefore: 2750,
      },
    ]);
  });
  it('reaches the frozen 7/2/3 approval outcome', () => {
    let policy = openVote(
      simulateProposal(
        propose(constitution),
        constitution,
        data.jobs,
        data.workers,
      ),
    );
    policy = vote(policy, 'W01', 'support');
    const values = Object.values(policy.votes);
    expect({
      eligible: policy.electorate,
      quorum: policy.quorum,
      threshold: Math.floor(policy.electorate / 2) + 1,
      support: values.filter((v) => v.choice === 'support').length,
      oppose: values.filter((v) => v.choice === 'oppose').length,
      notVoted: policy.electorate - values.length,
      status: policy.status,
    }).toEqual({
      eligible: 12,
      quorum: 9,
      threshold: 7,
      support: 7,
      oppose: 2,
      notVoted: 3,
      status: 'approved',
    });
  });
});
