import type { Receipt, Simulation } from './engine';

export type JudgeComparisonPair = {
  standard: Receipt;
  cooperative: Receipt;
};

export function pickJudgeComparisonPair(
  standard: Simulation,
  cooperative: Simulation,
): JudgeComparisonPair {
  const pairs = standard.receipts.map((current) => ({
    standard: current,
    cooperative: cooperative.receipts.find(
      (receipt) => receipt.job.id === current.job.id,
    )!,
  }));

  const preferred = pairs.find((pair) => {
    const currentEta = pair.standard.candidates.find(
      (candidate) => candidate.worker.id === pair.standard.selected,
    )?.eta;
    const cooperativeEta = pair.cooperative.candidates.find(
      (candidate) => candidate.worker.id === pair.cooperative.selected,
    )?.eta;
    return (
      pair.standard.selected === 'W02' &&
      pair.cooperative.selected === 'W01' &&
      currentEta !== undefined &&
      cooperativeEta !== undefined &&
      cooperativeEta > currentEta
    );
  });

  const changed = pairs.find(
    (pair) => pair.standard.selected !== pair.cooperative.selected,
  );
  return preferred ?? changed ?? pairs[0];
}

export function selectedCandidate(receipt: Receipt) {
  return receipt.candidates.find(
    (candidate) => candidate.worker.id === receipt.selected,
  );
}

export function judgeComparisonFacts(pair: JudgeComparisonPair) {
  const standard = selectedCandidate(pair.standard);
  const cooperative = selectedCandidate(pair.cooperative);
  if (!standard || !cooperative)
    throw new Error('Judge comparison requires two selected candidates.');

  return {
    jobId: pair.standard.job.id,
    category: pair.standard.job.category,
    zone: pair.standard.job.zone,
    standardWorkerId: standard.worker.id,
    standardWorkerName: standard.worker.name,
    standardEta: standard.eta,
    standardWeeklyNetBefore: standard.worker.net,
    cooperativeWorkerId: cooperative.worker.id,
    cooperativeWorkerName: cooperative.worker.name,
    cooperativeEta: cooperative.eta,
    cooperativeWeeklyNetBefore: cooperative.worker.net,
    addedWait: cooperative.eta - standard.eta,
  };
}
