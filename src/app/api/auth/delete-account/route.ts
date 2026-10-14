import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { getCurrentUserId, clearSession } from "@/lib/auth";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();

  if (!code) {
    return NextResponse.json(
      { error: "Enter the code we emailed you." },
      { status: 400 }
    );
  }

  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user || !user.deleteToken || user.deleteToken !== code) {
    return NextResponse.json({ error: "That code isn't right." }, { status: 400 });
  }

  const expiresAt = user.deleteTokenExpiresAt
    ? new Date(user.deleteTokenExpiresAt)
    : null;

  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "That code has expired. Request a new one." },
      { status: 400 }
    );
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
  await db.orm.public.Expense.where({ userId }).deleteAll();
  await db.orm.public.GroupMember.where({ userId }).deleteAll();
  await db.orm.public.User.where({ id: userId }).deleteAll();

  await clearSession();

  return NextResponse.json({ success: true });
}
