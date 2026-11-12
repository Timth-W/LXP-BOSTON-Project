import { describe, expect, it } from "vitest";
import {
  acceptOffer,
  cancelMission,
  companionCancel,
  completeMission,
  createMission,
  linkByCode,
  login,
  offerHelp,
  register,
  signUp,
  toggleDemoTime,
  unlinkFamily,
} from "../actions";
import { generateInviteCode, normalizeInviteCode } from "../auth";
import { isCompatible, rankActivities, rankMissions } from "../matching";
import { createSeed } from "../seed";
import { familyOf, giftMinutesLeft, missionForCompanion, paymentFor, seniorsOf, userById } from "../selectors";
import type { State } from "../types";

const seed = (): State => structuredClone(createSeed());
const newMission = (s: State) =>
  createMission(s, {
    seniorId: "u-marie",
    bookedById: "u-marie",
    payerId: "u-marie",
    activityId: "a1",
    type: "activity",
    note: "",
    start: "2026-11-14T14:15",
    durationMin: 150,
    sector: "gardens",
    meetingPoint: "3 Rose Street",
    via: "manual",
  });

describe("accounts", () => {
  it("creates an account, refuses a duplicate email and logs in", () => {
    const s = seed();
    const r = signUp(s, {
      role: "senior",
      email: "New@Mail.com ",
      passwordHash: "h",
      firstName: "Ana",
      lastName: "B",
      sector: "centre",
      interests: [],
    });
    expect(r.ok).toBe(true);
    expect(s.currentUserId).toBe(r.ok ? r.userId : null);
    expect(userById(s, s.currentUserId ?? undefined)?.inviteCode).toMatch(/^JOY-\d{4}$/);
    expect(
      signUp(s, {
        role: "family",
        email: "new@mail.com",
        passwordHash: "h",
        firstName: "X",
        lastName: "Y",
        sector: "centre",
        interests: [],
      }),
    ).toEqual({ ok: false, error: "emailTaken" });
    expect(login(s, "new@mail.com", "wrong").ok).toBe(false);
    expect(login(s, "NEW@mail.com", "h").ok).toBe(true);
  });

  it("links a relative with the invite code and lets either side remove it", () => {
    const s = seed();
    const r = signUp(s, {
      role: "family",
      email: "lucas@mail.com",
      passwordHash: "h",
      firstName: "Lucas",
      lastName: "L",
      sector: "centre",
      interests: [],
      inviteCode: "joy 4821",
      relation: "grandchild",
    });
    expect(r.ok).toBe(true);
    const lucas = r.ok ? r.userId : "";
    expect(familyOf(s, "u-marie").map((u) => u.id)).toContain(lucas);
    expect(linkByCode(s, lucas, "JOY-4821", "grandchild")).toBe("alreadyLinked");
    expect(linkByCode(s, lucas, "JOY-0000", "grandchild")).toBe("code");
    const link = s.links.find((l) => l.familyId === lucas)!;
    unlinkFamily(s, link.id, "u-marie");
    expect(seniorsOf(s, lucas)).toHaveLength(0);
  });

  it("normalises invite codes", () => {
    expect(normalizeInviteCode(" joy-4821 ")).toBe("JOY-4821");
    expect(normalizeInviteCode("4821")).toBe("JOY-4821");
    expect(generateInviteCode(() => 0)).toBe("JOY-1000");
  });
});

describe("matching", () => {
  it("only suggests future activities with seats, Marie gets gardening first", () => {
    const s = seed();
    const marie = userById(s, "u-marie")!;
    const ranked = rankActivities(s, marie);
    expect(ranked.every((r) => r.item.start > s.now)).toBe(true);
    expect(ranked[0].item.category).toBe("gardening");
    register(s, ranked[0].item.id, marie.id, "assistant");
    expect(rankActivities(s, marie).map((r) => r.item.id)).not.toContain(ranked[0].item.id);
  });

  it("offers outings only to companions in the area and free at that time", () => {
    const s = seed();
    const m = s.missions.find((x) => x.id === "m1")!;
    expect(isCompatible(s, m, userById(s, "u-karim")!)).toBe(true); // centre, free on Sunday morning
    expect(isCompatible(s, m, userById(s, "u-tom")!)).toBe(false); // not free on Sunday morning
    expect(rankMissions(s, userById(s, "u-lea")!).map((r) => r.item.id)).toContain("m1");
  });
});

describe("accompanied outing lifecycle", () => {
  it("holds the payment, hides private data, then captures it", () => {
    const s = seed();
    const id = newMission(s);
    expect(giftMinutesLeft(s, "u-marie")).toBe(150);
    expect(paymentFor(s, id)).toMatchObject({ status: "authorized", giftMinutes: 150, cardCents: 0 });
    expect(s.notifications.some((n) => n.userId === "u-sophie" && n.type === "seniorBooked")).toBe(true);

    offerHelp(s, id, "u-karim");
    const m = s.missions.find((x) => x.id === id)!;
    expect(missionForCompanion(s, m, "u-karim").meetingPoint).toBeNull();
    acceptOffer(s, s.offers.find((o) => o.missionId === id)!.id);
    expect(missionForCompanion(s, m, "u-karim").meetingPoint).toBe("3 Rose Street");

    toggleDemoTime(s);
    completeMission(s, id);
    expect(paymentFor(s, id)?.status).toBe("captured");
  });

  it("refunds and gives the gift minutes back when cancelled", () => {
    const s = seed();
    const id = newMission(s);
    cancelMission(s, id, "ill");
    expect(paymentFor(s, id)?.status).toBe("refunded");
    expect(giftMinutesLeft(s, "u-marie")).toBe(300);
  });

  it("reopens the outing when the companion withdraws", () => {
    const s = seed();
    const id = newMission(s);
    offerHelp(s, id, "u-karim");
    acceptOffer(s, s.offers.find((o) => o.missionId === id)!.id);
    companionCancel(s, id, "u-karim", "exam");
    expect(s.missions.find((x) => x.id === id)?.status).toBe("open");
  });
});
