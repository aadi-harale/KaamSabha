import type { Service } from './engine';
import type {
  PriceBreakdown,
  ProtectionIntent,
  RefusalReason,
} from './application/model';

export const priceBands: Record<Service, PriceBreakdown> = {
  Electrician: split(850, 760, 40, 50, 650),
  Plumber: split(900, 800, 45, 55, 690),
  'Home cleaning': split(1100, 970, 60, 70, 820),
  'Appliance repair': split(980, 870, 50, 60, 740),
  Caregiving: split(1050, 925, 60, 65, 800),
};

function split(
  customerTotal: number,
  workerServicePay: number,
  welfareContribution: number,
  cooperativeOperations: number,
  minimumWorkerPay: number,
): PriceBreakdown {
  return {
    customerTotal,
    workerServicePay,
    welfareContribution,
    cooperativeOperations,
    minimumWorkerPay,
  };
}

export function validatePrice(price: PriceBreakdown) {
  if (price.workerServicePay < price.minimumWorkerPay)
    throw new Error(
      `Worker service pay is below the cooperative minimum of ₹${price.minimumWorkerPay}.`,
    );
  if (
    [
      price.customerTotal,
      price.workerServicePay,
      price.welfareContribution,
      price.cooperativeOperations,
      price.minimumWorkerPay,
    ].some((value) => !Number.isFinite(value) || value < 0)
  )
    throw new Error('Price components must be valid non-negative amounts.');
  if (
    price.customerTotal !==
    price.workerServicePay +
      price.welfareContribution +
      price.cooperativeOperations
  )
    throw new Error(
      'Customer total must reconcile to the visible price split.',
    );
  return price;
}

const forbidden: Record<
  Exclude<ProtectionIntent, 'fair-opportunity'>,
  string
> = {
  'rating-cutoff':
    'Rejected: one customer rating cannot automatically restrict a member.',
  'cheapest-bid':
    'Rejected: work cannot be allocated through a lowest-price auction.',
  'unsafe-refusal-penalty':
    'Rejected: refusing unsafe or out-of-scope work cannot reduce future opportunity.',
  'sensitive-trait':
    'Rejected: caste, religion, gender and ethnicity cannot enter dispatch ranking.',
  'paid-priority': 'Rejected: members cannot pay for dispatch priority.',
  'workload-override':
    'Rejected: high demand cannot override a member’s active workload safety limits.',
};

export function validateProtectionIntent(intent: ProtectionIntent) {
  if (intent !== 'fair-opportunity') throw new Error(forbidden[intent]);
  return { passed: true as const };
}

export function refusalConsequence(reason: RefusalReason) {
  return {
    reason,
    opportunityPenalty: 0 as const,
    classification: 'declined-offer' as const,
  };
}

export function noShowConsequence() {
  return { classification: 'no-show-after-acceptance' as const, review: true };
}

export function cancellationProtection(input: {
  actor: 'customer' | 'worker';
  departedAt: string | null;
  workerPenalty: number;
  travelCompensation: number;
}) {
  if (input.actor === 'customer')
    return {
      workerPenalty: 0,
      workerCompensation: input.departedAt ? input.travelCompensation : 0,
    };
  return {
    workerPenalty: input.workerPenalty,
    workerCompensation: 0,
  };
}

export function ratingProtection(rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error('Rating must be a whole number from 1 to 5.');
  return { reviewRequired: rating <= 2, restrictionApplied: false as const };
}

export function canSettleChangeOrder(
  status: 'proposed' | 'approved' | 'declined',
) {
  return status === 'approved';
}

export function opportunityNeedScore(
  livelihoodGap: number,
  validOpportunityAccess: number,
) {
  if (livelihoodGap < 0 || validOpportunityAccess < 0)
    throw new Error('Livelihood and opportunity access cannot be negative.');
  return livelihoodGap / (1 + validOpportunityAccess);
}

export function workloadSafetyReason(input: {
  requestedMinute: number;
  availableUntil: number;
  minimumRestGap: number;
  maximumJobsToday: number;
  jobsToday: number;
  heavyService: boolean;
  heavyJobsToday: number;
  heavyServiceLimit: number;
  lastJobEnd: number | null;
  unavailablePeriods: { start: number; end: number }[];
}) {
  const minute = input.requestedMinute % 1440;
  if (minute > input.availableUntil) return 'Available-until limit';
  if (
    input.unavailablePeriods.some(
      (period) => minute >= period.start && minute < period.end,
    )
  )
    return 'Worker unavailable period';
  if (input.jobsToday >= input.maximumJobsToday) return 'Maximum jobs today';
  if (input.heavyService && input.heavyJobsToday >= input.heavyServiceLimit)
    return 'Heavy-service safety limit';
  if (
    input.lastJobEnd !== null &&
    input.requestedMinute - input.lastJobEnd < input.minimumRestGap
  )
    return 'Minimum rest gap';
  return null;
}
