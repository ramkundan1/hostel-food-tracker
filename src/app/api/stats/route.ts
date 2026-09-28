import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { computeStats } from "@/lib/stats";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const entries = await db.orm.public.FoodEntry.where({ userId }).all();

  return Response.json(computeStats(entries));
}
