/**
 * JoyTo data model.
 * Rule: every piece of information is stored in exactly one place.
 * Anything that can be derived (seats left, status seen by a companion, notification text…)
 * is computed in selectors.ts or at render time, never stored.
 * The same model is described as SQL tables in db/schema.sql.
 */

export type Locale = "en" | "fr";

/** Text written by the team in both languages (seed data), or free text typed by a user. */
export type Text = string | { en: string; fr: string };

export type Role = "senior" | "companion" | "family";

export type Category = "gardening" | "cooking" | "games" | "culture" | "walk" | "music" | "coffee";

export type OutingType = "activity" | "walk" | "errands" | "company";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Moment = "am" | "pm";

/** Availability slot, for example "sat-pm" (Saturday afternoon). */
export type Slot = `${DayKey}-${Moment}`;

export type SectorId = "gardens" | "centre" | "station" | "university";

export type Relation = "son" | "daughter" | "grandchild" | "partner" | "friend" | "neighbour" | "other";

export interface User {
  id: string;
  role: Role;
  email: string;
  /** Demo only: SHA-256 hash computed in the browser. Real auth must be handled by the backend. */
  passwordHash: string;
  firstName: string;
  lastName: string;
  bio: Text;
  sector: SectorId;
  interests: Category[];
  availability: Slot[];
  createdAt: string;
  /** Senior only: code shared with relatives so they can link their account. */
  inviteCode?: string;
  companion?: { sectors: SectorId[]; verified: boolean };
  /** Demo profile shown on the welcome screen. */
  demo?: boolean;
}

/** A relative (family role) linked to a senior. One senior can have several relatives and vice versa. */
export interface FamilyLink {
  id: string;
  seniorId: string;
  familyId: string;
  relation: Relation;
  createdAt: string;
}

export interface Activity {
  id: string;
  title: Text;
  category: Category;
  /** Local date-time without time zone: "2026-11-14T14:30". */
  start: string;
  place: Text;
  sector: SectorId;
  capacity: number;
  organizer: Text;
  description: Text;
  /** Position on the illustrated neighbourhood map, in percent. */
  map: { x: number; y: number };
}

export interface Registration {
  id: string;
  activityId: string;
  seniorId: string;
  via: "assistant" | "catalogue";
}

export type MissionStatus = "open" | "confirmed" | "done" | "cancelled";

/** An accompanied outing (paid). */
export interface Mission {
  id: string;
  seniorId: string;
  bookedById: string;
  payerId: string;
  activityId: string | null;
  type: OutingType;
  note: string;
  start: string;
  durationMin: number;
  sector: SectorId;
  /** Private: visible to the companion only once the outing is confirmed. */
  meetingPoint: string;
  status: MissionStatus;
  via: "assistant" | "manual";
  cancelReason?: string;
  rating?: number;
  review?: string;
  createdAt: string;
}

export type OfferStatus = "pending" | "accepted" | "declined" | "withdrawn";

export interface Offer {
  id: string;
  missionId: string;
  companionId: string;
  status: OfferStatus;
  createdAt: string;
}

/** authorized: amount held; captured: charged after the outing; refunded: released. */
export type PaymentStatus = "authorized" | "captured" | "refunded";

export interface Payment {
  id: string;
  missionId: string;
  payerId: string;
  amountCents: number;
  giftMinutes: number;
  cardCents: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface GiftCard {
  id: string;
  buyerId: string;
  seniorId: string;
  minutesTotal: number;
  minutesLeft: number;
  priceCents: number;
  createdAt: string;
}

export type NotificationType =
  | "welcome"
  | "giftReceived"
  | "newMission"
  | "offerReceived"
  | "offerAccepted"
  | "outingConfirmed"
  | "offerDeclined"
  | "missionTaken"
  | "missionCancelled"
  | "companionCancelled"
  | "missionDone"
  | "companionPaid"
  | "newReview"
  | "bookedForYou"
  | "seniorBooked"
  | "seniorRegistered"
  | "familyLinked"
  | "familyConfirmed"
  | "familyRemoved";

/** Notifications store ids, not text: names and titles are resolved at display time, in the viewer's language. */
export interface NotificationParams {
  actorId?: string;
  seniorId?: string;
  activityId?: string;
  missionId?: string;
  date?: string;
  rating?: number;
  reason?: string;
  minutes?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  params: NotificationParams;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface Intent {
  categories: Category[];
  days: DayKey[];
  moment: Moment | null;
  wantsCompanion: boolean;
  wantsGroup: boolean;
}

export interface Draft {
  activityId: string | null;
  type: OutingType;
  note: string;
  start: string;
  durationMin: number;
}

export interface Suggestion {
  activityId: string;
  reason: string;
}

export interface ChatMessage {
  id: string;
  from: "user" | "ai";
  text: string;
  suggestions?: Suggestion[];
  draft?: Draft | null;
  source?: "ai" | "demo";
  createdAt: string;
}

export interface State {
  version: number;
  /** Demo clock (local ISO time). Replace with the real date in production. */
  now: string;
  currentUserId: string | null;
  users: User[];
  links: FamilyLink[];
  activities: Activity[];
  registrations: Registration[];
  missions: Mission[];
  offers: Offer[];
  payments: Payment[];
  giftCards: GiftCard[];
  notifications: Notification[];
  chats: Record<string, ChatMessage[]>;
  seq: number;
}
