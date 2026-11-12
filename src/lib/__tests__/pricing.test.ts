import { describe, expect, it } from "vitest";
import { billedMinutes, priceFor, splitPayment } from "../pricing";

describe("pricing", () => {
  it("bills one hour minimum, then by the quarter hour", () => {
    expect(billedMinutes(30)).toBe(60);
    expect(billedMinutes(60)).toBe(60);
    expect(billedMinutes(61)).toBe(75);
    expect(billedMinutes(150)).toBe(150);
  });

  it("charges 25 euros per hour and gives 70% to the companion", () => {
    expect(priceFor(60)).toEqual({ billedMinutes: 60, totalCents: 2500, companionCents: 1750, platformCents: 750 });
    expect(priceFor(150).totalCents).toBe(6250);
  });

  it("uses the gift card before the bank card", () => {
    expect(splitPayment(150, 300)).toMatchObject({ giftMinutes: 150, cardCents: 0 });
    expect(splitPayment(150, 60)).toMatchObject({ giftMinutes: 60, cardCents: 3750 });
    expect(splitPayment(90, 0)).toMatchObject({ giftMinutes: 0, cardCents: 3750 });
  });
});
