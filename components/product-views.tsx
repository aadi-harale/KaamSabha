'use client';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { dispatchBooking } from '@/lib/booking';
import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  Scale,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Shell,
  money,
  MetricsTable,
  Tradeoff,
  ReceiptDialog,
  WorkerBars,
} from './kaamsabha';
import { useApp, type Booking } from '@/lib/store';
import {
  activate,
  cancellationCase,
  challenge,
  openVote,
  propose,
  replay,
  services,
  simulate,
  simulateProposal,
  vote,
  zones,
  type Appeal,
  type Job,
  type Policy,
  type Receipt,
  type Service,
} from '@/lib/engine';

function Choice({
  label,
  value,
  values,
  change,
}: {
  label: string;
  value: string;
  values: string[];
  change: (value: string) => void;
}) {
  return (
    <div className="field">
      <span id={`label-${label.replaceAll(' ', '-')}`}>{label}</span>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v) change(v);
        }}
      >
        <SelectTrigger
          aria-labelledby={`label-${label.replaceAll(' ', '-')}`}
          className="choice-trigger"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
function PageHeading({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}
export function PolicyDetails({ policy }: { policy: Policy }) {
  return (
    <dl className="policy-facts">
      <div>
        <dt>Weekly opportunity floor</dt>
        <dd>
          {money(policy.parameters.floor)} <small>net / member</small>
        </dd>
      </div>
      <div>
        <dt>Maximum additional wait</dt>
        <dd>
          {policy.parameters.maxDelay} <small>minutes</small>
        </dd>
      </div>
      <div>
        <dt>Customer SLA</dt>
        <dd>
          {policy.constraints.sla} <small>minutes</small>
        </dd>
      </div>
      <div>
        <dt>Service radius</dt>
        <dd>
          {policy.constraints.radius} <small>km one way</small>
        </dd>
      </div>
      <div>
        <dt>Emergency priority</dt>
        <dd>Always enabled</dd>
      </div>
      <div>
        <dt>Opportunity tie-break</dt>
        <dd>
          {policy.parameters.netPriority
            ? 'Net contribution, then ETA'
            : 'ETA, then service quality'}
        </dd>
      </div>
    </dl>
  );
}
export function Governance() {
  const { state, setState, setNotice, data, cooperative } = useApp();
  const p = state.proposal;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const presets: Record<string, [number, number, boolean]> = {
    Balanced: [3500, 8, false],
    'Worker opportunity': [4500, 10, true],
    'Customer speed': [3500, 2, false],
    'Net livelihood': [4500, 8, true],
  };
  const preset =
    Object.entries(presets).find(
      ([, [floor, delay, net]]) =>
        floor === p.parameters.floor &&
        delay === p.parameters.maxDelay &&
        net === p.parameters.netPriority,
    )?.[0] ?? 'Custom';
  const twin = useMemo(
    () =>
      p.simulation ? simulate(data.jobs, data.workers, p, state.rates) : null,
    [p, data, state.rates],
  );
  const amend = (patch: Partial<Policy>) =>
    setState((s) => ({
      ...s,
      proposal: {
        ...s.proposal,
        ...patch,
        status: 'draft',
        simulation: null,
        votes: {},
      },
    }));
  const pickPreset = (v: string) => {
    if (v === 'Custom') return;
    const values: Record<string, [number, number, boolean]> = {
      Balanced: [3500, 8, false],
      'Worker opportunity': [4500, 10, true],
      'Customer speed': [3500, 2, false],
      'Net livelihood': [4500, 8, true],
    };
    const [floor, maxDelay, netPriority] = values[v];
    amend({ name: v, parameters: { floor, maxDelay, netPriority } });
  };
  const supports = Object.values(p.votes).filter((v) => v === 'support').length,
    opposes = Object.values(p.votes).filter((v) => v === 'oppose').length;
  return (
    <Shell>
      <PageHeading
        title="The rules are ours to write."
        text="Test the consequences before asking members to decide."
      />
      <div className="governance-layout">
        <aside className="constitution-panel">
          <div className="section-heading">
            <ShieldCheck />
            <h2>Active constitution</h2>
            <span className="tag">v{state.active.version}</span>
          </div>
          <p className="policy-clause">
            For non-emergency work, prefer an eligible member below the weekly
            livelihood floor when the extra customer wait stays within our
            limit.
          </p>
          <PolicyDetails policy={state.active} />
          <div className="hard-rule">
            <strong>Service promises stay protected.</strong>
            <p>
              Skill, availability, schedule, radius and SLA checks run before
              this rule. Emergency jobs go to the fastest eligible worker.
            </p>
          </div>
          <div className="hard-rule">
            <strong>Cancellation protection</strong>
            <p>
              A customer cancellation after departure must not reduce worker
              reliability.
            </p>
            <Link href="/demo/worker?challenge=true">See this rule enforced</Link>
          </div>
          <details>
            <summary>Policy version history</summary>
            {state.history.map((h) => (
              <div className="history-row" key={h.version}>
                <strong>
                  v{h.version} / {h.name}
                </strong>
                <span>
                  {h.status} / {h.effectiveAt?.slice(0, 10) ?? 'Not activated'}
                </span>
              </div>
            ))}
          </details>
        </aside>
        <section className="proposal-panel">
          <div className="section-heading">
            <h2>Proposed constitution</h2>
            <span className="tag">
              v{p.version} / {p.status}
            </span>
          </div>
          <ol className="process-strip" aria-label="Policy lifecycle">
            {['Write', 'Simulate', 'Vote', 'Activate'].map((label, i) => (
              <li
                key={label}
                className={
                  i <=
                  (p.status === 'draft'
                    ? 0
                    : p.status === 'simulated'
                      ? 1
                      : p.status === 'voting' || p.status === 'approved'
                        ? 2
                        : 3)
                    ? 'reached'
                    : ''
                }
              >
                {label}
              </li>
            ))}
          </ol>
          {p.status === 'active' ? (
            <div className="activation-result" aria-live="polite">
              <ShieldCheck size={32} />
              <h2>Policy v{p.version} is now active.</h2>
              <p>
                The next booking uses the rule members approved. Existing
                receipts keep their original policy.
              </p>
              <Link className="text-link" href="/demo">
                Return to the dispatch lab <ArrowRight size={16} />
              </Link>
              <Button
                variant="outline"
                onClick={() =>
                  setState((s) => ({ ...s, proposal: propose(s.active) }))
                }
              >
                Draft the next version
              </Button>
            </div>
          ) : (
            <>
              <Choice
                label="Proposal preset"
                value={preset}
                values={[
                  'Balanced',
                  'Worker opportunity',
                  'Customer speed',
                  'Net livelihood',
                  'Custom',
                ]}
                change={pickPreset}
              />
              <div className="proposal-fields">
                <label>
                  Weekly net-livelihood floor (₹)
                  <input
                    type="number"
                    min="0"
                    max="15000"
                    step="500"
                    value={p.parameters.floor}
                    onChange={(e) =>
                      amend({
                        parameters: {
                          ...p.parameters,
                          floor: Math.min(
                            15000,
                            Math.max(0, Number(e.target.value)),
                          ),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Maximum additional ETA (min)
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={p.parameters.maxDelay}
                    onChange={(e) =>
                      amend({
                        parameters: {
                          ...p.parameters,
                          maxDelay: Math.min(
                            15,
                            Math.max(0, Number(e.target.value)),
                          ),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Service radius (km)
                  <input
                    type="number"
                    min="1"
                    max="8"
                    step="0.5"
                    value={p.constraints.radius}
                    onChange={(e) =>
                      amend({
                        constraints: {
                          ...p.constraints,
                          radius: Math.min(
                            8,
                            Math.max(1, Number(e.target.value)),
                          ),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Customer SLA (min)
                  <input
                    type="number"
                    min="10"
                    max="35"
                    value={p.constraints.sla}
                    onChange={(e) =>
                      amend({
                        constraints: {
                          ...p.constraints,
                          sla: Math.min(
                            35,
                            Math.max(10, Number(e.target.value)),
                          ),
                        },
                      })
                    }
                  />
                </label>
              </div>
              <p className="fine">
                {p.parameters.netPriority
                  ? 'When weekly net ties, prefer higher net job contribution before ETA.'
                  : 'When weekly net ties, prefer lower ETA.'}{' '}
                Emergency priority stays enabled.
              </p>
              <Button
                className="primary-action"
                onClick={() => {
                  setState((s) => ({
                    ...s,
                    proposal: simulateProposal(
                      s.proposal,
                      s.active,
                      data.jobs,
                      data.workers,
                      s.rates,
                    ),
                  }));
                }}
              >
                Simulate before voting
              </Button>
              {p.simulation && twin && (
                <div className="simulation-impact">
                  <h3>What would change?</h3>
                  <p className="muted">
                    Current v{state.active.version} compared with proposed v
                    {p.version}. Same starting state.
                  </p>
                  <Tradeoff
                    a={p.simulation.current}
                    b={p.simulation.proposed}
                    basis={`vs. active policy (v${state.active.version})`}
                  />
                  {p.simulation.proposed.fulfilled < 100 && (
                    <p className="inline-warning">
                      {100 - p.simulation.proposed.fulfilled} jobs have no
                      eligible worker. Review radius, wait and SLA before
                      voting.
                    </p>
                  )}
                  <details>
                    <summary>Customer and worker outcomes</summary>
                    <MetricsTable
                      a={p.simulation.current}
                      b={p.simulation.proposed}
                      labels={[
                        `Current v${state.active.version}`,
                        `Proposed v${p.version}`,
                      ]}
                    />
                  </details>
                  <details>
                    <summary>Who gains? Who gives up opportunity?</summary>
                    <WorkerBars
                      labels={[
                        `Current v${state.active.version}`,
                        `Proposed v${p.version}`,
                      ]}
                      a={cooperative}
                      b={twin}
                      done
                      onWorker={(id) =>
                        setReceipt(
                          twin.receipts.find((r) => r.selected === id) ??
                            twin.receipts[0],
                        )
                      }
                    />
                  </details>
                  <div className="vote-box">
                    <h3>One member, one vote</h3>
                    <p>
                      12 eligible worker-members. Quorum: 9 votes. Approval: at
                      least 7 support.
                    </p>
                    {p.status === 'simulated' ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setState((s) => ({
                            ...s,
                            proposal: openVote(s.proposal),
                          }))
                        }
                      >
                        Open member vote
                      </Button>
                    ) : (
                      <>
                        <div className="vote-count">
                          <span>
                            <b>{supports}</b> support
                          </span>
                          <span>
                            <b>{opposes}</b> oppose
                          </span>
                          <span>
                            <b>{12 - supports - opposes}</b> have not voted
                          </span>
                        </div>
                        <p className="fine">
                          Demo ballot includes eight seeded member votes. You
                          vote as Meena (W01).
                        </p>
                        {p.status === 'approved' ? (
                          <>
                            <p className="approved">
                              <Check size={18} />
                              Quorum reached. Members approved this
                              constitution.
                            </p>
                            <Button
                              className="primary-action"
                              onClick={() => {
                                const active = activate(
                                  p,
                                  new Date().toISOString(),
                                );
                                setState((s) => ({
                                  ...s,
                                  active,
                                  proposal: active,
                                  compared: true,
                                  history: [
                                    ...s.history.map((h) => ({
                                      ...h,
                                      status: 'expired' as const,
                                    })),
                                    active,
                                  ],
                                }));
                                setNotice(
                                  `Policy v${active.version} is now active.`,
                                );
                              }}
                            >
                              Activate policy v{p.version}
                            </Button>
                          </>
                        ) : p.votes.W01 ? (
                          <p aria-live="polite">
                            Your vote is recorded. This proposal has not reached
                            7 supporting members. Revise and re-simulate to open
                            a fresh ballot.
                          </p>
                        ) : (
                          <div className="button-row">
                            <Button
                              onClick={() =>
                                setState((s) => ({
                                  ...s,
                                  proposal: vote(s.proposal, 'W01', 'support'),
                                }))
                              }
                            >
                              Cast demo vote: support
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                setState((s) => ({
                                  ...s,
                                  proposal: vote(s.proposal, 'W01', 'oppose'),
                                }))
                              }
                            >
                              Oppose
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <ReceiptDialog receipt={receipt} close={() => setReceipt(null)} />
    </Shell>
  );
}

export function AppealDialog({
  caseId,
  close,
}: {
  caseId: string | null;
  close: () => void;
}) {
  const { state, setState } = useApp();
  const item = state.appeals.find((a) => a.id === caseId);
  if (!item) return null;
  const update = (fn: (a: Appeal) => Appeal) =>
    setState((s) => ({
      ...s,
      appeals: s.appeals.map((a) => (a.id === item.id ? fn(a) : a)),
    }));
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="receipt-dialog appeal-dialog">
        <DialogTitle>Replay Court</DialogTitle>
        <DialogDescription>
          {item.id} / {state.active && item.workerId} cancellation decision /
          frozen policy v{item.frozen.policyVersion}
        </DialogDescription>
        <div className="appeal-event">
          <Scale />
          <div>
            <h3>
              {item.frozen.penalty
                ? 'A cancellation counted against the worker.'
                : 'A cancellation was attributed to the customer.'}
            </h3>
            <p>
              {item.jobId} / {item.frozen.penalty} reliability penalty recorded
            </p>
          </div>
        </div>
        <ol className="event-timeline">
          <li>
            <span>Departure</span>
            <strong>
              {item.frozen.departed === null
                ? 'Evidence missing'
                : item.frozen.departed
                  ? item.frozen.departedAt
                  : 'Worker had not departed'}
            </strong>
          </li>
          <li>
            <span>Cancellation</span>
            <strong>
              {item.frozen.actor} initiated / {item.frozen.cancelledAt}
            </strong>
          </li>
          <li>
            <span>Constitution v{item.frozen.policyVersion}</span>
            <strong>
              Customer cancellation after departure must not reduce worker
              reliability.
            </strong>
          </li>
        </ol>
        {item.result ? (
          <div
            className={`replay-result ${item.status === 'review' ? 'review' : ''}`}
            aria-live="polite"
          >
            <ShieldCheck />
            <h2>{item.result}</h2>
            <p>{item.reason}</p>
            <dl>
              <div>
                <dt>Worker penalty now</dt>
                <dd>{item.penalty}</dd>
              </div>
              <div>
                <dt>Cancellation attributed to</dt>
                <dd>{item.attribution}</dd>
              </div>
              <div>
                <dt>Case status</dt>
                <dd>
                  {item.status === 'review'
                    ? 'Awaiting committee review'
                    : 'Closed'}
                </dd>
              </div>
            </dl>
          </div>
        ) : item.status === 'recorded' ? (
          <>
            <p>
              The event record is preserved. Challenge the penalty to check it
              against the constitution in force.
            </p>
            <Button
              className="primary-action"
              onClick={() => update(challenge)}
            >
              Challenge decision
            </Button>
          </>
        ) : (
          <>
            <p className="approved">
              <Check size={18} />
              Challenge filed. Frozen evidence is ready for replay.
            </p>
            <Button className="primary-action" onClick={() => update(replay)}>
              Replay decision
            </Button>
          </>
        )}
        <details>
          <summary>Inspect frozen evidence</summary>
          <pre>{JSON.stringify(item.frozen, null, 2)}</pre>
        </details>
        <Link className="text-link" href="/demo/governance">
          Next: test a constitution change <ArrowRight size={16} />
        </Link>
      </DialogContent>
    </Dialog>
  );
}

export function WorkerView() {
  const { state, setState, cooperative } = useApp();
  const [receipt, setReceipt] = useState<Receipt | null>(null),
    [caseId, setCaseId] = useState<string | null | undefined>(undefined),
    [memberId, setMemberId] = useState<string | null>(null);
  const search = useSearchParams();
  const meena =
    cooperative.workers.find(
      (w) => w.id === (memberId ?? search.get('member')),
    ) ?? cooperative.workers[0];
  const assigned = cooperative.receipts.filter((r) => r.selected === meena.id);
  const today = assigned.filter(
    (r) => Math.floor(r.job.requested / 1440) === 4,
  );
  const skipped = cooperative.receipts
    .filter(
      (r) =>
        r.selected !== meena.id &&
        r.candidates.find((c) => c.worker.id === meena.id)?.failed.length === 0,
    )
    .slice(-4);
  const bookingJobs = state.bookings.filter(
    (b) => b.receipt.selected === meena.id,
  );
  return (
    <Shell>
      <div className="worker-page">
        <PageHeading
          title={`Good afternoon, ${meena.name.split(' ')[0]}.`}
          text="Your work, your livelihood, your right to know."
        />
        <div className="member-switch">
          <Choice
            label="Demo worker-member"
            value={meena.name}
            values={cooperative.workers.map((w) => w.name)}
            change={(name) =>
              setMemberId(cooperative.workers.find((w) => w.name === name)!.id)
            }
          />
        </div>
        <div className="worker-layout">
          <section>
            <div className="section-heading">
              <h2>Friday’s work</h2>
              <span className="tag">4 September / sample week</span>
            </div>
            {today.length ? (
              today.map((r) => (
                <JobTicket
                  key={r.id}
                  receipt={r}
                  inspect={() => setReceipt(r)}
                />
              ))
            ) : (
              <div className="empty-state">
                No assignments on Friday. Your opportunity history below covers
                the full sample week.
              </div>
            )}
            {bookingJobs.length > 0 && (
              <>
                <h2 className="space-top">New bookings</h2>
                {bookingJobs.map((b) => (
                  <article className="job-ticket" key={b.job.id}>
                    <h3>
                      {b.job.category} / {zones[b.job.zone]}
                    </h3>
                    <p>
                      {b.job.status} / {b.job.id}
                    </p>
                    {b.job.status === 'assigned' && (
                      <div className="button-row">
                        <Button
                          variant="outline"
                          disabled={b.departed}
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              bookings: s.bookings.map((x) =>
                                x.job.id === b.job.id
                                  ? {
                                      ...x,
                                      departed: true,
                                      departedAt: new Date().toISOString(),
                                    }
                                  : x,
                              ),
                            }))
                          }
                        >
                          {b.departed
                            ? 'Departure recorded'
                            : 'Start travelling'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              bookings: s.bookings.map((x) =>
                                x.job.id === b.job.id
                                  ? {
                                      ...x,
                                      job: { ...x.job, status: 'completed' },
                                    }
                                  : x,
                              ),
                            }))
                          }
                        >
                          Complete job
                        </Button>
                      </div>
                    )}
                    <button
                      className="text-link"
                      onClick={() => setReceipt(b.receipt)}
                    >
                      View assignment receipt
                    </button>
                  </article>
                ))}
              </>
            )}
            <div className="section-heading space-top">
              <h2>Decisions you can review</h2>
              <Scale size={20} />
            </div>
            {state.appeals
              .filter((a) => a.workerId === meena.id)
              .map((a) => (
                <button
                  className="case-row"
                  key={a.id}
                  onClick={() => setCaseId(a.id)}
                >
                  <span>
                    <strong>{a.jobId}</strong>
                    <small>
                      {a.result ??
                        (a.frozen.actor === 'unknown'
                          ? 'Missing cancellation evidence'
                          : a.frozen.penalty
                            ? 'Cancellation reliability penalty'
                            : 'Customer cancellation, no penalty')}
                    </small>
                  </span>
                  <span className="tag">{a.status}</span>
                  <ArrowRight size={16} />
                </button>
              ))}
          </section>
          <aside>
            <div className="livelihood-panel">
              <span>This sample week</span>
              <strong>{money(meena.net)}</strong>
              <p>Illustrative net livelihood</p>
              <dl>
                <div>
                  <dt>Gross booking value</dt>
                  <dd>{money(meena.gross)}</dd>
                </div>
                <div>
                  <dt>Travel, time & consumables</dt>
                  <dd>−{money(meena.gross - meena.net)}</dd>
                </div>
                <div>
                  <dt>Jobs allocated</dt>
                  <dd>{meena.jobs}</dd>
                </div>
              </dl>
              <div className="floor-marker">
                Member-approved floor{' '}
                <b>{money(state.active.parameters.floor)}</b>
              </div>
              <p className="fine">
                An allocation preference, not a guaranteed wage. Policy v
                {state.active.version} protects customer commitments first.
              </p>
            </div>
            <div className="quiet-panel">
              <ShieldCheck />
              <h3>Your membership</h3>
              <p>
                {meena.id} / verified in{' '}
                {meena.skills.join(' and ').toLowerCase()}
              </p>
              <Link className="text-link" href="/demo/governance">
                Take part in the next vote
              </Link>
            </div>
          </aside>
        </div>
        <details className="all-metrics">
          <summary>
            Opportunity history / {assigned.length} assigned jobs
          </summary>
          {assigned.map((r) => (
            <button
              className="history-button"
              key={r.id}
              onClick={() => setReceipt(r)}
            >
              <span>
                {r.job.id} / {r.job.category}
              </span>
              <span>{money(r.job.payout)} / View receipt</span>
            </button>
          ))}
        </details>
        <details className="all-metrics">
          <summary>Why was I skipped? / eligible opportunities</summary>
          {skipped.map((r) => (
            <button
              className="history-button"
              key={r.id}
              onClick={() => setReceipt(r)}
            >
              <span>
                {r.job.id} / {zones[r.job.zone]}
              </span>
              <span>Inspect the selected worker and rule</span>
            </button>
          ))}
          {!skipped.length && (
            <p>No eligible skipped opportunities in this sample.</p>
          )}
        </details>
      </div>
      <ReceiptDialog receipt={receipt} close={() => setReceipt(null)} />
      <AppealDialog
        caseId={
          caseId === undefined
            ? search.has('challenge')
              ? 'CASE-KMS-C1048'
              : null
            : caseId
        }
        close={() => setCaseId(null)}
      />
    </Shell>
  );
}
function JobTicket({
  receipt: r,
  inspect,
}: {
  receipt: Receipt;
  inspect: () => void;
}) {
  const c = r.candidates.find((c) => c.worker.id === r.selected)!;
  const min = r.job.requested % 1440;
  return (
    <article className="job-ticket">
      <div className="ticket-time">
        <Clock size={16} />
        {`${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`}
        <span>{r.job.duration} min service</span>
      </div>
      <h3>{r.job.category}</h3>
      <p>
        {zones[r.job.zone]} / {r.job.id}
      </p>
      <div className="job-payout">
        <strong>{money(r.job.payout)}</strong> gross{' '}
        <span>{money(c.net)} estimated net</span>
      </div>
      <button className="text-link" onClick={inspect}>
        <FileText size={16} />
        View why this job was assigned
      </button>
    </article>
  );
}

export function CustomerView() {
  const { state, setState, setNotice, data } = useApp();
  const [service, setService] = useState<Service>('Electrician'),
    [zone, setZone] = useState('Kharadi'),
    [time, setTime] = useState('11:30'),
    [requirement, setRequirement] = useState(
      'Ceiling fan wiring needs checking',
    ),
    [error, setError] = useState(''),
    [invoice, setInvoice] = useState<Booking | null>(null);
  const price = [680, 720, 900, 780, 850][services.indexOf(service)];
  const book = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const requested =
      7 * 1440 + Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const job: Job = {
      id: `KMS-B${String(state.bookings.length + 1).padStart(3, '0')}`,
      category: service,
      customer: 'Demo household',
      zone: zones.indexOf(zone),
      payout: price,
      duration: 60,
      requested,
      sla: 35,
      emergency: false,
      consumables: 45,
      cancellationLoss: 0,
      status: 'requested',
      requirement: requirement.trim(),
    };
    const receipt = dispatchBooking(
      job,
      data.workers,
      state.bookings,
      state.active,
      state.rates,
    );
    if (!receipt.selected) {
      setError(
        'No eligible worker for this time and locality. Choose another time or service.',
      );
      return;
    }
    setState((s) => ({
      ...s,
      bookings: [
        {
          job: { ...job, status: 'assigned' },
          receipt,
          departed: false,
          departedAt: null,
          paid: false,
        },
        ...s.bookings,
      ],
    }));
    setError('');
    setNotice('Booking confirmed. Your worker and arrival estimate are below.');
  };
  const cancel = (b: Booking) => {
    const item = cancellationCase(
      'customer',
      b.departed,
      0,
      b.job.id,
      b.receipt.selected!,
      b.receipt.policy.version,
    );
    item.frozen.cancelledAt = new Date().toISOString();
    item.frozen.departedAt = b.departedAt;
    item.frozen.job = structuredClone({ ...b.job, status: 'cancelled' });
    item.frozen.policy = structuredClone(b.receipt.policy);
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((x) =>
        x.job.id === b.job.id
          ? { ...x, job: { ...x.job, status: 'cancelled' } }
          : x,
      ),
      appeals: [...s.appeals, item],
    }));
    setNotice(
      'Booking cancelled by customer. No worker reliability penalty applied.',
    );
  };
  return (
    <Shell>
      <PageHeading
        title="A skilled pair of hands."
        text="Book a verified member of the Pune service cooperative."
      />
      <div className="customer-layout">
        <section className="booking-panel">
          <div className="section-heading">
            <Wrench />
            <h2>What needs doing?</h2>
          </div>
          <form onSubmit={book}>
            <Choice
              label="Service"
              value={service}
              values={[...services]}
              change={(v) => setService(v as Service)}
            />
            <div className="form-pair">
              <Choice
                label="Locality"
                value={zone}
                values={zones}
                change={setZone}
              />
              <Choice
                label="Time on 7 September"
                value={time}
                values={['09:00', '11:30', '14:00', '16:30']}
                change={setTime}
              />
            </div>
            <label className="field">
              Tell the worker what to expect
              <textarea
                required
                maxLength={250}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
              />
            </label>
            <div className="price-line">
              <span>
                One-hour service visit
                <br />
                <small>Includes ₹45 illustrative consumables</small>
              </span>
              <strong>{money(price)}</strong>
            </div>
            <p className="fine">
              Parts beyond the visit are agreed before work starts. This is a
              local demo booking; no money is collected.
            </p>
            {error && (
              <p className="inline-warning" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="primary-action">
              Find worker
            </Button>
          </form>
        </section>
        <section className="booking-history">
          <h2>Your bookings</h2>
          {!state.bookings.length && (
            <div className="empty-state">
              <Clock />
              <h3>Your next visit starts here.</h3>
              <p>
                Choose a service and time. We’ll check verified skills,
                availability and arrival time.
              </p>
            </div>
          )}
          {state.bookings.map((b) => {
            const c = b.receipt.candidates.find(
              (c) => c.worker.id === b.receipt.selected,
            )!;
            return (
              <article className="job-ticket" key={b.job.id}>
                <div className="section-heading">
                  <h3>{b.job.category}</h3>
                  <span className="tag">{b.job.status}</span>
                </div>
                <p>
                  {zones[b.job.zone]} / {b.job.id}
                </p>
                <div className="assigned-member">
                  <span className="initials">
                    {c.worker.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                  <div>
                    <strong>{c.worker.name}</strong>
                    <small>
                      Verified member / {c.worker.rating.toFixed(1)} service
                      rating
                    </small>
                  </div>
                  <ShieldCheck size={18} />
                </div>
                <p>
                  {b.job.status === 'assigned' ? (
                    <>
                      <strong>{c.eta} min estimated arrival</strong> from your
                      scheduled time. {money(b.job.payout)} total.
                    </>
                  ) : b.job.status === 'cancelled' ? (
                    'Visit cancelled. No payment collected.'
                  ) : (
                    <>
                      <strong>Service completed.</strong> {money(b.job.payout)}{' '}
                      total.
                    </>
                  )}
                </p>
                <p className="fine">
                  7 September,{' '}
                  {`${Math.floor((b.job.requested % 1440) / 60)}:${String(b.job.requested % 60).padStart(2, '0')}`}{' '}
                  /{' '}
                  {b.departed
                    ? 'Worker departure recorded'
                    : 'Worker has not departed'}
                </p>
                {b.job.status === 'assigned' && (
                  <Button variant="outline" onClick={() => cancel(b)}>
                    Cancel booking
                  </Button>
                )}
                {b.job.status === 'completed' && !b.paid && (
                  <Button
                    onClick={() => {
                      setState((s) => ({
                        ...s,
                        bookings: s.bookings.map((x) =>
                          x.job.id === b.job.id ? { ...x, paid: true } : x,
                        ),
                      }));
                      setNotice(
                        'Demo payment recorded. No money was collected.',
                      );
                    }}
                  >
                    Record demo payment
                  </Button>
                )}
                {b.job.status !== 'cancelled' && (
                  <button
                    className="text-link invoice-link"
                    onClick={() => setInvoice(b)}
                  >
                    View {b.paid ? 'paid invoice' : 'booking estimate'}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      </div>
      <Dialog
        open={!!invoice}
        onOpenChange={(v) => {
          if (!v) setInvoice(null);
        }}
      >
        <DialogContent className="receipt-dialog">
          <DialogTitle>
            {invoice?.paid ? 'Demo invoice' : 'Booking estimate'}
          </DialogTitle>
          <DialogDescription>
            No real payment or tax invoice is issued by this prototype.
          </DialogDescription>
          {invoice && (
            <>
              <h3>
                {invoice.job.id} / {invoice.job.category}
              </h3>
              <p>
                Service visit: {money(invoice.job.payout - 45)}
                <br />
                Consumables: ₹45
                <br />
                <strong>Total: {money(invoice.job.payout)}</strong>
              </p>
              <p>
                {invoice.paid
                  ? 'Demo payment recorded.'
                  : 'Pay after the service is completed.'}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

export function Operations() {
  const { state, data, cooperative } = useApp();
  const [caseId, setCaseId] = useState<string | null>(null);
  return (
    <Shell>
      <PageHeading
        title="The cooperative work register."
        text="Service commitments, member verification and decisions needing attention."
      />
      <div className="operations-summary">
        <span>
          <strong>{data.workers.filter((w) => w.verified).length}/12</strong>{' '}
          verified members
        </span>
        <span>
          <strong>{cooperative.metrics.fulfilled}/100</strong> sample jobs
          served
        </span>
        <span>
          <strong>
            {state.appeals.filter((a) => a.status !== 'closed').length}
          </strong>{' '}
          decisions to review
        </span>
        <span>
          <strong>{state.bookings.length}</strong> new demo bookings
        </span>
      </div>
      <div className="operations-layout">
        <section className="surface">
          <h2>Member and service coverage</h2>
          {data.workers.map((w) => (
            <div className="member-line" key={w.id}>
              <div>
                <strong>{w.name}</strong>
                <small>{w.skills.join(', ')}</small>
              </div>
              <span>{zones[w.zone]}</span>
              <span className="verified">
                <ShieldCheck size={15} />
                Verified
              </span>
            </div>
          ))}
        </section>
        <div>
          <section className="surface">
            <h2>Decisions needing attention</h2>
            {state.appeals
              .filter((a) => a.status !== 'closed')
              .map((a) => (
                <button
                  className="case-row"
                  key={a.id}
                  onClick={() => setCaseId(a.id)}
                >
                  <span>
                    <strong>{a.jobId}</strong>
                    <small>
                      {a.status === 'review'
                        ? 'Committee review: incomplete evidence'
                        : 'Cancellation attribution'}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            {state.appeals.every((a) => a.status === 'closed') && (
              <p>No open challenges.</p>
            )}
          </section>
          <section className="surface space-top">
            <h2>Pune service areas</h2>
            <p className="fine">
              Illustrative zones; distances are deterministic estimates, not
              live navigation.
            </p>
            <div className="zone-list">
              {zones.map((z, i) => (
                <div key={z}>
                  <span>{z}</span>
                  <strong>
                    {data.jobs.filter((j) => j.zone === i).length} jobs
                  </strong>
                </div>
              ))}
            </div>
          </section>
          <section className="quiet-panel">
            <h3>Beyond one cooperative</h3>
            <p>
              A nearby cooperative could accept overflow plumbing demand under
              its own member-approved rules. This prototype models local
              governance only; no national exchange is connected.
            </p>
          </section>
        </div>
      </div>
      <AppealDialog caseId={caseId} close={() => setCaseId(null)} />
    </Shell>
  );
}
