import { describe, expect, it } from 'vitest';
import {
  baseline,
  constitution,
  dataset,
  dispatch,
  policyRuleText,
  type Job,
} from '../lib/engine';

const { workers, jobs } = dataset();
const ordinaryJob: Job = {
  ...jobs[1],
  category: 'Electrician',
  zone: 0,
  emergency: false,
  requested: 600,
};
const pair = () => [
  { ...workers[0], net: 1000 },
  { ...workers[1], net: 5000 },
];

describe('Cooperative Dispatch Constitution contract', () => {
  it('describes the exact active opportunity rule without overstating eligibility', () => {
    const text = policyRuleText(constitution);
    expect(text).toContain('Constitution v2');
    expect(text).toContain('₹3,500');
    expect(text).toContain('8 minutes');
    expect(text).toContain(
      'required skill, active status, availability, schedule, service radius and customer SLA',
    );
    expect(text).toContain('Lowest weekly net livelihood has priority');
  });

  it('keeps the receipt explanation tied to the exact policy used for dispatch', () => {
    const receipt = dispatch(ordinaryJob, pair(), constitution);
    expect(receipt.tieBreak).toBe(policyRuleText(receipt.policy, false));
    expect(receipt.selected).toBe('W01');
  });

  it('describes standard dispatch separately from the cooperative preference', () => {
    const text = policyRuleText(baseline);
    expect(text).toContain('Policy v1');
    expect(text).toContain('choose the fastest eligible member');
    expect(text).not.toContain('weekly net-livelihood floor');
  });

  it('makes emergency bypass explicit and preserves fastest-eligible dispatch', () => {
    const emergencyJob = { ...ordinaryJob, emergency: true };
    const receipt = dispatch(emergencyJob, pair(), constitution);
    expect(receipt.selected).toBe('W02');
    expect(receipt.tieBreak).toBe(policyRuleText(constitution, true));
    expect(receipt.tieBreak).toContain('opportunity preference is bypassed');
  });

  it('states the optional job-net tie-break only when that policy switch is active', () => {
    const withNetPriority = {
      ...constitution,
      version: 3,
      parameters: { ...constitution.parameters, netPriority: true },
    };
    expect(policyRuleText(withNetPriority)).toContain(
      'higher estimated net contribution from this job',
    );
    expect(policyRuleText(constitution)).not.toContain(
      'higher estimated net contribution from this job',
    );
  });
});
