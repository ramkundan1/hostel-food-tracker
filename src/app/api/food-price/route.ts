import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const foodPrice = await db.orm.public.FoodPrice
    .where({ userId })
    .first();

  return Response.json({
    meal: foodPrice?.meal ?? null,
    egg: foodPrice?.egg ?? null,
    curd: foodPrice?.curd ?? null,
    chicken: foodPrice?.chicken ?? null,
  });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const body = await request.json();

  const meal = Number(body.meal);
  const egg = Number(body.egg);
  const curd = Number(body.curd);
  const chicken = Number(body.chicken);

  if (
    !Number.isFinite(meal) || meal <= 0 ||
    !Number.isFinite(egg) || egg <= 0 ||
    !Number.isFinite(curd) || curd <= 0 ||
    !Number.isFinite(chicken) || chicken <= 0
  ) {
    return Response.json(
      { error: "Invalid price" },
      { status: 400 }
    );
  }

  const existing = await db.orm.public.FoodPrice
    .where({ userId })
    .first();

  if (existing) {
    const updated = await db.orm.public.FoodPrice
      .where({ id: existing.id, userId })
      .update({
        meal,
        egg,
        curd,
        chicken,
      });

    return Response.json(updated);
  }

  const created = await db.orm.public.FoodPrice.create({
    userId,
    meal,
    egg,
    curd,
    chicken,
  });

  return Response.json(created);
}
