import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { generatePasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Always returns the same generic message regardless of whether the email
// exists, so this endpoint can't be used to check which emails have
// accounts (same pattern as resend-verification).
const GENERIC_MESSAGE =
  "If an account with that email exists, we've sent a password reset link.";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(
      `forgot-password:${ip}`,
      5,
      15 * 60 * 1000
    );

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const user = await db.orm.public.User.where({ email }).first();

    if (user) {
      const { token, expiresAt } = generatePasswordResetToken();

      await db.orm.public.User
        .where({ id: user.id })
        .update({
          resetToken: token,
          resetTokenExpiresAt: expiresAt.toISOString(),
        });

      await sendPasswordResetEmail(email, token);
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
