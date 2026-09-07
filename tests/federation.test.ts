import { describe, expect, it } from 'vitest';
import {
  goldenFederationCapacity,
  matchFederationCooperative,
  receivingCooperativeDispatch,
  simulateFederationTwin,
} from '../lib/federation';
import { LocalApplicationRepository, type StoragePort } from '../lib/application/repositories';
import { createBooking, createFederationDemo, replayFederationDecision } from '../lib/application/service';

class MemoryStorage implements StoragePort {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('Federation Opportunity Exchange golden vector', () => {
  it('selects the cooperative before its constitution selects a worker', () => {
    const match = matchFederationCooperative({
      homeCooperativeId: 'COOP-KHARADI', service: 'Electrician', sla: 35,
      workerPayout: 760, capacities: goldenFederationCapacity,
    });
    expect(match.selectedCooperativeId).toBe('COOP-YERAWADA');
    expect(match.candidates.find((item) => item.cooperativeId === 'COOP-HADAPSAR')).toMatchObject({ eligible: false, slaCompatible: false });
    expect(match.candidates.find((item) => item.cooperativeId === 'COOP-VIMAN')).toMatchObject({ eligible: false, exclusionReason: 'Workload protection is active.' });
    const receipt = receivingCooperativeDispatch({
      id: 'FED-GOLDEN', category: 'Electrician', customer: 'Synthetic customer', zone: 0,
      payout: 760, duration: 60, requested: 7 * 1440 + 18 * 60, sla: 35,
      emergency: false, consumables: 45, cancellationLoss: 0, status: 'requested',
      requirement: 'Evening switchboard safety check',
    });
    expect(receipt.selected).toBe('W01');
    expect(receipt.policy.version).toBe(2);
  });

  it('blocks protection undercutting even when capacity and ETA pass', () => {
    const match = matchFederationCooperative({
      homeCooperativeId: 'COOP-KHARADI', service: 'Electrician', sla: 35,
      workerPayout: 600, capacities: goldenFederationCapacity,
    });
    expect(match.selectedCooperativeId).toBeNull();
    expect(match.candidates.every((candidate) => !candidate.protectionCompatible)).toBe(true);
  });

  it('persists linked receipts, reconciles settlement, and replays frozen inputs', async () => {
    const storage = new MemoryStorage();
    const repo = new LocalApplicationRepository(storage);
    await createFederationDemo(repo);
    let state = repo.read();
    expect(state.federation.opportunities[0]).toMatchObject({
      selectedCooperativeId: 'COOP-YERAWADA', workerId: 'W01', status: 'accepted',
    });
    expect(state.jobs[0].federationOpportunityId).toBe(state.federation.opportunities[0].id);
    const settlement = state.federation.settlements[0];
    expect(settlement.workerAmount + settlement.welfareAmount + settlement.fulfillingCooperativeAmount).toBe(settlement.customerTotal);
    await replayFederationDecision(repo, state.federation.snapshots[0].id);
    state = repo.read();
    expect(state.federation.replays[0].status).toBe('confirmed');
    expect(new LocalApplicationRepository(storage).read().federation.opportunities).toHaveLength(1);
  });

  it('automatically opens federation when local dispatch has no eligible worker', async () => {
    const repo = new LocalApplicationRepository(new MemoryStorage());
    await repo.transaction((unit) => {
      unit.state.workers = unit.state.workers.map((worker) => ({ ...worker, available: false }));
    });
    await createBooking(repo, {
      service: 'Electrician', zone: 0, requested: 8 * 1440 + 18 * 60,
      requirement: 'Evening electrical safety check',
    });
    const state = repo.read();
    expect(state.jobs[0]).toMatchObject({ stage: 'offered', workerId: 'W01' });
    expect(state.federation.opportunities[0].selectedCooperativeId).toBe('COOP-YERAWADA');
    expect(state.events.map((event) => event.type)).toContain('FEDERATION_OVERFLOW_OPENED');
  });

  it('calculates local-only and federation outcomes from identical scenarios', () => {
    const result = simulateFederationTwin();
    expect(result.mesh.served).toBeGreaterThan(result.localOnly.served);
    expect(result.mesh.unfilled).toBeLessThan(result.localOnly.unfilled);
    expect(result.mesh.protectionViolations).toBe(0);
    expect(result.mesh.crossCooperative).toBeGreaterThan(0);
  });
});
