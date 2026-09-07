// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DispatchDecisionMap } from '../components/dispatch-map';
import {
  constitution,
  dataset,
  replayAssignment,
  simulate,
} from '../lib/engine';
import { presentReceiptMap, workerCoordinate } from '../lib/map';

afterEach(cleanup);

const simulated = simulate(dataset().jobs, dataset().workers, constitution);
const receipt = simulated.receipts.find(
  (item) =>
    item.selected &&
    item.candidates.filter((candidate) => !candidate.failed.length).length >= 2,
)!;

describe('receipt-backed dispatch map', () => {
  it('uses the receipt winner and only eligible candidate IDs', () => {
    const presentation = presentReceiptMap(receipt);
    const markerIds = presentation.points
      .filter((point) => point.kind === 'worker')
      .map((point) => point.id);
    const eligibleIds = receipt.candidates
      .filter((candidate) => !candidate.failed.length)
      .map((candidate) => candidate.worker.id);
    expect(presentation.selectedId).toBe(receipt.selected);
    expect(presentation.points.find((point) => point.selected)?.id).toBe(
      receipt.selected,
    );
    expect(markerIds.every((id) => eligibleIds.includes(id))).toBe(true);
    expect(markerIds).toContain(receipt.selected);
  });

  it('derives stable positions without changing dispatch output', () => {
    const frozen = structuredClone(receipt);
    expect(workerCoordinate('W01', receipt.job.zone, 4.2)).toEqual(
      workerCoordinate('W01', receipt.job.zone, 4.2),
    );
    presentReceiptMap(receipt);
    expect(receipt).toEqual(frozen);
    expect(replayAssignment(receipt).selected).toBe(receipt.selected);
  });

  it('renders an accessible deterministic fallback with the same selected member', () => {
    const selectedName = receipt.candidates.find(
      (candidate) => candidate.worker.id === receipt.selected,
    )!.worker.name;
    render(
      React.createElement(DispatchDecisionMap, {
        receipt,
        mode: 'customer',
        forceFallback: true,
      }),
    );
    expect(
      screen.getAllByText('Illustrative service-area view').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(selectedName)).toBeTruthy();
    expect(document.querySelectorAll('.map-fallback g.worker')).toHaveLength(
      1,
    );
    expect(screen.queryByText('Eligible')).toBeNull();
    expect(document.querySelector('.map-rule-line')?.textContent).toContain(
      'Assignment confirmed within the cooperative’s service promise.',
    );
    expect(presentReceiptMap(receipt).summary).not.toMatch(
      /₹|livelihood|earnings|net/i,
    );
  });

  it('keeps the full candidate comparison in audit mode', () => {
    const mappedWorkerCount = presentReceiptMap(receipt).points.filter(
      (point) => point.kind === 'worker',
    ).length;
    render(
      React.createElement(DispatchDecisionMap, {
        receipt,
        mode: 'decision',
        forceFallback: true,
      }),
    );
    expect(document.querySelectorAll('.map-fallback g.worker')).toHaveLength(
      mappedWorkerCount,
    );
    expect(mappedWorkerCount).toBeGreaterThan(1);
    expect(screen.getAllByText('Eligible').length).toBeGreaterThan(0);
    expect(document.querySelector('.map-rule-line')?.textContent).toContain(
      'Approximate service distance; no road route shown.',
    );
  });
});
