/**
 * Default category set, shared by the seed script and new-user registration
 * so every account starts with the same Australian-tuned vocabulary.
 */
export const DEFAULT_CATEGORIES: { name: string; group: string; icon: string }[] = [
  { name: "Salary", group: "INCOME", icon: "banknote" },
  { name: "Investment Income", group: "INCOME", icon: "trending-up" },
  { name: "Groceries", group: "ESSENTIAL", icon: "shopping-cart" },
  { name: "Mortgage", group: "ESSENTIAL", icon: "home" },
  { name: "Rent", group: "ESSENTIAL", icon: "home" },
  { name: "Utilities", group: "ESSENTIAL", icon: "zap" },
  { name: "Phone & Internet", group: "ESSENTIAL", icon: "wifi" },
  { name: "Insurance", group: "ESSENTIAL", icon: "shield" },
  { name: "Fuel", group: "ESSENTIAL", icon: "fuel" },
  { name: "Transport", group: "ESSENTIAL", icon: "bus" },
  { name: "Medical", group: "ESSENTIAL", icon: "heart-pulse" },
  { name: "Coffee", group: "LIFESTYLE", icon: "coffee" },
  { name: "Dining", group: "LIFESTYLE", icon: "utensils" },
  { name: "Fast Food", group: "LIFESTYLE", icon: "pizza" },
  { name: "Takeaway", group: "LIFESTYLE", icon: "bike" },
  { name: "Shopping", group: "LIFESTYLE", icon: "shopping-bag" },
  { name: "Entertainment", group: "LIFESTYLE", icon: "clapperboard" },
  { name: "Subscriptions", group: "LIFESTYLE", icon: "repeat" },
  { name: "Health & Fitness", group: "LIFESTYLE", icon: "dumbbell" },
  { name: "Home", group: "LIFESTYLE", icon: "hammer" },
  { name: "Travel", group: "LIFESTYLE", icon: "plane" },
  { name: "Investing", group: "FINANCIAL", icon: "line-chart" },
  { name: "Savings Transfer", group: "FINANCIAL", icon: "piggy-bank" },
  { name: "Other", group: "LIFESTYLE", icon: "circle" },
];
