import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { signUp } from "../actions";
import { createBackendStore } from "../backend";
import { createSeed } from "../seed";

const files: string[] = [];

afterEach(() => {
  for (const file of files.splice(0)) {
    try {
      rmSync(file, { force: true });
    } catch {
      // ignore cleanup errors for test temp files
    }
  }
});

describe("server-side state store", () => {
  it("persists the app state and keeps the signup flow valid on the backend layer", async () => {
    const dir = mkdtempSync(join(tmpdir(), "joyto-backend-"));
    const file = join(dir, "state.json");
    files.push(file);

    const store = createBackendStore(file);
    const initial = createSeed();
    await store.save(initial);

    const result = await store.mutate((draft) => {
      const res = signUp(draft, {
        role: "senior",
        email: "backend@test.com",
        passwordHash: "demo-hash",
        firstName: "Backend",
        lastName: "User",
        sector: "centre",
        interests: ["culture"],
      });
      return res;
    });

    expect(result.ok).toBe(true);

    const persisted = await store.load();
    expect(persisted.users.some((user) => user.email === "backend@test.com")).toBe(true);
    expect(persisted.currentUserId).toBe(result.ok ? result.userId : null);
  });
});
