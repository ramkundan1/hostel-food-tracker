import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { checkName } from "@/lib/nameRules";
import { isAdminEmail } from "@/lib/admin";
import { ageFrom, MIN_AGE, MAX_AGE } from "@/lib/age";

const NAME_CHANGE_DAYS = 30;

// When the name can next be changed, or null if it can be changed now.
function nameChangeAvailableAt(changedAt: string | null | undefined): Date | null {
  if (!changedAt) return null;

  const changed = new Date(changedAt);

  if (Number.isNaN(changed.getTime())) return null;

  const next = new Date(changed.getTime() + NAME_CHANGE_DAYS * 24 * 60 * 60 * 1000);

  return next.getTime() > Date.now() ? next : null;
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

  const hasName = Boolean(user.firstName && user.lastName);
  const lockedUntil = hasName ? nameChangeAvailableAt(user.nameChangedAt) : null;

  return Response.json({
    firstName,
    middleName,
    lastName,
    dateOfBirth: user.dateOfBirth ?? "",
    email: user.email,
    emailVerified: user.emailVerified,
    isAdmin: isAdminEmail(user.email),
    hasProfile: Boolean(user.firstName && user.lastName && user.dateOfBirth),
    nameChangeAvailableAt: lockedUntil ? lockedUntil.toISOString() : null,
  });
}

// Saves the name, the date of birth, or both — whichever is sent.
export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const body = await request.json();

  const updates: {
    name?: string;
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    nameChangedAt?: string;
    dateOfBirth?: string;
    age?: number;
  } = {};

  const sendingName =
    body.firstName !== undefined ||
    body.middleName !== undefined ||
    body.lastName !== undefined;

  if (sendingName) {
    const check = checkName(body);

    if (!check.ok) {
      return Response.json({ error: check.error }, { status: 400 });
    }

    const hasName = Boolean(user.firstName && user.lastName);

    const unchanged =
      hasName &&
      user.firstName === check.firstName &&
      (user.middleName ?? "") === check.middleName &&
      user.lastName === check.lastName;

    // Setting a name for the first time is free. After that it can only be
    // changed once every 30 days. Saving the same name again changes nothing.
    if (hasName && !unchanged) {
      const next = nameChangeAvailableAt(user.nameChangedAt);

      if (next) {
        const date = next.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        return Response.json(
          {
            error: `You can change your name once every ${NAME_CHANGE_DAYS} days. You can change it again on ${date}.`,
          },
          { status: 429 }
        );
      }

      updates.nameChangedAt = new Date().toISOString();
    }

    if (!unchanged) {
      updates.name = check.fullName;
      updates.firstName = check.firstName;
      updates.middleName = check.middleName || null;
      updates.lastName = check.lastName;
    }
  }

  if (body.dateOfBirth !== undefined) {
    const dateOfBirth = String(body.dateOfBirth);
    const age = ageFrom(dateOfBirth);

    if (age === null || age > MAX_AGE) {
      return Response.json(
        { error: "Enter a valid date of birth." },
        { status: 400 }
      );
    }

    if (age < MIN_AGE) {
      return Response.json(
        { error: `You must be at least ${MIN_AGE} years old to use e-tracker.` },
        { status: 400 }
      );
    }

    updates.dateOfBirth = dateOfBirth;
    updates.age = age;
  }

  if (Object.keys(updates).length > 0) {
    await db.orm.public.User.where({ id: userId }).update(updates);
  }

  return Response.json({ success: true });
}
