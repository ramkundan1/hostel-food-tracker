import { db } from "@/prisma/db";
import { getCurrentUserId } from "@/lib/auth";
import { sendFeedbackEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`feedback:${ip}`, 5, 15 * 60 * 1000);

  if (!allowed) {
    return Response.json(
      { error: "Too many messages sent. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const message = String(body.message ?? "").trim();

  if (message.length < 5 || message.length > 2000) {
    return Response.json(
      { error: "Message must be between 5 and 2000 characters." },
      { status: 400 }
    );
  }

  const user = await db.orm.public.User.where({ id: userId }).first();

  await sendFeedbackEmail(user?.email ?? "unknown", message);

  return Response.json({ success: true });
}

