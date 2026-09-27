import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const membership = await db.orm.public.GroupMember
    .where({ userId })
    .first();

  if (!membership) {
    return Response.json({ group: null });
  }

  const group = await db.orm.public.Group
    .where({ id: membership.groupId })
    .first();

  if (!group) {
    return Response.json({ group: null });
  }

  const members = await db.orm.public.GroupMember
    .where({ groupId: group.id })
    .all();

  const memberDetails = await Promise.all(
    members.map(async (member) => {
      const user = await db.orm.public.User.where({ id: member.userId }).first();

      return {
        userId: member.userId,
        displayName:
          user?.name || user?.username || user?.email.split("@")[0] || "Someone",
      };
    })
  );

  return Response.json({
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      memberCount: members.length,
      members: memberDetails,
    },
  });
}
