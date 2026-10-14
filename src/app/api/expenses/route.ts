import { db } from "@/prisma/db";
import nepaliDateConverter from "nepali-date-converter";
import { getCurrentUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// One month of a person's additional purchases, plus that same month's food
// total so the page can show either figure (or both added together).
export async function GET(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const today = new nepaliDateConverter();

  const nepaliYear = url.searchParams.get("year")
    ? Number(url.searchParams.get("year"))
    : today.getYear();
  const nepaliMonth = url.searchParams.get("month")
    ? Number(url.searchParams.get("month"))
    : today.getMonth();

  if (
    !Number.isInteger(nepaliYear) ||
    !Number.isInteger(nepaliMonth) ||
    nepaliMonth < 0 ||
    nepaliMonth > 11
  ) {
    return Response.json({ error: "Invalid month." }, { status: 400 });
  }

  const [items, foodEntries] = await Promise.all([
    db.orm.public.Expense.where({ userId, nepaliYear, nepaliMonth }).all(),
    db.orm.public.FoodEntry.where({ userId, nepaliYear, nepaliMonth }).all(),
  ]);

  items.sort((a, b) => b.nepaliDate - a.nepaliDate || b.id - a.id);

  return Response.json({
    nepaliYear,
    nepaliMonth,
    items: items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount,
      nepaliDate: item.nepaliDate,
    })),
    additionalTotal: roundMoney(items.reduce((sum, i) => sum + i.amount, 0)),
    foodTotal: roundMoney(foodEntries.reduce((sum, e) => sum + e.totalCost, 0)),
  });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const allowed = await checkRateLimit(`expense:${userId}`, 60, 60 * 60 * 1000);

  if (!allowed) {
    return Response.json(
      { error: "You're adding items too quickly. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await request.json();

  const description = String(body.description ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (description.length < 2 || description.length > 100) {
    return Response.json(
      { error: "Describe the item in 2 to 100 characters." },
      { status: 400 }
    );
  }

  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return Response.json({ error: "Enter a valid price." }, { status: 400 });
  }

  const dateOnly = String(body.date ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }

  const parsed = new Date(dateOnly + "T00:00:00");

  if (Number.isNaN(parsed.getTime()) || dateOnly < "2000-01-01") {
    return Response.json({ error: "Invalid date." }, { status: 400 });
  }

  // Allow one day ahead of the server's date, so someone in Nepal logging
  // early in the morning (while the server is still on yesterday) isn't refused.
  const limit = new Date();
  limit.setUTCDate(limit.getUTCDate() + 1);

  if (dateOnly > limit.toISOString().slice(0, 10)) {
    return Response.json(
      { error: "You can't add an expense for a future date." },
      { status: 400 }
    );
  }

  const nepali = new nepaliDateConverter(parsed);

  const created = await db.orm.public.Expense.create({
    userId,
    description,
    amount: roundMoney(amount),
    date: parsed.toISOString(),
    nepaliYear: nepali.getYear(),
    nepaliMonth: nepali.getMonth(),
    nepaliDate: nepali.getDate(),
  });

  return Response.json({ success: true, id: created.id });
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const id = Number(new URL(request.url).searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid item." }, { status: 400 });
  }

  const existing = await db.orm.public.Expense.where({ id, userId }).first();

  if (!existing) {
    return Response.json({ error: "Item not found." }, { status: 404 });
  }

  await db.orm.public.Expense.where({ id }).deleteAll();

  return Response.json({ success: true });
}
