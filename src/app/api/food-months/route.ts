import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const entries = await db.orm.public.FoodEntry
    .where({ userId })
    .all();

  const months = new Map<string, {
    nepaliYear: number;
    nepaliMonth: number;
  }>();

  for (const entry of entries) {
    const key = entry.nepaliYear + "-" + entry.nepaliMonth;

    if (!months.has(key)) {
      months.set(key, {
        nepaliYear: entry.nepaliYear,
        nepaliMonth: entry.nepaliMonth,
      });
    }
  }

  const monthsList = Array.from(months.values());

  monthsList.sort((a, b) => {
    if (a.nepaliYear !== b.nepaliYear) {
      return b.nepaliYear - a.nepaliYear;
    }
    return b.nepaliMonth - a.nepaliMonth;
  });

  return Response.json(monthsList);
}
