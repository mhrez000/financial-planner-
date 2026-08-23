import { describe, expect, it } from "vitest";
import { categorise } from "../categorise";

describe("categorise", () => {
  it("matches built-in Australian merchants", () => {
    expect(categorise("WOOLWORTHS 1234 SYDNEY", "")).toBe("Groceries");
    expect(categorise("MCDONALDS PARRAMATTA", "")).toBe("Fast Food");
    expect(categorise("NETFLIX.COM", "")).toBe("Subscriptions");
  });

  it("is case-insensitive and searches description too", () => {
    expect(categorise("Direct Debit", "netflix monthly")).toBe("Subscriptions");
  });

  it("prefers user rules over built-in rules", () => {
    const userRules = [{ pattern: "WOOLWORTHS", categoryName: "Work Lunches", priority: 0 }];
    expect(categorise("WOOLWORTHS METRO", "", userRules)).toBe("Work Lunches");
  });

  it("prefers higher priority, then longer pattern", () => {
    const rules = [
      { pattern: "UBER", categoryName: "Transport", priority: 0 },
      { pattern: "UBER EATS", categoryName: "Takeaway", priority: 0 },
    ];
    expect(categorise("UBER EATS SYDNEY", "", rules)).toBe("Takeaway");
    const prioritised = [
      { pattern: "UBER", categoryName: "Business Travel", priority: 5 },
      { pattern: "UBER EATS", categoryName: "Takeaway", priority: 0 },
    ];
    expect(categorise("UBER EATS SYDNEY", "", prioritised)).toBe("Business Travel");
  });

  it("returns null for unknown merchants", () => {
    expect(categorise("TOTALLY UNKNOWN SHOP", "")).toBeNull();
  });
});
