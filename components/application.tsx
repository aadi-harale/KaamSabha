'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Clock, Scale, ShieldCheck, Users, Wrench } from 'lucide-react';
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
import { services, zones, type Service } from '@/lib/engine';
import { useApplication } from '@/lib/application/provider';
import {
  acceptOffer,
  activatePolicy,
  adjudicateChallenge,
  cancelJob,
  castCatchUpVote,
  castPolicyVote,
  closeChallenge,
  completeAccountabilityWindow,
  completeWork,
  createBooking,
  declineOffer,
  openChallenge,
  openPolicyVote,
  projection,
  postCatchUpAllocation,
  proposePolicy,
  proposeCatchUpAllocation,
  recordPolicyImpactView,
  recordArrival,
  remedyChallenge,
  replayChallenge,
  simulatePolicy,
  startTravel,
  startWork,
  switchPersona,
  wallet,
} from '@/lib/application/service';
import {
  type CourtCase,
  type DecisionSnapshot,
  type LivePolicy,
  type Persona,
  type WorkOrder,
} from '@/lib/application/model';
import './application.css';

const money = (value: number) =>
  `₹${Math.round(value).toLocaleString('en-IN')}`;
const prices: Record<Service, number> = {
  Electrician: 680,
  Plumber: 720,
  'Home cleaning': 900,
  'Appliance repair': 780,
  Caregiving: 850,
};
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
function AppShell({
  persona,
  children,
}: {
  persona: Persona;
  children: React.ReactNode;
}) {
  const { state, error, clearError, ready } = useApplication();
  const path = usePathname();
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
          KAAMSABHA<small>Local cooperative workspace</small>
        </Link>
        <nav aria-label="Persona switcher">
          {(
            [
              ['customer', '/customer', 'Customer'],
              ['worker', '/worker', 'Worker-member'],
              ['operations', '/operations', 'Operations'],
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
            Judge demo
          </Link>
        </nav>
      </header>
      <div className="live-context">
        <span>
          {ready ? 'Device-local records ready' : 'Loading workspace…'}
        </span>
        <Link href="/governance">
          <span className="status-dot" />
          Constitution v{state.activeVersion} active
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
        Seeded illustrative workspace. No authentication, live jobs or payments.
      </footer>
    </>
  );
}
export function ApplicationHome() {
  return (
    <AppShell persona="customer">
      <section className="entry">
        <p>Choose whose work you need to do.</p>
        <h1>One cooperative. Three working views.</h1>
        <div className="persona-entry">
          <Link href="/customer">
            <Wrench />
            <strong>Customer</strong>
            <span>Book and follow a service</span>
          </Link>
          <Link href="/worker">
            <Users />
            <strong>Worker-member</strong>
            <span>Accept work and see livelihood</span>
          </Link>
          <Link href="/operations">
            <ShieldCheck />
            <strong>Operations</strong>
            <span>Govern rules and review evidence</span>
          </Link>
        </div>
        <p className="entry-note">
          <Link href="/demo">Open the original deterministic judge demo</Link>
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
}: {
  snapshot: DecisionSnapshot | null;
  close: () => void;
  challenge?: (id: string) => void;
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
            ? 'DecisionSnapshot receipt'
            : 'Cancellation decision'}
        </DialogTitle>
        <DialogDescription>
          {snapshot.id} / SHA-256 {snapshot.hash.slice(0, 16)}… / policy v
          {snapshot.policy.version}
        </DialogDescription>
        <div className="integrity-line">
          <ShieldCheck />
          <span>
            Frozen and hash-chained to{' '}
            {snapshot.previousHash === 'GENESIS'
              ? 'the ledger origin'
              : snapshot.previousHash.slice(0, 12) + '…'}
          </span>
        </div>
        {receipt && (
          <>
            <div className="rule-explanation">
              <Scale />
              <p>{receipt.reason}</p>
            </div>
            <dl className="receipt-summary">
              <div>
                <dt>Selected member</dt>
                <dd>{selected?.worker.name ?? 'None'}</dd>
              </div>
              <div>
                <dt>ETA</dt>
                <dd>{selected?.eta ?? '—'} min</dd>
              </div>
              <div>
                <dt>Net contribution</dt>
                <dd>{selected ? money(selected.net) : '—'}</dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>v{receipt.policy.version}</dd>
              </div>
            </dl>
            {selected && (
              <p className="net-equation">
                {money(receipt.job.payout)} payout −{' '}
                {money(selected.costs.travel)} travel −{' '}
                {money(selected.costs.time)} unpaid travel time −{' '}
                {money(selected.costs.consumables)} consumables −{' '}
                {money(selected.costs.cancellation)} cancellation cost ={' '}
                <strong>{money(selected.net)} net contribution</strong>
              </p>
            )}
            <h3>Every candidate at decision time</h3>
            <div className="live-candidates">
              {receipt.candidates.map((c) => (
                <article
                  key={c.worker.id}
                  className={c.worker.id === receipt.selected ? 'chosen' : ''}
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
              <strong>Time field:</strong> requestedAtMinutesSince2026_08_31_IST
              is the requested service minute offset from 31 August 2026 00:00
              India Standard Time.
            </p>
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
              <dt>Constitution rule</dt>
              <dd>
                {snapshot.evidence.actor === 'customer'
                  ? 'No worker cancellation penalty'
                  : 'Worker cancellation after acceptance'}
              </dd>
            </div>
          </dl>
        )}
        <button className="text-link" onClick={() => setRaw((v) => !v)}>
          {raw ? 'Hide' : 'Inspect'} frozen JSON
        </button>
        {raw && <pre>{JSON.stringify(auditable, null, 2)}</pre>}
        {challenge && (
          <Button variant="outline" onClick={() => challenge(snapshot.id)}>
            Challenge this decision
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function CustomerApplication() {
  const { state, run, ready } = useApplication();
  const [service, setService] = useState<Service>('Electrician'),
    [zone, setZone] = useState('Kharadi'),
    [time, setTime] = useState('11:30'),
    [requirement, setRequirement] = useState(
      'Ceiling fan wiring needs checking',
    ),
    [receipt, setReceipt] = useState<DecisionSnapshot | null>(null);
  const active = state.policies.find(
    (policy) => policy.version === state.activeVersion,
  )!;
  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void run((repo) =>
      createBooking(repo, {
        service,
        zone: zones.indexOf(zone),
        requested:
          7 * 1440 + Number(time.slice(0, 2)) * 60 + Number(time.slice(3)),
        requirement,
        payout: prices[service],
      }),
    );
  };
  return (
    <AppShell persona="customer">
      <Heading
        title="Book a cooperative member"
        text="Your request runs through the active constitution immediately."
      />
      <div className="customer-live-grid">
        <section className="live-panel">
          <h2>New service request</h2>
          <form onSubmit={submit} className="live-form">
            <Choice
              label="Service"
              value={service}
              values={services.map((x) => ({ value: x, label: x }))}
              onChange={(v) => setService(v as Service)}
            />
            <div className="live-form-pair">
              <Choice
                label="Locality"
                value={zone}
                values={zones.map((x) => ({ value: x, label: x }))}
                onChange={setZone}
              />
              <Choice
                label="Time on 7 September"
                value={time}
                values={['09:00', '11:30', '14:00', '16:30'].map((x) => ({
                  value: x,
                  label: x,
                }))}
                onChange={setTime}
              />
            </div>
            <label className="live-field">
              <span>What should the member expect?</span>
              <textarea
                required
                maxLength={250}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
              />
            </label>
            <div className="price-line">
              <span>Illustrative one-hour visit</span>
              <strong>{money(prices[service])}</strong>
            </div>
            <p className="fairness-disclosure">
              Estimated wait may include up to{' '}
              <strong>{active.parameters.maxDelay} extra minutes</strong> under
              this cooperative’s member-voted fair-opportunity rule.
            </p>
            <Button type="submit" disabled={!ready}>
              Create job and dispatch
            </Button>
          </form>
        </section>
        <section className="live-queue">
          <h2>
            Your job records <span>{state.jobs.length}</span>
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
            return (
              <article className="live-job" key={job.id}>
                <div>
                  <strong>{job.job.category}</strong>
                  <span className="stage">{job.stage}</span>
                </div>
                <p>
                  {zones[job.job.zone]} / {job.id}
                </p>
                <p>
                  {workerName(state, job.workerId)} / constitution v
                  {snap?.policy.version}
                </p>
                <div className="button-row">
                  {snap && (
                    <Button variant="outline" onClick={() => setReceipt(snap)}>
                      Open receipt
                    </Button>
                  )}
                  {!['completed', 'cancelled'].includes(job.stage) && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        void run((repo) => cancelJob(repo, job.id, 'customer'))
                      }
                    >
                      Cancel job
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
      <SnapshotDialog snapshot={receipt} close={() => setReceipt(null)} />
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
  accepted: { label: 'Start travelling', run: startTravel },
  'en-route': { label: 'Record arrival', run: recordArrival },
  arrived: { label: 'Start work', run: startWork },
  working: { label: 'Complete job', run: completeWork },
};
export function WorkerApplication() {
  const { state, run } = useApplication();
  const memberId = state.session.memberId,
    member = state.workers.find((w) => w.id === memberId)!,
    projected = projection(state).workers.find((w) => w.id === memberId)!,
    funds = wallet(state, memberId);
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
    );
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
      <Heading
        title={`${member.name}'s work`}
        text="Offers, earnings and explanations from the same local records."
        action={
          <Choice
            label="Acting as worker-member"
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
          <h2>
            Live work <span className="count">{mine.length}</span>
          </h2>
          {!mine.length && (
            <div className="empty-state">No local offers for this member.</div>
          )}
          {mine.map((job) => {
            const action = nextAction[job.stage];
            const snap = latestSnapshot(state, job);
            return (
              <article className="live-job" key={job.id}>
                <div>
                  <strong>
                    {job.job.category} / {zones[job.job.zone]}
                  </strong>
                  <span className="stage">{job.stage}</span>
                </div>
                <p>
                  {job.id} / assigned under v{snap?.policy.version}
                </p>
                {action && (
                  <div className="button-row">
                    <Button
                      onClick={() =>
                        void run((repo) => action.run(repo, job.id, memberId))
                      }
                    >
                      {action.label}
                    </Button>
                    {job.stage === 'offered' && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          void run((repo) =>
                            declineOffer(repo, job.id, memberId),
                          )
                        }
                      >
                        Decline and redispatch
                      </Button>
                    )}
                  </div>
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
        <aside className="wallet">
          <span>Settled local wallet</span>
          <strong>{money(funds.total)}</strong>
          <dl>
            <div>
              <dt>Completed-work net</dt>
              <dd>{money(funds.work)}</dd>
            </div>
            <div>
              <dt>Cooperative dividends</dt>
              <dd>{money(funds.dividends)}</dd>
            </div>
            <div>
              <dt>Penalties and remedies</dt>
              <dd>{money(funds.penalties)}</dd>
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
      <label className="challenge-reason">
        <span>Reason used when challenging a receipt</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <SnapshotDialog
        snapshot={receipt}
        close={() => setReceipt(null)}
        challenge={challengeSnap}
      />
    </AppShell>
  );
}
function PolicyProposalForm({ active }: { active: LivePolicy }) {
  const { run } = useApplication();
  const [floor, setFloor] = useState(active.parameters.floor + 1000),
    [delay, setDelay] = useState(active.parameters.maxDelay + 2);
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
      <Button
        onClick={() =>
          void run((repo) =>
            proposePolicy(repo, {
              floor,
              maxDelay: delay,
              netPriority: true,
            }),
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
                Comparison basis: proposed v{proposal.version} vs active policy
                v{active.version}.
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
                Quorum 9 / approval threshold 7. Every recorded vote below is an
                actual local action.
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
                      {proposal.historicalJobIds.length} jobs used by the policy
                      twin.
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
                      onChange={(event) => setDissentReason(event.target.value)}
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
      <section className="policy-history" aria-labelledby="policy-history-title">
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
                        {ballot.reason || 'No reason was recorded in this legacy ballot.'}
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
                      <span className={`accountability-status ${accountability.status}`}>
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
                          Forecast {money(accountability.forecast.change.lowestLivelihood)}
                          {accountability.actual && (
                            <> / Actual {money(accountability.actual.change.lowestLivelihood)} / Gap {money(accountability.actual.gap.lowestLivelihood)}</>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Average ETA</dt>
                        <dd>
                          Forecast {accountability.forecast.change.averageEta > 0 ? '+' : ''}
                          {accountability.forecast.change.averageEta} min
                          {accountability.actual && (
                            <> / Actual {accountability.actual.change.averageEta > 0 ? '+' : ''}{accountability.actual.change.averageEta} / Gap {accountability.actual.gap.averageEta} min</>
                          )}
                        </dd>
                      </div>
                    </dl>
                    {accountability.actual && (
                      <p>
                        Lowest-livelihood deviation:{' '}
                        <strong>{accountability.actual.livelihoodDeviationPercent}%</strong>.
                        A deviation above {accountability.thresholdPercent}% forces
                        a new member vote.
                      </p>
                    )}
                    {accountability.status === 'measuring' &&
                      policy.version === state.activeVersion && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            void run((repo) =>
                              completeAccountabilityWindow(repo, accountability.id),
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
                          Available cooperative reserve: {money(reserveBalance)}.
                          The allocation cannot exceed this balance.
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
                            <strong>{12 - catchUpVotes.length}</strong> not voted
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
    open = state.challenges.filter((c) => c.status !== 'closed').length;
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
