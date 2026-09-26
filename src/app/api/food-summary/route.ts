import { db } from "@/prisma/db";
import nepaliDateConverter from "nepali-date-converter";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const requestedYear = url.searchParams.get("year");
  const requestedMonth = url.searchParams.get("month");

  const today = new nepaliDateConverter();

  const nepaliYear = requestedYear
    ? Number(requestedYear)
    : today.getYear();

  const nepaliMonth = requestedMonth
    ? Number(requestedMonth)
    : today.getMonth();

  if (
    !Number.isInteger(nepaliYear) ||
    !Number.isInteger(nepaliMonth) ||
    nepaliMonth < 1 ||
    nepaliMonth > 12
  ) {
    return Response.json(
      { error: "Invalid Nepali year or month" },
      { status: 400 }
    );
  }

  const entries = await db.orm.public.FoodEntry
    .where({
      userId,
      nepaliYear,
      nepaliMonth,
    })
    .all();

  const responseEntries: Array<Record<string, unknown>> = [];

  const summary = {
    nepaliYear,
    nepaliMonth,
    totalExpense: 0,
    mealCount: 0,
    eggCount: 0,
    curdCount: 0,
    chickenCount: 0,
    entryCount: entries.length,
    entries: responseEntries,
  };

  for (const entry of entries) {
    const additionalPeople = await db.orm.public.FoodEntryPerson
      .where({
        foodEntryId: entry.id,
      })
      .all();

    summary.totalExpense += entry.totalCost;

    if (entry.meal) summary.mealCount++;
    if (entry.egg) summary.eggCount++;
    if (entry.curd) summary.curdCount++;
    if (entry.chicken) summary.chickenCount++;

    for (const person of additionalPeople) {
      if (person.meal) summary.mealCount++;
      if (person.egg) summary.eggCount++;
      if (person.curd) summary.curdCount++;
      if (person.chicken) summary.chickenCount++;
    }

    responseEntries.push({
      ...entry,
      additionalPeople,
    });
  }

  return Response.json(summary);
}
