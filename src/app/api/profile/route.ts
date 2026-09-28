import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  return Response.json({
    name: user.name ?? "",
    age: user.age ?? null,
    hasProfile: Boolean(user.name && user.age),
  });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
  const age = Number(body.age);

  if (name.length < 2 || name.length > 30) {
    return Response.json(
      { error: "Name must be between 2 and 30 characters." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(age) || age < 5 || age > 120) {
    return Response.json({ error: "Enter a valid age." }, { status: 400 });
  }

  await db.orm.public.User.where({ id: userId }).update({ name, age });

  return Response.json({ success: true });
}
