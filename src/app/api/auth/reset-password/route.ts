import { NextResponse } from "next/server";
import { randomUUID, scrypt } from "crypto";
import { promisify } from "util";
import { db } from "@/prisma/db";
import { checkPasswordStrength } from "@/lib/passwordRules";

const scryptAsync = promisify(scrypt);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");

    if (!token) {
      return NextResponse.json(
        { error: "Missing reset token." },
        { status: 400 }
      );
    }

    const strength = checkPasswordStrength(password);

    if (!strength.ok) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    const user = await db.orm.public.User
      .where({ resetToken: token })
      .first();

    if (!user) {
      return NextResponse.json(
        { error: "That reset link is invalid. Request a new one." },
        { status: 400 }
      );
    }

    const expiresAt = user.resetTokenExpiresAt
      ? new Date(user.resetTokenExpiresAt)
      : null;

    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        {
          error:
            "That reset link has expired. Request a new one — they're only good for 1 hour.",
        },
        { status: 400 }
      );
    }

    const salt = randomUUID();

    const derivedKey = (await scryptAsync(
      password,
      salt,
      64
    )) as Buffer;

    const passwordHash = `${salt}:${derivedKey.toString("hex")}`;

    await db.orm.public.User
      .where({ id: user.id })
      .update({
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
