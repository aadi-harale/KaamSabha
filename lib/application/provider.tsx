'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { emptyApplication, type ApplicationState } from './model';
import {
  APPLICATION_KEY,
  LocalApplicationRepository,
  type ApplicationRepository,
} from './repositories';

type ApplicationContextValue = {
  state: ApplicationState;
  repository: ApplicationRepository | null;
  ready: boolean;
  error: string;
  run: <T>(
    command: (repo: ApplicationRepository) => Promise<T>,
  ) => Promise<T | undefined>;
  clearError: () => void;
  reset: () => void;
};
const Context = createContext<ApplicationContextValue | null>(null);
let singleton: LocalApplicationRepository | null = null;
function browserRepository() {
  if (!singleton) {
    const lock =
      typeof navigator !== 'undefined' && navigator.locks
        ? <T,>(work: () => Promise<T>) =>
            navigator.locks.request('kaamsabha-application', () =>
              work(),
            ) as Promise<T>
        : undefined;
    singleton = new LocalApplicationRepository(window.localStorage, lock);
  }
  return singleton;
}
export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [repository, setRepository] = useState<ApplicationRepository | null>(
    null,
  );
  const [state, setState] = useState<ApplicationState>(emptyApplication),
    [error, setError] = useState('');
  const refresh = useCallback((repo: ApplicationRepository) => {
    try {
      setState(repo.read());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The saved workspace could not be read.',
      );
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      const repo = browserRepository();
      setRepository(repo);
      refresh(repo);
    });
  }, [refresh]);
  useEffect(() => {
    if (!repository) return;
    const unsubscribe = repository.subscribe(() => refresh(repository));
    const storage = (event: StorageEvent) => {
      if (event.key === APPLICATION_KEY) refresh(repository);
    };
    window.addEventListener('storage', storage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', storage);
    };
  }, [repository, refresh]);
  const value = useMemo<ApplicationContextValue>(
    () => ({
      state,
      repository,
      ready: !!repository,
      error,
      clearError: () => setError(''),
      run: async (command) => {
        if (!repository) {
          setError('Workspace is still loading.');
          return;
        }
        try {
          setError('');
          return await command(repository);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'The action could not be completed.',
          );
        }
      },
      reset: () => {
        localStorage.removeItem(APPLICATION_KEY);
        singleton = null;
        const repo = browserRepository();
        setRepository(repo);
        refresh(repo);
        setError('');
      },
    }),
    [state, repository, error, refresh],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApplication() {
  const value = useContext(Context);
  if (!value) throw new Error('ApplicationProvider missing');
  return value;
}
