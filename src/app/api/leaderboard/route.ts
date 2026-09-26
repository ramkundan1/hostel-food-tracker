import { db } from "@/prisma/db";
import nepaliDateConverter from "nepali-date-converter";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedYear = url.searchParams.get("year");
  const requestedMonth = url.searchParams.get("month");

  const today = new nepaliDateConverter();

  const nepaliYear = requestedYear ? Number(requestedYear) : today.getYear();
  const nepaliMonth = requestedMonth
    ? Number(requestedMonth)
    : today.getMonth();

  if (
    !Number.isInteger(nepaliYear) ||
    !Number.isInteger(nepaliMonth) ||
    nepaliMonth < 1 ||
    nepaliMonth > 12
  ) {
    return Response.json(
      { error: "Invalid Nepali year or month" },
      { status: 400 }
    );
  }

  // Deliberately not scoped to the current user — a leaderboard is
  // inherently cross-user. Only aggregate totals are exposed (spend,
  // entry count), never other users' individual meal details.
  const entries = await db.orm.public.FoodEntry
    .where({ nepaliYear, nepaliMonth })
    .all();

  const totalsByUser = new Map<
    number,
    { totalSpent: number; entryCount: number }
  >();

  for (const entry of entries) {
    const current = totalsByUser.get(entry.userId) ?? {
      totalSpent: 0,
      entryCount: 0,
    };

    current.totalSpent += entry.totalCost;
    current.entryCount += 1;
    totalsByUser.set(entry.userId, current);
  }

  const rows = await Promise.all(
    Array.from(totalsByUser.entries()).map(async ([id, totals]) => {
      const user = await db.orm.public.User.where({ id }).first();

      const displayName =
        user?.name || user?.username || user?.email.split("@")[0] || "Someone";

      return {
        userId: id,
        displayName,
        isYou: id === userId,
        ...totals,
      };
    })
  );

  // Lowest total spend first — the "frugal champion" framing, since this
  // is a cost tracker and spending less is the fun thing to brag about.
  rows.sort((a, b) => a.totalSpent - b.totalSpent);

  return Response.json({
    nepaliYear,
    nepaliMonth,
    rows,
  });
}
