import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { checkName } from "@/lib/nameRules";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  let firstName = user.firstName ?? "";
  let middleName = user.middleName ?? "";
  let lastName = user.lastName ?? "";

  // Accounts made before structured names only have one "name" value. Split it
  // as a starting point so the person just has to check it and save.
  if (!firstName && !lastName && user.name) {
    const parts = user.name.trim().split(/\s+/);

    firstName = parts[0] ?? "";
    lastName = parts.length > 1 ? parts[parts.length - 1] : "";
    middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
  }

  return Response.json({
    firstName,
    middleName,
    lastName,
    age: user.age ?? null,
    hasProfile: Boolean(user.firstName && user.lastName && user.age),
  });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();

  const check = checkName(body);

  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 400 });
  }

  const age = Number(body.age);

  if (!Number.isInteger(age) || age < 5 || age > 120) {
    return Response.json({ error: "Enter a valid age." }, { status: 400 });
  }

  await db.orm.public.User.where({ id: userId }).update({
    name: check.fullName,
    firstName: check.firstName,
    middleName: check.middleName || null,
    lastName: check.lastName,
    age,
  });

  return Response.json({ success: true });
}
