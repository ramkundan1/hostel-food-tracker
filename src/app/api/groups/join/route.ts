import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const existing = await db.orm.public.GroupMember.where({ userId }).first();

  if (existing) {
    return Response.json(
      { error: "You're already in a group. Leave it before joining another." },
      { status: 409 }
    );
  }

  const body = await request.json();
  const inviteCode = String(body.inviteCode ?? "").trim().toUpperCase();

  if (!inviteCode) {
    return Response.json({ error: "Invite code is required." }, { status: 400 });
  }

  const group = await db.orm.public.Group.where({ inviteCode }).first();

  if (!group) {
    return Response.json(
      { error: "That invite code doesn't match any group." },
      { status: 404 }
    );
  }

  await db.orm.public.GroupMember.create({
    groupId: group.id,
    userId,
  });

  return Response.json({
    success: true,
    group: { id: group.id, name: group.name, inviteCode: group.inviteCode },
  });
}
