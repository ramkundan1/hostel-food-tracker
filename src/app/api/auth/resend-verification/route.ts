import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { generateVerificationToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Always returns the same generic message regardless of whether the email
// exists or is already verified, so this endpoint can't be used to check
// which emails have accounts.
const GENERIC_MESSAGE =
  "If an account with that email exists and isn't verified yet, we've sent a new verification link.";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(
      `resend-verification:${ip}`,
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

    if (user && !user.emailVerified) {
      const { token, expiresAt } = generateVerificationToken();

      await db.orm.public.User
        .where({ id: user.id })
        .update({
          verificationToken: token,
          verificationTokenExpiresAt: expiresAt.toISOString(),
        });

      await sendVerificationEmail(email, token);
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
