import { describe, expect, it } from "vitest";
import { fingerprint, markDuplicates, normaliseMerchantKey } from "../dedupe";

describe("normaliseMerchantKey", () => {
  it("strips store numbers, punctuation and case", () => {
    expect(normaliseMerchantKey("WOOLWORTHS 2103 SYDNEY")).toBe("WOOLWORTHS SYDNEY");
    expect(normaliseMerchantKey("Netflix.com")).toBe("NETFLIX COM");
    expect(fingerprint({ date: new Date(), amountCents: -2299, merchant: "NETFLIX.COM" })).toBe(
      fingerprint({ date: new Date(), amountCents: -2299, merchant: "netflix com" }),
    );
  });
});

describe("markDuplicates", () => {
  const base = { amountCents: -4550, merchant: "COLES 0441 CHATSWOOD" };

  it("flags same amount+merchant within ±1 day of an existing txn", () => {
    const existing = [{ ...base, date: new Date("2026-07-10") }];
    const incoming = [
      { ...base, date: new Date("2026-07-11") }, // posted next day → duplicate
      { ...base, date: new Date("2026-07-15") }, // genuinely new
      { amountCents: -4551, merchant: base.merchant, date: new Date("2026-07-10") }, // different cents
    ];
    expect(markDuplicates(incoming, existing)).toEqual([true, false, false]);
  });

  it("catches repeats within the incoming batch itself", () => {
    const incoming = [
      { ...base, date: new Date("2026-07-10") },
      { ...base, date: new Date("2026-07-10") },
    ];
    expect(markDuplicates(incoming, [])).toEqual([false, true]);
  });
});
