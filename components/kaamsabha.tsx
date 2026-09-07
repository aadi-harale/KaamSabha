'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CircleHelp,
  FileText,
  Play,
  RotateCcw,
  Scale,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useApp } from '@/lib/store';
import {
  replayAssignment,
  simulate,
  baseline,
  propose,
  zones,
  type Metrics,
  type Receipt,
  type Simulation,
} from '@/lib/engine';
import { DispatchDecisionMap } from '@/components/dispatch-map';
export const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
export const signed = (n: number, unit = '') =>
  `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}${unit}`;
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { state, notice, reset, setState, setNotice } = useApp();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to work area
      </a>
      <header className="app-header">
        <Link className="brand" href="/demo">
          <span className="brand-mark">
            <Users size={22} />
          </span>
          <span>
            KAAMSABHA<small>Worker-owned. Member-governed.</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {[
            ['/demo', 'Dispatch lab'],
            ['/demo/worker', 'My work'],
            ['/demo/customer', 'Book a service'],
            ['/demo/governance', 'Our rules'],
            ['/demo/operations', 'Operations'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href || (path === '/' && href === '/demo')
                  ? 'page'
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className="demo-badge">SIH26089 prototype</span>
      </header>
      <div className="workspace-meta">
        <span>
          Pune service cooperative{' '}
          <span className="muted">/ illustrative workspace</span>
        </span>
        <Link href="/demo/governance">
          <span className="status-dot" />
          Policy v{state.active.version} active
        </Link>
      </div>
      <main id="main">{children}</main>
      <footer>
        <span>
          Synthetic illustrative Pune dataset. No live jobs or payments.
        </span>
        <details className="demo-controls">
          <summary>Demo controls</summary>
          <div className="control-panel">
            <Button variant="outline" onClick={reset}>
              <RotateCcw />
              Reset demo
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setState((s) => ({ ...s, compared: false }));
                setNotice('Standard dispatch loaded.');
              }}
            >
              Run baseline
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setState((s) => ({ ...s, compared: true }));
                setNotice('Constitution dispatch complete.');
              }}
            >
              Run constitution
            </Button>
            <Link href="/demo/worker?challenge=true">Load challenge</Link>
            <Link href="/demo/governance">Load policy vote</Link>
            <p>Illustrative cooperative operating assumptions</p>
            <label>
              Travel cost, ₹ per km
              <input
                type="number"
                min="0"
                max="30"
                step="1"
                value={state.rates.perKm}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    rates: {
                      ...s.rates,
                      perKm: Math.min(30, Math.max(0, Number(e.target.value))),
                    },
                    proposal: {
                      ...(s.proposal.status === 'active'
                        ? propose(s.active)
                        : s.proposal),
                      status: 'draft',
                      votes: {},
                      simulation: null,
                    },
                  }))
                }
              />
            </label>
            <label>
              Unpaid travel, ₹ per minute
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={state.rates.perMinute}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    rates: {
                      ...s.rates,
                      perMinute: Math.min(
                        10,
                        Math.max(0, Number(e.target.value)),
                      ),
                    },
                    proposal: {
                      ...(s.proposal.status === 'active'
                        ? propose(s.active)
                        : s.proposal),
                      status: 'draft',
                      votes: {},
                      simulation: null,
                    },
                  }))
                }
              />
            </label>
          </div>
        </details>
      </footer>
      {notice && (
        <div className="notice" aria-live="polite">
          {notice}
          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
export function MetricsTable({
  a,
  b,
  labels = ['Standard', 'Constitution'],
}: {
  a: Metrics;
  b: Metrics;
  labels?: string[];
}) {
  const rows: [string, keyof Metrics, string][] = [
    ['Average ETA', 'avgEta', 'min'],
    ['90th percentile ETA', 'p90Eta', 'min'],
    ['Round-trip travel / job', 'avgTravel', 'km'],
    ['Jobs fulfilled / 100', 'fulfilled', ''],
    ['SLA violations', 'slaViolations', ''],
    ['Median member livelihood', 'median', '₹'],
    ['Bottom decile livelihood¹', 'bottomDecile', '₹'],
    ['Lowest member livelihood', 'lowest', '₹'],
    ['Highest member livelihood', 'highest', '₹'],
    ['Highest–lowest gap', 'gap', '₹'],
    ['Total net livelihood', 'net', '₹'],
  ];
  return (
    <div className="metric-table">
      <table aria-label="Calculated simulation metrics">
        <thead>
          <tr>
            <th scope="col">Calculated outcome</th>
            <th scope="col">{labels[0]}</th>
            <th scope="col">{labels[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, key, unit]) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              {[a, b].map((m, i) => (
                <td key={i}>
                  {unit === '₹'
                    ? money(m[key])
                    : `${Number(m[key].toFixed(1))} ${unit}`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fine">
        ¹ Mean of the lowest two members (ceil of 10% of 12). Earnings are
        illustrative net livelihood.
      </p>
    </div>
  );
}
export function Tradeoff({
  a,
  b,
  basis = 'vs. standard dispatch',
}: {
  a: Metrics;
  b: Metrics;
  basis?: string;
}) {
  return (
    <div className="tradeoff" aria-live="polite">
      <div>
        <span>Customer wait</span>
        <strong>
          {signed(b.avgEta - a.avgEta)} <small>min</small>
        </strong>
        <p>average arrival time</p>
      </div>
      <div>
        <span>Lowest weekly livelihood</span>
        <strong>
          {b.lowest - a.lowest >= 0 ? '+' : '−'}
          {money(Math.abs(b.lowest - a.lowest))}
        </strong>
        <p>
          {money(a.lowest)} to {money(b.lowest)} net
        </p>
        <p className="metric-basis">{basis}</p>
      </div>
      <div>
        <span>Service commitment</span>
        <strong>
          {b.slaViolations - a.slaViolations} <small>extra</small>
        </strong>
        <p>SLA violations ({b.fulfilled}/100 served)</p>
      </div>
    </div>
  );
}
export function ReceiptDialog({
  receipt,
  close,
}: {
  receipt: Receipt | null;
  close: () => void;
}) {
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const verified = verifiedId === receipt?.id;
  if (!receipt) return null;
  const selected = receipt.candidates.find(
    (c) => c.worker.id === receipt.selected,
  );
  const fastestEta =
    receipt.candidates.find((c) => c.worker.id === receipt.fastest)?.eta ?? 0;
  const exportReceipt = structuredClone(receipt) as Receipt & {
    job: Receipt['job'] & { requestedAtMinutesSince2026_08_31_IST?: number };
  };
  exportReceipt.job.requestedAtMinutesSince2026_08_31_IST =
    exportReceipt.job.requested;
  delete (exportReceipt.job as Partial<Receipt['job']>).requested;
  return (
    <Dialog
      open={!!receipt}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="receipt-dialog">
        <DialogTitle>Why this assignment?</DialogTitle>
        <DialogDescription>
          Decision receipt {receipt.id}. Frozen inputs, reproducible rules.
        </DialogDescription>
        <div className="ticket-heading">
          <Wrench />
          <div>
            <h3>
              {receipt.job.category} in {zones[receipt.job.zone]}
            </h3>
            <p>
              {receipt.job.id} / {money(receipt.job.payout)} payout /{' '}
              {receipt.job.emergency ? 'Emergency' : 'Scheduled service'}
            </p>
          </div>
          <span className="tag">Policy v{receipt.policy.version}</span>
        </div>
        <div className="rule-explanation">
          <ShieldCheck />
          <p>{receipt.reason}</p>
        </div>
        <DispatchDecisionMap receipt={receipt} mode="decision" />
        <div className="receipt-candidates">
          {[...receipt.candidates]
            .sort(
              (a, b) =>
                Number(b.worker.id === receipt.selected) -
                  Number(a.worker.id === receipt.selected) ||
                a.failed.length - b.failed.length,
            )
            .slice(0, 4)
            .map((c) => (
              <div
                key={c.worker.id}
                className={`candidate ${c.worker.id === receipt.selected ? 'selected' : ''}`}
              >
                <div>
                  <strong>{c.worker.name}</strong>
                  <span>
                    {c.worker.id === receipt.selected
                      ? 'Selected'
                      : c.failed.length
                        ? 'Ineligible'
                        : 'Eligible, not selected'}
                  </span>
                </div>
                <p>
                  {c.failed.length
                    ? c.failed.join(', ')
                    : c.eta - fastestEta > receipt.policy.parameters.maxDelay &&
                        receipt.policy.parameters.floor > 0
                      ? `Hard constraints passed. +${c.eta - fastestEta} min exceeds the ${receipt.policy.parameters.maxDelay}-minute opportunity limit.`
                      : 'Skill matched; active; available; schedule, radius and SLA passed'}
                </p>
                <div className="candidate-numbers">
                  <span>{c.distance} km</span>
                  <span>{c.eta} min ETA</span>
                  <span>{money(c.worker.net)} weekly net before</span>
                  <span>{money(c.net)} job net</span>
                </div>
              </div>
            ))}
        </div>
        <details>
          <summary>
            All {receipt.candidates.length} candidate eligibility checks
          </summary>
          {receipt.candidates.map((c) => (
            <p className="fine" key={c.worker.id}>
              <strong>{c.worker.name}:</strong>{' '}
              {c.failed.length
                ? c.failed.join(', ')
                : 'All hard constraints passed'}{' '}
              / {c.eta} min ETA / {money(c.worker.net)} net before allocation
            </p>
          ))}
        </details>
        {selected && (
          <details>
            <summary>Net-livelihood calculation</summary>
            <p>
              {money(receipt.job.payout)} payout −{' '}
              {money(selected.costs.travel)} return travel −{' '}
              {money(selected.costs.time)} unpaid travel time −{' '}
              {money(selected.costs.consumables)} consumables −{' '}
              {money(selected.costs.cancellation)} cancellation loss ={' '}
              <strong>{money(selected.net)}</strong>.
            </p>
            <p className="fine">
              Frozen assumptions: ₹{receipt.assumptions.perKm}/km and ₹
              {receipt.assumptions.perMinute}/minute. Illustrative, not official
              wage rates.
            </p>
          </details>
        )}
        <details>
          <summary>Exact policy and snapshot</summary>
          <p>
            Floor {money(receipt.policy.parameters.floor)}, extra wait{' '}
            {receipt.policy.parameters.maxDelay} min, radius{' '}
            {receipt.policy.constraints.radius} km, SLA{' '}
            {receipt.policy.constraints.sla} min. Recorded {receipt.timestamp}.
          </p>
          <p className="fine">{receipt.tieBreak}</p>
          <pre>{JSON.stringify(exportReceipt, null, 2)}</pre>
          <p className="fine">
            requestedAtMinutesSince2026_08_31_IST is the service minute offset
            from 31 August 2026 00:00 India Standard Time.
          </p>
        </details>
        <Button
          variant="outline"
          onClick={() =>
            setVerifiedId(
              replayAssignment(receipt).selected === receipt.selected
                ? receipt.id
                : null,
            )
          }
        >
          {verified ? <Check /> : <RotateCcw />}
          {verified
            ? 'Replay matches the recorded assignment'
            : 'Verify assignment replay'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
export function WorkerBars({
  a,
  b,
  done,
  onWorker,
  compact = false,
  labels = ['Standard dispatch', 'Cooperative constitution'],
}: {
  a: Simulation;
  b: Simulation;
  done: boolean;
  onWorker: (id: string) => void;
  compact?: boolean;
  labels?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(
    ...a.workers.map((w) => w.net),
    ...b.workers.map((w) => w.net),
  );
  return (
    <div
      className="worker-register"
      aria-label={`Weekly illustrative net livelihood by worker. Slate bars show ${labels[0]}, teal bars show ${labels[1]}.`}
    >
      <div className="register-head">
        <span>Worker-member</span>
        <span>
          <i className="legend standard" />
          {labels[0]}
        </span>
        <span>
          <i className="legend cooperative" />
          {labels[1]}
        </span>
      </div>
      {(compact && !expanded ? a.workers.slice(0, 3) : a.workers).map((w) => {
        const next = b.workers.find((n) => n.id === w.id)!;
        return (
          <button
            className={`worker-row ${w.id === 'W01' ? 'featured-worker' : ''}`}
            key={w.id}
            onClick={() => onWorker(w.id)}
            aria-label={`Inspect ${w.name}. ${labels[0]} ${money(w.net)}, ${w.jobs} jobs. ${labels[1]} ${done ? `${money(next.net)}, ${next.jobs} jobs` : 'not yet run'}`}
          >
            <span className="worker-identity">
              <span className="initials">
                {w.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </span>
              <span>
                <strong>{w.name}</strong>
                <small>{w.skills[0]}</small>
              </span>
              <FileText size={15} />
            </span>
            <span className="bar-cell" data-label={labels[0].split(' ')[0]}>
              <span className="bar-caption">
                <b>{money(w.net)}</b>
                <small>
                  {w.jobs} {w.jobs === 1 ? 'job' : 'jobs'}
                </small>
              </span>
              <span className="bar-track">
                <span
                  className="bar-fill standard"
                  style={{ width: `${(w.net / max) * 100}%` }}
                />
              </span>
            </span>
            <span
              className="bar-cell"
              data-label={
                labels[1] === 'Cooperative constitution'
                  ? 'Constitution'
                  : labels[1].split(' ')[0]
              }
            >
              <span className="bar-caption">
                <b>{done ? money(next.net) : 'Waiting to run'}</b>
                <small>{done ? `${next.jobs} jobs` : ''}</small>
              </span>
              <span className="bar-track">
                <span
                  className="bar-fill cooperative"
                  style={{ width: done ? `${(next.net / max) * 100}%` : '0%' }}
                />
              </span>
            </span>
          </button>
        );
      })}
      {compact && (
        <button
          className="expand-register"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? 'Show the three featured members'
            : 'View all 12 worker-members'}
        </button>
      )}
    </div>
  );
}
export function Demo() {
  const { state, setState, standard, cooperative, data } = useApp();
  const [receipt, setReceipt] = useState<Receipt | null>(null),
    [progress, setProgress] = useState<number | null>(null);
  const staged = useMemo(
    () =>
      progress === null
        ? null
        : simulate(
            data.jobs.slice(0, progress < 100 ? progress : progress - 100),
            data.workers,
            progress < 100 ? baseline : state.active,
            state.rates,
          ),
    [progress, data, state.active, state.rates],
  );
  const mapPair = useMemo(() => {
    const pairs = standard.receipts.map((current) => ({
      current,
      cooperative: cooperative.receipts.find(
        (receipt) => receipt.job.id === current.job.id,
      )!,
    }));
    return (
      pairs.find((pair) => {
        const currentEta = pair.current.candidates.find(
          (candidate) => candidate.worker.id === pair.current.selected,
        )?.eta;
        const cooperativeEta = pair.cooperative.candidates.find(
          (candidate) => candidate.worker.id === pair.cooperative.selected,
        )?.eta;
        return (
          pair.current.selected === 'W02' &&
          pair.cooperative.selected === 'W01' &&
          currentEta !== undefined &&
          cooperativeEta !== undefined &&
          cooperativeEta > currentEta
        );
      }) ??
      pairs.find(
        (pair) => pair.current.selected !== pair.cooperative.selected,
      ) ??
      pairs[0]
    );
  }, [standard, cooperative]);
  useEffect(() => {
    if (progress === null) return;
    const timer = setTimeout(() => {
      if (progress >= 190) {
        setState((s) => ({ ...s, compared: true }));
        setProgress(null);
      } else setProgress(progress + 10);
    }, 55);
    return () => clearTimeout(timer);
  }, [progress, setState]);
  const run = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      setState((s) => ({ ...s, compared: true }));
    else {
      setState((s) => ({ ...s, compared: false }));
      setProgress(0);
    }
  };
  const inspect = (id: string) => {
    const source = state.compared ? cooperative : standard;
    setReceipt(
      [...source.receipts]
        .reverse()
        .find(
          (r) =>
            r.selected === id &&
            r.selected !== r.fastest &&
            r.candidates.find((c) => c.worker.id === r.selected)!.eta >
              r.candidates.find((c) => c.worker.id === r.fastest)!.eta,
        ) ??
        source.receipts.find((r) => r.selected === id) ??
        source.receipts.find((r) =>
          r.candidates.some((c) => c.worker.id === id),
        )!,
    );
  };
  return (
    <Shell>
      <section className="demo-intro">
        <div>
          <p className="product-thesis">
            The cooperative belongs to workers. Now the dispatch rules do too.
          </p>
          <h1>
            Ravi received {standard.workers[1].jobs} jobs.
            <br />
            Meena received {standard.workers[0].jobs}.
          </h1>
          <p className="story-question">
            They own the same cooperative. <strong>Why?</strong>
          </p>
        </div>
        <aside className="intro-rule">
          <p>
            Ownership is a start.
            <br />
            <strong>Control over opportunity is the next step.</strong>
          </p>
          <Link href="/demo/governance">
            Read the member-approved rule <ArrowRight size={15} />
          </Link>
        </aside>
      </section>
      <section className="dispatch-board">
        <div className="board-toolbar">
          <div>
            <h2>
              Same jobs. Same workers.
              <br className="mobile-only" /> Different dispatch rule.
            </h2>
            <p>
              {data.jobs.length} jobs / {data.workers.length} worker-members /
              31 Aug–4 Sep 2026
            </p>
          </div>
          <Button
            className="primary-action"
            onClick={run}
            disabled={progress !== null}
          >
            <Play size={18} />
            {progress !== null
              ? 'Dispatching…'
              : state.compared
                ? 'Run comparison again'
                : 'Run comparison'}
          </Button>
        </div>
        <div className="board-context">
          <span>
            <ShieldCheck size={16} />
            Skills, schedules and customer SLA always come first.
          </span>
          <span>
            Constitution v{state.active.version}:{' '}
            {money(state.active.parameters.floor)} floor / +
            {state.active.parameters.maxDelay} min max
          </span>
        </div>
        {mapPair && (
          <div className="comparison-map-shell">
            <div className="comparison-map-state">
              <span>
                {state.compared ? 'Member constitution' : 'Standard dispatch'}
              </span>
              <strong>
                {data.workers.find(
                  (worker) =>
                    worker.id ===
                    (state.compared
                      ? mapPair.cooperative.selected
                      : mapPair.current.selected),
                )?.name ?? 'No assignment'}{' '}
                selected
              </strong>
              <small>
                Same request and positions. Only the active allocation rule
                changes.
              </small>
            </div>
            <DispatchDecisionMap
              receipt={state.compared ? mapPair.cooperative : mapPair.current}
              mode="governance"
            />
          </div>
        )}
        {progress !== null && (
          <div aria-live="polite" className="run-progress">
            <span>
              {progress < 100
                ? 'Standard dispatch'
                : 'Cooperative constitution'}
              : {progress < 100 ? progress : progress - 100} of 100 jobs
              allocated
              {staged?.receipts.at(-1)?.selected &&
                ` / ${data.workers.find((w) => w.id === staged.receipts.at(-1)!.selected)?.name} received ${staged.receipts.at(-1)!.job.id}`}
            </span>
            <progress max="200" value={progress} />
          </div>
        )}
        <WorkerBars
          compact
          a={progress !== null && progress < 100 && staged ? staged : standard}
          b={
            progress !== null && progress >= 100 && staged
              ? staged
              : cooperative
          }
          done={state.compared || (progress !== null && progress >= 100)}
          onWorker={inspect}
        />
        {state.compared ? (
          <Tradeoff a={standard.metrics} b={cooperative.metrics} />
        ) : (
          <div className="board-prompt">
            <CircleHelp size={18} />
            <p>
              The nearest eligible worker often gets the next job. Run the same
              week with the rule members chose.
            </p>
          </div>
        )}
        <div className="board-foot">
          <span>
            Weekly net livelihood after illustrative travel, time and consumable
            costs.
          </span>
          <span>Click a worker to inspect a decision receipt.</span>
        </div>
      </section>
      <div className="next-actions">
        <button onClick={() => inspect('W01')}>
          <FileText />
          <span>
            <strong>Why this assignment?</strong>
            <small>Inspect Meena’s decision receipt</small>
          </span>
          <ArrowRight />
        </button>
        <Link href="/demo/worker?challenge=true">
          <Scale />
          <span>
            <strong>Challenge a decision</strong>
            <small>Replay an unfair cancellation penalty</small>
          </span>
          <ArrowRight />
        </Link>
        <Link href="/demo/governance">
          <Users />
          <span>
            <strong>Change the rule</strong>
            <small>
              Simulate, vote, then activate v{state.active.version + 1}
            </small>
          </span>
          <ArrowRight />
        </Link>
      </div>
      {state.compared && (
        <details className="all-metrics">
          <summary>Inspect all calculated outcomes</summary>
          <MetricsTable a={standard.metrics} b={cooperative.metrics} />
        </details>
      )}
      <ReceiptDialog receipt={receipt} close={() => setReceipt(null)} />
    </Shell>
  );
}
