import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const lunch = body.lunch ?? {};
  const dinner = body.dinner ?? {};

  await db.orm.public.User.where({ id: userId }).update({
    autoEntryEnabled: Boolean(body.enabled),
    autoLunchMeal: Boolean(lunch.meal),
    autoLunchEgg: Boolean(lunch.egg),
    autoLunchCurd: Boolean(lunch.curd),
    autoLunchChicken: Boolean(lunch.chicken),
    autoDinnerMeal: Boolean(dinner.meal),
    autoDinnerEgg: Boolean(dinner.egg),
    autoDinnerCurd: Boolean(dinner.curd),
    autoDinnerChicken: Boolean(dinner.chicken),
  });

  return Response.json({ success: true });
}

