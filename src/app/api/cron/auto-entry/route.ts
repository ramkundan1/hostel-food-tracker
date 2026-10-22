import { db } from "@/prisma/db";
import nepaliDateConverter from "nepali-date-converter";
import { calculateMealCost } from "@/lib/pricing";
import { isAdminEmail } from "@/lib/admin";

// Called once a day by Vercel Cron (see vercel.json). Vercel adds
// "Authorization: Bearer <CRON_SECRET>" automatically when CRON_SECRET is
// set as an env var, so only Vercel's own scheduler can trigger this.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }

  const today = new nepaliDateConverter();
  const nepaliYear = today.getYear();
  const nepaliMonth = today.getMonth();
  const nepaliDate = today.getDate();
  const dayKey = `${nepaliYear}-${nepaliMonth}-${nepaliDate}`;
  // The job runs in the evening Nepal time, when the UTC date and the Nepali
  // date are the same calendar day, so the stored date always equals the day
  // the row is created.
  const entryDate = new Date(
    new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"
  ).toISOString();

  const users = await db.orm.public.User
    .where({ autoEntryEnabled: true })
    .all();

  let usersProcessed = 0;
  let entriesCreated = 0;

  for (const user of users) {
    // Admins have unlimited auto-entry: it never uses up days.
    const unlimited = isAdminEmail(user.email);

    if (user.autoEntryCredits <= 0 && !unlimited) continue;

    const price = await db.orm.public.FoodPrice
      .where({ userId: user.id })
      .first();

    if (!price) continue; // can't auto-price without a price sheet

    let createdToday = false;

    const mealTypes: Array<{
      mealType: "lunch" | "dinner";
      meal: boolean;
      egg: boolean;
      curd: boolean;
      chicken: boolean;
    }> = [
      {
        mealType: "lunch",
        meal: user.autoLunchMeal,
        egg: user.autoLunchEgg,
        curd: user.autoLunchCurd,
        chicken: user.autoLunchChicken,
      },
      {
        mealType: "dinner",
        meal: user.autoDinnerMeal,
        egg: user.autoDinnerEgg,
        curd: user.autoDinnerCurd,
        chicken: user.autoDinnerChicken,
      },
    ];

    for (const template of mealTypes) {
      const hasAnySelection =
        template.meal || template.egg || template.curd || template.chicken;

      if (!hasAnySelection) continue;

      const existing = await db.orm.public.FoodEntry
        .where({ userId: user.id, dayKey, mealType: template.mealType })
        .first();

      if (existing) continue; // they already logged it themselves today

      const totalCost = calculateMealCost(template, price);

      await db.orm.public.FoodEntry.create({
        userId: user.id,
        date: entryDate,
        nepaliYear,
        nepaliMonth,
        nepaliDate,
        mealType: template.mealType,
        meal: template.meal,
        egg: template.egg,
        curd: template.curd,
        chicken: template.chicken,
        totalCost,
        dayKey,
      });

      entriesCreated++;
      createdToday = true;
    }

    if (createdToday && unlimited) {
      usersProcessed++;
    } else if (createdToday) {
      const remaining = user.autoEntryCredits - 1;

      await db.orm.public.User.where({ id: user.id }).update({
        autoEntryCredits: remaining,
        // Turn it back off once credits run out, so nothing silently
        // tries to auto-fill with zero credits left.
        autoEntryEnabled: remaining > 0,
      });

      usersProcessed++;
    }
  }

  return Response.json({ usersProcessed, entriesCreated });
}
