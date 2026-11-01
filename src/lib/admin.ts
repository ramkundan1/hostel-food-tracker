import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";

// Admins are identified by a verified email address, set via ADMIN_EMAILS in
// Vercel (comma separated). There is deliberately no hardcoded fallback here
// — this file ships in a public repo, so an admin address must never be
// written into the source itself.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
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
