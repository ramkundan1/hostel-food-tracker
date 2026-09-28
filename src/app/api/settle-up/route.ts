import { db } from "@/prisma/db";
import nepaliDateConverter from "nepali-date-converter";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const membership = await db.orm.public.GroupMember.where({ userId }).first();

  if (!membership) {
    return Response.json(
      { error: "Join or create a group first." },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const requestedYear = url.searchParams.get("year");
  const requestedMonth = url.searchParams.get("month");

  const today = new nepaliDateConverter();
  const nepaliYear = requestedYear ? Number(requestedYear) : today.getYear();
  const nepaliMonth = requestedMonth
    ? Number(requestedMonth)
    : today.getMonth();

  const groupMembers = await db.orm.public.GroupMember
    .where({ groupId: membership.groupId })
    .all();

  const memberIds = new Set(groupMembers.map((m) => m.userId));

  const allEntries = await db.orm.public.FoodEntry
    .where({ nepaliYear, nepaliMonth })
    .all();

  const groupEntries = allEntries.filter((entry) => memberIds.has(entry.userId));

  // owed[from][to] = how much `from` owes `to`, before netting opposite
  // directions against each other.
  const owed = new Map<string, number>();

  const addOwed = (fromId: number, toId: number, amount: number) => {
    if (fromId === toId || amount <= 0) return;
    const key = `${fromId}->${toId}`;
    owed.set(key, (owed.get(key) ?? 0) + amount);
  };

  for (const entry of groupEntries) {
    const people = await db.orm.public.FoodEntryPerson
      .where({ foodEntryId: entry.id })
      .all();

    for (const person of people) {
      if (
        typeof person.memberUserId === "number" &&
        memberIds.has(person.memberUserId)
      ) {
        addOwed(person.memberUserId, entry.userId, person.totalCost);
      }
    }
  }

  // Subtract anything already marked settled this month.
  const settlements = await db.orm.public.Settlement
    .where({ groupId: membership.groupId, nepaliYear, nepaliMonth })
    .all();

  for (const settlement of settlements) {
    const key = `${settlement.fromUserId}->${settlement.toUserId}`;
    owed.set(key, Math.max(0, (owed.get(key) ?? 0) - settlement.amount));
  }

  // Net opposing pairs against each other so A and B only ever see one
  // number between them, not two.
  const seen = new Set<string>();
  const netPairs: { fromUserId: number; toUserId: number; amount: number }[] = [];

  for (const [key, amount] of owed.entries()) {
    const [fromStr, toStr] = key.split("->");
    const from = Number(fromStr);
    const to = Number(toStr);
    const pairKey = [from, to].sort((a, b) => a - b).join("-");

    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    const reverseAmount = owed.get(`${to}->${from}`) ?? 0;
    const net = amount - reverseAmount;

    if (net > 0.01) {
      netPairs.push({ fromUserId: from, toUserId: to, amount: net });
    } else if (net < -0.01) {
      netPairs.push({ fromUserId: to, toUserId: from, amount: -net });
    }
  }

  const userIds = new Set<number>();
  netPairs.forEach((p) => {
    userIds.add(p.fromUserId);
    userIds.add(p.toUserId);
  });

  const names = new Map<number, string>();
  for (const id of userIds) {
    const user = await db.orm.public.User.where({ id }).first();
    names.set(
      id,
      user?.name || user?.username || user?.email.split("@")[0] || "Someone"
    );
  }

  const debts = netPairs.map((p) => ({
    fromUserId: p.fromUserId,
    fromName: names.get(p.fromUserId) ?? "Someone",
    toUserId: p.toUserId,
    toName: names.get(p.toUserId) ?? "Someone",
    amount: Math.round(p.amount * 100) / 100,
  }));

  return Response.json({ nepaliYear, nepaliMonth, debts });
}
