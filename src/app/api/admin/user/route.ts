import { db } from "@/prisma/db";
import { getAdmin, isAdminEmail } from "@/lib/admin";
import { computeStats } from "@/lib/stats";

function parseId(value: unknown): number | null {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

// Everything about one account. Admin only.
export async function GET(request: Request) {
  const admin = await getAdmin();

  if (!admin) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  const id = parseId(new URL(request.url).searchParams.get("id"));

  if (!id) {
    return Response.json({ error: "Invalid user." }, { status: 400 });
  }

  const user = await db.orm.public.User.where({ id }).first();

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const [entries, expenses] = await Promise.all([
    db.orm.public.FoodEntry.where({ userId: id }).all(),
    db.orm.public.Expense.where({ userId: id }).all(),
  ]);

  const stats = computeStats(entries);

  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  expenses.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      isAdmin: isAdminEmail(user.email),
      name: user.name ?? "",
      firstName: user.firstName ?? "",
      middleName: user.middleName ?? "",
      lastName: user.lastName ?? "",
      dateOfBirth: user.dateOfBirth ?? "",
      age: user.age ?? null,
      joined: user.createdAt,
    },
    stats: {
      points: Math.max(0, stats.points - user.pointsSpent),
      level: stats.level,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      countedEntries: stats.totalEntries,
      backdatedEntries: stats.backdatedCount,
      allEntries: entries.length,
    },
    rewards: {
      autoEntryCredits: user.autoEntryCredits,
      autoEntryEnabled: user.autoEntryEnabled,
      pointsSpent: user.pointsSpent,
    },
    totals: {
      food: Math.round(entries.reduce((sum, e) => sum + e.totalCost, 0) * 100) / 100,
      additional: Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100,
    },
    recentEntries: entries.slice(0, 30).map((e) => ({
      id: e.id,
      mealType: e.mealType,
      nepaliMonth: e.nepaliMonth,
      nepaliDate: e.nepaliDate,
      meal: e.meal,
      egg: e.egg,
      curd: e.curd,
      chicken: e.chicken,
      totalCost: e.totalCost,
    })),
    recentExpenses: expenses.slice(0, 30).map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      nepaliMonth: e.nepaliMonth,
      nepaliDate: e.nepaliDate,
    })),
  });
}

// Admin actions on one account.
export async function POST(request: Request) {
  const admin = await getAdmin();

  if (!admin) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  const body = await request.json();
  const id = parseId(body.id);
  const action = String(body.action ?? "");
  const amount = Number(body.amount);

  if (!id) {
    return Response.json({ error: "Invalid user." }, { status: 400 });
  }

  const target = await db.orm.public.User.where({ id }).first();

  if (!target) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  if (action === "grantCredits") {
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000) {
      return Response.json({ error: "Enter 1 to 1000 days." }, { status: 400 });
    }

    await db.orm.public.User.where({ id }).update({
      autoEntryCredits: target.autoEntryCredits + amount,
    });
  } else if (action === "setCredits") {
    if (!Number.isInteger(amount) || amount < 0 || amount > 100000) {
      return Response.json({ error: "Enter 0 to 100000 days." }, { status: 400 });
    }

    await db.orm.public.User.where({ id }).update({ autoEntryCredits: amount });
  } else if (action === "adjustPoints") {
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000) {
      return Response.json(
        { error: "Enter a non-zero whole number (up to 100000)." },
        { status: 400 }
      );
    }

    // Points are earned minus spent, so giving points means lowering "spent".
    await db.orm.public.User.where({ id }).update({
      pointsSpent: target.pointsSpent - amount,
    });
  } else if (action === "verifyEmail") {
    await db.orm.public.User.where({ id }).update({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });
  } else if (action === "deleteUser") {
    if (target.id === admin.id || isAdminEmail(target.email)) {
      return Response.json(
        { error: "Admin accounts can't be deleted here." },
        { status: 400 }
      );
    }

    const entries = await db.orm.public.FoodEntry.where({ userId: id }).all();

    await Promise.all(
      entries.map((entry) =>
        db.orm.public.FoodEntryPerson.where({ foodEntryId: entry.id }).deleteAll()
      )
    );

    await db.orm.public.FoodEntry.where({ userId: id }).deleteAll();
    await db.orm.public.FoodPrice.where({ userId: id }).deleteAll();
    await db.orm.public.Expense.where({ userId: id }).deleteAll();
    await db.orm.public.GroupMember.where({ userId: id }).deleteAll();
    await db.orm.public.User.where({ id }).deleteAll();
  } else {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  return Response.json({ success: true });
}
