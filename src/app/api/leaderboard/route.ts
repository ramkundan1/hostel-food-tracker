import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { computeStats } from "@/lib/stats";

// Everyone-vs-everyone leaderboard, visible to any logged-in user.
// Only shares nickname, points, level, streak and badges — never emails,
// ages, or money.
export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const users = await db.orm.public.User.where({ emailVerified: true }).all();

  // Two queries for all entries (rather than one per user), so the number of
  // database calls stays fixed as more people join.
  const lunches = await db.orm.public.FoodEntry
    .where({ mealType: "lunch" })
    .all();
  const dinners = await db.orm.public.FoodEntry
    .where({ mealType: "dinner" })
    .all();

  const entriesByUser = new Map<number, typeof lunches>();

  for (const entry of [...lunches, ...dinners]) {
    const list = entriesByUser.get(entry.userId) ?? [];
    list.push(entry);
    entriesByUser.set(entry.userId, list);
  }

  const rows = users.map((user) => {
    const stats = computeStats(entriesByUser.get(user.id) ?? []);

    return {
      userId: user.id,
      displayName: user.name?.trim() || "Anonymous eater",
      isYou: user.id === userId,
      points: stats.points,
      level: stats.level,
      currentStreak: stats.currentStreak,
      totalEntries: stats.totalEntries,
      badges: stats.badges.filter((b) => b.earned).map((b) => b.emoji),
    };
  });

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.totalEntries - a.totalEntries ||
      a.displayName.localeCompare(b.displayName)
  );

  return Response.json({ rows });
}
