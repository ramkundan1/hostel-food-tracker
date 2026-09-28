import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { computeStats } from "@/lib/stats";

type BoardRow = {
  userId: number;
  displayName: string;
  points: number;
  level: string;
  currentStreak: number;
  totalEntries: number;
  badges: string[];
};

// Building the board means reading every user's meals, so the result is kept
// for a minute and reused. It lives in each server instance's memory; anyone
// opening the page within that minute gets it instantly.
const CACHE_MS = 60 * 1000;
let cache: { builtAt: number; rows: BoardRow[] } | null = null;

async function buildBoard(): Promise<BoardRow[]> {
  // All three queries run at the same time. Two queries cover every meal
  // (rather than one per user), so the count stays fixed as people join.
  const [users, lunches, dinners] = await Promise.all([
    db.orm.public.User.where({ emailVerified: true }).all(),
    db.orm.public.FoodEntry.where({ mealType: "lunch" }).all(),
    db.orm.public.FoodEntry.where({ mealType: "dinner" }).all(),
  ]);

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

  return rows;
}

// Everyone-vs-everyone leaderboard, visible to any logged-in user.
// Only shares nickname, points, level, streak and badges — never emails,
// ages, or money.
export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!cache || Date.now() - cache.builtAt > CACHE_MS) {
    cache = { builtAt: Date.now(), rows: await buildBoard() };
  }

  const rows = cache.rows.map((row) => ({
    ...row,
    isYou: row.userId === userId,
  }));

  return Response.json({ rows });
}
