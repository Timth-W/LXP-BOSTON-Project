import { PRICING } from "./constants";

export interface PriceBreakdown {
  billedMinutes: number;
  totalCents: number;
  companionCents: number;
  platformCents: number;
}

/** One hour minimum, then billed by the quarter hour. */
export function billedMinutes(durationMin: number): number {
  const { minimumMinutes, stepMinutes } = PRICING;
  return Math.max(minimumMinutes, Math.ceil(durationMin / stepMinutes) * stepMinutes);
}

export function centsForMinutes(minutes: number): number {
  return Math.round((minutes / 60) * PRICING.hourlyCents);
}

export function priceFor(durationMin: number): PriceBreakdown {
  const minutes = billedMinutes(durationMin);
  const totalCents = centsForMinutes(minutes);
  const companionCents = Math.round(totalCents * PRICING.companionShare);
  return { billedMinutes: minutes, totalCents, companionCents, platformCents: totalCents - companionCents };
}

/** Splits a price between the senior's gift card balance and the card of the payer. */
export function splitPayment(durationMin: number, giftMinutesAvailable: number) {
  const price = priceFor(durationMin);
  const giftMinutes = Math.min(Math.max(giftMinutesAvailable, 0), price.billedMinutes);
  const cardCents = centsForMinutes(price.billedMinutes - giftMinutes);
  return { ...price, giftMinutes, cardCents };
}
