import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { checkName } from "@/lib/nameRules";
import { isAdminEmail } from "@/lib/admin";

// Whole years old today, or null when the date isn't a real calendar date.
function ageFrom(dateOfBirth: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const probe = new Date(Date.UTC(year, month - 1, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - year;

  const hadBirthday =
    now.getUTCMonth() + 1 > month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day);

  if (!hadBirthday) age -= 1;

  return age;
}

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
    dateOfBirth: user.dateOfBirth ?? "",
    email: user.email,
    emailVerified: user.emailVerified,
    isAdmin: isAdminEmail(user.email),
    hasProfile: Boolean(user.firstName && user.lastName && user.dateOfBirth),
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

  const dateOfBirth = String(body.dateOfBirth ?? "");
  const age = ageFrom(dateOfBirth);

  if (age === null || age < 5 || age > 120) {
    return Response.json(
      { error: "Enter a valid date of birth." },
      { status: 400 }
    );
  }

  await db.orm.public.User.where({ id: userId }).update({
    name: check.fullName,
    firstName: check.firstName,
    middleName: check.middleName || null,
    lastName: check.lastName,
    dateOfBirth,
    age,
  });

  return Response.json({ success: true });
}
