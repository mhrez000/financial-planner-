import { describe, expect, it } from "vitest";
import { currentFinancialYear, financialYear } from "../tax";

describe("financial year (AU)", () => {
  it("runs 1 July to 30 June, named by end year", () => {
    const fy = financialYear(2026);
    expect(fy.label).toBe("FY2025–26");
    expect(fy.from).toEqual(new Date(2025, 6, 1));
    expect(fy.to.getFullYear()).toBe(2026);
    expect(fy.to.getMonth()).toBe(5);
    expect(fy.to.getDate()).toBe(30);
  });

  it("resolves the current FY either side of 1 July", () => {
    expect(currentFinancialYear(new Date(2026, 5, 30)).endYear).toBe(2026); // 30 June
    expect(currentFinancialYear(new Date(2026, 6, 1)).endYear).toBe(2027); // 1 July
  });
});
