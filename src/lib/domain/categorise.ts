/**
 * Smart categorisation engine.
 *
 * Two layers:
 *  1. User-defined rules (highest priority wins) — e.g. "MCD" → Fast Food.
 *  2. A built-in Australian merchant knowledge base as fallback.
 *
 * Both layers are plain data, so the same engine runs on web, mobile and in
 * background sync jobs. An ML/LLM layer can slot in behind this as a third
 * fallback without changing the interface.
 */

export interface Rule {
  pattern: string;
  categoryName: string;
  priority: number;
}

/** Built-in merchant → category knowledge base (Australian-first). */
export const BUILT_IN_RULES: Rule[] = [
  { pattern: "WOOLWORTHS", categoryName: "Groceries", priority: 0 },
  { pattern: "COLES", categoryName: "Groceries", priority: 0 },
  { pattern: "ALDI", categoryName: "Groceries", priority: 0 },
  { pattern: "IGA", categoryName: "Groceries", priority: 0 },
  { pattern: "MCD", categoryName: "Fast Food", priority: 0 },
  { pattern: "MCDONALD", categoryName: "Fast Food", priority: 0 },
  { pattern: "KFC", categoryName: "Fast Food", priority: 0 },
  { pattern: "HUNGRY JACK", categoryName: "Fast Food", priority: 0 },
  { pattern: "GUZMAN", categoryName: "Fast Food", priority: 0 },
  { pattern: "UBER EATS", categoryName: "Takeaway", priority: 1 },
  { pattern: "MENULOG", categoryName: "Takeaway", priority: 0 },
  { pattern: "DOORDASH", categoryName: "Takeaway", priority: 0 },
  { pattern: "CAFE", categoryName: "Coffee", priority: 0 },
  { pattern: "COFFEE", categoryName: "Coffee", priority: 0 },
  { pattern: "ESPRESSO", categoryName: "Coffee", priority: 0 },
  { pattern: "BP ", categoryName: "Fuel", priority: 0 },
  { pattern: "SHELL", categoryName: "Fuel", priority: 0 },
  { pattern: "AMPOL", categoryName: "Fuel", priority: 0 },
  { pattern: "7-ELEVEN FUEL", categoryName: "Fuel", priority: 0 },
  { pattern: "NETFLIX", categoryName: "Subscriptions", priority: 0 },
  { pattern: "SPOTIFY", categoryName: "Subscriptions", priority: 0 },
  { pattern: "APPLE.COM/BILL", categoryName: "Subscriptions", priority: 0 },
  { pattern: "DISNEY", categoryName: "Subscriptions", priority: 0 },
  { pattern: "YOUTUBE PREMIUM", categoryName: "Subscriptions", priority: 0 },
  { pattern: "ICLOUD", categoryName: "Subscriptions", priority: 0 },
  { pattern: "ANYTIME FITNESS", categoryName: "Health & Fitness", priority: 0 },
  { pattern: "GYM", categoryName: "Health & Fitness", priority: 0 },
  { pattern: "CHEMIST", categoryName: "Medical", priority: 0 },
  { pattern: "PHARMACY", categoryName: "Medical", priority: 0 },
  { pattern: "MEDICARE", categoryName: "Medical", priority: 0 },
  { pattern: "AGL", categoryName: "Utilities", priority: 0 },
  { pattern: "ORIGIN ENERGY", categoryName: "Utilities", priority: 0 },
  { pattern: "ENERGYAUSTRALIA", categoryName: "Utilities", priority: 0 },
  { pattern: "SYDNEY WATER", categoryName: "Utilities", priority: 0 },
  { pattern: "TELSTRA", categoryName: "Phone & Internet", priority: 0 },
  { pattern: "OPTUS", categoryName: "Phone & Internet", priority: 0 },
  { pattern: "VODAFONE", categoryName: "Phone & Internet", priority: 0 },
  { pattern: "AUSSIE BROADBAND", categoryName: "Phone & Internet", priority: 0 },
  { pattern: "KMART", categoryName: "Shopping", priority: 0 },
  { pattern: "TARGET", categoryName: "Shopping", priority: 0 },
  { pattern: "BIG W", categoryName: "Shopping", priority: 0 },
  { pattern: "JB HI-FI", categoryName: "Shopping", priority: 0 },
  { pattern: "AMAZON", categoryName: "Shopping", priority: 0 },
  { pattern: "BUNNINGS", categoryName: "Home", priority: 0 },
  { pattern: "IKEA", categoryName: "Home", priority: 0 },
  { pattern: "OPAL", categoryName: "Transport", priority: 0 },
  { pattern: "MYKI", categoryName: "Transport", priority: 0 },
  { pattern: "UBER *TRIP", categoryName: "Transport", priority: 0 },
  { pattern: "QANTAS", categoryName: "Travel", priority: 0 },
  { pattern: "JETSTAR", categoryName: "Travel", priority: 0 },
  { pattern: "AIRBNB", categoryName: "Travel", priority: 0 },
  { pattern: "SALARY", categoryName: "Salary", priority: 0 },
  { pattern: "PAYROLL", categoryName: "Salary", priority: 0 },
  { pattern: "DIVIDEND", categoryName: "Investment Income", priority: 0 },
  { pattern: "DISTRIBUTION", categoryName: "Investment Income", priority: 0 },
  { pattern: "MORTGAGE", categoryName: "Mortgage", priority: 0 },
  { pattern: "HOME LOAN", categoryName: "Mortgage", priority: 0 },
  { pattern: "RENT", categoryName: "Rent", priority: 0 },
  { pattern: "NRMA", categoryName: "Insurance", priority: 0 },
  { pattern: "INSURANCE", categoryName: "Insurance", priority: 0 },
  { pattern: "BUPA", categoryName: "Insurance", priority: 0 },
  { pattern: "MEDIBANK", categoryName: "Insurance", priority: 0 },
  { pattern: "VANGUARD", categoryName: "Investing", priority: 0 },
  { pattern: "COMMSEC", categoryName: "Investing", priority: 0 },
  { pattern: "PEARLER", categoryName: "Investing", priority: 0 },
  { pattern: "RAIZ", categoryName: "Investing", priority: 0 },
  { pattern: "TRANSFER TO SAVINGS", categoryName: "Savings Transfer", priority: 0 },
];

/**
 * Resolve a category name for a transaction. User rules always beat built-in
 * rules; within a layer, higher priority wins, then longer (more specific)
 * pattern wins.
 */
export function categorise(
  merchant: string,
  description: string,
  userRules: Rule[] = [],
): string | null {
  const haystack = `${merchant} ${description}`.toUpperCase();
  const match = (rules: Rule[]) =>
    rules
      .filter((r) => haystack.includes(r.pattern.toUpperCase()))
      .sort((a, b) => b.priority - a.priority || b.pattern.length - a.pattern.length)[0] ?? null;

  return (match(userRules) ?? match(BUILT_IN_RULES))?.categoryName ?? null;
}
