import { NextResponse } from "next/server";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "@/prisma/db";
import { createSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const scryptAsync = promisify(scrypt);

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Generous IP-wide cap so one address can't hammer many different
    // accounts even while staying under any single account's lockout.
    const allowed = await checkRateLimit(`login:${ip}`, 20, 15 * 60 * 1000);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await db.orm.public.User
      .where({ email })
      .first();

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil) : null;

    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      const minutesLeft = Math.ceil(
        (lockedUntil.getTime() - Date.now()) / 60000
      );

      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
        },
        { status: 429 }
      );
    }

    const [salt, storedHash] = user.passwordHash.split(":");

    if (!salt || !storedHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const derivedKey = (await scryptAsync(
      password,
      salt,
      64
    )) as Buffer;

    const storedKey = Buffer.from(storedHash, "hex");

    const passwordMatches =
      storedKey.length === derivedKey.length &&
      timingSafeEqual(storedKey, derivedKey);

    if (!passwordMatches) {
      const failedAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

      await db.orm.public.User
        .where({ id: user.id })
        .update({
          failedLoginAttempts: shouldLock ? 0 : failedAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MS).toISOString()
            : null,
        });

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error:
            "Please verify your email before logging in. Check your inbox for the verification link.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await db.orm.public.User
        .where({ id: user.id })
        .update({ failedLoginAttempts: 0, lockedUntil: null });
    }

    await createSession(user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Login failed." },
      { status: 500 }
    );
  }
}
