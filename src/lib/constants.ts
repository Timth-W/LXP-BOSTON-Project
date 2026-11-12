import type { Category, DayKey, OutingType, Relation, Role, SectorId } from "./types";

export const APP_NAME = "JoyTo";

export const CATEGORY_IDS: Category[] = ["gardening", "cooking", "games", "culture", "walk", "music", "coffee"];
export const OUTING_TYPE_IDS: OutingType[] = ["activity", "walk", "errands", "company"];
export const SECTOR_IDS: SectorId[] = ["gardens", "centre", "station", "university"];
export const RELATION_IDS: Relation[] = ["son", "daughter", "grandchild", "partner", "friend", "neighbour", "other"];

export const HOME_BY_ROLE: Record<Role, string> = {
  senior: "/senior",
  companion: "/companion",
  family: "/family",
};

/** Index = Date.getDay() (0 = Sunday). */
export const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const WEEK_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Business model (see the business plan). */
export const PRICING = {
  /** Price of one hour of accompanied outing, in cents (VAT included). */
  hourlyCents: 2500,
  /** Minimum billed duration, in minutes. */
  minimumMinutes: 60,
  /** Billing step after the first hour, in minutes. */
  stepMinutes: 15,
  /** Share paid to the companion. */
  companionShare: 0.7,
  /** Gift card: 5 hours for 115 €. */
  giftCard: { minutes: 300, priceCents: 11500 },
} as const;

/** Demo clock: Thursday morning, then Sunday evening to show what happens after an outing. */
export const DEMO_NOW = "2026-11-12T10:00";
export const DEMO_LATER = "2026-11-15T18:00";

/** Family alert threshold: number of days without any outing. */
export const NO_OUTING_ALERT_DAYS = 14;

/** Password of every demo account (shown on the welcome screen). */
export const DEMO_PASSWORD = "demo1234";

export const PASSWORD_MIN_LENGTH = 8;
