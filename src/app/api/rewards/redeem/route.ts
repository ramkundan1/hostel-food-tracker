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

  // Redeeming really spends the points: it lowers your points (and so your
  // leaderboard rank) in exchange for an auto-entry day.
  //
  // Two requests racing each other (a double-click, or two tabs) must not be
  // able to both succeed from the same starting balance. The update below is
  // conditioned on pointsSpent still matching what was just read — if another
  // request changed it in between, zero rows match and this one is treated as
  // a conflict, re-read, and retried, rather than silently overwriting it.
  for (let attempt = 0; attempt < 3; attempt++) {
    const current =
      attempt === 0 ? user : await db.orm.public.User.where({ id: userId }).first();

    if (!current) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const availablePoints = Math.max(0, stats.points - current.pointsSpent);

    if (availablePoints < REDEEM_COST) {
      return Response.json(
        { error: `You need ${REDEEM_COST} points to redeem — you have ${availablePoints}.` },
        { status: 400 }
      );
    }

    const autoEntryCredits = current.autoEntryCredits + 1;
    const pointsSpent = current.pointsSpent + REDEEM_COST;

    await db.orm.public.User
      .where({ id: userId, pointsSpent: current.pointsSpent })
      .update({ pointsSpent, autoEntryCredits });

    // Re-read rather than trust the update's return value, since a WHERE
    // clause that matched nothing (another request having won the race)
    // isn't guaranteed to be distinguishable from success by its return
    // value alone. The database's actual state is the one source of truth.
    const after = await db.orm.public.User.where({ id: userId }).first();
    const succeeded = after?.pointsSpent === pointsSpent;

    if (succeeded) {
      return Response.json({
        success: true,
        autoEntryCredits,
        pointsRemaining: availablePoints - REDEEM_COST,
        autoEntryEnabled: current.autoEntryEnabled,
      });
    }
    // Someone else's request landed first — loop around and retry with a
    // fresh read rather than compounding on stale data.
  }

  return Response.json(
    { error: "That didn't go through — please try again." },
    { status: 409 }
  );
}
