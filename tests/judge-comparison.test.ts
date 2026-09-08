import { describe, expect, it } from 'vitest';
import { baseline, constitution, dataset, simulate } from '../lib/engine';
import {
  judgeComparisonFacts,
  pickJudgeComparisonPair,
} from '../lib/judge-comparison';

const data = dataset();
const standard = simulate(data.jobs, data.workers, baseline);
const cooperative = simulate(data.jobs, data.workers, constitution);

describe('judge comparison proof', () => {
  it('selects one request whose assignment changes under the constitution', () => {
    const pair = pickJudgeComparisonPair(standard, cooperative);
    expect(pair.standard.job.id).toBe(pair.cooperative.job.id);
    expect(pair.standard.job).toEqual(pair.cooperative.job);
    expect(pair.standard.selected).not.toBe(pair.cooperative.selected);
  });

  it('uses the preferred Ravi-to-Meena deterministic example when available', () => {
    const facts = judgeComparisonFacts(
      pickJudgeComparisonPair(standard, cooperative),
    );
    expect(facts.standardWorkerId).toBe('W02');
    expect(facts.cooperativeWorkerId).toBe('W01');
    expect(facts.addedWait).toBeGreaterThan(0);
    expect(facts.addedWait).toBeLessThanOrEqual(
      constitution.parameters.maxDelay,
    );
  });

  it('keeps the week-level customer SLA invariant intact', () => {
    expect(cooperative.metrics.slaViolations).toBe(0);
    expect(standard.metrics.slaViolations).toBe(0);
  });
});
