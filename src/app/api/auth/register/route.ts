import { NextResponse } from "next/server";
import { randomUUID, scrypt } from "crypto";
import { promisify } from "util";
import { db } from "@/prisma/db";
import { generateVerificationToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const scryptAsync = promisify(scrypt);

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Try again in a few minutes." },
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

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existingUser = await db.orm.public.User
      .where({ email })
      .first();

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const salt = randomUUID();

    const derivedKey = (await scryptAsync(
      password,
      salt,
      64
    )) as Buffer;

    const passwordHash = `${salt}:${derivedKey.toString("hex")}`;

    const { token, expiresAt } = generateVerificationToken();

    await db.orm.public.User.create({
      email,
      passwordHash,
      emailVerified: false,
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt.toISOString(),
    });

    await sendVerificationEmail(email, token);

    return NextResponse.json({
      success: true,
      message:
        "Account created. Check your email for a verification link before logging in.",
    });
  } catch {
    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 }
    );
  }
}
