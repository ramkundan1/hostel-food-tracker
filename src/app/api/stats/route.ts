import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

function dateOnly(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateOnlyStr: string, days: number): string {
  const d = new Date(dateOnlyStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return dateOnly(d.toISOString());
}

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const entries = await db.orm.public.FoodEntry.where({ userId }).all();

  const distinctDays = Array.from(
    new Set(entries.map((entry) => dateOnly(entry.date)))
  ).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // descending

  const today = dateOnly(new Date().toISOString());
  const yesterday = addDays(today, -1);

  let currentStreak = 0;

  if (distinctDays.length > 0) {
    const mostRecent = distinctDays[0];

    if (mostRecent === today || mostRecent === yesterday) {
      currentStreak = 1;
      let cursor = mostRecent;

      for (let i = 1; i < distinctDays.length; i++) {
        const expectedPrev = addDays(cursor, -1);

        if (distinctDays[i] === expectedPrev) {
          currentStreak++;
          cursor = distinctDays[i];
        } else {
          break;
        }
      }
    }
  }

  // Longest streak ever, scanning the full (already descending) day list.
  let longestStreak = distinctDays.length > 0 ? 1 : 0;
  let run = distinctDays.length > 0 ? 1 : 0;

  for (let i = 1; i < distinctDays.length; i++) {
    const expectedPrev = addDays(distinctDays[i - 1], -1);

    if (distinctDays[i] === expectedPrev) {
      run++;
    } else {
      run = 1;
    }

    if (run > longestStreak) longestStreak = run;
  }

  const totalEntries = entries.length;
  const chickenCount = entries.filter((e) => e.chicken).length;
  const totalSpent = entries.reduce((sum, e) => sum + e.totalCost, 0);

  const badges = [
    {
      id: "first-bite",
      title: "First Bite",
      emoji: "🍽️",
      description: "Log your first meal",
      earned: totalEntries >= 1,
    },
    {
      id: "week-warrior",
      title: "Week Warrior",
      emoji: "🔥",
      description: "Hit a 7-day logging streak",
      earned: longestStreak >= 7,
    },
    {
      id: "fortnight-fighter",
      title: "Fortnight Fighter",
      emoji: "⚡",
      description: "Hit a 14-day logging streak",
      earned: longestStreak >= 14,
    },
    {
      id: "monthly-regular",
      title: "Monthly Regular",
      emoji: "📅",
      description: "Log 30 meals total",
      earned: totalEntries >= 30,
    },
    {
      id: "century-club",
      title: "Century Club",
      emoji: "💯",
      description: "Log 100 meals total",
      earned: totalEntries >= 100,
    },
    {
      id: "chicken-enjoyer",
      title: "Chicken Enjoyer",
      emoji: "🍗",
      description: "Order chicken 20 times",
      earned: chickenCount >= 20,
    },
  ];

  return Response.json({
    currentStreak,
    longestStreak,
    totalEntries,
    totalSpent,
    chickenCount,
    badges,
  });
}
