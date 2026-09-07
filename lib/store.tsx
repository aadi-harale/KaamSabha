'use client';
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import {
  assumptions,
  baseline,
  cancellationCase,
  constitution,
  dataset,
  propose,
  simulate,
  type Appeal,
  type Assumptions,
  type Job,
  type Policy,
  type Receipt,
} from './engine';
export type Booking = {
  job: Job;
  receipt: Receipt;
  departed: boolean;
  departedAt: string | null;
  paid: boolean;
};
export type State = {
  active: Policy;
  proposal: Policy;
  history: Policy[];
  appeals: Appeal[];
  bookings: Booking[];
  rates: Assumptions;
  compared: boolean;
};
export const initialState = (): State => ({
  active: structuredClone(constitution),
  proposal: propose(constitution),
  history: [{ ...structuredClone(baseline), status: 'expired' }, structuredClone(constitution)],
  appeals: [
    cancellationCase(),
    {
      ...cancellationCase('customer', true, 0, 'KMS-C1061'),
      id: 'CASE-confirmed',
    },
    { ...cancellationCase('unknown', null, 1, 'KMS-C1072'), id: 'CASE-review' },
  ],
  bookings: [],
  rates: { ...assumptions },
  compared: false,
});
const seeded = dataset();
function useAppState() {
  const [state, setState] = useState<State>(initialState),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(''),
    [resetEpoch, setResetEpoch] = useState(0);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem('kaamsabha-v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            parsed.active?.policyId &&
            Array.isArray(parsed.appeals) &&
            parsed.rates
          )
            setState(parsed);
        }
      } catch {
        /* In-memory fallback. */
      }
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem('kaamsabha-v2', JSON.stringify(state));
      } catch {
        /* In-memory fallback. */
      }
    }
  }, [state, ready]);
  const standard = useMemo(
    () => simulate(seeded.jobs, seeded.workers, baseline, state.rates),
    [state.rates],
  );
  const cooperative = useMemo(
    () => simulate(seeded.jobs, seeded.workers, state.active, state.rates),
    [state.active, state.rates],
  );
  useEffect(() => {
    const registry = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              description: string;
              inputSchema: object;
              annotations: object;
              execute: (input: unknown) => unknown;
            },
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!registry) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        registry.registerTool(
          {
            name: 'run_dispatch_comparison',
            description:
              'Run the same synthetic jobs under standard and active cooperative rules and reveal the comparison in the dispatch lab. Updates local demo state only.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: (input: unknown) => {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object.');
              flushSync(() => setState((s) => ({ ...s, compared: true })));
              return {
                policyVersion: state.active.version,
                standard: standard.metrics,
                cooperative: cooperative.metrics,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {
        /* Optional browser capability; UI remains the primary interface. */
      });
    } catch {
      /* Unsupported experimental WebMCP registry. */
    }
    return () => lifecycle.abort();
  }, [state.active.version, standard, cooperative]);
  return {
    state,
    setState,
    notice,
    setNotice,
    standard,
    cooperative,
    resetEpoch,
    data: seeded,
    reset: () => {
      setState(initialState());
      setResetEpoch(n => n + 1);
      setNotice('Demo reset. Seed 26089 restored.');
    },
  };
}
const Context = createContext<ReturnType<typeof useAppState> | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppState();
  return <Context.Provider value={value}><Fragment key={value.resetEpoch}>{children}</Fragment></Context.Provider>;
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider missing');
  return value;
}
