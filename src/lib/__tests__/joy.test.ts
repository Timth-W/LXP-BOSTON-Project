import { describe, expect, it } from "vitest";
import { makeFormatters } from "@/i18n";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { register } from "../actions";
import { proposalsFor } from "../joy/proposals";
import { greeting, when } from "../joy/script";
import { createSeed } from "../seed";
import { userById } from "../selectors";
import type { State } from "../types";

const seed = (): State => structuredClone(createSeed());
const EN = { t: en, f: makeFormatters("en", en), locale: "en" as const };
const FR = { t: fr, f: makeFormatters("fr", fr), locale: "fr" as const };

describe("Joy proposals", () => {
  it("reminds Marie of tomorrow and suggests activities and a companion", () => {
    const s = seed();
    const marie = userById(s, "u-marie")!;
    const ids = proposalsFor(s, marie).map((p) => p.id);
    expect(ids[0]).toBe("upcoming:a10");
    expect(ids).toContain("join:a1");
    expect(ids.some((id) => id.startsWith("book:"))).toBe(true);
  });

  it("drops an activity once the senior has signed up", () => {
    const s = seed();
    const marie = userById(s, "u-marie")!;
    register(s, "a1", marie.id, "assistant");
    expect(proposalsFor(s, marie).map((p) => p.id)).not.toContain("join:a1");
  });

  it("talks to relatives about their loved one and to companions about missions", () => {
    const s = seed();
    const sophie = userById(s, "u-sophie")!;
    expect(proposalsFor(s, sophie).every((p) => !("seniorId" in p) || p.seniorId === "u-marie")).toBe(true);
    expect(proposalsFor(s, userById(s, "u-karim")!).map((p) => p.id)).toContain("mission:m1");
  });

  it("greets by first name with relative dates, in both languages", () => {
    const s = seed();
    const marie = userById(s, "u-marie")!;
    const list = proposalsFor(s, marie);
    const hello = greeting(s, marie, list, EN).replace(/\s/g, " ");
    expect(hello).toMatch(/^Hello Marie! What would you like to do this week\?/);
    expect(hello).toContain("“Tea and crosswords” tomorrow at 5 pm");
    expect(hello).toContain("Or would you like someone to go with you");
    expect(greeting(s, marie, list, FR).replace(/\s/g, " ")).toContain("« Thé et mots croisés » demain à 17 h");
    expect(when("2026-11-14T14:30", s.now, EN).replace(/\s/g, " ")).toBe("on Saturday at 2:30 pm");
    expect(when("2026-11-28T14:00", s.now, FR)).toBe("le samedi 28 novembre à 14 h");
  });
});
