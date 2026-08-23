import { getSessionUserOrNull } from "@/lib/data";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Full transaction history as CSV — data portability is a feature, not a favour. */
export async function GET() {
  const user = await getSessionUserOrNull();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const txns = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    "Date,Merchant,Category,Account,Amount",
    ...txns.map((t) =>
      [
        t.date.toISOString().slice(0, 10),
        esc(t.merchant),
        esc(t.category?.name ?? ""),
        esc(t.account.name),
        (t.amountCents / 100).toFixed(2),
      ].join(","),
    ),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sage-transactions.csv"',
    },
  });
}
