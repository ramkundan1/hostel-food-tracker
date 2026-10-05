import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { computeStats, levelForPoints } from "@/lib/stats";

// Streak milestones grant one-time auto-entry credits the first time a
// user reaches them. lastStreakRewardTier tracks the highest tier already
// paid out, so revisiting the page after the streak breaks doesn't re-grant.
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

  let lastStreakRewardTier = user.lastStreakRewardTier;
  let autoEntryCredits = user.autoEntryCredits;
  let grantedCredits = 0;

  for (const tier of STREAK_TIERS) {
    if (stats.currentStreak >= tier.days && lastStreakRewardTier < tier.days) {
      grantedCredits += tier.credits;
      lastStreakRewardTier = tier.days;
    }
  }

  if (grantedCredits > 0) {
    autoEntryCredits += grantedCredits;

    await db.orm.public.User.where({ id: userId }).update({
      autoEntryCredits,
      lastStreakRewardTier,
    });
  }

  const points = Math.max(0, stats.points - user.pointsSpent);

  return Response.json({
    ...stats,
    points,
    level: levelForPoints(points),
    autoEntryCreditsEarnedJustNow: grantedCredits,
  });
}

