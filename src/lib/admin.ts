import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

// Admins are identified by a verified email address. Set ADMIN_EMAILS in
// Vercel (comma separated) to change who they are; the owner's address is the
// default so nothing needs configuring to get started.
const DEFAULT_ADMIN_EMAIL = "envirmhp74@gmail.com";

function adminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return configured.length > 0 ? configured : [DEFAULT_ADMIN_EMAIL];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  return adminEmails().includes(email.trim().toLowerCase());
}

// Every admin endpoint calls this first. It re-checks on the server, so hiding
// a button in the page is never the only protection.
export async function getAdmin() {
  const userId = await getCurrentUserId();

  if (!userId) return null;

  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user || !user.emailVerified || !isAdminEmail(user.email)) return null;

  return user;
}
