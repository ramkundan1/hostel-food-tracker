import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { isValidCurrency, DEFAULT_CURRENCY } from "@/lib/currency";

const CALENDARS = ["nepali", "english"];

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  return Response.json({
    currency: user.currency || DEFAULT_CURRENCY,
    calendarPreference: user.calendarPreference || "nepali",
  });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const currency = String(body.currency ?? "");
  const calendarPreference = String(body.calendarPreference ?? "");

  if (!isValidCurrency(currency)) {
    return Response.json({ error: "Unknown currency." }, { status: 400 });
  }

  if (!CALENDARS.includes(calendarPreference)) {
    return Response.json({ error: "Unknown calendar." }, { status: 400 });
  }

  await db.orm.public.User.where({ id: userId }).update({
    currency,
    calendarPreference,
  });

  return Response.json({ success: true });
}
