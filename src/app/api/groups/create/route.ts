import { randomBytes } from "crypto";
import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

function generateInviteCode(): string {
  // Short, easy-to-share code — e.g. "K3F9QZ"
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const existing = await db.orm.public.GroupMember.where({ userId }).first();

  if (existing) {
    return Response.json(
      { error: "You're already in a group. Leave it before creating a new one." },
      { status: 409 }
    );
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();

  if (!name) {
    return Response.json({ error: "Group name is required." }, { status: 400 });
  }

  if (name.length > 50) {
    return Response.json(
      { error: "Group name must be 50 characters or fewer." },
      { status: 400 }
    );
  }

  let inviteCode = generateInviteCode();

  // Extremely unlikely to collide, but guard against it anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db.orm.public.Group.where({ inviteCode }).first();
    if (!clash) break;
    inviteCode = generateInviteCode();
  }

  const group = await db.orm.public.Group.create({
    name,
    inviteCode,
    createdBy: userId,
  });

  await db.orm.public.GroupMember.create({
    groupId: group.id,
    userId,
  });

  return Response.json({
    success: true,
    group: { id: group.id, name: group.name, inviteCode: group.inviteCode },
  });
}
