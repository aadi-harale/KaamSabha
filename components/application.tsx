'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Clock,
  IndianRupee,
  MapPin,
  Scale,
  ShieldCheck,
  Users,
  Wrench,
  Camera,
  Languages,
  Home,
  ListChecks,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { dataset, services, zones, type Service } from '@/lib/engine';
import { useApplication } from '@/lib/application/provider';
import {
  acceptOffer,
  addJobEvidence,
  advanceTravel,
  activatePolicy,
  adjudicateChallenge,
  cancelJob,
  castCatchUpVote,
  castPolicyVote,
  closeChallenge,
  completeAccountabilityWindow,
  createBooking,
  declineOffer,
  decideChangeOrder,
  disputeMaterialCharge,
  openChallenge,
  openPolicyVote,
  projection,
  postCatchUpAllocation,
  proposePolicy,
  proposeCatchUpAllocation,
  proposeChangeOrder,
  recordPolicyImpactView,
  remedyChallenge,
  replayChallenge,
  simulatePolicy,
  startTravelWithRoute,
  requestJobOtp,
  verifyJobOtp,
  setLocale,
  setCustomerName,
  finishWorkerOnboarding,
  markNotificationsRead,
  submitCustomerFeedback,
  submitWorkabilitySignal,
  switchPersona,
  updateWorkloadSettings,
  wallet,
} from '@/lib/application/service';
import {
  type CourtCase,
  type DecisionSnapshot,
  type LivePolicy,
  type MemberProfile,
  type Persona,
  type ProtectionIntent,
  type RefusalReason,
  type WorkOrder,
} from '@/lib/application/model';
import { priceBands } from '@/lib/protections';
import { ActiveTravelMap, DispatchDecisionMap } from '@/components/dispatch-map';
import { compressEvidence } from '@/lib/application/image-evidence';
import { localeOptions, serviceLabel, translate, type Locale } from '@/lib/i18n';
import './application.css';

const money = (value: number) =>
  `₹${Math.round(value).toLocaleString('en-IN')}`;
function stageLabel(locale: Locale, stage: WorkOrder['stage']) {
  const key = stage === 'completed' ? 'completed' : stage === 'offered' ? 'offered' : stage === 'en-route' ? 'travelling' : stage === 'arrived' ? 'arrival' : stage === 'working' ? 'working' : stage.includes('verification') ? 'verification' : stage === 'cancelled' ? 'cancelled' : null;
  return key ? translate(locale, key) : stage;
}
const protectionIntents: { value: ProtectionIntent; label: string }[] = [
  {
    value: 'fair-opportunity',
    label: 'Fair opportunity within hard eligibility',
  },
  { value: 'rating-cutoff', label: 'Auto-restrict after one low rating' },
  { value: 'cheapest-bid', label: 'Give work to the cheapest bidder' },
  {
    value: 'unsafe-refusal-penalty',
    label: 'Reduce rank after unsafe refusal',
  },
  { value: 'sensitive-trait', label: 'Rank using a sensitive identity trait' },
  { value: 'paid-priority', label: 'Sell priority placement to members' },
  {
    value: 'workload-override',
    label: 'Override a member workload safety limit',
  },
];
function Choice({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="live-field">
      <span>{label}</span>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="live-select">
          <SelectValue>
            {values.find((x) => x.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {values.map((x) => (
            <SelectItem key={x.value} value={x.value}>
              {x.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
function LanguageControl({ compact = false }: { compact?: boolean }) {
  const { state, run } = useApplication();
  return (
    <label className={`language-control ${compact ? 'compact' : ''}`}>
      <Languages aria-hidden="true" />
      <span className="sr-only">{translate(state.session.locale, 'language')}</span>
      <select
        aria-label={translate(state.session.locale, 'language')}
        value={state.session.locale}
        onChange={(event) => void run((repo) => setLocale(repo, event.target.value as Locale))}
      >
        {localeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
function AppShell({
  persona,
  children,
}: {
  persona: Persona;
  children: React.ReactNode;
}) {
  const { state, error, clearError, ready, run } = useApplication();
  const path = usePathname();
  const t = (key: Parameters<typeof translate>[1]) => translate(state.session.locale, key);
  const unread = state.notifications.filter((item) => !item.readAt && item.recipient.role === persona && (persona !== 'worker' || item.recipient.id === state.session.memberId)).length;
  useEffect(() => {
    document.documentElement.lang = state.session.locale;
  }, [state.session.locale]);
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to work area
      </a>
      <header className="live-header">
        <Link href="/app" className="live-brand">
          <span>
            <Users size={21} />
          </span>
          {t('appName')}<small>Worker-governed service workspace</small>
        </Link>
        <nav aria-label="Persona switcher">
          {(
            [
              ['customer', '/customer', t('roleCustomer')],
              ['worker', '/worker', t('roleWorker')],
              ['operations', '/operations', t('roleOperations')],
            ] as const
          ).map(([role, href, label]) => (
            <Link
              href={href}
              key={role}
              aria-current={persona === role ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
          <Link href="/demo" className="judge-link">
            {t('judgeDemo')}
          </Link>
          <LanguageControl compact />
        </nav>
      </header>
      <div className="live-context">
        <span>
          {ready ? t('offlineMode') : 'Loading workspace…'}
        </span>
        {unread > 0 && <button className="context-action" onClick={() => void run((repo) => markNotificationsRead(repo, { role: persona, id: persona === 'worker' ? state.session.memberId : persona === 'customer' ? 'CUSTOMER-01' : 'OPS-01' }))}>{unread} updates. Mark read</button>}
        <Link href="/governance">
          <span className="status-dot" />
          {t('activePolicy')} v{state.activeVersion}
        </Link>
      </div>
      {error && (
        <div className="live-error" role="alert">
          {error}
          <button onClick={clearError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      <main id="workspace" className="live-main" data-path={path}>
        {children}
      </main>
      <footer className="live-footer">
        Synthetic Pune demonstration. Device-local fallback is explicit; no live payment processing.
      </footer>
    </>
  );
}
export function ApplicationHome() {
  const { state, run } = useApplication();
  const [role, setRole] = useState<'customer' | 'worker' | 'operations' | null>(null);
  const [customerName, setName] = useState(state.session.customerName);
  const [workerId, setWorkerId] = useState(state.session.memberId);
  const router = useRouter();
  const continueRole = () => {
    if (!role) return;
    void run(async (repo) => {
      if (role === 'customer') await setCustomerName(repo, customerName);
      await switchPersona(repo, role, role === 'worker' ? workerId : undefined);
    }).then(() => router.push(role === 'operations' ? '/operations' : `/${role}`));
  };
  return (
    <AppShell persona="customer">
      <section className="entry">
        <LanguageControl />
        <p>The cooperative belongs to workers. The dispatch rules do too.</p>
        <h1>Book trusted cooperative services with worker-governed fair allocation.</h1>
        <div className="persona-entry">
          <button onClick={() => setRole('customer')} aria-pressed={role === 'customer'}>
            <Wrench />
            <strong>Continue as customer</strong>
            <span>See the price, member assignment and service record</span>
          </button>
          <button onClick={() => setRole('worker')} aria-pressed={role === 'worker'}>
            <Users />
            <strong>Continue as worker</strong>
            <span>See the scope, net pay, protection and livelihood</span>
          </button>
          <button onClick={() => setRole('operations')} aria-pressed={role === 'operations'}>
            <ShieldCheck />
            <strong>Continue as cooperative admin</strong>
            <span>Manage records, disputes, welfare and member rules</span>
          </button>
        </div>
        {role && (
          <div className="demo-role-claim">
            <strong>{translate(state.session.locale, 'demoAccess')}</strong>
            {role === 'customer' && (
              <label className="live-field"><span>Your name</span><input value={customerName} onChange={(event) => setName(event.target.value)} /></label>
            )}
            {role === 'worker' && (
              <Choice label="Select your demo worker" value={workerId} values={state.workers.map((worker) => ({ value: worker.id, label: worker.name }))} onChange={setWorkerId} />
            )}
            <Button onClick={continueRole}>Continue</Button>
          </div>
        )}
        <p className="entry-note">
          <Link href="/demo">See judge demo</Link>
        </p>
      </section>
    </AppShell>
  );
}
function Heading({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="live-heading">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function workerName(
  state: ReturnType<typeof useApplication>['state'],
  id: string | null,
) {
  return state.workers.find((w) => w.id === id)?.name ?? 'Unassigned';
}
function latestSnapshot(
  state: ReturnType<typeof useApplication>['state'],
  job: WorkOrder,
) {
  return state.snapshots.find((x) => x.id === job.receiptIds.at(-1));
}
function SnapshotDialog({
  snapshot,
  close,
  challenge,
  audience = 'audit',
}: {
  snapshot: DecisionSnapshot | null;
  close: () => void;
  challenge?: (id: string) => void;
  audience?: 'customer' | 'audit';
}) {
  const [raw, setRaw] = useState(false);
  if (!snapshot) return null;
  const receipt = snapshot.receipt,
    selected = receipt?.candidates.find(
      (c) => c.worker.id === receipt.selected,
    );
  const auditable = JSON.parse(JSON.stringify(snapshot)) as Record<
    string,
    unknown
  >;
  if (receipt) {
    const receiptValue = auditable.receipt as Record<string, unknown>;
    const job = receiptValue.job as Record<string, unknown>;
    job.requestedAtMinutesSince2026_08_31_IST = job.requested;
    delete job.requested;
  }
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="receipt-dialog live-receipt">
        <DialogTitle>
          {snapshot.kind === 'dispatch'
            ? audience === 'customer'
              ? 'Your assignment'
              : 'DecisionSnapshot receipt'
            : 'Cancellation decision'}
        </DialogTitle>
        <DialogDescription>
          {audience === 'customer'
            ? `Recorded for job ${snapshot.jobId}`
            : `${snapshot.id} / SHA-256 ${snapshot.hash.slice(0, 16)}… / policy v${snapshot.policy.version}`}
        </DialogDescription>
        <div className="integrity-line">
          <ShieldCheck />
          <span>
            {audience === 'customer'
              ? 'The cooperative recorded this assignment when your booking was made.'
              : `Frozen and hash-chained to ${
                  snapshot.previousHash === 'GENESIS'
                    ? 'the ledger origin'
                    : snapshot.previousHash.slice(0, 12) + '…'
                }`}
          </span>
        </div>
        {receipt && (
          <>
            <DispatchDecisionMap
              receipt={receipt}
              mode={audience === 'customer' ? 'customer' : 'decision'}
              className="receipt-map"
            />
            <div className="rule-explanation">
              <Scale />
              <p>
                {audience === 'customer'
                  ? 'The assigned member has the required skill, is available, and can arrive within the service promise.'
                  : receipt.reason}
              </p>
            </div>
            <dl className="receipt-summary">
              <div>
                <dt>Assigned member</dt>
                <dd>{selected?.worker.name ?? 'None'}</dd>
              </div>
              <div>
                <dt>Expected arrival</dt>
                <dd>{selected?.eta ?? '—'} min</dd>
              </div>
              {audience !== 'customer' && (
                <>
                  <div>
                    <dt>Net contribution</dt>
                    <dd>{selected ? money(selected.net) : '—'}</dd>
                  </div>
                  <div>
                    <dt>Policy</dt>
                    <dd>v{receipt.policy.version}</dd>
                  </div>
                </>
              )}
            </dl>
            {selected && audience !== 'customer' && (
              <p className="net-equation">
                {money(receipt.job.payout)} payout −{' '}
                {money(selected.costs.travel)} travel −{' '}
                {money(selected.costs.time)} unpaid travel time −{' '}
                {money(selected.costs.consumables)} consumables −{' '}
                {money(selected.costs.cancellation)} cancellation cost ={' '}
                <strong>{money(selected.net)} net contribution</strong>
              </p>
            )}
            {audience !== 'customer' && (
              <>
                <h3>Every candidate at decision time</h3>
                <div className="live-candidates">
                  {receipt.candidates.map((c) => (
                    <article
                      key={c.worker.id}
                      className={
                        c.worker.id === receipt.selected ? 'chosen' : ''
                      }
                    >
                      <div>
                        <strong>{c.worker.name}</strong>
                        <span>
                          {c.eta} min / net before {money(c.worker.net)}
                        </span>
                      </div>
                      <p>
                        {c.failed.length
                          ? `Rejected: ${c.failed.join(', ')}`
                          : c.worker.id === receipt.selected
                            ? 'Selected by the active tie-break'
                            : `Eligible, passed over by: ${receipt.tieBreak}`}
                      </p>
                    </article>
                  ))}
                </div>
                <p className="field-legend">
                  <strong>Time field:</strong>{' '}
                  requestedAtMinutesSince2026_08_31_IST is the requested
                  service minute offset from 31 August 2026 00:00 India
                  Standard Time.
                </p>
              </>
            )}
          </>
        )}
        {snapshot.evidence && (
          <dl className="receipt-summary">
            <div>
              <dt>Cancelled by</dt>
              <dd>{snapshot.evidence.actor}</dd>
            </div>
            <div>
              <dt>Stage</dt>
              <dd>{snapshot.evidence.stage}</dd>
            </div>
            <div>
              <dt>Recorded charge</dt>
              <dd>{money(snapshot.outcome.charge)}</dd>
            </div>
            <div>
              <dt>Worker compensation</dt>
              <dd>{money(snapshot.outcome.compensation ?? 0)}</dd>
            </div>
            <div>
              <dt>Constitution rule</dt>
              <dd>
                {snapshot.evidence.actor === 'customer'
                  ? 'No worker cancellation penalty'
                  : 'Worker cancellation after acceptance'}
              </dd>
            </div>
          </dl>
        )}
        {audience !== 'customer' && (
          <>
            <button className="text-link" onClick={() => setRaw((v) => !v)}>
              {raw ? 'Hide' : 'Inspect'} frozen JSON
            </button>
            {raw && <pre>{JSON.stringify(auditable, null, 2)}</pre>}
          </>
        )}
        {challenge && (
          <Button variant="outline" onClick={() => challenge(snapshot.id)}>
            Challenge this decision
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
function PriceRegister({ service }: { service: Service }) {
  const { state } = useApplication();
  const t = (key: Parameters<typeof translate>[1]) => translate(state.session.locale, key);
  const price = priceBands[service];
  return (
    <div className="price-register" aria-label="Cooperative price breakdown">
      <div>
        <span>{t('workerPay')}</span>
        <strong>{money(price.workerServicePay)}</strong>
      </div>
      <div>
        <span>{t('welfare')}</span>
        <strong>{money(price.welfareContribution)}</strong>
      </div>
      <div>
        <span>{t('operationsShare')}</span>
        <strong>{money(price.cooperativeOperations)}</strong>
      </div>
      <div className="price-total">
        <span>{t('customerTotal')}</span>
        <strong>{money(price.customerTotal)}</strong>
      </div>
      <small>
        Cooperative-defined illustrative minimum:{' '}
        {money(price.minimumWorkerPay)}. No bidding, ranking fee or hidden
        worker deduction.
      </small>
    </div>
  );
}

type IntakeSuggestion = {
  suggestedServiceCategory: string;
  suggestedTask: string;
  issueSummary: string;
  scopeDraft: string[];
  clarifyingQuestions: string[];
  possibleUrgency: string;
  possibleToolsOrMaterials: string[];
  uncertaintyNote: string;
};
function localIntake(description: string): IntakeSuggestion {
  const text = description.toLowerCase();
  const category = text.includes('leak') || text.includes('pipe') || text.includes('tap')
    ? 'Plumber' : text.includes('clean') ? 'Home cleaning' : text.includes('fridge') || text.includes('washing')
      ? 'Appliance repair' : 'Electrician';
  return {
    suggestedServiceCategory: category,
    suggestedTask: `${category} inspection`,
    issueSummary: description.trim(),
    scopeDraft: ['Inspect the reported issue', 'Explain findings before additional work', 'Complete only customer-approved scope'],
    clarifyingQuestions: ['When did the issue begin?', 'Is there any smell, heat, water or other immediate safety concern?'],
    possibleUrgency: /burn|spark|smoke|flood/.test(text) ? 'urgent' : 'uncertain',
    possibleToolsOrMaterials: ['Inspection tools; materials confirmed after diagnosis'],
    uncertaintyNote: 'Local fallback suggestion. Confirm the category and scope before booking.',
  };
}

export function CustomerApplication() {
  const { state, run, ready } = useApplication();
  const [service, setService] = useState<Service>('Electrician'),
    [zone, setZone] = useState('Kharadi'),
    [time, setTime] = useState('11:30'),
    [requirement, setRequirement] = useState(
      'Ceiling fan wiring needs checking',
    ),
    [emergency, setEmergency] = useState(false),
    [receipt, setReceipt] = useState<DecisionSnapshot | null>(null),
    [intake, setIntake] = useState<IntakeSuggestion | null>(null),
    [intakeStatus, setIntakeStatus] = useState(''),
    [reference, setReference] = useState<Awaited<ReturnType<typeof compressEvidence>> | null>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(state.session.locale, key);
  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void run(async (repo) => {
      const jobId = await createBooking(repo, {
        service,
        zone: zones.indexOf(zone),
        requested:
          7 * 1440 + Number(time.slice(0, 2)) * 60 + Number(time.slice(3)),
        requirement,
        pricing: priceBands[service],
        emergency,
      });
      if (reference) await addJobEvidence(repo, {
        jobId, type: 'customer-reference', caption: 'Customer reference photo',
        ...reference, uploader: { role: 'customer', id: 'CUSTOMER-01' },
      });
    });
  };
  const askIntake = async () => {
    setIntakeStatus('Structuring your service request…');
    try {
      const response = await fetch('/api/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: requirement }) });
      if (!response.ok) throw new Error('fallback');
      setIntake(await response.json() as IntakeSuggestion);
      setIntakeStatus('AI suggestion ready. Review it before applying.');
    } catch {
      setIntake(localIntake(requirement));
      setIntakeStatus('AI service unavailable. A deterministic local draft is ready; booking still works.');
    }
  };
  return (
    <AppShell persona="customer">
      <Heading
        title={translate(state.session.locale, 'bookHelp')}
        text={t('bookingSub')}
      />
      <div className="customer-live-grid">
        <section className="live-panel">
          <h2>{t('newRequest')}</h2>
          <form onSubmit={submit} className="live-form">
            <Choice
              label={t('service')}
              value={service}
              values={services.map((x) => ({ value: x, label: serviceLabel(state.session.locale, x) }))}
              onChange={(v) => setService(v as Service)}
            />
            <div className="live-form-pair">
              <Choice
                label={t('locality')}
                value={zone}
                values={zones.map((x) => ({ value: x, label: x }))}
                onChange={setZone}
              />
              <Choice
                label={t('schedule')}
                value={time}
                values={['09:00', '11:30', '14:00', '16:30'].map((x) => ({
                  value: x,
                  label: x,
                }))}
                onChange={setTime}
              />
            </div>
            <label className="live-field">
              <span>{t('describe')}</span>
              <textarea
                required
                maxLength={250}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
              />
            </label>
            <div className="intake-assistant">
              <div><strong>Describe it with help</strong><span>AI structures your words; you decide what enters the booking.</span></div>
              <Button type="button" variant="outline" onClick={() => void askIntake()}>{t('aiHelp')}</Button>
              {intakeStatus && <output>{intakeStatus}</output>}
              {intake && (
                <div className="intake-result">
                  <strong>{intake.suggestedTask}</strong>
                  <p>{intake.issueSummary}</p>
                  <ul>{intake.clarifyingQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
                  <small>{intake.uncertaintyNote}</small>
                  <div className="button-row">
                    <Button type="button" onClick={() => {
                      if (services.includes(intake.suggestedServiceCategory as Service)) setService(intake.suggestedServiceCategory as Service);
                      setRequirement(`${intake.suggestedTask}: ${intake.issueSummary}`);
                      setEmergency(intake.possibleUrgency === 'urgent');
                      setIntake(null);
                    }}>Use this editable draft</Button>
                    <Button type="button" variant="outline" onClick={() => setIntake(null)}>Keep my description</Button>
                  </div>
                </div>
              )}
            </div>
            <label className="evidence-picker">
              <Camera aria-hidden="true" />
              <span><strong>{t('referencePhoto')}</strong><small>Optional. Compressed on this device.</small></span>
              <input type="file" accept="image/*" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void compressEvidence(file).then(setReference).catch((error: Error) => setIntakeStatus(error.message));
              }} />
            </label>
            {reference && <><span className="sr-only">Customer reference preview</span><div className="evidence-preview" style={{ backgroundImage: `url(${reference.dataUrl})` }} /></>}
            <label className="emergency-choice">
              <input
                type="checkbox"
                checked={emergency}
                onChange={(event) => setEmergency(event.target.checked)}
              />
              <span>
                {t('emergency')}
                <small>
                  Uses the same hard skill, radius and safety checks.
                </small>
              </span>
            </label>
            <PriceRegister service={service} />
            <p className="fairness-disclosure">
              Skill, availability and the promised arrival time are checked
              before the cooperative applies its member-approved assignment
              rule.
            </p>
            <Button type="submit" disabled={!ready}>
              {translate(state.session.locale, 'createJob')}
            </Button>
          </form>
        </section>
        <section className="live-queue">
          <h2>
            {t('jobRecords')} <span>{state.jobs.length}</span>
          </h2>
          {!state.jobs.length && (
            <div className="empty-state">
              <Clock />
              <h3>No local jobs yet</h3>
              <p>
                The first booking creates a persisted job, event and dispatch
                snapshot.
              </p>
            </div>
          )}
          {state.jobs.map((job) => {
            const snap = latestSnapshot(state, job);
            const pendingChange = state.changeOrders.find(
              (change) =>
                change.jobId === job.id && change.status === 'proposed',
            );
            const settlement = state.settlements.find(
              (item) => item.id === job.settlementId,
            );
            const feedback = state.feedback.find(
              (item) => item.jobId === job.id,
            );
            return (
              <article className="live-job" key={job.id}>
                <div>
                  <strong>{serviceLabel(state.session.locale, job.job.category)}</strong>
                  <span className="stage">{stageLabel(state.session.locale, job.stage)}</span>
                </div>
                <p>
                  {zones[job.job.zone]} / {job.id}
                </p>
                <p>
                  Assigned member: {workerName(state, job.workerId)}
                </p>
                {job.emergency && (
                  <p className="protection-note">
                    Emergency request / hard eligibility preserved
                  </p>
                )}
                {snap?.receipt && !job.route && state.jobs.at(-1)?.id === job.id && (
                  <DispatchDecisionMap receipt={snap.receipt} mode="customer" />
                )}
                {snap?.receipt && job.route && ['en-route', 'arrived', 'start-verification', 'working', 'completion-verification'].includes(job.stage) && (
                  <ActiveTravelMap receipt={snap.receipt} route={job.route} progress={job.travelProgress ?? 0} locale={state.session.locale} />
                )}
                {['start-verification', 'completion-verification'].includes(job.stage) && (() => {
                  const type = job.stage === 'start-verification' ? 'start' : 'completion';
                  const otp = state.otps.filter((item) => item.jobId === job.id && item.type === type && !item.invalidatedAt && !item.usedAt).at(-1);
                  return otp ? (
                    <output className="customer-otp">
                      <span>{type === 'start' ? 'Start code' : 'Completion code'}</span>
                      <strong>{otp.customerCode}</strong>
                      <p>Share this code only after checking the member {type === 'start' ? 'has arrived' : 'has completed the approved scope'}.</p>
                    </output>
                  ) : null;
                })()}
                {state.evidence.some((item) => item.jobId === job.id) && (
                  <div className="evidence-gallery" aria-label="Job evidence">
                    {state.evidence.filter((item) => item.jobId === job.id).map((item) => (
                      <figure key={item.id}><span className="sr-only">{item.type} work evidence: {item.caption}</span><span className="evidence-image" style={{ backgroundImage: `url(${item.dataUrl})` }} /><figcaption>{item.type.replace('-', ' ')}</figcaption></figure>
                    ))}
                  </div>
                )}
                {pendingChange && (
                  <div className="scope-consent">
                    <strong>Approve added scope?</strong>
                    <p>
                      {pendingChange.description} / labour{' '}
                      {money(pendingChange.labour)} / material{' '}
                      {money(pendingChange.material)}
                    </p>
                    <div className="button-row">
                      <Button
                        onClick={() =>
                          void run((repo) =>
                            decideChangeOrder(
                              repo,
                              pendingChange.id,
                              'approved',
                            ),
                          )
                        }
                      >
                        Approve quoted change
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          void run((repo) =>
                            decideChangeOrder(
                              repo,
                              pendingChange.id,
                              'declined',
                            ),
                          )
                        }
                      >
                        Keep original scope
                      </Button>
                    </div>
                  </div>
                )}
                {settlement && (
                  <div className="invoice-register">
                    <strong>Invoice {settlement.invoiceId}</strong>
                    <span>
                      {money(settlement.customerTotal)} / {settlement.status}
                    </span>
                    <small>
                      Worker pay {money(settlement.workerPay)} remains settled.
                    </small>
                    {settlement.approvedExtras > 0 &&
                      settlement.status === 'settled' && (
                        <button
                          className="text-link"
                          onClick={() =>
                            void run((repo) =>
                              disputeMaterialCharge(repo, settlement.id),
                            )
                          }
                        >
                          Question approved material charge
                        </button>
                      )}
                  </div>
                )}
                {job.stage === 'completed' && !feedback && (
                  <div className="button-row rating-actions">
                    <Button
                      variant="outline"
                      onClick={() =>
                        void run((repo) =>
                          submitCustomerFeedback(
                            repo,
                            job.id,
                            5,
                            'Work completed as agreed.',
                          ),
                        )
                      }
                    >
                      Rate 5 / 5
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void run((repo) =>
                          submitCustomerFeedback(
                            repo,
                            job.id,
                            1,
                            'Needs cooperative review.',
                          ),
                        )
                      }
                    >
                      Rate 1 / 5
                    </Button>
                  </div>
                )}
                {feedback && (
                  <p className="protection-note">
                    Rating {feedback.rating}/5 recorded. It cannot automatically
                    restrict the member
                    {feedback.reviewRequired
                      ? '; cooperative review required.'
                      : '.'}
                  </p>
                )}
                <div className="button-row">
                  {snap && (
                    <Button variant="outline" onClick={() => setReceipt(snap)}>
                      View assignment
                    </Button>
                  )}
                  {!['completed', 'cancelled'].includes(job.stage) && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        void run((repo) => cancelJob(repo, job.id, 'customer'))
                      }
                    >
                      {t('cancelJob')}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
      <SnapshotDialog
        snapshot={receipt}
        close={() => setReceipt(null)}
        audience="customer"
      />
    </AppShell>
  );
}
const nextAction: Partial<
  Record<
    WorkOrder['stage'],
    {
      label: string;
      run: (
        repo: Parameters<typeof acceptOffer>[0],
        jobId: string,
        workerId: string,
      ) => Promise<unknown>;
    }
  >
> = {
  offered: { label: 'Accept offer', run: acceptOffer },
  accepted: { label: 'Start travelling', run: startTravelWithRoute },
};

const clockValue = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const clockMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

function WorkloadPanel({ profile }: { profile: MemberProfile }) {
  const { run, state } = useApplication();
  const t = (key: Parameters<typeof translate>[1]) => translate(state.session.locale, key);
  const [availableUntil, setAvailableUntil] = useState(
      clockValue(profile.workload.availableUntil),
    ),
    [minimumRestGap, setMinimumRestGap] = useState(
      profile.workload.minimumRestGap,
    ),
    [maximumJobsToday, setMaximumJobsToday] = useState(
      profile.workload.maximumJobsToday,
    ),
    [heavyServiceLimit, setHeavyServiceLimit] = useState(
      profile.workload.heavyServiceLimit,
    ),
    [unavailableStart, setUnavailableStart] = useState(
      profile.workload.unavailablePeriods[0]
        ? clockValue(profile.workload.unavailablePeriods[0].start)
        : '',
    ),
    [unavailableEnd, setUnavailableEnd] = useState(
      profile.workload.unavailablePeriods[0]
        ? clockValue(profile.workload.unavailablePeriods[0].end)
        : '',
    );
  const periods =
    unavailableStart && unavailableEnd
      ? [
          {
            start: clockMinutes(unavailableStart),
            end: clockMinutes(unavailableEnd),
          },
        ]
      : [];
  return (
    <section className="workload-panel">
      <div className="workload-heading">
        <div>
          <h2>{t('workload')}</h2>
          <p>These limits block offers before livelihood ranking.</p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </div>
      <div className="workload-fields">
        <label className="live-field">
          <span>Available until</span>
          <input
            type="time"
            value={availableUntil}
            onChange={(event) => setAvailableUntil(event.target.value)}
          />
        </label>
        <label className="live-field">
          <span>Minimum rest gap (minutes)</span>
          <input
            min="0"
            type="number"
            value={minimumRestGap}
            onChange={(event) => setMinimumRestGap(Number(event.target.value))}
          />
        </label>
        <label className="live-field">
          <span>Maximum jobs today</span>
          <input
            min="0"
            type="number"
            value={maximumJobsToday}
            onChange={(event) =>
              setMaximumJobsToday(Number(event.target.value))
            }
          />
        </label>
        <label className="live-field">
          <span>Maximum heavy services</span>
          <input
            min="0"
            type="number"
            value={heavyServiceLimit}
            onChange={(event) =>
              setHeavyServiceLimit(Number(event.target.value))
            }
          />
        </label>
        <label className="live-field">
          <span>Unavailable from (optional)</span>
          <input
            type="time"
            value={unavailableStart}
            onChange={(event) => setUnavailableStart(event.target.value)}
          />
        </label>
        <label className="live-field">
          <span>Unavailable until (optional)</span>
          <input
            type="time"
            value={unavailableEnd}
            onChange={(event) => setUnavailableEnd(event.target.value)}
          />
        </label>
      </div>
      <p className="workload-assurance">
        A safety exclusion never lowers your standing or counts as a refusal.
      </p>
      <Button
        variant="outline"
        onClick={() =>
          void run((repo) =>
            updateWorkloadSettings(repo, profile.id, {
              availableUntil: clockMinutes(availableUntil),
              minimumRestGap,
              maximumJobsToday,
              heavyServiceLimit,
              unavailablePeriods: periods,
            }),
          )
        }
      >
        Save workload boundary
      </Button>
    </section>
  );
}

export function WorkerApplication() {
  const { state, run, ready } = useApplication();
  const memberId = state.session.memberId,
    member = state.workers.find((w) => w.id === memberId)!,
    projected = projection(state).workers.find((w) => w.id === memberId)!,
    funds = wallet(state, memberId),
    profile = state.members.find((item) => item.id === memberId)!,
    opportunities = state.opportunities.filter(
      (item) => item.workerId === memberId && item.valid,
    ),
    acceptedOpportunities = opportunities.filter(
      (item) => item.outcome === 'accepted',
    ).length;
  const previousPolicy = state.policies
      .filter((policy) => policy.status === 'expired')
      .sort((a, b) => b.version - a.version)[0],
    previousProjection = previousPolicy
      ? projection(state, previousPolicy.version).workers.find(
          (worker) => worker.id === memberId,
        )
      : null;
  const [receipt, setReceipt] = useState<DecisionSnapshot | null>(null),
    [reason, setReason] = useState(
      'Please verify this decision against the frozen constitution.',
    ),
    [refusalReason, setRefusalReason] = useState<RefusalReason>('unsafe'),
    [otpCode, setOtpCode] = useState(''),
    [proofType, setProofType] = useState<'before' | 'during' | 'after' | 'variance'>('before'),
    [proofStatus, setProofStatus] = useState(''),
    [guideDismissed, setGuideDismissed] = useState(false),
    [guideForced, setGuideForced] = useState(false);
  const showGuide = guideForced || (ready && !state.session.onboardingDone[memberId] && !guideDismissed);
  const t = (key: Parameters<typeof translate>[1]) => translate(state.session.locale, key);
  const mine = state.jobs.filter((j) => j.workerId === memberId),
    skipped = state.jobs.filter(
      (j) =>
        j.workerId !== memberId &&
        j.receiptIds.some((id) => {
          const r = state.snapshots.find((s) => s.id === id)?.receipt;
          const c = r?.candidates.find((x) => x.worker.id === memberId);
          return c && !c.failed.length;
        }),
    );
  const challengeSnap = (snapshotId: string) => {
    void run((repo) =>
      openChallenge(repo, snapshotId, { role: 'worker', id: memberId }, reason),
    );
    setReceipt(null);
  };
  return (
    <AppShell persona="worker">
      <Dialog open={showGuide} onOpenChange={(open) => { if (!open) { setGuideDismissed(true); setGuideForced(false); } }}>
        <DialogContent className="worker-guide">
          <DialogTitle>How KAAMSABHA protects your work</DialogTitle>
          <DialogDescription>Four places to know before your first offer.</DialogDescription>
          <ol>
            <li><strong>Today’s jobs appear here.</strong><span>One clear action follows each job state.</span></li>
            <li><strong>See your pay before accepting.</strong><span>Scope, payout, estimated costs and net stay together.</span></li>
            <li><strong>Fair Work explains allocation.</strong><span>See real opportunities, the current rule and votes.</span></li>
            <li><strong>Challenge a decision.</strong><span>Replay Court checks the frozen receipt.</span></li>
          </ol>
          <Button onClick={() => { setGuideDismissed(true); setGuideForced(false); void run((repo) => finishWorkerOnboarding(repo, memberId)); }}>Done</Button>
        </DialogContent>
      </Dialog>
      <Heading
        title={`${member.name} ${t('workerWork')}`}
        text={t('workerSub')}
        action={
          <Choice
            label={t('actingWorker')}
            value={memberId}
            values={state.workers.map((w) => ({ value: w.id, label: w.name }))}
            onChange={(id) =>
              void run((repo) => switchPersona(repo, 'worker', id))
            }
          />
        }
      />
      <div className="worker-live-grid">
        <section>
          <h2 id="worker-jobs">
            {t('liveWork')} <span className="count">{mine.length}</span>
          </h2>
          {!mine.length && (
            <div className="empty-state">{t('noOffers')}</div>
          )}
          {mine.map((job) => {
            const action = nextAction[job.stage];
            const snap = latestSnapshot(state, job);
            const candidate = snap?.receipt?.candidates.find(
              (item) => item.worker.id === memberId,
            );
            const change = state.changeOrders.find(
              (item) => item.jobId === job.id,
            );
            const workability = state.workability.find(
              (item) => item.jobId === job.id,
            );
            return (
              <article className="live-job" key={job.id}>
                <div>
                  <strong>
                    {serviceLabel(state.session.locale, job.job.category)} / {zones[job.job.zone]}
                  </strong>
                  <span className="stage">{stageLabel(state.session.locale, job.stage)}</span>
                </div>
                <p>
                  {job.id} / assigned under v{snap?.policy.version}
                </p>
                <div className="offer-register">
                  <div>
                    <span>{t('bookedScope')}</span>
                    <strong>{job.job.requirement}</strong>
                  </div>
                  <div>
                    <span>{t('workerPay')}</span>
                    <strong>
                      {money(job.pricing?.workerServicePay ?? job.job.payout)}
                    </strong>
                  </div>
                  <div>
                    <span>{t('estimatedCosts')}</span>
                    <strong>
                      {money(
                        candidate
                          ? Object.values(candidate.costs).reduce(
                              (sum, value) => sum + value,
                              0,
                            )
                          : 0,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>{t('estimatedNet')}</span>
                    <strong>{money(candidate?.net ?? 0)}</strong>
                  </div>
                  <small>No ranking fee, boost fee or hidden deduction.</small>
                </div>
                {action && (
                  <div className="button-row">
                    <Button
                      onClick={() =>
                        void run((repo) => action.run(repo, job.id, memberId))
                      }
                    >
                      {job.stage === 'offered' ? t('acceptOffer') : t('startTravel')}
                    </Button>
                    {job.stage === 'offered' && (
                      <>
                        <Choice
                          label="Reason for declining"
                          value={refusalReason}
                          values={[
                            { value: 'unsafe', label: 'Unsafe conditions' },
                            {
                              value: 'out-of-scope',
                              label: 'Outside my skill or scope',
                            },
                            {
                              value: 'schedule-conflict',
                              label: 'Schedule conflict',
                            },
                            {
                              value: 'outside-service-area',
                              label: 'Outside my service area',
                            },
                            { value: 'other', label: 'Another reason' },
                          ]}
                          onChange={(value) =>
                            setRefusalReason(value as RefusalReason)
                          }
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            void run((repo) =>
                              declineOffer(
                                repo,
                                job.id,
                                memberId,
                                refusalReason,
                              ),
                            )
                          }
                        >
                          {t('declineSafe')}
                        </Button>
                      </>
                    )}
                  </div>
                )}
                {snap?.receipt && job.route && (
                  <ActiveTravelMap receipt={snap.receipt} route={job.route} progress={job.travelProgress ?? 0} locale={state.session.locale} />
                )}
                {job.stage === 'en-route' && (
                  <Button onClick={() => void run((repo) => advanceTravel(repo, job.id, memberId))}>
                    {(job.travelProgress ?? 0) >= 0.67 ? t('arrived') : 'Advance simulated travel'}
                  </Button>
                )}
                {job.stage === 'arrived' && (
                  <Button onClick={() => void run((repo) => requestJobOtp(repo, job.id, memberId, 'start'))}>{t('requestStartCode')}</Button>
                )}
                {job.stage === 'start-verification' && (
                  <div className="otp-entry">
                    <label className="live-field"><span>{t('startCode')}</span><input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))} /></label>
                    <Button disabled={otpCode.length !== 6} onClick={() => void run((repo) => verifyJobOtp(repo, job.id, memberId, 'start', otpCode)).then(() => setOtpCode(''))}>{t('verifyStartCode')}</Button>
                  </div>
                )}
                {['working', 'completion-verification'].includes(job.stage) && (
                  <div className="work-proof">
                    <strong>{t('evidence')}</strong>
                    <Choice label="Proof type" value={proofType} values={[
                      { value: 'before', label: 'Before work' }, { value: 'during', label: 'During work' }, { value: 'after', label: 'After work' }, { value: 'variance', label: 'Unexpected work' },
                    ]} onChange={(value) => setProofType(value as typeof proofType)} />
                    <label className="evidence-picker"><Camera aria-hidden="true" /><span><strong>Add photo</strong><small>Image only, compressed before saving.</small></span><input type="file" accept="image/*" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setProofStatus('Saving work proof…');
                      void compressEvidence(file).then((prepared) => run((repo) => addJobEvidence(repo, { jobId: job.id, type: proofType, caption: `${proofType} proof`, ...prepared, uploader: { role: 'worker', id: memberId } }))).then(() => setProofStatus('Work proof saved.')).catch((error: Error) => setProofStatus(error.message));
                    }} /></label>
                    {proofStatus && <output>{proofStatus}</output>}
                    {state.evidence.filter((item) => item.jobId === job.id).length > 0 && <div className="evidence-gallery">{state.evidence.filter((item) => item.jobId === job.id).map((item) => <figure key={item.id}><span className="sr-only">{item.type} evidence: {item.caption}</span><span className="evidence-image" style={{ backgroundImage: `url(${item.dataUrl})` }} /><figcaption>{item.type}</figcaption></figure>)}</div>}
                  </div>
                )}
                {job.stage === 'working' && (
                  <Button onClick={() => void run((repo) => requestJobOtp(repo, job.id, memberId, 'completion'))}>{t('requestCompletionCode')}</Button>
                )}
                {job.stage === 'completion-verification' && (
                  <div className="otp-entry">
                    <label className="live-field"><span>{t('completionCode')}</span><input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))} /></label>
                    <Button disabled={otpCode.length !== 6} onClick={() => void run((repo) => verifyJobOtp(repo, job.id, memberId, 'completion', otpCode)).then(() => setOtpCode(''))}>{t('verifyCompletionCode')}</Button>
                  </div>
                )}
                {['arrived', 'working'].includes(job.stage) && !change && (
                  <div className="scope-consent">
                    <strong>Scope changed on site?</strong>
                    <p>
                      Quote an explicit change. The original job can continue;
                      extra work is excluded until the customer approves.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void run((repo) =>
                          proposeChangeOrder(
                            repo,
                            job.id,
                            memberId,
                            'Replace damaged connector and add cable',
                            120,
                            80,
                          ),
                        )
                      }
                    >
                      Request approval / {money(200)}
                    </Button>
                  </div>
                )}
                {change && (
                  <p className="protection-note">
                    Change order {change.status}: {change.description}.{' '}
                    {change.status === 'approved'
                      ? 'Approved amount will settle.'
                      : 'Unapproved work does not affect your record.'}
                  </p>
                )}
                {job.stage === 'cancelled' && job.cancellationId && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setReceipt(
                        state.snapshots.find(
                          (s) => s.id === job.cancellationId,
                        ) ?? null,
                      )
                    }
                  >
                    Review cancellation
                  </Button>
                )}
                {snap && (
                  <button
                    className="text-link"
                    onClick={() => setReceipt(snap)}
                  >
                    Why was this assigned?
                  </button>
                )}
                {['completed', 'cancelled'].includes(job.stage) &&
                  !workability && (
                    <div className="button-row">
                      <Button
                        variant="outline"
                        onClick={() =>
                          void run((repo) =>
                            submitWorkabilitySignal(
                              repo,
                              job.id,
                              memberId,
                              'clear-scope',
                            ),
                          )
                        }
                      >
                        Scope was clear
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          void run((repo) =>
                            submitWorkabilitySignal(
                              repo,
                              job.id,
                              memberId,
                              'safety-concern',
                            ),
                          )
                        }
                      >
                        Private safety concern
                      </Button>
                    </div>
                  )}
                {workability && (
                  <p className="protection-note">
                    Workability signal recorded:{' '}
                    {workability.sensitive
                      ? 'private operations review'
                      : workability.signal}
                    .
                  </p>
                )}
              </article>
            );
          })}
          <details className="live-details">
            <summary>Why was I skipped? / {skipped.length} local jobs</summary>
            {skipped.map((job) => {
              const snap = latestSnapshot(state, job)!;
              return (
                <button key={job.id} onClick={() => setReceipt(snap)}>
                  <span>
                    {job.id} / selected {workerName(state, job.workerId)}
                  </span>
                  <strong>Inspect tie-break</strong>
                </button>
              );
            })}
          </details>
        </section>
        <aside className="wallet" id="worker-earnings">
          <div className="member-proof">
            <ShieldCheck />
            <span>Verified worker-member</span>
            <small>
              {member.skills.join(', ')} / {zones[member.zone]} service area
            </small>
          </div>
          <div className="opportunity-register">
            <span>{t('thisWeek')}</span>
            <dl>
              <div>
                <dt>{t('estimatedLivelihood')}</dt>
                <dd>{money(funds.total)}</dd>
              </div>
              <div>
                <dt>{t('validOpportunities')}</dt>
                <dd>{opportunities.length}</dd>
              </div>
              <div>
                <dt>{t('jobsAccepted')}</dt>
                <dd>{acceptedOpportunities}</dd>
              </div>
            </dl>
            <small>
              KAAMSABHA balances livelihood and access to genuine, workable
              opportunities. A decline never reduces future eligibility.
            </small>
          </div>
          <span>{t('settledWallet')}</span>
          <strong>{money(funds.total)}</strong>
          <dl>
            <div>
              <dt>{t('completedWorkNet')}</dt>
              <dd>{money(funds.work)}</dd>
            </div>
            <div>
              <dt>{t('dividends')}</dt>
              <dd>{money(funds.dividends)}</dd>
            </div>
            <div>
              <dt>{t('penalties')}</dt>
              <dd>{money(funds.penalties)}</dd>
            </div>
            <div>
              <dt>{t('travelProtection')}</dt>
              <dd>{money(funds.protections)}</dd>
            </div>
          </dl>
          <div className="projection">
            <span>Active-policy projection</span>
            <strong>
              {money(projected.net)} / {projected.jobs} jobs
            </strong>
            <small>
              100 historical jobs +{' '}
              {state.jobs.filter((x) => x.stage !== 'cancelled').length} local
              jobs, recalculated under v{state.activeVersion}. Wallet entries
              never change retroactively.
            </small>
            {previousProjection && (
              <p className="projection-change">
                Policy change: v{previousPolicy.version}{' '}
                {money(previousProjection.net)} / {previousProjection.jobs} jobs
                → v{state.activeVersion} {money(projected.net)} /{' '}
                {projected.jobs} jobs.
              </p>
            )}
          </div>
        </aside>
      </div>
      <section className="fair-work-hub" id="worker-fair-work">
        <div className="section-heading">
          <div><h2>{t('fairWork')}</h2><p>{t('fairWorkHelp')}</p></div><Scale aria-hidden="true" />
        </div>
        <div className="fair-work-sections">
          <details open>
            <summary>{t('opportunities')}</summary>
            <dl className="receipt-summary">
              <div><dt>{t('estimatedLivelihood')}</dt><dd>{money(funds.total)}</dd></div>
              <div><dt>{t('validOpportunities')}</dt><dd>{opportunities.length}</dd></div>
              <div><dt>Accepted</dt><dd>{acceptedOpportunities}</dd></div>
              <div><dt>Completed</dt><dd>{mine.filter((job) => job.stage === 'completed').length}</dd></div>
            </dl>
            <p>{t('fairAccessHelp')}</p>
          </details>
          <details>
            <summary>{t('whyDecision')}</summary>
            {[...mine, ...skipped].slice(-5).reverse().map((job) => (
              <button className="fair-decision-row" key={job.id} onClick={() => setReceipt(latestSnapshot(state, job) ?? null)}>
                <span><strong>{job.job.category}</strong>{zones[job.job.zone]}</span>
                <span>{job.workerId === memberId ? 'You received this job.' : `Eligible; ${workerName(state, job.workerId)} received it.`}</span>
              </button>
            ))}
            {!mine.length && !skipped.length && <p>No decisions need your attention.</p>}
          </details>
          <details>
            <summary>{t('currentRule')}</summary>
            <p>Workers below <strong>{money(state.policies.find((policy) => policy.version === state.activeVersion)!.parameters.floor)}</strong> estimated weekly net may receive preference when extra customer wait is at most <strong>{state.policies.find((policy) => policy.version === state.activeVersion)!.parameters.maxDelay} minutes</strong> and the customer SLA still holds.</p>
            <small>Cooperative Dispatch Constitution v{state.activeVersion}</small>
          </details>
          <details>
            <summary>{t('challenges')}</summary>
            {state.challenges.filter((item) => item.openedBy.id === memberId).map((item) => <p key={item.id}><strong>{item.status}</strong> / {item.reason}</p>)}
            {!state.challenges.some((item) => item.openedBy.id === memberId) && <p>You haven’t challenged any decisions.</p>}
          </details>
          <details>
            <summary>{t('votes')}</summary>
            <p>{state.proposalVersion ? `Constitution v${state.proposalVersion} is open in cooperative governance.` : 'No member vote is open.'}</p>
            <Link className="text-link" href="/governance">See what the rule would change</Link>
          </details>
        </div>
      </section>
      <div id="worker-more">
        <WorkloadPanel key={memberId} profile={profile} />
        <Button variant="outline" onClick={() => setGuideForced(true)}>{t('howItWorks')}</Button>
      </div>
      <label className="challenge-reason">
        <span>Reason used when challenging a receipt</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <SnapshotDialog
        snapshot={receipt}
        close={() => setReceipt(null)}
        challenge={challengeSnap}
      />
      <nav className="worker-bottom-nav" aria-label="Worker app">
        <a href="#workspace"><Home aria-hidden="true" /><span>{t('today')}</span></a>
        <a href="#worker-jobs"><ListChecks aria-hidden="true" /><span>{t('jobs')}</span></a>
        <a href="#worker-fair-work"><Scale aria-hidden="true" /><span>{t('fairWork')}</span></a>
        <a href="#worker-earnings"><IndianRupee aria-hidden="true" /><span>{t('earnings')}</span></a>
        <a href="#worker-more"><Menu aria-hidden="true" /><span>{t('more')}</span></a>
      </nav>
    </AppShell>
  );
}
function PolicyProposalForm({ active }: { active: LivePolicy }) {
  const { run } = useApplication();
  const [floor, setFloor] = useState(active.parameters.floor + 1000),
    [delay, setDelay] = useState(active.parameters.maxDelay + 2),
    [intent, setIntent] = useState<ProtectionIntent>('fair-opportunity');
  return (
    <div className="live-panel">
      <h2>Propose the next version</h2>
      <div className="live-form-pair">
        <label className="live-field">
          <span>Weekly net floor</span>
          <input
            type="number"
            value={floor}
            onChange={(e) => setFloor(Number(e.target.value))}
          />
        </label>
        <label className="live-field">
          <span>Maximum extra ETA</span>
          <input
            type="number"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
          />
        </label>
      </div>
      <Choice
        label="Rule being proposed"
        value={intent}
        values={protectionIntents}
        onChange={(value) => setIntent(value as ProtectionIntent)}
      />
      <p className="protection-note">
        The Worker Protection Floor validates proposals before simulation. It is
        outside the member ballot and cannot be voted away.
      </p>
      <Button
        onClick={() =>
          void run((repo) =>
            proposePolicy(
              repo,
              {
                floor,
                maxDelay: delay,
                netPriority: true,
              },
              intent,
            ),
          )
        }
      >
        Propose v{active.version + 1}
      </Button>
    </div>
  );
}
function GovernancePanel() {
  const { state, run } = useApplication();
  const active = state.policies.find((p) => p.version === state.activeVersion)!,
    proposal = state.policies.find((p) => p.version === state.proposalVersion);
  const [voter, setVoter] = useState('W01'),
    [catchUpVoter, setCatchUpVoter] = useState('W01'),
    [dissentReason, setDissentReason] = useState(''),
    [impactOpen, setImpactOpen] = useState(false);
  const [currentProjection, proposedProjection] = useMemo(() => {
    if (!proposal) return [null, null];
    return [
      projection(state, active.version).workers.find((w) => w.id === voter) ??
        null,
      projection(state, proposal.version).workers.find((w) => w.id === voter) ??
        null,
    ];
  }, [state, active.version, proposal, voter]);
  const votes = proposal ? Object.values(proposal.votes) : [],
    support = votes.filter((v) => v.choice === 'support').length,
    oppose = votes.filter((v) => v.choice === 'oppose').length,
    consultation = proposal?.consultations[voter],
    voterName = workerName(state, voter),
    reserveBalance = state.ledger
      .filter((entry) => entry.kind === 'reserve')
      .reduce((sum, entry) => sum + entry.amount, 0);
  const voteAndAdvance = (choice: 'support' | 'oppose') => {
    void run(async (repo) => {
      await castPolicyVote(repo, voter, choice, dissentReason);
      const next = state.workers.find(
        (w) => !proposal?.votes[w.id] && w.id !== voter,
      );
      if (next) {
        setVoter(next.id);
        setImpactOpen(false);
      }
      setDissentReason('');
    });
  };
  return (
    <>
      <section className="governance-live">
        <div className="constitution-summary">
          <h2>Active constitution v{active.version}</h2>
          <p>
            Eligible members below {money(active.parameters.floor)} can receive
            work within +{active.parameters.maxDelay} ETA minutes. Hard skill,
            schedule, radius and SLA checks run first.
          </p>
          <p className="protection-seal">
            <ShieldCheck /> Worker Protection Floor / hard constraint
          </p>
        </div>
        {!proposal ? (
          <PolicyProposalForm key={active.version} active={active} />
        ) : (
          <div className="live-panel">
            <div className="section-heading">
              <h2>Proposal v{proposal.version}</h2>
              <span className="stage">{proposal.status}</span>
            </div>
            <ol className="policy-steps">
              <li>Proposed</li>
              <li>Simulated</li>
              <li>Voted</li>
              <li>Activated</li>
            </ol>
            {proposal.status === 'draft' && (
              <Button onClick={() => void run(simulatePolicy)}>
                Simulate against stored history
              </Button>
            )}
            {proposal.simulation && (
              <div className="twin">
                <h3>
                  Same {proposal.historicalJobIds.length} jobs, same 12 workers
                </h3>
                <p className="metric-basis">
                  Comparison basis: proposed v{proposal.version} vs active
                  policy v{active.version}.
                </p>
                <dl>
                  <div>
                    <dt>Lowest weekly livelihood</dt>
                    <dd>
                      {money(proposal.simulation.current.lowest)} →{' '}
                      {money(proposal.simulation.proposed.lowest)}
                    </dd>
                  </div>
                  <div>
                    <dt>Average ETA</dt>
                    <dd>
                      {proposal.simulation.current.avgEta} →{' '}
                      {proposal.simulation.proposed.avgEta} min
                    </dd>
                  </div>
                  <div>
                    <dt>Jobs fulfilled</dt>
                    <dd>
                      {proposal.simulation.current.fulfilled} →{' '}
                      {proposal.simulation.proposed.fulfilled}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            {proposal.status === 'simulated' && (
              <Button onClick={() => void run(openPolicyVote)}>
                Open empty member ballot
              </Button>
            )}
            {['voting', 'approved'].includes(proposal.status) && (
              <div className="ballot">
                <div className="vote-tally">
                  <span>
                    <strong>{support}</strong> support
                  </span>
                  <span>
                    <strong>{oppose}</strong> oppose
                  </span>
                  <span>
                    <strong>{12 - votes.length}</strong> not voted
                  </span>
                </div>
                <p>
                  Quorum 9 / approval threshold 7. Every recorded vote below is
                  an actual local action.
                </p>
                {proposal.status === 'voting' && (
                  <>
                    <Choice
                      label="Vote as member"
                      value={voter}
                      values={state.workers
                        .filter((w) => !proposal.votes[w.id])
                        .map((w) => ({ value: w.id, label: w.name }))}
                      onChange={(memberId) => {
                        setVoter(memberId);
                        setImpactOpen(false);
                        setDissentReason('');
                      }}
                    />
                    <details
                      className="member-impact"
                      open={impactOpen}
                      onToggle={(event) => {
                        const open = event.currentTarget.open;
                        setImpactOpen(open);
                        if (open && !consultation)
                          void run((repo) =>
                            recordPolicyImpactView(repo, voter),
                          );
                      }}
                    >
                      <summary>
                        Who gains or gives up opportunity? Review {voterName}
                      </summary>
                      <dl>
                        <div>
                          <dt>Current v{active.version}</dt>
                          <dd>
                            {money(currentProjection?.net ?? 0)} /{' '}
                            {currentProjection?.jobs ?? 0} jobs
                          </dd>
                        </div>
                        <div>
                          <dt>Proposed v{proposal.version}</dt>
                          <dd>
                            {money(proposedProjection?.net ?? 0)} /{' '}
                            {proposedProjection?.jobs ?? 0} jobs
                          </dd>
                        </div>
                      </dl>
                      <p>
                        This is {voterName}’s own projection over the same{' '}
                        {proposal.historicalJobIds.length} jobs used by the
                        policy twin.
                      </p>
                    </details>
                    <p className="consent-status" id="vote-consent-status">
                      {consultation
                        ? `${voterName} reviewed this comparison. Voting is enabled.`
                        : `Open the comparison above before recording ${voterName}’s vote.`}
                    </p>
                    <label className="live-field">
                      <span>Reason if opposing (required and preserved)</span>
                      <textarea
                        maxLength={240}
                        value={dissentReason}
                        onChange={(event) =>
                          setDissentReason(event.target.value)
                        }
                        placeholder="State the trade-off this member cannot support"
                      />
                    </label>
                    <div className="button-row">
                      <Button
                        aria-describedby="vote-consent-status"
                        disabled={!consultation}
                        onClick={() => voteAndAdvance('support')}
                      >
                        Support
                      </Button>
                      <Button
                        variant="outline"
                        aria-describedby="vote-consent-status"
                        disabled={!consultation || !dissentReason.trim()}
                        onClick={() => voteAndAdvance('oppose')}
                      >
                        Oppose
                      </Button>
                    </div>
                  </>
                )}
                {proposal.status === 'approved' && (
                  <Button onClick={() => void run(activatePolicy)}>
                    Activate constitution v{proposal.version}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </section>
      <section
        className="policy-history"
        aria-labelledby="policy-history-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="policy-history-title">Constitution record</h2>
            <p>Votes, dissent and delivery evidence stay with each version.</p>
          </div>
        </div>
        {[...state.policies]
          .sort((a, b) => b.version - a.version)
          .map((policy) => {
            const dissents = Object.entries(policy.votes).filter(
                ([, ballot]) => ballot.choice === 'oppose',
              ),
              accountability = state.accountability.find(
                (record) => record.policyVersion === policy.version,
              ),
              catchUp = accountability
                ? state.catchUps.find(
                    (item) => item.accountabilityId === accountability.id,
                  )
                : undefined,
              catchUpVotes = catchUp ? Object.values(catchUp.votes) : [],
              catchUpSupport = catchUpVotes.filter(
                (ballot) => ballot.choice === 'support',
              ).length;
            return (
              <article className="policy-record" key={policy.version}>
                <div className="policy-record-heading">
                  <div>
                    <strong>
                      Constitution v{policy.version}: {policy.name}
                    </strong>
                    <span>
                      {money(policy.parameters.floor)} floor / +
                      {policy.parameters.maxDelay} minute limit
                    </span>
                  </div>
                  <span className="stage">{policy.status}</span>
                </div>
                <div className="dissent-ledger">
                  <h3>Preserved dissent</h3>
                  {dissents.length ? (
                    dissents.map(([memberId, ballot]) => (
                      <p key={memberId}>
                        <strong>{workerName(state, memberId)}:</strong>{' '}
                        {ballot.reason ||
                          'No reason was recorded in this legacy ballot.'}
                      </p>
                    ))
                  ) : (
                    <p>No opposing vote is recorded for this version.</p>
                  )}
                </div>
                {accountability && (
                  <div className="accountability-ledger">
                    <div>
                      <h3>Promise vs delivered</h3>
                      <span
                        className={`accountability-status ${accountability.status}`}
                      >
                        {accountability.status === 'measuring'
                          ? '20-job window pending'
                          : accountability.status === 'revote-required'
                            ? 'Mandatory re-vote'
                            : 'Within threshold'}
                      </span>
                    </div>
                    <p className="metric-basis">
                      Forecast basis: {accountability.basisJobIds.length} jobs,
                      v{accountability.comparisonVersion} compared with v
                      {accountability.policyVersion}. Delivery basis adds the
                      next 20 deterministic measurement jobs.
                    </p>
                    <dl>
                      <div>
                        <dt>Lowest livelihood</dt>
                        <dd>
                          Forecast{' '}
                          {money(
                            accountability.forecast.change.lowestLivelihood,
                          )}
                          {accountability.actual && (
                            <>
                              {' '}
                              / Actual{' '}
                              {money(
                                accountability.actual.change.lowestLivelihood,
                              )}{' '}
                              / Gap{' '}
                              {money(
                                accountability.actual.gap.lowestLivelihood,
                              )}
                            </>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Average ETA</dt>
                        <dd>
                          Forecast{' '}
                          {accountability.forecast.change.averageEta > 0
                            ? '+'
                            : ''}
                          {accountability.forecast.change.averageEta} min
                          {accountability.actual && (
                            <>
                              {' '}
                              / Actual{' '}
                              {accountability.actual.change.averageEta > 0
                                ? '+'
                                : ''}
                              {accountability.actual.change.averageEta} / Gap{' '}
                              {accountability.actual.gap.averageEta} min
                            </>
                          )}
                        </dd>
                      </div>
                    </dl>
                    {accountability.actual && (
                      <p>
                        Lowest-livelihood deviation:{' '}
                        <strong>
                          {accountability.actual.livelihoodDeviationPercent}%
                        </strong>
                        . A deviation above {accountability.thresholdPercent}%
                        forces a new member vote.
                      </p>
                    )}
                    {accountability.status === 'measuring' &&
                      policy.version === state.activeVersion && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            void run((repo) =>
                              completeAccountabilityWindow(
                                repo,
                                accountability.id,
                              ),
                            )
                          }
                        >
                          Run next 20-job measurement
                        </Button>
                      )}
                    {accountability.actual && !catchUp && (
                      <div className="catch-up-entry">
                        <Button
                          variant="outline"
                          disabled={reserveBalance <= 0}
                          onClick={() =>
                            void run((repo) =>
                              proposeCatchUpAllocation(repo, accountability.id),
                            )
                          }
                        >
                          Open bounded catch-up vote
                        </Button>
                        <small>
                          Available cooperative reserve: {money(reserveBalance)}
                          . The allocation cannot exceed this balance.
                        </small>
                      </div>
                    )}
                    {catchUp && (
                      <div className="catch-up-ledger">
                        <div className="policy-record-heading">
                          <div>
                            <h3>One-time catch-up allocation</h3>
                            <strong>
                              {workerName(state, catchUp.beneficiaryId)} /{' '}
                              {money(catchUp.amount)}
                            </strong>
                          </div>
                          <span className="stage">{catchUp.status}</span>
                        </div>
                        <p>{catchUp.justification}</p>
                        <p className="metric-basis">
                          Bound: the least of 10% of the{' '}
                          {money(catchUp.opportunityGap)} opportunity gap,{' '}
                          {money(catchUp.cap)}, and the{' '}
                          {money(catchUp.availableReserveAtProposal)} reserve
                          available when proposed.
                        </p>
                        <div className="vote-tally catch-up-tally">
                          <span>
                            <strong>{catchUpSupport}</strong> support
                          </span>
                          <span>
                            <strong>
                              {
                                catchUpVotes.filter(
                                  (ballot) => ballot.choice === 'oppose',
                                ).length
                              }
                            </strong>{' '}
                            oppose
                          </span>
                          <span>
                            <strong>{12 - catchUpVotes.length}</strong> not
                            voted
                          </span>
                        </div>
                        {catchUp.status === 'voting' && (
                          <>
                            <Choice
                              label="Vote on catch-up as member"
                              value={catchUpVoter}
                              values={state.workers
                                .filter((worker) => !catchUp.votes[worker.id])
                                .map((worker) => ({
                                  value: worker.id,
                                  label: worker.name,
                                }))}
                              onChange={setCatchUpVoter}
                            />
                            <div className="button-row">
                              <Button
                                onClick={() =>
                                  void run(async (repo) => {
                                    await castCatchUpVote(
                                      repo,
                                      catchUp.id,
                                      catchUpVoter,
                                      'support',
                                    );
                                    const next = state.workers.find(
                                      (worker) =>
                                        !catchUp.votes[worker.id] &&
                                        worker.id !== catchUpVoter,
                                    );
                                    if (next) setCatchUpVoter(next.id);
                                  })
                                }
                              >
                                Support catch-up
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  void run(async (repo) => {
                                    await castCatchUpVote(
                                      repo,
                                      catchUp.id,
                                      catchUpVoter,
                                      'oppose',
                                    );
                                    const next = state.workers.find(
                                      (worker) =>
                                        !catchUp.votes[worker.id] &&
                                        worker.id !== catchUpVoter,
                                    );
                                    if (next) setCatchUpVoter(next.id);
                                  })
                                }
                              >
                                Oppose catch-up
                              </Button>
                            </div>
                          </>
                        )}
                        {catchUp.status === 'approved' && (
                          <Button
                            onClick={() =>
                              void run((repo) =>
                                postCatchUpAllocation(repo, catchUp.id),
                              )
                            }
                          >
                            Post approved allocation
                          </Button>
                        )}
                        {catchUp.status === 'posted' && (
                          <p className="posted-allocation">
                            Posted to the member wallet and debited from the
                            cooperative reserve.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
      </section>
    </>
  );
}
function Court({ item }: { item: CourtCase }) {
  const { state, run } = useApplication();
  const snap = state.snapshots.find((s) => s.id === item.snapshotId)!;
  return (
    <article className="court-case">
      <div>
        <strong>
          {item.id} / {snap.jobId}
        </strong>
        <span className="stage">{item.status}</span>
      </div>
      <p>{item.reason}</p>
      {item.result && (
        <p>
          <b>{item.result.verdict}:</b> {item.result.explanation}
        </p>
      )}
      <div className="button-row">
        {item.status === 'open' && (
          <Button
            onClick={() => void run((repo) => replayChallenge(repo, item.id))}
          >
            Replay frozen inputs
          </Button>
        )}
        {item.status === 'replayed' && (
          <Button
            onClick={() =>
              void run((repo) => adjudicateChallenge(repo, item.id))
            }
          >
            Record replay verdict
          </Button>
        )}
        {['confirmed', 'violation'].includes(item.status) && (
          <Button
            onClick={() => void run((repo) => remedyChallenge(repo, item.id))}
          >
            {item.status === 'confirmed'
              ? 'Record no-change remedy'
              : 'Apply ledger remedy'}
          </Button>
        )}
        {item.status === 'remedied' && (
          <Button
            variant="outline"
            onClick={() => void run((repo) => closeChallenge(repo, item.id))}
          >
            Close case
          </Button>
        )}
      </div>
    </article>
  );
}
export function OperationsApplication({
  governance = false,
}: {
  governance?: boolean;
}) {
  const { state, reset } = useApplication();
  const router = useRouter();
  const completed = state.jobs.filter((j) => j.stage === 'completed').length,
    open = state.challenges.filter((c) => c.status !== 'closed').length,
    welfare = state.ledger
      .filter((entry) => entry.kind === 'welfare')
      .reduce((sum, entry) => sum + entry.amount, 0),
    privateReviews =
      state.workability.filter((item) => item.status === 'operations-review')
        .length + state.feedback.filter((item) => item.reviewRequired).length;
  const demand = Object.entries(
    dataset().jobs.reduce<Record<string, number>>((counts, job) => {
      const key = `${zones[job.zone]} / ${job.category}`;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4);
  const coveredMembers = new Set(
    state.snapshots.flatMap(
      (snapshot) =>
        snapshot.receipt?.candidates.map((candidate) => candidate.worker.id) ??
        [],
    ),
  ).size;
  return (
    <AppShell persona="operations">
      <Heading
        title={
          governance ? 'Cooperative constitution' : 'Cooperative operations'
        }
        text={
          governance
            ? 'Members test and decide the rules that allocate work.'
            : 'Every counter comes from this device-local event envelope.'
        }
        action={
          <div className="ops-tabs">
            <Link
              aria-current={!governance ? 'page' : undefined}
              href="/operations"
            >
              Operations
            </Link>
            <Link
              aria-current={governance ? 'page' : undefined}
              href="/governance"
            >
              Governance
            </Link>
          </div>
        }
      />
      {governance ? (
        <GovernancePanel />
      ) : (
        <>
          <div className="ops-counters">
            <div>
              <span>Local bookings</span>
              <strong>{state.jobs.length}</strong>
              <small>Created in this workspace</small>
            </div>
            <div>
              <span>Completed services</span>
              <strong>{completed}</strong>
              <small>Backed by settlement entries</small>
            </div>
            <div>
              <span>Open decisions</span>
              <strong>{open}</strong>
              <small>Challenges not closed</small>
            </div>
            <div>
              <span>Member coverage</span>
              <strong>{coveredMembers}/12</strong>
              <small>Seen in local dispatch evidence</small>
            </div>
          </div>
          <div className="operations-grid">
            <section>
              <h2>
                Event history <span>{state.events.length}</span>
              </h2>
              {state.events
                .slice()
                .reverse()
                .map((e) => (
                  <div className="event-row" key={e.id}>
                    <span>{e.type}</span>
                    <strong>{e.subject}</strong>
                    <small>{e.detail}</small>
                  </div>
                ))}
            </section>
            <section>
              <h2>
                Replay Court <span>{state.challenges.length}</span>
              </h2>
              {state.challenges.length ? (
                state.challenges.map((c) => <Court key={c.id} item={c} />)
              ) : (
                <div className="empty-state">
                  <Scale />
                  <p>Challenges opened from a worker receipt appear here.</p>
                </div>
              )}
            </section>
          </div>
          <div className="operations-registers">
            <section className="ops-register">
              <div className="section-heading">
                <div>
                  <h2>Member register</h2>
                  <p>Membership, skills, availability and representation.</p>
                </div>
                <strong>{state.members.length} verified</strong>
              </div>
              {state.members.map((profile) => {
                const worker = state.workers.find(
                  (item) => item.id === profile.id,
                )!;
                return (
                  <div className="register-row" key={profile.id}>
                    <strong>{worker.name}</strong>
                    <span>{profile.certificate}</span>
                    <span>{profile.availability}</span>
                    <small>
                      {profile.representative === 'welfare-representative'
                        ? 'Welfare representative'
                        : 'Member'}
                    </small>
                  </div>
                );
              })}
            </section>
            <section className="ops-register">
              <div className="section-heading">
                <div>
                  <h2>Demand outlook</h2>
                  <p>
                    Interpretable signal from 100 synthetic historical jobs.
                  </p>
                </div>
                <MapPin />
              </div>
              {demand.map(([label, count]) => (
                <div className="demand-row" key={label}>
                  <span>{label}</span>
                  <div>
                    <i style={{ width: `${count * 9}px` }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              ))}
              <small className="model-note">
                Illustrative demand representation. No real-world forecast
                accuracy claim.
              </small>
            </section>
            <section className="ops-register settlement-register">
              <div className="section-heading">
                <div>
                  <h2>Payment settlement ledger</h2>
                  <p>Deterministic invoice splits; no escrow claim.</p>
                </div>
                <IndianRupee />
              </div>
              <div className="register-summary">
                <span>
                  Welfare posted <strong>{money(welfare)}</strong>
                </span>
                <span>
                  Private reviews <strong>{privateReviews}</strong>
                </span>
              </div>
              {state.settlements.length ? (
                state.settlements.map((item) => (
                  <div className="register-row" key={item.id}>
                    <strong>{item.invoiceId}</strong>
                    <span>{item.jobId}</span>
                    <span>{money(item.customerTotal)}</span>
                    <small>
                      {item.status}; worker pay {money(item.workerPay)} remains
                      posted
                    </small>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  Completed jobs create settlement records here.
                </div>
              )}
            </section>
          </div>
          <details className="workspace-tools">
            <summary>Workspace controls</summary>
            <Button
              variant="outline"
              onClick={() => {
                reset();
                router.push('/app');
              }}
            >
              Reset local application
            </Button>
          </details>
        </>
      )}
    </AppShell>
  );
}
