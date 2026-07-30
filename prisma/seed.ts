/**
 * Seeds a realistic 8-month Australian household dataset for the demo user.
 * Deterministic (seeded PRNG) so screenshots, tests and reviews are stable.
 */
import { PrismaClient } from "@prisma/client";
import { categorise } from "../src/lib/domain/categorise";
import { DEFAULT_CATEGORIES } from "../src/lib/domain/categories";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

// Mulberry32 — small deterministic PRNG
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260720);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const jitter = (cents: number, pct: number) => Math.round(cents * (1 + (rand() * 2 - 1) * pct));

const NOW = new Date();
const MONTHS_BACK = 8;

const CATEGORIES = DEFAULT_CATEGORIES;

interface MerchantSpec {
  merchant: string;
  min: number; // dollars
  max: number;
  perMonth: number; // average occurrences
  weekendBias?: number; // 0-1, extra probability of falling on Fri-Sun
}

const SPEND_MERCHANTS: MerchantSpec[] = [
  { merchant: "WOOLWORTHS 2103 SYDNEY", min: 40, max: 180, perMonth: 6 },
  { merchant: "COLES 0441 CHATSWOOD", min: 25, max: 120, perMonth: 4 },
  { merchant: "ALDI STORES NORTH RYDE", min: 30, max: 90, perMonth: 2 },
  { merchant: "SINGLE ORIGIN CAFE", min: 5, max: 14, perMonth: 14 },
  { merchant: "CAMPOS COFFEE NEWTOWN", min: 5, max: 12, perMonth: 6 },
  { merchant: "MCDONALDS PARRAMATTA", min: 12, max: 34, perMonth: 3, weekendBias: 0.5 },
  { merchant: "GUZMAN Y GOMEZ MACQUARIE", min: 15, max: 38, perMonth: 2 },
  { merchant: "UBER EATS SYDNEY", min: 28, max: 75, perMonth: 4, weekendBias: 0.7 },
  { merchant: "THE ITALIAN PLACE SURRY HILLS", min: 60, max: 160, perMonth: 2, weekendBias: 0.8 },
  { merchant: "SUSHI TRAIN CHATSWOOD", min: 25, max: 60, perMonth: 2 },
  { merchant: "BP 7291 EPPING", min: 55, max: 95, perMonth: 3 },
  { merchant: "KMART 1054 TOP RYDE", min: 15, max: 120, perMonth: 1.5, weekendBias: 0.6 },
  { merchant: "JB HI-FI MACQUARIE", min: 30, max: 350, perMonth: 0.6, weekendBias: 0.5 },
  { merchant: "AMAZON AU MARKETPLACE", min: 18, max: 140, perMonth: 2.5 },
  { merchant: "BUNNINGS WAREHOUSE RYDE", min: 20, max: 180, perMonth: 1.2, weekendBias: 0.8 },
  { merchant: "CHEMIST WAREHOUSE EPPING", min: 12, max: 65, perMonth: 1.5 },
  { merchant: "OPAL TRANSPORT NSW", min: 20, max: 50, perMonth: 4 },
  { merchant: "EVENT CINEMAS MACQUARIE", min: 25, max: 70, perMonth: 1, weekendBias: 0.9 },
  { merchant: "DAN MURPHYS TOP RYDE", min: 30, max: 90, perMonth: 1.5, weekendBias: 0.7 },
];

// Recurring outgoings: [merchant, dollars, dayOfMonth]
const RECURRING_MONTHLY: [string, number, number][] = [
  ["NETFLIX.COM", 22.99, 4],
  ["SPOTIFY P2447D8", 13.99, 7],
  ["APPLE.COM/BILL ICLOUD", 4.49, 11],
  ["DISNEY PLUS", 15.99, 15],
  ["YOUTUBE PREMIUM", 16.99, 19],
  ["AUSSIE BROADBAND", 89.0, 12],
  ["TELSTRA MOBILE", 65.0, 20],
  ["AGL ENERGY", 145.0, 25],
  ["NRMA CAR INSURANCE", 118.5, 27],
  ["MEDIBANK PRIVATE", 210.0, 1],
  ["HOME LOAN REPAYMENT CBA", 2680.0, 2],
  ["VANGUARD AUTO-INVEST", 500.0, 16],
];
const RECURRING_FORTNIGHTLY: [string, number][] = [["ANYTIME FITNESS EPPING", 17.95]];

const SALARY_NET = 4460.0; // fortnightly, net
const SAVINGS_TRANSFER = 600.0; // fortnightly, payday automation

const c = (dollars: number) => Math.round(dollars * 100);

async function main() {
  // Idempotent reset
  await prisma.user.deleteMany();
  await prisma.household.deleteMany();
  await prisma.netWorthSnapshot.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "alex@example.com",
      name: "Alex Nguyen",
      passwordHash: hashPassword("demo1234"),
    },
  });

  const categories = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const row = await prisma.category.create({ data: { ...cat, userId: user.id } });
    categories.set(cat.name, row.id);
  }

  await prisma.categoryRule.create({
    data: {
      userId: user.id,
      pattern: "DAN MURPHYS",
      categoryId: categories.get("Entertainment")!,
      priority: 1,
    },
  });

  const accounts = {
    everyday: await prisma.account.create({
      data: { userId: user.id, name: "Everyday", institution: "CommBank", type: "TRANSACTION", balanceCents: c(4820.55) },
    }),
    saver: await prisma.account.create({
      data: { userId: user.id, name: "NetBank Saver", institution: "CommBank", type: "SAVINGS", balanceCents: c(18240.0) },
    }),
    credit: await prisma.account.create({
      data: { userId: user.id, name: "Low Rate Card", institution: "ING", type: "CREDIT_CARD", balanceCents: -c(1240.8) },
    }),
    invest: await prisma.account.create({
      data: { userId: user.id, name: "Vanguard ETFs", institution: "Vanguard", type: "INVESTMENT", balanceCents: c(31650.0) },
    }),
    superFund: await prisma.account.create({
      data: { userId: user.id, name: "Super", institution: "AustralianSuper", type: "SUPER", balanceCents: c(88400.0) },
    }),
    mortgage: await prisma.account.create({
      data: { userId: user.id, name: "Home Loan", institution: "CommBank", type: "LOAN", balanceCents: -c(486500.0) },
    }),
    property: await prisma.account.create({
      data: { userId: user.id, name: "Apartment (est.)", institution: "Manual", type: "PROPERTY", balanceCents: c(742000.0) },
    }),
  };

  const userRules = [{ pattern: "DAN MURPHYS", categoryName: "Entertainment", priority: 1 }];
  const txns: {
    date: Date;
    amountCents: number;
    merchant: string;
    accountId: string;
    categoryId: string | null;
  }[] = [];

  const catFor = (merchant: string): string | null => {
    const name = categorise(merchant, "", userRules);
    return name ? categories.get(name) ?? null : categories.get("Other") ?? null;
  };

  const monthStart = (offset: number) => new Date(NOW.getFullYear(), NOW.getMonth() - offset, 1);

  for (let m = MONTHS_BACK; m >= 0; m--) {
    const start = monthStart(m);
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const lastDay = m === 0 ? NOW.getDate() : daysInMonth;

    // Variable spending
    for (const spec of SPEND_MERCHANTS) {
      const count = Math.floor(spec.perMonth) + (rand() < spec.perMonth % 1 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        let day = 1 + Math.floor(rand() * daysInMonth);
        if (spec.weekendBias && rand() < spec.weekendBias) {
          const d = new Date(start.getFullYear(), start.getMonth(), day);
          const shift = (5 - d.getDay() + 7) % 7; // push towards Friday
          day = Math.min(daysInMonth, day + Math.min(shift, 3));
        }
        if (day > lastDay) continue;
        const hour = rand() < 0.08 ? 22 + Math.floor(rand() * 2) : 8 + Math.floor(rand() * 12);
        const date = new Date(start.getFullYear(), start.getMonth(), day, hour, Math.floor(rand() * 60));
        const amount = -c(spec.min + rand() * (spec.max - spec.min));
        txns.push({ date, amountCents: Math.round(amount), merchant: spec.merchant, accountId: accounts.everyday.id, categoryId: catFor(spec.merchant) });
      }
    }

    // Monthly recurring
    for (const [merchant, dollars, day] of RECURRING_MONTHLY) {
      if (day > lastDay) continue;
      // Netflix price rise two months ago
      const price = merchant.startsWith("NETFLIX") && m <= 1 ? 25.99 : dollars;
      const target = merchant.includes("VANGUARD") ? accounts.everyday.id : accounts.everyday.id;
      txns.push({
        date: new Date(start.getFullYear(), start.getMonth(), day, 6, 0),
        amountCents: -c(price),
        merchant,
        accountId: target,
        categoryId: catFor(merchant),
      });
    }

    // Fortnightly: salary (day 3 & 17), savings automation, gym
    for (const payday of [3, 17]) {
      if (payday > lastDay) continue;
      txns.push({
        date: new Date(start.getFullYear(), start.getMonth(), payday, 4, 0),
        amountCents: c(SALARY_NET),
        merchant: "ACME PTY LTD SALARY",
        accountId: accounts.everyday.id,
        categoryId: categories.get("Salary")!,
      });
      txns.push({
        date: new Date(start.getFullYear(), start.getMonth(), payday, 5, 0),
        amountCents: -c(SAVINGS_TRANSFER),
        merchant: "TRANSFER TO SAVINGS",
        accountId: accounts.everyday.id,
        categoryId: categories.get("Savings Transfer")!,
      });
    }
    for (const day of [5, 19]) {
      if (day > lastDay) continue;
      for (const [merchant, dollars] of RECURRING_FORTNIGHTLY) {
        txns.push({
          date: new Date(start.getFullYear(), start.getMonth(), day, 6, 0),
          amountCents: -c(dollars),
          merchant,
          accountId: accounts.everyday.id,
          categoryId: catFor(merchant),
        });
      }
    }

    // Quarterly dividend
    if (start.getMonth() % 3 === 0 && 15 <= lastDay) {
      txns.push({
        date: new Date(start.getFullYear(), start.getMonth(), 15, 4, 0),
        amountCents: c(180 + rand() * 220),
        merchant: "VANGUARD DISTRIBUTION",
        accountId: accounts.everyday.id,
        categoryId: categories.get("Investment Income")!,
      });
    }
  }

  await prisma.transaction.createMany({
    data: txns.map((t) => ({ ...t, userId: user.id, amountCents: Math.round(t.amountCents) })),
  });

  // Budgets (monthly)
  const budgets: [string, number][] = [
    ["Groceries", 900],
    ["Coffee", 120],
    ["Dining", 300],
    ["Takeaway", 180],
    ["Fast Food", 80],
    ["Shopping", 350],
    ["Entertainment", 150],
    ["Fuel", 260],
    ["Transport", 160],
  ];
  for (const [name, dollars] of budgets) {
    await prisma.budget.create({
      data: { userId: user.id, categoryId: categories.get(name)!, amountCents: c(dollars), period: "MONTHLY" },
    });
  }

  // Goals
  const goals: { name: string; icon: string; target: number; saved: number; monthly: number; monthsToDeadline: number | null }[] = [
    { name: "Emergency Fund", icon: "shield", target: 15000, saved: 11200, monthly: 600, monthsToDeadline: 8 },
    { name: "Japan Holiday", icon: "plane", target: 8000, saved: 3450, monthly: 400, monthsToDeadline: 10 },
    { name: "House Deposit Top-up", icon: "home", target: 40000, saved: 7040, monthly: 700, monthsToDeadline: 48 },
    { name: "New Car", icon: "car", target: 25000, saved: 2100, monthly: 250, monthsToDeadline: null },
  ];
  for (const g of goals) {
    await prisma.goal.create({
      data: {
        userId: user.id,
        name: g.name,
        icon: g.icon,
        targetCents: c(g.target),
        savedCents: c(g.saved),
        monthlyContribCents: c(g.monthly),
        deadline: g.monthsToDeadline
          ? new Date(NOW.getFullYear(), NOW.getMonth() + g.monthsToDeadline, 1)
          : null,
      },
    });
  }

  // Bills
  const bills: [string, number, number, string, boolean][] = [
    ["AGL Electricity", 145, 25, "MONTHLY", true],
    ["Medibank Private", 210, 1, "MONTHLY", true],
    ["NRMA Car Insurance", 118.5, 27, "MONTHLY", true],
    ["Council Rates", 412, 28, "QUARTERLY", false],
    ["Telstra Mobile", 65, 20, "MONTHLY", true],
    ["Aussie Broadband", 89, 12, "MONTHLY", true],
  ];
  for (const [name, dollars, day, frequency, autopay] of bills) {
    const next = new Date(NOW.getFullYear(), NOW.getMonth(), day);
    if (next <= NOW) next.setMonth(next.getMonth() + (frequency === "QUARTERLY" ? 3 : 1));
    await prisma.bill.create({
      data: { userId: user.id, name, amountCents: c(dollars), nextDueDate: next, frequency, autopay },
    });
  }

  // Debts
  await prisma.debt.createMany({
    data: [
      { userId: user.id, name: "Home Loan", type: "MORTGAGE", balanceCents: c(486500), aprBps: 615, minPaymentCents: c(2680) },
      { userId: user.id, name: "Low Rate Card", type: "CREDIT_CARD", balanceCents: c(1240.8), aprBps: 1349, minPaymentCents: c(62) },
      { userId: user.id, name: "Car Loan", type: "CAR_LOAN", balanceCents: c(9800), aprBps: 799, minPaymentCents: c(320) },
    ],
  });

  // Habits + streak logs
  const habitSpecs: { name: string; icon: string; daysActive: number[] }[] = [
    { name: "Bring lunch to work", icon: "salad", daysActive: [1, 2, 3, 4, 5] },
    { name: "No online shopping", icon: "ban", daysActive: [0, 1, 2, 3, 4, 5, 6] },
    { name: "Weekly money review", icon: "calendar-check", daysActive: [0] },
    { name: "Invest every payday", icon: "line-chart", daysActive: [3, 17] },
  ];
  for (const spec of habitSpecs.slice(0, 3)) {
    const habit = await prisma.habit.create({ data: { userId: user.id, name: spec.name, icon: spec.icon } });
    // Log a plausible streak over the past 30 days with ~85% adherence
    for (let d = 30; d >= 1; d--) {
      const date = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - d);
      if (spec.daysActive.includes(date.getDay()) && rand() < 0.85) {
        await prisma.habitLog.create({ data: { habitId: habit.id, date } });
      }
    }
  }

  // Investment holdings (prices manually refreshed; feed comes later)
  await prisma.holding.createMany({
    data: [
      { userId: user.id, symbol: "VAS", name: "Vanguard Australian Shares ETF", assetClass: "AU_SHARES", units: 142, avgCostCents: 8730, lastPriceCents: 9415 },
      { userId: user.id, symbol: "VGS", name: "Vanguard MSCI World ETF", assetClass: "INTL_SHARES", units: 96, avgCostCents: 10480, lastPriceCents: 12260 },
      { userId: user.id, symbol: "NDQ", name: "Betashares Nasdaq 100 ETF", assetClass: "INTL_SHARES", units: 45, avgCostCents: 3620, lastPriceCents: 4510 },
      { userId: user.id, symbol: "BTC", name: "Bitcoin", assetClass: "CRYPTO", units: 0.042, avgCostCents: 6_150_000_00, lastPriceCents: 6_930_000_00 },
    ],
  });

  // Mark plausible work-related expenses as tax-deductible (phone, transport)
  const deductibleCandidates = await prisma.transaction.findMany({
    where: { userId: user.id, merchant: { in: ["TELSTRA MOBILE", "OPAL TRANSPORT NSW"] } },
    take: 12,
  });
  await prisma.transaction.updateMany({
    where: { id: { in: deductibleCandidates.map((t) => t.id) } },
    data: { taxDeductible: true },
  });

  // An in-flight Coffee Challenge so the challenges UI shows live progress
  const challengeStart = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 9);
  await prisma.challenge.create({
    data: {
      userId: user.id,
      type: "COFFEE_CHALLENGE",
      startDate: challengeStart,
      endDate: new Date(challengeStart.getTime() + 30 * 86400_000 - 1),
      targetCents: 6000,
      xp: 200,
    },
  });

  // Net worth snapshots — monthly, trending upward
  let assets = c(820000);
  let liabilities = c(505000);
  for (let m = MONTHS_BACK; m >= 0; m--) {
    const date = new Date(NOW.getFullYear(), NOW.getMonth() - m, 1);
    assets += c(2600 + rand() * 2400);
    liabilities -= c(1500 + rand() * 900);
    await prisma.netWorthSnapshot.create({
      data: { userId: user.id, date, assetsCents: Math.round(assets), liabilitiesCents: Math.round(liabilities) },
    });
  }

  // Household: Alex + partner Sam, both with shared everyday accounts
  const household = await prisma.household.create({
    data: { name: "The Nguyen–Chen household", inviteCode: "DEMO2345" },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { householdId: household.id, householdRole: "OWNER" },
  });
  await prisma.account.update({ where: { id: accounts.everyday.id }, data: { shared: true } });
  await prisma.account.update({ where: { id: accounts.mortgage.id }, data: { shared: true } });

  const partner = await prisma.user.create({
    data: {
      email: "sam@example.com",
      name: "Sam Chen",
      passwordHash: hashPassword("demo1234"),
      householdId: household.id,
      householdRole: "MEMBER",
      categories: { create: CATEGORIES },
    },
  });
  const partnerCats = await prisma.category.findMany({ where: { userId: partner.id } });
  const pCat = (name: string) => partnerCats.find((c) => c.name === name)!.id;
  const partnerAccount = await prisma.account.create({
    data: {
      userId: partner.id,
      name: "Spending",
      institution: "ING",
      type: "TRANSACTION",
      balanceCents: c(3120.4),
      shared: true,
    },
  });
  const partnerTxns: { date: Date; amountCents: number; merchant: string; categoryId: string }[] = [];
  for (let m = 2; m >= 0; m--) {
    const start = new Date(NOW.getFullYear(), NOW.getMonth() - m, 1);
    const lastDay = m === 0 ? NOW.getDate() : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    for (const payday of [6, 20]) {
      if (payday > lastDay) continue;
      partnerTxns.push({
        date: new Date(start.getFullYear(), start.getMonth(), payday, 4, 0),
        amountCents: c(2860),
        merchant: "NORTHSIDE HEALTH PAYROLL",
        categoryId: pCat("Salary"),
      });
    }
    for (const [merchant, cat, dollars, day] of [
      ["COLES 0441 CHATSWOOD", "Groceries", 96.4, 5],
      ["WOOLWORTHS 2103 SYDNEY", "Groceries", 88.2, 15],
      ["CAMPOS COFFEE NEWTOWN", "Coffee", 6.5, 9],
      ["THE ITALIAN PLACE SURRY HILLS", "Dining", 84.0, 19],
      ["OPAL TRANSPORT NSW", "Transport", 42.6, 11],
      ["CHEMIST WAREHOUSE EPPING", "Medical", 31.9, 22],
    ] as const) {
      if (day > lastDay) continue;
      partnerTxns.push({
        date: new Date(start.getFullYear(), start.getMonth(), day, 12, 0),
        amountCents: -c(dollars),
        merchant,
        categoryId: pCat(cat),
      });
    }
  }
  await prisma.transaction.createMany({
    data: partnerTxns.map((t) => ({ ...t, userId: partner.id, accountId: partnerAccount.id })),
  });

  console.log(`Seeded ${txns.length} transactions for ${user.name} (+${partnerTxns.length} for ${partner.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
