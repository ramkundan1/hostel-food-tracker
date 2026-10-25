import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { sendDeleteAccountCode } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

export async function POST() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const allowed = await checkRateLimit(
    `delete-request:${userId}`,
    RATE_LIMIT,
    RATE_WINDOW_MS
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few hours." },
      { status: 429 }
    );
  }

  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // 6-digit code, zero-padded — easier to type than a long token.
  const code = String(randomInt(0, 1000000)).padStart(6, "0");

  await db.orm.public.User.where({ id: userId }).update({
    deleteToken: code,
    deleteTokenExpiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });

  await sendDeleteAccountCode(user.email, code);

  return NextResponse.json({ success: true });
}
