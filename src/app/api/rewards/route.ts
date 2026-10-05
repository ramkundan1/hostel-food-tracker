import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { computeStats, levelForPoints } from "@/lib/stats";

const STREAK_TIERS = [
  { days: 7, credits: 2 },
  { days: 30, credits: 5 },
];

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const entries = await db.orm.public.FoodEntry.where({ userId }).all();
  const stats = computeStats(entries);
  const points = Math.max(0, stats.points - user.pointsSpent);

  const nextTier = STREAK_TIERS.find((t) => t.days > user.lastStreakRewardTier);

  return Response.json({
    points,
    level: levelForPoints(points),
    currentStreak: stats.currentStreak,
    autoEntryCredits: user.autoEntryCredits,
    autoEntryEnabled: user.autoEntryEnabled,
    nextStreakTier: nextTier ?? null,
    template: {
      lunch: {
        meal: user.autoLunchMeal,
        egg: user.autoLunchEgg,
        curd: user.autoLunchCurd,
        chicken: user.autoLunchChicken,
      },
      dinner: {
        meal: user.autoDinnerMeal,
        egg: user.autoDinnerEgg,
        curd: user.autoDinnerCurd,
        chicken: user.autoDinnerChicken,
      },
    },
  });
}

