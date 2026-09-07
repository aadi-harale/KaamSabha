import { copy } from '../engine';
import {
  emptyApplication,
  freeze,
  type ApplicationState,
  type WorkOrder,
  type LivePolicy,
  type DecisionSnapshot,
  type AppEvent,
  type LedgerEntry,
  type CourtCase,
} from './model';

export interface ReadRepository<T> {
  all(): T[];
  get(id: string): T;
}
export interface JobRepository extends ReadRepository<WorkOrder> {
  put(job: WorkOrder): void;
}
export interface PolicyRepository {
  all(): LivePolicy[];
  get(version: number): LivePolicy;
  put(policy: LivePolicy): void;
}
export interface SnapshotRepository extends ReadRepository<DecisionSnapshot> {
  append(value: DecisionSnapshot): void;
}
export interface EventRepository {
  all(): AppEvent[];
  append(value: AppEvent): void;
}
export interface LedgerRepository {
  all(): LedgerEntry[];
  append(value: LedgerEntry): void;
}
export interface ChallengeRepository extends ReadRepository<CourtCase> {
  put(value: CourtCase): void;
}
export interface UnitOfWork {
  state: ApplicationState;
  jobs: JobRepository;
  policies: PolicyRepository;
  snapshots: SnapshotRepository;
  events: EventRepository;
  ledger: LedgerRepository;
  challenges: ChallengeRepository;
}
export interface ApplicationRepository {
  read(): ApplicationState;
  transaction<T>(command: (unit: UnitOfWork) => Promise<T> | T): Promise<T>;
  subscribe(listener: () => void): () => void;
}
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const APPLICATION_KEY = 'kaamsabha-application-v1';
function collection<T extends { id: string }>(items: T[]) {
  return {
    all: () => copy(items),
    get: (id: string) => {
      const value = items.find((x) => x.id === id);
      if (!value) throw new Error(`Record ${id} was not found.`);
      return copy(value);
    },
    put: (value: T) => {
      const i = items.findIndex((x) => x.id === value.id);
      if (i < 0) items.push(copy(value));
      else items[i] = copy(value);
    },
    append: (value: T) => {
      if (items.some((x) => x.id === value.id))
        throw new Error('Duplicate journal entry.');
      items.push(copy(value));
    },
  };
}
function unit(state: ApplicationState): UnitOfWork {
  const snapshots = collection(state.snapshots),
    events = collection(state.events),
    ledger = collection(state.ledger);
  return {
    state,
    jobs: collection(state.jobs),
    challenges: collection(state.challenges),
    snapshots: {
      all: () => freeze(snapshots.all()),
      get: (id) => freeze(snapshots.get(id)),
      append: snapshots.append,
    },
    events: { all: events.all, append: events.append },
    ledger: { all: ledger.all, append: ledger.append },
    policies: {
      all: () => copy(state.policies),
      get: (version) => {
        const p = state.policies.find((x) => x.version === version);
        if (!p) throw new Error('Policy version missing.');
        return copy(p);
      },
      put: (policy) => {
        const i = state.policies.findIndex((x) => x.version === policy.version);
        if (i < 0) state.policies.push(copy(policy));
        else state.policies[i] = copy(policy);
      },
    },
  };
}
function decode(raw: string | null): ApplicationState {
  if (!raw) return emptyApplication();
  const s = JSON.parse(raw) as ApplicationState;
  if (
    s.schema !== 1 ||
    !Number.isInteger(s.revision) ||
    !Number.isInteger(s.sequence) ||
    !s.session ||
    !s.rates ||
    ![
      'jobs',
      'workers',
      'policies',
      'snapshots',
      'ledger',
      'events',
      'challenges',
    ].every((k) => Array.isArray(s[k as keyof ApplicationState])) ||
    !s.policies.some(
      (p) => p.version === s.activeVersion && p.status === 'active',
    )
  )
    throw new Error(
      'Saved workspace is invalid. Preserve browser storage and restore a valid workspace before continuing.',
    );
  return s;
}
/** One atomic envelope prevents a saved job without its earnings, events or receipt. */
export class LocalApplicationRepository implements ApplicationRepository {
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(
    private storage: StoragePort,
    private lock?: <T>(work: () => Promise<T>) => Promise<T>,
  ) {}
  read() {
    return freeze(decode(this.storage.getItem(APPLICATION_KEY)));
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  transaction<T>(command: (unit: UnitOfWork) => Promise<T> | T): Promise<T> {
    const execute = async () => {
      const state = copy(this.read()),
        revision = state.revision;
      const result = await command(unit(state));
      if (this.read().revision !== revision)
        throw new Error('Workspace changed in another tab. Retry this action.');
      state.revision++;
      this.storage.setItem(APPLICATION_KEY, JSON.stringify(state));
      this.listeners.forEach((fn) => fn());
      return result;
    };
    const pending = this.queue.then(() =>
      this.lock ? this.lock(execute) : execute(),
    );
    this.queue = pending.catch(() => undefined);
    return pending;
  }
}

/** Guided-demo persistence stays separate from the application envelope. */
export interface DemoStateRepository<T> {
  load(): T | null;
  save(value: T): void;
}
export function demoStateRepository<T>(
  storage: StoragePort,
): DemoStateRepository<T> {
  return {
    load: () => {
      const raw = storage.getItem('kaamsabha-v2');
      return raw ? (JSON.parse(raw) as T) : null;
    },
    save: (value) => storage.setItem('kaamsabha-v2', JSON.stringify(value)),
  };
}
