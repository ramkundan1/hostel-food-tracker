import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { computeStats } from "@/lib/stats";
import { isAdminEmail } from "@/lib/admin";

const REDEEM_COST = 100;

export async function POST() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  if (isAdminEmail(user.email)) {
    return Response.json(
      { error: "Admins already have unlimited auto-entry." },
      { status: 400 }
    );
  }

  // Points are only spent once there is a saved selection to auto-log.
  const hasSavedSelection = [
    user.autoLunchMeal,
    user.autoLunchEgg,
    user.autoLunchCurd,
    user.autoLunchChicken,
    user.autoDinnerMeal,
    user.autoDinnerEgg,
    user.autoDinnerCurd,
    user.autoDinnerChicken,
  ].some(Boolean);

  if (!hasSavedSelection) {
    return Response.json(
      { error: "Choose what to auto-log and save it before redeeming." },
      { status: 400 }
    );
  }

  const entries = await db.orm.public.FoodEntry.where({ userId }).all();
  const stats = computeStats(entries);
  const availablePoints = Math.max(0, stats.points - user.pointsSpent);

  if (availablePoints < REDEEM_COST) {
    return Response.json(
      { error: `You need ${REDEEM_COST} points to redeem — you have ${availablePoints}.` },
      { status: 400 }
    );
  }

  // Redeeming really spends the points: it lowers your points (and so your
  // leaderboard rank) in exchange for an auto-entry day.
  const autoEntryCredits = user.autoEntryCredits + 1;

  await db.orm.public.User.where({ id: userId }).update({
    pointsSpent: user.pointsSpent + REDEEM_COST,
    autoEntryCredits,
  });

  return Response.json({
    success: true,
    autoEntryCredits,
    pointsRemaining: availablePoints - REDEEM_COST,
    autoEntryEnabled: user.autoEntryEnabled,
  });
}
