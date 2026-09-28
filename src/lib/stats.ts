// Streaks, badges and points, computed from a user's meal entries.
// Shared by /api/stats (your own numbers) and /api/leaderboard (everyone's).

export type StatsEntry = {
  date: string;
  chicken: boolean;
};

export type Badge = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  earned: boolean;
};

export type UserStats = {
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  chickenCount: number;
  badges: Badge[];
  points: number;
  level: string;
};

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

// Points: 10 per meal logged, 50 per badge earned, 5 per day of current streak.
export function computeStats(entries: StatsEntry[]): UserStats {
  const distinctDays = Array.from(
    new Set(entries.map((entry) => dateOnly(entry.date)))
  ).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // newest first

  const today = dateOnly(new Date().toISOString());
  const yesterday = addDays(today, -1);

  let currentStreak = 0;

  if (distinctDays.length > 0) {
    const mostRecent = distinctDays[0];

    if (mostRecent === today || mostRecent === yesterday) {
      currentStreak = 1;
      let cursor = mostRecent;

      for (let i = 1; i < distinctDays.length; i++) {
        if (distinctDays[i] === addDays(cursor, -1)) {
          currentStreak++;
          cursor = distinctDays[i];
        } else {
          break;
        }
      }
    }
  }

  let longestStreak = distinctDays.length > 0 ? 1 : 0;
  let run = distinctDays.length > 0 ? 1 : 0;

  for (let i = 1; i < distinctDays.length; i++) {
    if (distinctDays[i] === addDays(distinctDays[i - 1], -1)) {
      run++;
    } else {
      run = 1;
    }

    if (run > longestStreak) longestStreak = run;
  }

  const totalEntries = entries.length;
  const chickenCount = entries.filter((e) => e.chicken).length;

  const badges: Badge[] = [
    { id: "first-bite", title: "First Bite", emoji: "🍽️", description: "Log your first meal", earned: totalEntries >= 1 },
    { id: "week-warrior", title: "Week Warrior", emoji: "🔥", description: "Hit a 7-day logging streak", earned: longestStreak >= 7 },
    { id: "fortnight-fighter", title: "Fortnight Fighter", emoji: "⚡", description: "Hit a 14-day logging streak", earned: longestStreak >= 14 },
    { id: "monthly-regular", title: "Monthly Regular", emoji: "📅", description: "Log 30 meals total", earned: totalEntries >= 30 },
    { id: "century-club", title: "Century Club", emoji: "💯", description: "Log 100 meals total", earned: totalEntries >= 100 },
    { id: "chicken-enjoyer", title: "Chicken Enjoyer", emoji: "🍗", description: "Order chicken 20 times", earned: chickenCount >= 20 },
  ];

  const earnedCount = badges.filter((b) => b.earned).length;
  const points = totalEntries * 10 + earnedCount * 50 + currentStreak * 5;

  const level =
    points >= 1200
      ? "Legend 👑"
      : points >= 400
        ? "Foodie 🔥"
        : points >= 100
          ? "Regular 🍛"
          : "Newbie 🐣";

  return { currentStreak, longestStreak, totalEntries, chickenCount, badges, points, level };
}
