import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import nepaliDateConverter from "nepali-date-converter";

type AdditionalPerson = {
  meal?: boolean;
  egg?: boolean;
  curd?: boolean;
  chicken?: boolean;
};

function getPersonCost(
  person: AdditionalPerson,
  foodPrice: {
    meal: number;
    egg: number;
    curd: number;
    chicken: number;
  }
) {
  return (
    (person.meal ? foodPrice.meal : 0) +
    (person.egg ? foodPrice.egg : 0) +
    (person.curd ? foodPrice.curd : 0) +
    (person.chicken ? foodPrice.chicken : 0)
  );
}

function validatePeople(people: AdditionalPerson[]) {
  return people.every(
    (person) =>
      Boolean(person.meal) ||
      Boolean(person.egg) ||
      Boolean(person.curd) ||
      Boolean(person.chicken)
  );
}

function todayDateOnly(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Resolves the AD date (as YYYY-MM-DD) an entry should be recorded under,
// validating it if the caller supplied one. Defaults to today when omitted.
function resolveEntryDate(rawDate: unknown):
  | { ok: true; dateOnly: string }
  | { ok: false; error: string } {
  if (rawDate === undefined || rawDate === null || rawDate === "") {
    return { ok: true, dateOnly: todayDateOnly() };
  }

  if (typeof rawDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return { ok: false, error: "Invalid date." };
  }

  const parsed = new Date(rawDate + "T00:00:00");

  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Invalid date." };
  }

  if (rawDate > todayDateOnly()) {
    return { ok: false, error: "You can't add an entry for a future date." };
  }

  return { ok: true, dateOnly: rawDate };
}

export async function GET() {
const userId = await getCurrentUserId();

if (!userId) {
  return Response.json(
    { error: "Not authenticated." },
    { status: 401 }
  );
}
  const entries = await db.orm.public.FoodEntry.where({userId}).all();
  return Response.json(entries);
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

  const mealType = body.mealType;

  if (mealType !== "lunch" && mealType !== "dinner") {
    return Response.json(
      { error: "Invalid meal type" },
      { status: 400 }
    );
  }

  const meal = Boolean(body.meal);
  const egg = Boolean(body.egg);
  const curd = Boolean(body.curd);
  const chicken = Boolean(body.chicken);

  const additionalPeople: AdditionalPerson[] =
    Array.isArray(body.additionalPeople)
      ? body.additionalPeople
      : [];

  if (!validatePeople(additionalPeople)) {
    return Response.json(
      {
        error:
          "Each additional person must have at least one food item.",
      },
      { status: 400 }
    );
  }

  if (
    !meal &&
    !egg &&
    !curd &&
    !chicken &&
    additionalPeople.length === 0
  ) {
    return Response.json(
      { error: "Select at least one food item." },
      { status: 400 }
    );
  }

  const foodPrice = await db.orm.public.FoodPrice.where({ userId }).first();

  if (!foodPrice) {
    return Response.json(
      { error: "Food prices are not set" },
      { status: 400 }
    );
  }

  const resolvedDate = resolveEntryDate(body.date);

  if (!resolvedDate.ok) {
    return Response.json({ error: resolvedDate.error }, { status: 400 });
  }

  const entryDate = new Date(resolvedDate.dateOnly + "T00:00:00");
  const nepaliDateObj = new nepaliDateConverter(entryDate);

  const nepaliYear = nepaliDateObj.getYear();
  const nepaliMonth = nepaliDateObj.getMonth();
  const nepaliDate = nepaliDateObj.getDate();

  const dayKey =
    String(nepaliYear) +
    "-" +
    String(nepaliMonth) +
    "-" +
    String(nepaliDate);

  const existing = await db.orm.public.FoodEntry
    .where({
      userId,
      dayKey,
      mealType,
    })
    .first();

  if (existing) {
    return Response.json(
      {
        error:
          mealType.charAt(0).toUpperCase() +
          mealType.slice(1) +
          " has already been recorded for that date. You can edit it from Monthly Report.",
      },
      { status: 409 }
    );
  }

  const ownerCost = getPersonCost(
    { meal, egg, curd, chicken },
    foodPrice
  );

  const additionalCost = additionalPeople.reduce(
    (total, person) => total + getPersonCost(person, foodPrice),
    0
  );

  const totalCost = ownerCost + additionalCost;

  const entry = await db.orm.public.FoodEntry.create({
userId,
    date: entryDate.toISOString(),
    nepaliYear,
    nepaliMonth,
    nepaliDate,
    mealType,
    meal,
    egg,
    curd,
    chicken,
    totalCost,
    dayKey,
  });

  await Promise.all(
    additionalPeople.map((person) =>
      db.orm.public.FoodEntryPerson.create({
        foodEntryId: entry.id,
        meal: Boolean(person.meal),
        egg: Boolean(person.egg),
        curd: Boolean(person.curd),
        chicken: Boolean(person.chicken),
        totalCost: getPersonCost(person, foodPrice),
      })
    )
  );

  return Response.json(entry);
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json(
      { error: "Invalid entry ID" },
      { status: 400 }
    );
  }

  const existing = await db.orm.public.FoodEntry
    .where({ id, userId })
    .first();

  if (!existing) {
    return Response.json(
      { error: "Food entry not found" },
      { status: 404 }
    );
  }

  await db.orm.public.FoodEntryPerson
    .where({ foodEntryId: id })
    .deleteAll();

  await db.orm.public.FoodEntry.where({ id }).deleteAll();

  return Response.json({ success: true });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }
  const body = await request.json();

  const id = Number(body.id);

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json(
      { error: "Invalid entry ID" },
      { status: 400 }
    );
  }

  const existing = await db.orm.public.FoodEntry
    .where({ id,userId })
    .first();

  if (!existing) {
    return Response.json(
      { error: "Food entry not found" },
      { status: 404 }
    );
  }

  const mealType = body.mealType;

  if (mealType !== "lunch" && mealType !== "dinner") {
    return Response.json(
      { error: "Invalid meal type" },
      { status: 400 }
    );
  }

  const meal = Boolean(body.meal);
  const egg = Boolean(body.egg);
  const curd = Boolean(body.curd);
  const chicken = Boolean(body.chicken);

  const additionalPeople: AdditionalPerson[] =
    Array.isArray(body.additionalPeople)
      ? body.additionalPeople
      : [];

  if (!validatePeople(additionalPeople)) {
    return Response.json(
      {
        error:
          "Each additional person must have at least one food item.",
      },
      { status: 400 }
    );
  }

  if (
    !meal &&
    !egg &&
    !curd &&
    !chicken &&
    additionalPeople.length === 0
  ) {
    return Response.json(
      { error: "Select at least one food item." },
      { status: 400 }
    );
  }

  const foodPrice = await db.orm.public.FoodPrice.where({ userId }).first();

  if (!foodPrice) {
    return Response.json(
      { error: "Food prices are not set" },
      { status: 400 }
    );
  }

  const ownerCost = getPersonCost(
    { meal, egg, curd, chicken },
    foodPrice
  );

  const additionalCost = additionalPeople.reduce(
    (total, person) => total + getPersonCost(person, foodPrice),
    0
  );

  const totalCost = ownerCost + additionalCost;

  const dateUpdate: {
    date?: string;
    nepaliYear?: number;
    nepaliMonth?: number;
    nepaliDate?: number;
    dayKey?: string;
  } = {};

  if (body.date !== undefined) {
    const resolvedDate = resolveEntryDate(body.date);

    if (!resolvedDate.ok) {
      return Response.json({ error: resolvedDate.error }, { status: 400 });
    }

    const entryDate = new Date(resolvedDate.dateOnly + "T00:00:00");
    const nepaliDateObj = new nepaliDateConverter(entryDate);

    const nepaliYear = nepaliDateObj.getYear();
    const nepaliMonth = nepaliDateObj.getMonth();
    const nepaliDate = nepaliDateObj.getDate();

    dateUpdate.date = entryDate.toISOString();
    dateUpdate.nepaliYear = nepaliYear;
    dateUpdate.nepaliMonth = nepaliMonth;
    dateUpdate.nepaliDate = nepaliDate;
    dateUpdate.dayKey =
      String(nepaliYear) + "-" + String(nepaliMonth) + "-" + String(nepaliDate);
  }

  const effectiveDayKey = dateUpdate.dayKey ?? existing.dayKey;

  if (effectiveDayKey !== existing.dayKey || mealType !== existing.mealType) {
    const conflict = await db.orm.public.FoodEntry
      .where({
        userId,
        dayKey: effectiveDayKey,
        mealType,
      })
      .first();

    if (conflict && conflict.id !== id) {
      return Response.json(
        {
          error:
            mealType.charAt(0).toUpperCase() +
            mealType.slice(1) +
            " has already been recorded for that date.",
        },
        { status: 409 }
      );
    }
  }

  const updated = await db.orm.public.FoodEntry
    .where({ id })
    .update({
      meal,
      egg,
      curd,
      chicken,
      totalCost,
      mealType,
      ...dateUpdate,
    });

  await db.orm.public.FoodEntryPerson
    .where({ foodEntryId: id })
    .deleteAll();

  await Promise.all(
    additionalPeople.map((person) =>
      db.orm.public.FoodEntryPerson.create({
        foodEntryId: id,
        meal: Boolean(person.meal),
        egg: Boolean(person.egg),
        curd: Boolean(person.curd),
        chicken: Boolean(person.chicken),
        totalCost: getPersonCost(person, foodPrice),
      })
    )
  );

  return Response.json(updated);
}
