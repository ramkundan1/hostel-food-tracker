import { db } from "@/prisma/db";
import { getAdmin, isAdminEmail } from "@/lib/admin";
import { computeStats } from "@/lib/stats";

// Every account with a short summary. Admin only.
export async function GET() {
  const admin = await getAdmin();

  if (!admin) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  const [verified, unverified, lunches, dinners] = await Promise.all([
    db.orm.public.User.where({ emailVerified: true }).all(),
    db.orm.public.User.where({ emailVerified: false }).all(),
    db.orm.public.FoodEntry.where({ mealType: "lunch" }).all(),
    db.orm.public.FoodEntry.where({ mealType: "dinner" }).all(),
  ]);

  const entriesByUser = new Map<number, typeof lunches>();

  for (const entry of [...lunches, ...dinners]) {
    const list = entriesByUser.get(entry.userId) ?? [];
    list.push(entry);
    entriesByUser.set(entry.userId, list);
  }

  const users = [...verified, ...unverified].map((user) => {
    const entries = entriesByUser.get(user.id) ?? [];
    const stats = computeStats(entries);

    let lastActive = "";

    for (const entry of entries) {
      if (entry.createdAt > lastActive) lastActive = entry.createdAt;
    }

    return {
      id: user.id,
      name: user.name ?? "",
      email: user.email,
      emailVerified: user.emailVerified,
      isAdmin: isAdminEmail(user.email),
      joined: user.createdAt,
      age: user.age ?? null,
      points: Math.max(0, stats.points - user.pointsSpent),
      level: stats.level,
      entries: entries.length,
      autoEntryCredits: user.autoEntryCredits,
      lastActive: lastActive || null,
    };
  });

  users.sort((a, b) => (a.joined < b.joined ? 1 : -1));

  return Response.json({ users });
}
