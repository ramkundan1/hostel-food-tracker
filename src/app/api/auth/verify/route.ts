import { NextResponse } from "next/server";
import { db } from "@/prisma/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const redirectTo = (status: "success" | "invalid" | "expired") =>
    NextResponse.redirect(new URL(`/login?verified=${status}`, url.origin));

  if (!token) {
    return redirectTo("invalid");
  }

  const user = await db.orm.public.User
    .where({ verificationToken: token })
    .first();

  if (!user) {
    return redirectTo("invalid");
  }

  const expiresAt = user.verificationTokenExpiresAt
    ? new Date(user.verificationTokenExpiresAt)
    : null;

  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    return redirectTo("expired");
  }

  await db.orm.public.User
    .where({ id: user.id })
    .update({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });

  return redirectTo("success");
}
