/**
 * Business actions. Each action receives a copy of the state and changes it.
 * They are called through run() from the store (store.tsx); then every screen re-renders.
 * Production: each function becomes a server route (or a database function) with the same rules.
 * Actions never write text: notifications store a type and ids, translated at display time.
 */
import { DEMO_LATER, DEMO_NOW, PRICING } from "./constants";
import { generateInviteCode, normalizeEmail } from "./auth";
import { isCompatible } from "./matching";
import { splitPayment } from "./pricing";
import {
  findSeniorByCode,
  findUserByEmail,
  familyOf,
  giftMinutesLeft,
  isLinked,
  missionById,
  offersFor,
  paymentFor,
  userById,
} from "./selectors";
import type {
  ChatMessage,
  Mission,
  NotificationParams,
  NotificationType,
  OutingType,
  Relation,
  Role,
  SectorId,
  State,
  User,
} from "./types";

export const nextId = (s: State, prefix: string) => `${prefix}${++s.seq}`;

export function notify(s: State, userId: string, type: NotificationType, params: NotificationParams, href: string) {
  s.notifications.push({ id: nextId(s, "n"), userId, type, params, href, read: false, createdAt: s.now });
}

/* ---------- Accounts and session ---------- */

export type AuthError = "emailTaken" | "credentials" | "code" | "alreadyLinked";

export interface SignUpInput {
  role: Role;
  email: string;
  /** Already hashed by lib/auth.ts (demo only: in production the backend handles passwords). */
  passwordHash: string;
  firstName: string;
  lastName: string;
  sector: SectorId;
  interests: User["interests"];
  /** Family only: invite code of the senior to link right away. */
  inviteCode?: string;
  relation?: Relation;
}

export function uniqueInviteCode(s: State): string {
  let code = generateInviteCode();
  while (s.users.some((u) => u.inviteCode === code)) code = generateInviteCode();
  return code;
}

/** Creates the account and opens the session. Returns an error code or the new user id. */
export function signUp(s: State, input: SignUpInput): { ok: true; userId: string } | { ok: false; error: AuthError } {
  const email = normalizeEmail(input.email);
  if (findUserByEmail(s, email)) return { ok: false, error: "emailTaken" };
  const senior = input.role === "family" && input.inviteCode ? findSeniorByCode(s, input.inviteCode) : undefined;
  if (input.role === "family" && input.inviteCode && !senior) return { ok: false, error: "code" };

  const user: User = {
    id: nextId(s, "u-"),
    role: input.role,
    email,
    passwordHash: input.passwordHash,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    bio: "",
    sector: input.sector,
    interests: input.interests,
    availability: [],
    createdAt: s.now,
  };
  if (input.role === "senior") user.inviteCode = uniqueInviteCode(s);
  if (input.role === "companion") user.companion = { sectors: [input.sector], verified: false };
  s.users.push(user);
  s.currentUserId = user.id;
  notify(
    s,
    user.id,
    "welcome",
    {},
    input.role === "senior" ? "/senior/profile" : input.role === "companion" ? "/companion/profile" : "/family/profile",
  );
  if (senior) linkFamily(s, senior.id, user.id, input.relation ?? "other");
  return { ok: true, userId: user.id };
}

export function login(s: State, email: string, passwordHash: string): { ok: true; user: User } | { ok: false; error: AuthError } {
  const user = findUserByEmail(s, email);
  if (!user || user.passwordHash !== passwordHash) return { ok: false, error: "credentials" };
  s.currentUserId = user.id;
  return { ok: true, user };
}

/** Demo only: open a demo profile without a password. */
export function loginAsDemo(s: State, userId: string) {
  if (userById(s, userId)?.demo) s.currentUserId = userId;
}

export function logout(s: State) {
  s.currentUserId = null;
}

export function toggleDemoTime(s: State) {
  s.now = s.now === DEMO_NOW ? DEMO_LATER : DEMO_NOW;
}

/* ---------- Family links ---------- */

export function linkFamily(s: State, seniorId: string, familyId: string, relation: Relation): AuthError | null {
  if (isLinked(s, seniorId, familyId)) return "alreadyLinked";
  s.links.push({ id: nextId(s, "l"), seniorId, familyId, relation, createdAt: s.now });
  notify(s, seniorId, "familyLinked", { actorId: familyId }, "/senior/profile");
  notify(s, familyId, "familyConfirmed", { seniorId }, "/family");
  return null;
}

/** Called by a relative who enters the invite code of a senior. */
export function linkByCode(s: State, familyId: string, code: string, relation: Relation): AuthError | null {
  const senior = findSeniorByCode(s, code);
  if (!senior) return "code";
  return linkFamily(s, senior.id, familyId, relation);
}

/** Either side can remove the link; the other side is told. */
export function unlinkFamily(s: State, linkId: string, byUserId: string) {
  const link = s.links.find((l) => l.id === linkId);
  if (!link || (link.seniorId !== byUserId && link.familyId !== byUserId)) return;
  s.links = s.links.filter((l) => l.id !== linkId);
  const other = link.seniorId === byUserId ? link.familyId : link.seniorId;
  const href = other === link.seniorId ? "/senior/profile" : "/family/profile";
  notify(s, other, "familyRemoved", { actorId: byUserId }, href);
}

export function regenerateInviteCode(s: State, seniorId: string) {
  const u = userById(s, seniorId);
  if (u?.role === "senior") u.inviteCode = uniqueInviteCode(s);
}

/* ---------- Activities ---------- */

export function register(s: State, activityId: string, seniorId: string, via: "assistant" | "catalogue") {
  if (s.registrations.some((r) => r.activityId === activityId && r.seniorId === seniorId)) return;
  const a = s.activities.find((x) => x.id === activityId);
  if (!a) return;
  s.registrations.push({ id: nextId(s, "r"), activityId, seniorId, via });
  for (const relative of familyOf(s, seniorId)) {
    notify(s, relative.id, "seniorRegistered", { seniorId, activityId, date: a.start }, "/family");
  }
}

export function unregister(s: State, activityId: string, seniorId: string) {
  s.registrations = s.registrations.filter((r) => !(r.activityId === activityId && r.seniorId === seniorId));
}

/* ---------- Accompanied outings ---------- */

export interface NewMission {
  seniorId: string;
  bookedById: string;
  payerId: string;
  activityId: string | null;
  type: OutingType;
  note: string;
  start: string;
  durationMin: number;
  sector: SectorId;
  meetingPoint: string;
  via: "assistant" | "manual";
}

/** Link to an outing, depending on who reads the notification. */
export function outingHref(s: State, missionId: string, userId: string) {
  const role = userById(s, userId)?.role;
  if (role === "family") return `/family/outings/${missionId}`;
  if (role === "companion") return `/companion/missions/${missionId}`;
  return `/senior/outings/${missionId}`;
}

/** The senior, the person who booked, the payer and every linked relative. */
function seniorSide(s: State, m: Mission) {
  return Array.from(new Set([m.seniorId, m.payerId, m.bookedById, ...familyOf(s, m.seniorId).map((u) => u.id)]));
}

/** Publishes an outing and puts the payment on hold (gift card first, then bank card). */
export function createMission(s: State, input: NewMission): string {
  const id = nextId(s, "m");
  const mission: Mission = { ...input, id, status: "open", createdAt: s.now };
  s.missions.push(mission);

  const split = splitPayment(input.durationMin, giftMinutesLeft(s, input.seniorId));
  consumeGiftMinutes(s, input.seniorId, split.giftMinutes);
  s.payments.push({
    id: nextId(s, "p"),
    missionId: id,
    payerId: input.payerId,
    amountCents: split.totalCents,
    giftMinutes: split.giftMinutes,
    cardCents: split.cardCents,
    status: "authorized",
    createdAt: s.now,
  });

  for (const c of s.users.filter((u) => u.role === "companion")) {
    if (isCompatible(s, mission, c)) {
      notify(s, c.id, "newMission", { seniorId: input.seniorId, missionId: id, date: input.start }, `/companion/missions/${id}`);
    }
  }
  if (input.bookedById !== input.seniorId) {
    notify(s, input.seniorId, "bookedForYou", { actorId: input.bookedById, missionId: id, date: input.start }, `/senior/outings/${id}`);
  }
  for (const relative of familyOf(s, input.seniorId).filter((u) => u.id !== input.bookedById)) {
    notify(s, relative.id, "seniorBooked", { seniorId: input.seniorId, missionId: id, date: input.start }, `/family/outings/${id}`);
  }
  return id;
}

function consumeGiftMinutes(s: State, seniorId: string, minutes: number) {
  let left = minutes;
  for (const g of s.giftCards.filter((x) => x.seniorId === seniorId && x.minutesLeft > 0)) {
    if (left === 0) break;
    const used = Math.min(g.minutesLeft, left);
    g.minutesLeft -= used;
    left -= used;
  }
}

function restoreGiftMinutes(s: State, seniorId: string, minutes: number) {
  let left = minutes;
  for (const g of s.giftCards.filter((x) => x.seniorId === seniorId)) {
    if (left === 0) break;
    const back = Math.min(g.minutesTotal - g.minutesLeft, left);
    g.minutesLeft += back;
    left -= back;
  }
}

export function offerHelp(s: State, missionId: string, companionId: string) {
  const m = missionById(s, missionId);
  if (!m || m.status !== "open") return;
  const existing = s.offers.find((o) => o.missionId === missionId && o.companionId === companionId);
  if (existing) existing.status = "pending";
  else s.offers.push({ id: nextId(s, "o"), missionId, companionId, status: "pending", createdAt: s.now });
  for (const uid of seniorSide(s, m)) {
    notify(s, uid, "offerReceived", { actorId: companionId, missionId, date: m.start }, outingHref(s, missionId, uid));
  }
}

export function withdrawOffer(s: State, missionId: string, companionId: string) {
  const o = s.offers.find((x) => x.missionId === missionId && x.companionId === companionId && x.status === "pending");
  if (o) o.status = "withdrawn";
}

export function acceptOffer(s: State, offerId: string) {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o || o.status !== "pending") return;
  const m = missionById(s, o.missionId);
  if (!m || m.status !== "open") return;
  o.status = "accepted";
  m.status = "confirmed";
  for (const other of offersFor(s, m.id).filter((x) => x.id !== o.id && x.status === "pending")) {
    other.status = "declined";
    notify(s, other.companionId, "missionTaken", { missionId: m.id, date: m.start }, `/companion/missions/${m.id}`);
  }
  notify(s, o.companionId, "offerAccepted", { seniorId: m.seniorId, missionId: m.id, date: m.start }, `/companion/missions/${m.id}`);
  for (const uid of seniorSide(s, m).filter((id) => id !== m.seniorId)) {
    notify(
      s,
      uid,
      "outingConfirmed",
      { seniorId: m.seniorId, actorId: o.companionId, missionId: m.id, date: m.start },
      outingHref(s, m.id, uid),
    );
  }
}

export function declineOffer(s: State, offerId: string) {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o || o.status !== "pending") return;
  o.status = "declined";
  const m = missionById(s, o.missionId);
  if (m) notify(s, o.companionId, "offerDeclined", { missionId: m.id, date: m.start }, `/companion/missions/${m.id}`);
}

/** Cancelled by the senior or a relative: the outing is cancelled and the money released. */
export function cancelMission(s: State, missionId: string, reason: string) {
  const m = missionById(s, missionId);
  if (!m || (m.status !== "open" && m.status !== "confirmed")) return;
  m.status = "cancelled";
  m.cancelReason = reason;
  const p = paymentFor(s, missionId);
  if (p && p.status === "authorized") {
    p.status = "refunded";
    restoreGiftMinutes(s, m.seniorId, p.giftMinutes);
  }
  for (const o of offersFor(s, missionId).filter((x) => x.status === "pending" || x.status === "accepted")) {
    notify(s, o.companionId, "missionCancelled", { missionId: m.id, date: m.start, reason }, `/companion/missions/${m.id}`);
    if (o.status === "pending") o.status = "declined";
  }
}

/** A confirmed companion withdraws: the outing is open to others again. */
export function companionCancel(s: State, missionId: string, companionId: string, reason: string) {
  const m = missionById(s, missionId);
  const o = s.offers.find((x) => x.missionId === missionId && x.companionId === companionId && x.status === "accepted");
  if (!m || !o || m.status !== "confirmed") return;
  o.status = "withdrawn";
  m.status = "open";
  for (const uid of seniorSide(s, m)) {
    notify(s, uid, "companionCancelled", { actorId: companionId, missionId: m.id, date: m.start, reason }, outingHref(s, m.id, uid));
  }
  for (const c of s.users.filter((u) => u.role === "companion" && u.id !== companionId)) {
    if (isCompatible(s, m, c))
      notify(s, c.id, "newMission", { seniorId: m.seniorId, missionId: m.id, date: m.start }, `/companion/missions/${m.id}`);
  }
}

/** End of the outing: the payment is captured and the companion is paid. */
export function completeMission(s: State, missionId: string) {
  const m = missionById(s, missionId);
  if (!m || m.status !== "confirmed") return;
  m.status = "done";
  const p = paymentFor(s, missionId);
  if (p) p.status = "captured";
  const o = s.offers.find((x) => x.missionId === missionId && x.status === "accepted");
  if (o) notify(s, o.companionId, "companionPaid", { missionId: m.id }, "/companion/earnings");
  for (const uid of seniorSide(s, m).filter((id) => id !== m.seniorId)) {
    notify(s, uid, "missionDone", { missionId: m.id, date: m.start }, outingHref(s, m.id, uid));
  }
}

export function rateMission(s: State, missionId: string, rating: number, review: string) {
  const m = missionById(s, missionId);
  if (!m || m.status !== "done" || rating < 1 || rating > 5) return;
  m.rating = Math.round(rating);
  m.review = review;
  const o = s.offers.find((x) => x.missionId === missionId && x.status === "accepted");
  if (o) notify(s, o.companionId, "newReview", { missionId: m.id, rating: m.rating }, `/companion/missions/${m.id}`);
}

/* ---------- Gift card ---------- */

export function buyGiftCard(s: State, buyerId: string, seniorId: string) {
  const { minutes, priceCents } = PRICING.giftCard;
  s.giftCards.push({ id: nextId(s, "g"), buyerId, seniorId, minutesTotal: minutes, minutesLeft: minutes, priceCents, createdAt: s.now });
  notify(s, seniorId, "giftReceived", { actorId: buyerId, minutes }, "/senior");
}

/* ---------- Assistant ---------- */

export function addChatMessage(s: State, seniorId: string, msg: Omit<ChatMessage, "id" | "createdAt">) {
  const list = (s.chats[seniorId] ??= []);
  list.push({ ...msg, id: nextId(s, "c"), createdAt: s.now });
}

export function clearChat(s: State, seniorId: string) {
  s.chats[seniorId] = [];
}

/* ---------- Profile and notifications ---------- */

export type ProfilePatch = Partial<Pick<User, "firstName" | "lastName" | "bio" | "sector" | "interests" | "availability">> & {
  companionSectors?: SectorId[];
};

export function updateProfile(s: State, userId: string, patch: ProfilePatch) {
  const u = userById(s, userId);
  if (!u) return;
  const { companionSectors, ...rest } = patch;
  Object.assign(u, rest);
  if (companionSectors && u.companion) u.companion.sectors = companionSectors;
}

export function markAllRead(s: State, userId: string) {
  for (const n of s.notifications.filter((x) => x.userId === userId)) n.read = true;
}

export function markRead(s: State, id: string) {
  const n = s.notifications.find((x) => x.id === id);
  if (n) n.read = true;
}
