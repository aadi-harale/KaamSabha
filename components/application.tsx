'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  Menu,
  LogOut,
  UserRound,
  BriefcaseBusiness,
  History,
  CalendarDays,
  Vote,
  CircleAlert,
  Droplets,
  SprayCan,
  Refrigerator,
  HeartHandshake,
  Network,
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
  updateWorkloadSettings,
  wallet,
  signInApplication,
  signOutApplication,
  raiseIssue,
  addIssueResponse,
  updateIssueStatus,
  createFederationDemo,
  runFederationTwin,
  replayFederationDecision,
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
  type AppRole,
  type IssueType,
  type IssueStatus,
} from '@/lib/application/model';
import { priceBands } from '@/lib/protections';
import { ActiveTravelMap, DispatchDecisionMap, FederationMap } from '@/components/dispatch-map';
import { compressEvidence } from '@/lib/application/image-evidence';
import { localeOptions, serviceLabel, translate, type Locale } from '@/lib/i18n';
import { roleLanding } from '@/lib/application/auth';
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
function NavigationIcon({ href }: { href: string }) {
  if (href.endsWith('/current')) return <BriefcaseBusiness aria-hidden="true" />;
  if (href.endsWith('/fair-work')) return <Scale aria-hidden="true" />;
  if (href.endsWith('/issues')) return <CircleAlert aria-hidden="true" />;
  if (href.endsWith('/bookings')) return <CalendarDays aria-hidden="true" />;
  if (href.endsWith('/past')) return <History aria-hidden="true" />;
  if (href.endsWith('/profile')) return <UserRound aria-hidden="true" />;
  if (href.endsWith('/more')) return <Menu aria-hidden="true" />;
  if (href === '/governance') return <Vote aria-hidden="true" />;
  if (href.endsWith('/federation')) return <Network aria-hidden="true" />;
  return <Home aria-hidden="true" />;
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
  const router = useRouter();
  const t = (key: Parameters<typeof translate>[1]) => translate(state.session.locale, key);
  const expectedRole: AppRole = persona === 'operations' ? 'admin' : persona;
  const authenticated = state.session.auth;
  const unread = state.notifications.filter((item) => !item.readAt && item.recipient.role === persona && (persona !== 'worker' || item.recipient.id === state.session.memberId)).length;
  useEffect(() => {
    document.documentElement.lang = state.session.locale;
  }, [state.session.locale]);
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) router.replace('/');
    else if (authenticated.role !== expectedRole)
      router.replace(roleLanding(authenticated.role));
  }, [authenticated, expectedRole, ready, router]);
  if (!ready)
    return <main className="auth-loading">Loading your workspace…</main>;
  if (!authenticated || authenticated.role !== expectedRole)
    return <main className="auth-loading">Checking access…</main>;
  const navigation =
    expectedRole === 'customer'
      ? [
          ['/customer', t('home')],
          ['/customer/bookings', t('bookings')],
          ['/customer/past', t('pastOrders')],
          ['/customer/profile', t('profile')],
        ]
      : expectedRole === 'worker'
        ? [
            ['/worker', t('home')],
            ['/worker/current', t('currentJob')],
            ['/worker/fair-work', t('fairWork')],
            ['/worker/issues', t('issues')],
            ['/worker/more', t('more')],
          ]
        : [
            ['/operations', t('overview')],
            ['/operations/jobs', 'Jobs'],
            ['/operations/workers', 'Workers'],
            ['/operations/issues', t('issuesChallenges')],
            ['/governance', t('governance')],
            ['/operations/settlements', 'Settlements'],
            ['/operations/demand', 'Demand'],
            ['/operations/federation', 'Federation'],
          ];
  const home = roleLanding(expectedRole);
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to work area
      </a>
      <header className={`live-header role-${expectedRole}`}>
        <Link href={home} className="live-brand">
          <span>
            <Users size={21} />
          </span>
          {t('appName')}<small>Worker-governed service workspace</small>
        </Link>
        <nav aria-label={t('primaryNavigation')}>
          {expectedRole !== 'admin' && navigation.map(([href, label]) => (
            <Link
              href={href}
              key={href}
              aria-current={path === href ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
          <button
            className="header-logout"
            onClick={() =>
              void run(async (repo) => {
                await signOutApplication(repo);
                router.replace('/');
              })
            }
          >
            <LogOut aria-hidden="true" />
            {t('logout')}
          </button>
        </nav>
      </header>
      <div className="live-context">
        <span>
          {ready ? t('offlineMode') : 'Loading workspace…'}
        </span>
        {unread > 0 && <button className="context-action" onClick={() => void run((repo) => markNotificationsRead(repo, { role: persona, id: persona === 'worker' ? state.session.memberId : persona === 'customer' ? 'CUSTOMER-01' : 'OPS-01' }))}>{unread} updates. Mark read</button>}
        <span className="signed-in-as">
          <UserRound aria-hidden="true" /> {authenticated.userId}
        </span>
        {expectedRole !== 'customer' && (
          <Link href={expectedRole === 'admin' ? '/governance' : '/worker/fair-work'}>
            <span className="status-dot" />
            {expectedRole === 'worker' ? t('fairWork') : t('activePolicy')} v
            {state.activeVersion}
          </Link>
        )}
      </div>
      {expectedRole === 'admin' && (
        <aside className="admin-side-nav" aria-label="Cooperative administration">
          <strong>Cooperative administration</strong>
          <span>Operations</span>
          {navigation.slice(0, 4).map(([href, label]) => <Link href={href} key={href} aria-current={path === href ? 'page' : undefined}><NavigationIcon href={href} />{label}</Link>)}
          <span>Governance and records</span>
          {navigation.slice(4, 6).map(([href, label]) => <Link href={href} key={href} aria-current={path === href ? 'page' : undefined}><NavigationIcon href={href} />{label}</Link>)}
          <span>Planning</span>
          {navigation.slice(6).map(([href, label]) => <Link href={href} key={href} aria-current={path === href ? 'page' : undefined}><NavigationIcon href={href} />{label}</Link>)}
        </aside>
      )}
      {error && (
        <div className="live-error" role="alert">
          {error}
          <button onClick={clearError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      <main id="workspace" className={`live-main ${expectedRole === 'admin' ? 'admin-main' : ''}`} data-path={path}>
        {children}
      </main>
      {expectedRole !== 'admin' && (
        <nav
          className={`role-bottom-nav ${expectedRole}`}
          aria-label={t('mobileNavigation')}
        >
          {navigation.map(([href, label]) => (
            <Link href={href} key={href} aria-current={path === href ? 'page' : undefined}>
              <NavigationIcon href={href} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
      <footer className="live-footer">
        Synthetic Pune demonstration. Device-local fallback is explicit; no live payment processing.
      </footer>
    </>
  );
}
export function ApplicationHome() {
  const { state, ready, repository } = useApplication();
  const [role, setRole] = useState<AppRole>('customer');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const t = (key: Parameters<typeof translate>[1]) => translate(state.session.locale, key);
  useEffect(() => {
    if (!ready || !state.session.auth) return;
    router.replace(roleLanding(state.session.auth.role));
  }, [ready, router, state.session.auth]);
  const submitLogin = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus('');
    if (!repository) return;
    void signInApplication(repository, { userId, password, role })
      .then((identity) =>
        router.replace(roleLanding(identity.role)),
      )
      .catch((error: Error) => setStatus(error.message))
      .finally(() => setSubmitting(false));
  };
  return (
    <main className="login-page">
      <section className="login-brand" aria-labelledby="login-title">
        <div className="login-brand-mark"><Users aria-hidden="true" /></div>
        <p>{t('cooperativeService')}</p>
        <h1 id="login-title">{t('loginPromise')}</h1>
        <ul>
          <li><ShieldCheck aria-hidden="true" /> {t('verifiedMembers')}</li>
          <li><BriefcaseBusiness aria-hidden="true" /> {t('clearWorkRecords')}</li>
          <li><Vote aria-hidden="true" /> {t('workerGoverned')}</li>
        </ul>
      </section>
      <section className="login-panel" aria-label={t('login')}>
        <div className="login-panel-heading">
          <div><strong>{t('appName')}</strong><span>{t('login')}</span></div>
          <LanguageControl />
        </div>
        <div className="login-roles" aria-label={t('chooseRole')}>
          {([
            ['customer', t('roleCustomer'), Wrench],
            ['worker', t('roleWorker'), Users],
            ['admin', t('roleAdmin'), ShieldCheck],
          ] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" aria-pressed={role === value} onClick={() => setRole(value)}>
              <Icon aria-hidden="true" /> <span>{label}</span>
            </button>
          ))}
        </div>
        <form className="login-form" onSubmit={submitLogin}>
          <label><span>{t('userId')}</span><input autoCapitalize="none" autoComplete="username" value={userId} onChange={(event) => setUserId(event.target.value)} /></label>
          <label><span>{t('password')}</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {status && <p className="login-error" role="alert">{status}</p>}
          <Button type="submit" disabled={submitting || !userId || !password}>{submitting ? t('signingIn') : t('signIn')}</Button>
        </form>
        <div className="login-foot">
          <span>{state.session.auth?.mode === 'supabase' ? t('secureSession') : t('offlineJudgeLogin')}</span>
          <Link href="/demo">{t('openJudgeDemo')}</Link>
        </div>
      </section>
    </main>
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
function plainEligibilityReason(reason: string) {
  const value = reason.toLowerCase();
  if (value.includes('skill')) return 'Required skill is not verified';
  if (value.includes('activ')) return 'Membership is not currently active';
  if (value.includes('avail')) return 'Outside the member’s available hours';
  if (value.includes('schedule') || value.includes('overlap')) return 'Already committed at this time';
  if (value.includes('radius') || value.includes('service area')) return 'Outside the member’s service area';
  if (value.includes('sla') || value.includes('eta')) return 'Could not meet the promised arrival time';
  if (value.includes('workload') || value.includes('rest')) return 'Protected by the member’s workload boundary';
  return reason;
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
  audience?: 'customer' | 'worker' | 'audit';
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
              : audience === 'worker'
                ? 'Why this decision?'
                : 'DecisionSnapshot receipt'
            : 'Cancellation decision'}
        </DialogTitle>
        <DialogDescription>
          {audience === 'customer'
            ? `Recorded for job ${snapshot.jobId}`
            : audience === 'worker'
              ? `Job ${snapshot.jobId} / fair-work rule v${snapshot.policy.version}`
              : `${snapshot.id} / SHA-256 ${snapshot.hash.slice(0, 16)}… / policy v${snapshot.policy.version}`}
        </DialogDescription>
        <div className="integrity-line">
          <ShieldCheck />
          <span>
            {audience === 'customer'
              ? 'The cooperative recorded this assignment when your booking was made.'
              : audience === 'worker'
                ? 'Saved at assignment time so the cooperative can check the original decision.'
                : `Frozen and hash-chained to ${
                  snapshot.previousHash === 'GENESIS'
                    ? 'the ledger origin'
                    : snapshot.previousHash.slice(0, 12) + '…'
                }`}
          </span>
        </div>
        {receipt && (
          <>
            {audience !== 'worker' && (
              <DispatchDecisionMap
                receipt={receipt}
                mode={audience === 'customer' ? 'customer' : 'decision'}
                className="receipt-map"
              />
            )}
            {audience === 'worker' && (
              <div className="eligibility-checks" aria-label="Why the member was eligible">
                <span>✓ Correct skill</span><span>✓ Available</span><span>✓ Inside service area</span><span>✓ Customer served on time</span>
                <strong>{selected?.worker.name ?? 'No member'} received the job.</strong>
              </div>
            )}
            <div className="rule-explanation">
              <Scale />
              <p>
                {audience === 'customer'
                  ? 'The assigned member has the required skill, is available, and can arrive within the service promise.'
                  : audience === 'worker'
                    ? 'The constitution first checked skill, active membership, availability, schedule, service area and arrival promise. It then applied the current opportunity rule to every eligible member.'
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
            {selected && audience === 'audit' && (
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
              <details className="advanced-receipt" open={audience === 'audit'}>
                <summary>{audience === 'worker' ? 'Advanced decision details' : 'Every candidate at decision time'}</summary>
                {audience === 'worker' && (
                  <>
                    <DispatchDecisionMap receipt={receipt} mode="decision" className="receipt-map" />
                    {selected && <p className="net-equation">{money(receipt.job.payout)} payout − {money(selected.costs.travel)} travel − {money(selected.costs.time)} unpaid travel time − {money(selected.costs.consumables)} consumables − {money(selected.costs.cancellation)} cancellation cost = <strong>{money(selected.net)} net contribution</strong></p>}
                  </>
                )}
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
                          ? c.failed.map(plainEligibilityReason).join('. ')
                          : c.worker.id === receipt.selected
                            ? 'Eligible and selected under the active constitution'
                            : 'Eligible, but another member ranked first under the active constitution'}
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
                {audience === 'worker' && (
                  <>
                    <button className="text-link" onClick={() => setRaw((value) => !value)}>
                      {raw ? 'Hide' : 'Inspect'} frozen JSON
                    </button>
                    {raw && <pre>{JSON.stringify(auditable, null, 2)}</pre>}
                  </>
                )}
              </details>
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
        {audience === 'audit' && (
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
function ServiceIcon({ service }: { service: Service }) {
  if (service === 'Plumber') return <Droplets aria-hidden="true" />;
  if (service === 'Home cleaning') return <SprayCan aria-hidden="true" />;
  if (service === 'Appliance repair') return <Refrigerator aria-hidden="true" />;
  if (service === 'Caregiving') return <HeartHandshake aria-hidden="true" />;
  return <Wrench aria-hidden="true" />;
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

export function CustomerApplication({
  section = 'home',
}: {
  section?: 'home' | 'bookings' | 'past' | 'profile';
}) {
  const { state, run, ready } = useApplication();
  const requestedService = useSearchParams().get('service');
  const [service, setService] = useState<Service>(
      requestedService && services.includes(requestedService as Service)
        ? (requestedService as Service)
        : 'Electrician',
    ),
    [zone, setZone] = useState('Kharadi'),
    [time, setTime] = useState('11:30'),
    [requirement, setRequirement] = useState(
      'Ceiling fan wiring needs checking',
    ),
    [emergency, setEmergency] = useState(false),
    [receipt, setReceipt] = useState<DecisionSnapshot | null>(null),
    [intake, setIntake] = useState<IntakeSuggestion | null>(null),
    [intakeStatus, setIntakeStatus] = useState(''),
    [reference, setReference] = useState<Awaited<ReturnType<typeof compressEvidence>> | null>(null),
    [bookingStep, setBookingStep] = useState(
      requestedService && services.includes(requestedService as Service) ? 2 : 1,
    ),
    [issueJobId, setIssueJobId] = useState<string | null>(null),
    [issueType, setIssueType] = useState<IssueType>('quality'),
    [issueDescription, setIssueDescription] = useState(''),
    [issueStatus, setIssueStatus] = useState('');
  const router = useRouter();
  const t = (key: Parameters<typeof translate>[1]) => translate(state.session.locale, key);
  const activeJobs = state.jobs.filter(
    (job) => !['completed', 'cancelled'].includes(job.stage),
  );
  const pastJobs = state.jobs
    .filter((job) => ['completed', 'cancelled'].includes(job.stage))
    .toReversed();
  const visibleJobs =
    section === 'past'
      ? pastJobs
      : section === 'home'
        ? activeJobs.slice(-1)
        : activeJobs;
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
    }).then(() => {
      setBookingStep(1);
      router.push('/customer/bookings');
    });
  };
  const askIntake = async () => {
    setIntakeStatus('Structuring your service request…');
    try {
      const response = await fetch('/api/ai/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: requirement }) });
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
        title={
          section === 'home'
            ? `${t('greeting')}, ${state.session.customerName}`
            : section === 'bookings'
              ? t('bookService')
              : section === 'past'
                ? t('pastOrders')
                : t('profile')
        }
        text={
          section === 'home'
            ? 'Kharadi, Pune'
            : section === 'bookings'
              ? t('bookServiceHelp')
              : section === 'past'
                ? t('pastOrdersHelp')
                : t('profileHelp')
        }
      />
      {section === 'home' && (
        <section className="customer-home-services">
          <div className="section-heading">
            <div><h2>{t('bookHelp')}</h2><p>{t('chooseService')}</p></div>
          </div>
          <div className="service-choice-grid">
            {services.map((item) => (
              <Link key={item} href={`/customer/bookings?service=${encodeURIComponent(item)}`}>
                <span><ServiceIcon service={item} /></span>
                <strong>{serviceLabel(state.session.locale, item)}</strong>
                <small>{money(priceBands[item].customerTotal)}</small>
              </Link>
            ))}
          </div>
        </section>
      )}
      {section === 'profile' && (
        <section className="customer-profile live-panel">
          <div className="profile-line"><UserRound aria-hidden="true" /><div><strong>{state.session.customerName}</strong><span>{state.session.auth?.userId}</span></div></div>
          <label className="live-field"><span>Your name</span><input defaultValue={state.session.customerName} onBlur={(event) => void run((repo) => setCustomerName(repo, event.target.value.trim() || state.session.customerName))} /></label>
          <div><strong>{t('language')}</strong><LanguageControl /></div>
          <div className="profile-location"><MapPin aria-hidden="true" /><span>Kharadi, Pune</span></div>
        </section>
      )}
      {section !== 'profile' && (
      <div className={`customer-live-grid ${section !== 'bookings' ? 'single' : ''}`}>
        {section === 'bookings' && (
        <section className="live-panel">
          <h2>{t('newRequest')}</h2>
          <form onSubmit={submit} className="live-form">
            <div className="booking-progress" aria-label={`Step ${bookingStep} of 5`}>
              <span>Step {bookingStep} of 5</span>
              <progress max="5" value={bookingStep} />
            </div>
            {bookingStep === 1 && (
              <fieldset className="booking-step">
                <legend>{t('service')}</legend>
                <div className="service-choice-grid compact">
                  {services.map((item) => (
                    <button key={item} type="button" aria-pressed={service === item} onClick={() => setService(item)}>
                      <span><ServiceIcon service={item} /></span>
                      <strong>{serviceLabel(state.session.locale, item)}</strong>
                    </button>
                  ))}
                </div>
                <Button type="button" onClick={() => setBookingStep(2)}>Continue</Button>
              </fieldset>
            )}
            {bookingStep === 2 && (
              <fieldset className="booking-step">
                <legend>What needs fixing?</legend>
                <label className="live-field">
                  <span>{t('describe')}</span>
                  <textarea required maxLength={250} value={requirement} onChange={(e) => setRequirement(e.target.value)} />
                </label>
                <div className="intake-assistant">
                  <div><strong>Describe it with help</strong><span>You decide what enters the booking.</span></div>
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
                        }}>Use suggestion</Button>
                        <Button type="button" variant="outline" onClick={() => setIntake(null)}>Ignore</Button>
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
                <div className="booking-actions"><Button type="button" variant="outline" onClick={() => setBookingStep(1)}>Back</Button><Button type="button" onClick={() => setBookingStep(3)} disabled={requirement.trim().length < 5}>Continue</Button></div>
              </fieldset>
            )}
            {bookingStep === 3 && (
              <fieldset className="booking-step">
                <legend>{t('locality')}</legend>
                <Choice label={t('locality')} value={zone} values={zones.map((x) => ({ value: x, label: x }))} onChange={setZone} />
                <div className="booking-actions"><Button type="button" variant="outline" onClick={() => setBookingStep(2)}>Back</Button><Button type="button" onClick={() => setBookingStep(4)}>Continue</Button></div>
              </fieldset>
            )}
            {bookingStep === 4 && (
              <fieldset className="booking-step">
                <legend>When should we come?</legend>
                <Choice label={t('schedule')} value={time} values={['09:00', '11:30', '14:00', '16:30'].map((x) => ({ value: x, label: x }))} onChange={setTime} />
                <label className="emergency-choice"><input type="checkbox" checked={emergency} onChange={(event) => setEmergency(event.target.checked)} /><span>{t('emergency')}<small>Use this only when the service cannot safely wait.</small></span></label>
                <div className="booking-actions"><Button type="button" variant="outline" onClick={() => setBookingStep(3)}>Back</Button><Button type="button" onClick={() => setBookingStep(5)}>Review booking</Button></div>
              </fieldset>
            )}
            {bookingStep === 5 && (
              <fieldset className="booking-step review-step">
                <legend>Review</legend>
                <dl className="booking-review"><div><dt>Service</dt><dd>{serviceLabel(state.session.locale, service)}</dd></div><div><dt>Need</dt><dd>{requirement}</dd></div><div><dt>Location</dt><dd>{zone}</dd></div><div><dt>Time</dt><dd>{time}</dd></div></dl>
                <PriceRegister service={service} />
                <p className="fairness-disclosure">Skill, availability and promised arrival are checked before assignment.</p>
                <div className="booking-actions"><Button type="button" variant="outline" onClick={() => setBookingStep(4)}>Back</Button><Button type="submit" disabled={!ready}>{translate(state.session.locale, 'createJob')}</Button></div>
              </fieldset>
            )}
          </form>
        </section>
        )}
        <section className="live-queue">
          <h2>
            {section === 'past' ? t('pastOrders') : section === 'home' ? t('activeBooking') : t('bookings')} <span>{visibleJobs.length}</span>
          </h2>
          {!visibleJobs.length && (
            <div className="empty-state">
              <Clock />
              <h3>{section === 'past' ? 'No past orders yet' : t('noActiveBooking')}</h3>
              <p>{section === 'past' ? 'Completed services will appear here.' : 'Choose a service when you need help.'}</p>
              {section !== 'past' && <Link className="button-link" href="/customer/bookings">{t('bookService')}</Link>}
            </div>
          )}
          {visibleJobs.map((job) => {
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
                {job.federationOpportunityId && (
                  <p className="federation-customer-note"><Network aria-hidden="true" /> Verified cooperative worker found through the Pune Labour Cooperative Federation network.</p>
                )}
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
                  {section === 'past' && ['completed', 'cancelled'].includes(job.stage) && (
                    <>
                      <Button variant="outline" onClick={() => setIssueJobId(job.id)}>Report a problem</Button>
                      <Link className="text-link" href={`/customer/bookings?service=${encodeURIComponent(job.job.category)}`}>Book again</Link>
                    </>
                  )}
                </div>
                {state.issues.filter((issue) => issue.jobId === job.id && issue.raisedBy.role === 'customer').map((issue) => (
                  <p className="issue-status-line" key={issue.id}><strong>Issue {issue.status.replaceAll('-', ' ')}</strong><span>{issue.description}</span></p>
                ))}
              </article>
            );
          })}
        </section>
      </div>
      )}
      <SnapshotDialog
        snapshot={receipt}
        close={() => setReceipt(null)}
        audience="customer"
      />
      <Dialog open={!!issueJobId} onOpenChange={(open) => !open && setIssueJobId(null)}>
        <DialogContent className="issue-dialog">
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>Tell the cooperative what happened. This does not automatically penalize the worker.</DialogDescription>
          <Choice label="Problem type" value={issueType} values={[
            { value: 'work-incomplete', label: 'Work incomplete' }, { value: 'quality', label: 'Quality issue' }, { value: 'payment', label: 'Payment issue' }, { value: 'worker-no-show', label: 'Worker did not arrive' }, { value: 'wrong-scope', label: 'Wrong scope' }, { value: 'other', label: 'Other' },
          ]} onChange={(value) => setIssueType(value as IssueType)} />
          <label className="live-field"><span>What happened?</span><textarea value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} /></label>
          {issueStatus && <output>{issueStatus}</output>}
          <Button disabled={issueDescription.trim().length < 8} onClick={() => {
            if (!issueJobId) return;
            void run((repo) => raiseIssue(repo, { actor: { role: 'customer', id: 'CUSTOMER-01' }, jobId: issueJobId, issueType, description: issueDescription })).then(() => {
              setIssueStatus('Issue received. The cooperative and worker have been notified.');
              setIssueDescription('');
            });
          }}>Submit issue</Button>
        </DialogContent>
      </Dialog>
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

export function WorkerApplication({
  section = 'home',
}: {
  section?: 'home' | 'current' | 'fair-work' | 'issues' | 'more';
}) {
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
    [issueType, setIssueType] = useState<IssueType>('unsafe-workplace'),
    [issueDescription, setIssueDescription] = useState(''),
    [issueStatus, setIssueStatus] = useState(''),
    [issueResponses, setIssueResponses] = useState<Record<string, string>>({}),
    [voteReason, setVoteReason] = useState(''),
    [guideDismissed, setGuideDismissed] = useState(false),
    [guideForced, setGuideForced] = useState(false);
  const showGuide = guideForced || (ready && !state.session.onboardingDone[memberId] && !guideDismissed);
  const t = (key: Parameters<typeof translate>[1]) => translate(state.session.locale, key);
  const mine = state.jobs.filter((j) => j.workerId === memberId),
    activeMine = mine.filter(
      (job) => !['completed', 'cancelled'].includes(job.stage),
    ),
    workerJobs = section === 'home' ? activeMine.slice(-1) : activeMine,
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
      />
      <div className={`worker-section worker-section-${section}`}>
      <section className="worker-home-summary" aria-label="Today at a glance">
        <div><span>{t('availability')}</span><strong>{profile.availability}</strong></div>
        <div><span>{t('nextJob')}</span><strong>{activeMine[0] ? serviceLabel(state.session.locale, activeMine[0].job.category) : t('noActiveOffer')}</strong></div>
        <div><span>{t('settledEarnings')}</span><strong>{money(funds.total)}</strong></div>
        <div><span>{t('todaysWorkload')}</span><strong>{activeMine.length}/{profile.workload.maximumJobsToday} jobs</strong><progress max={Math.max(profile.workload.maximumJobsToday, 1)} value={activeMine.length} /></div>
      </section>
      <div className="worker-live-grid">
        <section>
          <h2 id="worker-jobs">
            {t('liveWork')} <span className="count">{workerJobs.length}</span>
          </h2>
          {!workerJobs.length && (
            <div className="empty-state">{t('noOffers')}</div>
          )}
          {workerJobs.map((job) => {
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
                {job.federationOpportunityId && (
                  <p className="federation-worker-note"><Network aria-hidden="true" /><span><strong>Federation job</strong>Requested by Kharadi Cooperative. Your cooperative is Yerawada. Your protections stay the same.</span></p>
                )}
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
            <label className="challenge-reason">
              <span>What should the cooperative check when you challenge a decision?</span>
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
          </details>
          <details>
            <summary>{t('votes')}</summary>
            {state.proposalVersion ? (() => {
              const proposal = state.policies.find(
                (policy) => policy.version === state.proposalVersion,
              )!;
              const consultation = proposal.consultations[memberId];
              const ballot = proposal.votes[memberId];
              const current = projection(state).workers.find(
                (item) => item.id === memberId,
              )!;
              const proposed = projection(state, proposal.version).workers.find(
                (item) => item.id === memberId,
              )!;
              return (
                <div className="worker-ballot">
                  <p>
                    Constitution v{proposal.version} is {proposal.status}.
                    Review what it changes for your work before voting.
                  </p>
                  <dl className="receipt-summary">
                    <div><dt>Current rule</dt><dd>{money(current.net)} / {current.jobs} jobs</dd></div>
                    <div><dt>Proposed rule</dt><dd>{money(proposed.net)} / {proposed.jobs} jobs</dd></div>
                  </dl>
                  {!consultation && proposal.status === 'voting' && (
                    <Button variant="outline" onClick={() => void run((repo) => recordPolicyImpactView(repo, memberId))}>
                      I reviewed my impact
                    </Button>
                  )}
                  {consultation && !ballot && proposal.status === 'voting' && (
                    <>
                      <label className="live-field">
                        <span>Reason if opposing</span>
                        <textarea value={voteReason} onChange={(event) => setVoteReason(event.target.value)} />
                      </label>
                      <div className="button-row">
                        <Button onClick={() => void run((repo) => castPolicyVote(repo, memberId, 'support'))}>Support</Button>
                        <Button variant="outline" disabled={!voteReason.trim()} onClick={() => void run((repo) => castPolicyVote(repo, memberId, 'oppose', voteReason))}>Oppose</Button>
                      </div>
                    </>
                  )}
                  {ballot && (
                    <p className="protection-note">
                      Your vote: <strong>{ballot.choice}</strong>
                      {ballot.reason ? ` — ${ballot.reason}` : ''}
                    </p>
                  )}
                </div>
              );
            })() : <p>No member vote is open.</p>}
          </details>
        </div>
      </section>
      <section className="worker-issues-hub live-panel">
        <div className="section-heading">
          <div><h2>{t('issuesSuggestions')}</h2><p>{t('issueHelp')}</p></div>
          <CircleAlert aria-hidden="true" />
        </div>
        <Choice label="Type" value={issueType} values={[
          { value: 'unsafe-workplace', label: 'Safety concern' },
          { value: 'payment', label: 'Payment issue' },
          { value: 'work-incomplete', label: 'Job or scope issue' },
          { value: 'policy-suggestion', label: 'Policy suggestion' },
          { value: 'other', label: 'Other' },
        ]} onChange={(value) => setIssueType(value as IssueType)} />
        <label className="live-field">
          <span>{issueType === 'policy-suggestion' ? 'What rule should members discuss?' : 'What happened?'}</span>
          <textarea value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} />
        </label>
        {issueStatus && <output>{issueStatus}</output>}
        <Button disabled={issueDescription.trim().length < 8} onClick={() => void run((repo) => raiseIssue(repo, {
          actor: { role: 'worker', id: memberId },
          jobId: activeMine[0]?.id ?? null,
          issueType,
          description: issueDescription,
        })).then(() => {
          setIssueStatus('Sent to cooperative operations.');
          setIssueDescription('');
        })}>
          Submit
        </Button>
        <div className="issue-list">
          {state.issues
            .filter((item) =>
              (item.raisedBy.role === 'worker' && item.raisedBy.id === memberId) ||
              (item.raisedBy.role === 'customer' && !!item.jobId && state.jobs.some((job) => job.id === item.jobId && job.workerId === memberId)),
            )
            .toReversed()
            .map((item) => (
              <article key={item.id}>
                <div><strong>{item.issueType.replaceAll('-', ' ')}</strong><span className="stage">{item.status.replaceAll('-', ' ')}</span></div>
                <p>{item.description}</p>
                {item.comments.map((comment) => <small key={comment.id}>{comment.author.role}: {comment.message}</small>)}
                {item.raisedBy.role === 'customer' && (
                  <div className="issue-response-box">
                    <label className="live-field"><span>Add your response</span><textarea value={issueResponses[item.id] ?? ''} onChange={(event) => setIssueResponses((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
                    <Button variant="outline" disabled={(issueResponses[item.id] ?? '').trim().length < 3} onClick={() => void run((repo) => addIssueResponse(repo, item.id, { role: 'worker', id: memberId }, issueResponses[item.id])).then(() => setIssueResponses((current) => ({ ...current, [item.id]: '' })))}>Send response</Button>
                  </div>
                )}
              </article>
            ))}
        </div>
      </section>
      <div id="worker-more">
        <WorkloadPanel key={memberId} profile={profile} />
        <Button variant="outline" onClick={() => setGuideForced(true)}>{t('howItWorks')}</Button>
      </div>
      </div>
      <SnapshotDialog
        snapshot={receipt}
        close={() => setReceipt(null)}
        challenge={challengeSnap}
        audience="worker"
      />
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
function OperationsIssues() {
  const { state, run } = useApplication();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const statuses: IssueStatus[] = [
    'open',
    'under-review',
    'waiting-for-response',
    'resolved',
    'closed',
  ];
  return (
    <section className="admin-issues">
      <div className="section-heading">
        <div><h2>Issue register</h2><p>Service, member and policy concerns with an accountable response trail.</p></div>
        <strong>{state.issues.filter((item) => !['resolved', 'closed'].includes(item.status)).length} open</strong>
      </div>
      {!state.issues.length && <div className="empty-state"><CircleAlert aria-hidden="true" /><p>No issues have been raised.</p></div>}
      {state.issues.toReversed().map((item) => (
        <article className="admin-issue-row" key={item.id}>
          <div className="admin-issue-heading">
            <div><strong>{item.issueType.replaceAll('-', ' ')}</strong><span>{item.id} / {item.raisedBy.role} {item.raisedBy.id}{item.jobId ? ` / ${item.jobId}` : ''}</span></div>
            <Choice label="Status" value={item.status} values={statuses.map((status) => ({ value: status, label: status.replaceAll('-', ' ') }))} onChange={(status) => void run((repo) => updateIssueStatus(repo, item.id, status as IssueStatus))} />
          </div>
          <p>{item.description}</p>
          <div className="issue-comments">
            {item.comments.map((comment) => <p key={comment.id}><strong>{comment.author.role}</strong> {comment.message}</p>)}
          </div>
          <label className="live-field"><span>Add response</span><textarea value={responses[item.id] ?? ''} onChange={(event) => setResponses((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
          <Button
            variant="outline"
            disabled={(responses[item.id] ?? '').trim().length < 3}
            onClick={() => {
              void run((repo) =>
                addIssueResponse(
                  repo,
                  item.id,
                  { role: 'operations', id: state.session.auth?.userId ?? 'admin01' },
                  responses[item.id],
                ),
              ).then(() =>
                setResponses((current) => ({ ...current, [item.id]: '' })),
              );
            }}
          >
            Add response
          </Button>
        </article>
      ))}
    </section>
  );
}

function FederationPanel() {
  const { state, run } = useApplication();
  const federation = state.federation;
  const opportunity = federation.opportunities.at(-1);
  const snapshot = opportunity
    ? federation.snapshots.find((item) => item.opportunityId === opportunity.id)
    : null;
  const replay = snapshot
    ? federation.replays.find((item) => item.snapshotId === snapshot.id)
    : null;
  const name = (id: string | null) =>
    federation.cooperatives.find((item) => item.id === id)?.name ?? 'Not selected';
  return (
    <div className="federation-workspace">
      <section className="federation-thesis">
        <Network aria-hidden="true" />
        <div><h2>Federation Opportunity Exchange</h2><p>When one society has excess demand and another has safe capacity, they can share the opportunity without combining workers into one central pool.</p></div>
        {!opportunity && <Button onClick={() => void run(createFederationDemo)}>Run protected overflow scenario</Button>}
      </section>
      {opportunity ? (
        <>
          <FederationMap cooperatives={federation.cooperatives} candidates={opportunity.candidates} selectedId={opportunity.selectedCooperativeId} />
          <section className="federation-flow" aria-label="Two level federation decision">
            <div><span>Home society</span><strong>Kharadi</strong><small>No safe local capacity within 35 min</small></div>
            <div><span>Federation chooses the society</span><strong>Yerawada selected</strong><small>Capacity, protection and SLA passed</small></div>
            <div><span>Society chooses the worker</span><strong>{workerName(state, opportunity.workerId)}</strong><small>Yerawada constitution v{opportunity.workerReceipt?.policy.version}</small></div>
          </section>
          <section className="ops-register federation-exchange">
            <div className="section-heading"><div><h2>Live overflow request</h2><p>{opportunity.jobId} / {opportunity.service} / customer promise {opportunity.customerSlaMinutes} min</p></div><span className="stage">Accepted</span></div>
            <table className="federation-candidate-table" aria-label="Federation candidate cooperatives">
              <thead><tr className="table-head"><th>Cooperative</th><th>Capacity</th><th>ETA</th><th>Protection</th><th>Result</th></tr></thead>
              <tbody>
              {opportunity.candidates.map((candidate) => (
                <tr key={candidate.cooperativeId} className={candidate.cooperativeId === opportunity.selectedCooperativeId ? 'selected' : ''}>
                  <th>{name(candidate.cooperativeId)}</th><td>{candidate.availableWorkers} available</td><td>{candidate.eta < 900 ? `${candidate.eta} min` : '—'}</td><td>{candidate.protectionCompatible ? 'Compatible' : 'Blocked'}</td><td>{candidate.cooperativeId === opportunity.selectedCooperativeId ? 'Selected' : candidate.exclusionReason}</td>
                </tr>
              ))}
              </tbody>
            </table>
          </section>
          <div className="federation-receipts">
            <section className="live-panel"><span className="receipt-level">Receipt 1 / federation</span><h2>Why did this job move to Yerawada?</h2><ul><li>✓ Two electricians safely available</li><li>✓ 24-minute arrival is inside the promise</li><li>✓ Worker protections match the federation covenant</li><li>Hadapsar: 39 minutes, outside promise</li><li>Viman Nagar: workload protection active</li></ul><strong>Result: Yerawada Cooperative selected.</strong>{snapshot && <Button variant="outline" onClick={() => void run((repo) => replayFederationDecision(repo, snapshot.id))}>Replay frozen federation receipt</Button>}{replay && <p className={`replay-result ${replay.status}`}>{replay.status === 'confirmed' ? 'Federation decision confirmed' : replay.status}<small>{replay.explanation}</small></p>}</section>
            <section className="live-panel"><span className="receipt-level">Receipt 2 / worker</span><h2>Why did {workerName(state, opportunity.workerId)} receive it?</h2><ul><li>✓ Right verified skill</li><li>✓ Available and workload safe</li><li>✓ Customer still receives service on time</li><li>↑ Fewer work opportunities this week</li></ul><strong>Result: the receiving society selected its own member.</strong></section>
          </div>
          <section className="federation-settlement">
            <span>Illustrative settlement / no clearing claim</span><strong>₹900 customer total = ₹760 worker + ₹40 welfare + ₹100 fulfilling cooperative</strong><small>No home-society or federation fee is invented.</small>
          </section>
        </>
      ) : (
        <div className="empty-state"><Network /><h3>No overflow request yet</h3><p>Run the deterministic Kharadi evening peak scenario.</p></div>
      )}
      <section className="federation-twin">
        <div className="section-heading"><div><h2>Local only vs Federation Mesh</h2><p>Same 12 capacity scenarios. Same societies. Same worker protections.</p></div>{!federation.twin && <Button onClick={() => void run(runFederationTwin)}>Run federation Policy Twin</Button>}</div>
        {federation.twin && <div className="federation-twin-grid">
          {([['Local only', federation.twin.localOnly], ['Federation Mesh', federation.twin.mesh]] as const).map(([label, metrics]) => <article key={label}><h3>{label}</h3><dl><div><dt>Jobs served</dt><dd>{metrics.served}</dd></div><div><dt>Unfilled</dt><dd>{metrics.unfilled}</dd></div><div><dt>Average ETA</dt><dd>{metrics.averageEta} min</dd></div><div><dt>p90 ETA</dt><dd>{metrics.p90Eta} min</dd></div><div><dt>Cross-coop</dt><dd>{metrics.crossCooperative}</dd></div><div><dt>Protection violations</dt><dd>{metrics.protectionViolations}</dd></div></dl></article>)}
        </div>}
      </section>
    </div>
  );
}
export function OperationsApplication({
  governance = false,
  section = 'overview',
}: {
  governance?: boolean;
  section?: 'overview' | 'jobs' | 'workers' | 'issues' | 'settlements' | 'demand' | 'federation';
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
          governance
            ? 'Cooperative constitution'
            : section === 'jobs'
              ? 'Jobs and events'
              : section === 'workers'
                ? 'Worker-members'
                : section === 'settlements'
                  ? 'Settlements'
                  : section === 'demand'
                    ? 'Demand outlook'
                    : section === 'federation'
                      ? 'Federation Opportunity Exchange'
                    : section === 'issues'
                      ? 'Issues and challenges'
                      : 'Cooperative operations'
        }
        text={
          governance
            ? 'Members test and decide the rules that allocate work.'
            : section === 'federation'
              ? 'Share demand and safe capacity while each society keeps control of its own workers.'
            : section === 'overview'
              ? 'Every counter comes from this device-local event envelope.'
              : 'A focused register from the same cooperative records.'
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
            <Link
              aria-current={section === 'federation' ? 'page' : undefined}
              href="/operations/federation"
            >
              Federation
            </Link>
          </div>
        }
      />
      {section === 'federation' ? (
        <FederationPanel />
      ) : section === 'issues' ? (
        <OperationsIssues />
      ) : governance ? (
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
            <section className="ops-register member-register">
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
            <section className="ops-register demand-register">
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
