'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  Play,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DispatchDecisionMap } from '@/components/dispatch-map';
import {
  ReceiptDialog,
  Shell,
  Tradeoff,
  WorkerBars,
  money,
} from '@/components/kaamsabha';
import { useApp } from '@/lib/store';
import { baseline, simulate, type Receipt } from '@/lib/engine';
import {
  judgeComparisonFacts,
  pickJudgeComparisonPair,
} from '@/lib/judge-comparison';
import { zones } from '@/lib/engine';

export function JudgeDemo() {
  const { state, setState, standard, cooperative, data } = useApp();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const pair = useMemo(
    () => pickJudgeComparisonPair(standard, cooperative),
    [standard, cooperative],
  );
  const facts = useMemo(() => judgeComparisonFacts(pair), [pair]);
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

  useEffect(() => {
    if (progress === null) return;
    const timer = setTimeout(() => {
      if (progress >= 190) {
        setState((current) => ({ ...current, compared: true }));
        setProgress(null);
      } else {
        setProgress(progress + 10);
      }
    }, 55);
    return () => clearTimeout(timer);
  }, [progress, setState]);

  const runComparison = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState((current) => ({ ...current, compared: true }));
      return;
    }
    setState((current) => ({ ...current, compared: false }));
    setProgress(0);
  };

  const inspectWorker = (id: string) => {
    const source = state.compared ? cooperative : standard;
    setReceipt(
      [...source.receipts]
        .reverse()
        .find(
          (candidateReceipt) =>
            candidateReceipt.selected === id &&
            candidateReceipt.selected !== candidateReceipt.fastest &&
            candidateReceipt.candidates.find(
              (candidate) => candidate.worker.id === candidateReceipt.selected,
            )!.eta >
              candidateReceipt.candidates.find(
                (candidate) => candidate.worker.id === candidateReceipt.fastest,
              )!.eta,
        ) ??
        source.receipts.find(
          (candidateReceipt) => candidateReceipt.selected === id,
        ) ??
        source.receipts.find((candidateReceipt) =>
          candidateReceipt.candidates.some(
            (candidate) => candidate.worker.id === id,
          ),
        )!,
    );
  };

  const constitutionVisible =
    state.compared || (progress !== null && progress >= 100);
  const activeReceipt = constitutionVisible ? pair.cooperative : pair.standard;

  return (
    <Shell>
      <section className="judge-hero">
        <p>The cooperative belongs to workers. The dispatch rules should too.</p>
        <h1>Same jobs. Same workers. Different rule.</h1>
        <div className="judge-hero-row">
          <span>
            100 synthetic Pune service requests · 12 verified worker-members ·
            one deterministic week
          </span>
          <span className="judge-path">
            Run → explain → govern → challenge
          </span>
        </div>
      </section>

      <section className="judge-board" aria-labelledby="judge-board-title">
        <div className="judge-board-toolbar">
          <div>
            <span className="judge-kicker">One request, two outcomes</span>
            <h2 id="judge-board-title">
              {facts.category} · {zones[facts.zone]} · {facts.jobId}
            </h2>
            <p>
              Identical request, workers, costs and hard eligibility checks.
              Only the allocation rule changes.
            </p>
          </div>
          <Button
            className="primary-action"
            onClick={runComparison}
            disabled={progress !== null}
          >
            <Play size={18} />
            {progress !== null
              ? 'Dispatching…'
              : state.compared
                ? 'Run again'
                : 'Run comparison'}
          </Button>
        </div>

        <div className="judge-hard-rules">
          <span>
            <ShieldCheck size={16} />
            Skill, availability, schedule, radius and SLA are checked first.
          </span>
          <span>
            Constitution v{state.active.version}: {money(state.active.parameters.floor)}
            {' '}weekly floor · +{state.active.parameters.maxDelay} min maximum extra wait
          </span>
        </div>

        <div className="judge-decision-split">
          <article className="judge-decision standard-decision">
            <span>Standard dispatch</span>
            <strong>{facts.standardWorkerName}</strong>
            <dl>
              <div>
                <dt>Arrival</dt>
                <dd>{facts.standardEta} min</dd>
              </div>
              <div>
                <dt>Weekly net before job</dt>
                <dd>{money(facts.standardWeeklyNetBefore)}</dd>
              </div>
            </dl>
            <p>Fastest eligible member wins; quality and member ID break ties.</p>
          </article>

          <div className="judge-rule-change" aria-label="Only the rule changed">
            <span>Only the rule changed</span>
            <ArrowRight aria-hidden="true" />
          </div>

          <article
            className={`judge-decision constitution-decision ${constitutionVisible ? 'revealed' : 'waiting'}`}
            aria-live="polite"
          >
            <span>Member constitution v{state.active.version}</span>
            {constitutionVisible ? (
              <>
                <strong>{facts.cooperativeWorkerName}</strong>
                <dl>
                  <div>
                    <dt>Arrival</dt>
                    <dd>{facts.cooperativeEta} min</dd>
                  </div>
                  <div>
                    <dt>Weekly net before job</dt>
                    <dd>{money(facts.cooperativeWeeklyNetBefore)}</dd>
                  </div>
                </dl>
                <p>
                  {facts.addedWait >= 0 ? '+' : '−'}{Math.abs(facts.addedWait)} min
                  {' '}versus fastest, inside the member-approved +
                  {state.active.parameters.maxDelay} min limit.
                </p>
              </>
            ) : (
              <div className="judge-waiting-copy">
                <strong>Waiting to run</strong>
                <p>
                  Apply the worker-approved opportunity rule to the exact same
                  request and candidate set.
                </p>
              </div>
            )}
          </article>
        </div>

        {progress !== null && (
          <div aria-live="polite" className="judge-progress">
            <span>
              {progress < 100 ? 'Standard dispatch' : 'Member constitution'} ·{' '}
              {progress < 100 ? progress : progress - 100}/100 jobs
            </span>
            <progress max="200" value={progress} />
          </div>
        )}

        {state.compared && (
          <div className="judge-proof-line" aria-live="polite">
            <strong>
              {facts.standardWorkerName.split(' ')[0]} →{' '}
              {facts.cooperativeWorkerName.split(' ')[0]}
            </strong>
            <span>
              {facts.addedWait >= 0 ? '+' : '−'}{Math.abs(facts.addedWait)} min on this
              request
            </span>
            <span>
              {cooperative.metrics.slaViolations - standard.metrics.slaViolations} extra
              SLA violations across 100 jobs
            </span>
          </div>
        )}

        <details className="judge-map-details">
          <summary>See this exact request on the map</summary>
          <p>
            The map uses the same request and worker positions. It switches from
            standard dispatch to the constitution result after the comparison.
          </p>
          <DispatchDecisionMap receipt={activeReceipt} mode="governance" />
        </details>

        <div className="judge-week-heading">
          <div>
            <h3>Now widen the lens to the full week.</h3>
            <p>
              The highlighted request proves the mechanism; these bars show the
              effect across all 100 synthetic jobs.
            </p>
          </div>
        </div>

        <WorkerBars
          compact
          a={progress !== null && progress < 100 && staged ? staged : standard}
          b={progress !== null && progress >= 100 && staged ? staged : cooperative}
          done={state.compared || (progress !== null && progress >= 100)}
          onWorker={inspectWorker}
        />

        {state.compared ? (
          <Tradeoff a={standard.metrics} b={cooperative.metrics} />
        ) : (
          <div className="judge-run-prompt">
            Run the comparison to reveal the constitution outcome and the
            customer-worker trade-off.
          </div>
        )}
      </section>

      <section className="judge-next" aria-label="Judge walkthrough">
        <div className="judge-next-heading">
          <span>Continue the working flow</span>
          <p>Each step opens a real mechanism, not a presentation slide.</p>
        </div>
        <div className="judge-next-grid">
          <button onClick={() => setReceipt(pair.cooperative)}>
            <b>1</b>
            <FileText />
            <span>
              <strong>Explain the assignment</strong>
              <small>Frozen candidates, policy version and replayable receipt</small>
            </span>
            <ArrowRight />
          </button>
          <Link href="/demo/governance">
            <b>2</b>
            <Users />
            <span>
              <strong>Govern the next rule</strong>
              <small>Propose → simulate → vote → activate</small>
            </span>
            <ArrowRight />
          </Link>
          <Link href="/demo/worker?challenge=true">
            <b>3</b>
            <Scale />
            <span>
              <strong>Challenge a decision</strong>
              <small>Replay frozen evidence and apply the constitution</small>
            </span>
            <ArrowRight />
          </Link>
        </div>
      </section>

      <ReceiptDialog receipt={receipt} close={() => setReceipt(null)} />
    </Shell>
  );
}
