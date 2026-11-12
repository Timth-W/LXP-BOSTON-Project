import { promises as fs } from "node:fs";
import path from "node:path";
import { createSeed } from "./seed";
import type { State } from "./types";

export interface BackendStore {
  load: () => Promise<State>;
  save: (state: State) => Promise<State>;
  mutate: <T>(mutator: (draft: State) => T) => Promise<T>;
}

export function createBackendStore(filePath = path.join(process.cwd(), ".data", "joyto-state.json")): BackendStore {
  const ensureDirectory = async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  };

  const load = async (): Promise<State> => {
    await ensureDirectory();

    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as State;
      return parsed.version === createSeed().version ? parsed : createSeed();
    } catch {
      const fresh = createSeed();
      await save(fresh);
      return fresh;
    }
  };

  const save = async (state: State): Promise<State> => {
    await ensureDirectory();
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
    return state;
  };

  const mutate = async <T>(mutator: (draft: State) => T): Promise<T> => {
    const draft = await load();
    const result = mutator(draft);
    await save(draft);
    return result;
  };

  return { load, save, mutate };
}

export const appStateStore = createBackendStore();

export function stateSummary(state: State) {
  return {
    version: state.version,
    now: state.now,
    currentUserId: state.currentUserId,
    users: state.users.length,
    missions: state.missions.length,
    activities: state.activities.length,
    notifications: state.notifications.length,
  };
}
