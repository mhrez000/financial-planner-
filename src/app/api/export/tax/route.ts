import { getSessionUserOrNull } from "@/lib/data";
import { prisma } from "@/lib/db";
import { currentFinancialYear, financialYear } from "@/lib/domain/tax";

export const dynamic = "force-dynamic";

/** EOFY deductions export — one CSV your accountant can actually use. */
export async function GET(request: Request) {
  const user = await getSessionUserOrNull();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const fyParam = Number(new URL(request.url).searchParams.get("fy"));
  const fy = fyParam ? financialYear(fyParam) : currentFinancialYear(new Date());

  const txns = await prisma.transaction.findMany({
    where: { userId: user.id, taxDeductible: true, date: { gte: fy.from, lte: fy.to } },
    include: { category: true, account: true },
    orderBy: { date: "asc" },
  });

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    `Sage EOFY deduction export,${fy.label}`,
    "Date,Merchant,Category,Account,Amount",
    ...txns.map((t) =>
      [
        t.date.toISOString().slice(0, 10),
        esc(t.merchant),
        esc(t.category?.name ?? ""),
        esc(t.account.name),
        (Math.abs(t.amountCents) / 100).toFixed(2),
      ].join(","),
    ),
    `Total,,,,${(txns.reduce((a, t) => a + Math.abs(t.amountCents), 0) / 100).toFixed(2)}`,
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sage-deductions-${fy.label.replace("–", "-")}.csv"`,
    },
  });
}
