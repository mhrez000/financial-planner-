import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness + database reachability, for load balancers and uptime checks. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "up" });
  } catch {
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
