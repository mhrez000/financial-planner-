import { getSessionUserOrNull } from "@/lib/data";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Complete account export as JSON (GDPR/APP-style data portability). */
export async function GET() {
  const user = await getSessionUserOrNull();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const [accounts, transactions, categories, rules, budgets, goals, bills, debts, habits] =
    await Promise.all([
      prisma.account.findMany({ where: { userId: user.id } }),
      prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
      prisma.category.findMany({ where: { userId: user.id } }),
      prisma.categoryRule.findMany({ where: { userId: user.id } }),
      prisma.budget.findMany({ where: { userId: user.id } }),
      prisma.goal.findMany({ where: { userId: user.id } }),
      prisma.bill.findMany({ where: { userId: user.id } }),
      prisma.debt.findMany({ where: { userId: user.id } }),
      prisma.habit.findMany({ where: { userId: user.id }, include: { logs: true } }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { name: user.name, email: user.email },
    accounts,
    transactions,
    categories,
    rules,
    budgets,
    goals,
    bills,
    debts,
    habits,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="sage-export.json"',
    },
  });
}
