import { getSessionUserOrNull } from "@/lib/data";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Serves a receipt — only to the transaction's owner. */
export async function GET(_req: Request, { params }: { params: { txnId: string } }) {
  const user = await getSessionUserOrNull();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const txn = await prisma.transaction.findUnique({
    where: { id: params.txnId, userId: user.id },
    select: { receiptKey: true },
  });
  if (!txn?.receiptKey) return new Response("Not found", { status: 404 });

  const file = await storage.get(txn.receiptKey);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
}
