"use client";

/**
 * Single data store of the prototype.
 * All data lives here; every action produces a new state and every screen re-renders.
 * For the demo the data is kept in the browser (localStorage).
 * Production: replace this store with API calls to a real database (see db/schema.sql and README).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createSeed } from "./seed";
import { currentUser } from "./selectors";
import type { State, User } from "./types";

const STORAGE_KEY = "joyto-state";

interface StoreValue {
  state: State;
  /** False during the first render, before the saved data is read: screens wait for it. */
  hydrated: boolean;
  me: User | undefined;
  run: <T = void>(action: (draft: State) => T) => T;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function load(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as State;
    return saved.version === createSeed().version ? saved : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(createSeed);
  const [hydrated, setHydrated] = useState(false);
  /** Always the latest state, so that two actions in a row never work on stale data. */
  const ref = useRef(state);

  const commit = useCallback((next: State) => {
    ref.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const saved = load();
    if (saved) commit(saved);
    setHydrated(true);
  }, [commit]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: the demo still works for this visit */
    }
  }, [state, hydrated]);

  /** Same data in other tabs: keep them in sync. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const saved = load();
      if (saved) commit(saved);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [commit]);

  /**
   * Runs an action on a copy of the state and returns its result synchronously
   * (for example the id of a new outing), so a screen can navigate right after.
   */
  const run = useCallback(
    <T,>(action: (draft: State) => T): T => {
      const draft = structuredClone(ref.current);
      const result = action(draft);
      commit(draft);
      return result;
    },
    [commit],
  );

  const reset = useCallback(() => commit({ ...createSeed(), currentUserId: ref.current.currentUserId }), [commit]);

  return <StoreContext.Provider value={{ state, hydrated, me: currentUser(state), run, reset }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>.");
  return ctx;
}
