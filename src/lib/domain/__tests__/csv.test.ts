import { describe, expect, it } from "vitest";
import { parseTransactionsCsv } from "../csv";

describe("parseTransactionsCsv", () => {
  it("parses a headered CSV with signed amounts (dd/mm/yyyy)", () => {
    const csv = [
      "Date,Amount,Description,Balance",
      '15/07/2026,-45.50,"WOOLWORTHS 2103 SYDNEY",+1200.00',
      "16/07/2026,2230.00,ACME PTY LTD SALARY,3430.00",
    ].join("\n");
    const { rows, skipped } = parseTransactionsCsv(csv);
    expect(skipped).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].amountCents).toBe(-4550);
    expect(rows[0].merchant).toBe("WOOLWORTHS 2103 SYDNEY");
    expect(rows[0].date.getDate()).toBe(15);
    expect(rows[0].date.getMonth()).toBe(6);
    expect(rows[1].amountCents).toBe(223000);
  });

  it("parses Debit/Credit column layouts (ING style)", () => {
    const csv = [
      "Date,Description,Debit,Credit",
      "01/07/2026,NETFLIX.COM,22.99,",
      "03/07/2026,SALARY,,2230.00",
    ].join("\n");
    const { rows } = parseTransactionsCsv(csv);
    expect(rows[0].amountCents).toBe(-2299);
    expect(rows[1].amountCents).toBe(223000);
  });

  it("parses headerless CBA-style exports", () => {
    const csv = ['12/07/2026,"-15.80","SINGLE ORIGIN CAFE","+984.20"', '13/07/2026,"-89.00","AUSSIE BROADBAND","+895.20"'].join("\n");
    const { rows, skipped } = parseTransactionsCsv(csv);
    expect(skipped).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].merchant).toBe("SINGLE ORIGIN CAFE");
    expect(rows[0].amountCents).toBe(-1580);
  });

  it("handles ISO dates, quoted commas, and reports bad lines", () => {
    const csv = [
      "Date,Amount,Description",
      '2026-07-15,-12.00,"CAFE, THE FANCY ONE"',
      "not-a-date,-5.00,MYSTERY",
      "16/07/2026,zero,BROKEN AMOUNT",
    ].join("\n");
    const { rows, skipped } = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].merchant).toBe("CAFE, THE FANCY ONE");
    expect(skipped.map((s) => s.reason)).toEqual(["unparseable date", "no amount"]);
  });
});
