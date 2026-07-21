/**
 * Bank CSV parsing.
 *
 * Australian banks export wildly different CSVs: CBA has no header and
 * dd/mm/yyyy dates; ING uses Debit/Credit columns; others use a signed
 * Amount. This parser detects the layout from the data instead of asking
 * the user to configure column mappings.
 */

export interface ParsedCsvRow {
  date: Date;
  amountCents: number; // negative = spend
  merchant: string;
  raw: string;
}

export interface CsvParseResult {
  rows: ParsedCsvRow[];
  skipped: { line: number; reason: string }[];
}

/** Split one CSV line respecting double quotes. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseDate(s: string): Date | null {
  const cleaned = s.trim().replace(/"/g, "");
  // dd/mm/yyyy or dd-mm-yyyy (Australian banks)
  let m = cleaned.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12);
    return isNaN(d.getTime()) ? null : d;
  }
  // yyyy-mm-dd
  m = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseMoney(s: string): number | null {
  const cleaned = s.replace(/[$,\s"]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const m = cleaned.match(/^\(?([+-]?\d+(?:\.\d{1,2})?)\)?$/);
  if (!m) return null;
  let value = Number(m[1]);
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) value = -Math.abs(value);
  return Math.round(value * 100);
}

const HEADER_WORDS = /date|amount|debit|credit|description|narrative|balance|memo|payee/i;

export function parseTransactionsCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], skipped: [] };

  const first = splitLine(lines[0]);
  const hasHeader = first.some((c) => HEADER_WORDS.test(c)) && parseDate(first[0]) === null;

  // Column discovery
  let dateCol = 0;
  let amountCol = -1;
  let debitCol = -1;
  let creditCol = -1;
  let descCol = -1;

  if (hasHeader) {
    first.forEach((h, i) => {
      const l = h.toLowerCase();
      if (l.includes("date") && !l.includes("update")) dateCol = i;
      else if (l.includes("debit")) debitCol = i;
      else if (l.includes("credit")) creditCol = i;
      else if (l.includes("amount") && amountCol === -1) amountCol = i;
      else if (/description|narrative|memo|payee|details/.test(l) && descCol === -1) descCol = i;
    });
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const skipped: CsvParseResult["skipped"] = [];
  const rows: ParsedCsvRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const lineNo = i + (hasHeader ? 2 : 1);
    const cells = splitLine(dataLines[i]);
    if (cells.length < 2) {
      skipped.push({ line: lineNo, reason: "too few columns" });
      continue;
    }

    // Headerless (e.g. CBA): infer per file once — date, amount, description, [balance]
    if (!hasHeader && amountCol === -1 && debitCol === -1) {
      dateCol = cells.findIndex((c) => parseDate(c) !== null);
      amountCol = cells.findIndex((c, j) => j !== dateCol && parseMoney(c) !== null);
      descCol = cells.findIndex((c, j) => j !== dateCol && j !== amountCol && parseMoney(c) === null);
      if (dateCol === -1 || amountCol === -1) {
        skipped.push({ line: lineNo, reason: "could not infer columns" });
        continue;
      }
    }

    const date = parseDate(cells[dateCol] ?? "");
    if (!date) {
      skipped.push({ line: lineNo, reason: "unparseable date" });
      continue;
    }

    let amountCents: number | null = null;
    if (debitCol !== -1 || creditCol !== -1) {
      const debit = debitCol !== -1 ? parseMoney(cells[debitCol] ?? "") : null;
      const credit = creditCol !== -1 ? parseMoney(cells[creditCol] ?? "") : null;
      if (debit !== null && debit !== 0) amountCents = -Math.abs(debit);
      else if (credit !== null && credit !== 0) amountCents = Math.abs(credit);
    } else if (amountCol !== -1) {
      amountCents = parseMoney(cells[amountCol] ?? "");
    }
    if (amountCents === null || amountCents === 0) {
      skipped.push({ line: lineNo, reason: "no amount" });
      continue;
    }

    const merchant =
      (descCol !== -1 ? cells[descCol] : cells.find((c, j) => j !== dateCol && parseMoney(c) === null)) ??
      "Unknown";

    rows.push({ date, amountCents, merchant: merchant.replace(/\s+/g, " ").trim() || "Unknown", raw: dataLines[i] });
  }

  return { rows, skipped };
}
