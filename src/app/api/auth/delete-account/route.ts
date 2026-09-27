import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { getCurrentUserId, clearSession } from "@/lib/auth";

export async function POST() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Clean up everything tied to this user before removing the account
  // itself, since there's no cascading delete at the database level here.
  const entries = await db.orm.public.FoodEntry.where({ userId }).all();

  for (const entry of entries) {
    await db.orm.public.FoodEntryPerson
      .where({ foodEntryId: entry.id })
      .deleteAll();
  }

  await db.orm.public.FoodEntry.where({ userId }).deleteAll();
  await db.orm.public.FoodPrice.where({ userId }).deleteAll();
  await db.orm.public.GroupMember.where({ userId }).deleteAll();
  await db.orm.public.User.where({ id: userId }).deleteAll();

  await clearSession();

  return NextResponse.json({ success: true });
}
