import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request: Request) {
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

  const body = await request.json();
  const toUserId = Number(body.toUserId);
  const amount = Number(body.amount);
  const nepaliYear = Number(body.nepaliYear);
  const nepaliMonth = Number(body.nepaliMonth);

  if (
    !Number.isInteger(toUserId) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isInteger(nepaliYear) ||
    !Number.isInteger(nepaliMonth)
  ) {
    return Response.json({ error: "Invalid settlement details." }, { status: 400 });
  }

  const recipientMembership = await db.orm.public.GroupMember
    .where({ groupId: membership.groupId, userId: toUserId })
    .first();

  if (!recipientMembership) {
    return Response.json(
      { error: "That person isn't in your group." },
      { status: 400 }
    );
  }

  await db.orm.public.Settlement.create({
    groupId: membership.groupId,
    fromUserId: userId,
    toUserId,
    nepaliYear,
    nepaliMonth,
    amount,
  });

  return Response.json({ success: true });
}
