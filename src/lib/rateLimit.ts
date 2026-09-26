import { db } from "@/prisma/db";

// A simple fixed-window rate limiter backed by Postgres. Serverless
// functions don't share memory between invocations, so an in-memory
// counter wouldn't work here — this trades a bit of latency for
// correctness across instances.
//
// Returns true if the request should be ALLOWED, false if it should be
// blocked for exceeding the limit.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();

  const existing = await db.orm.public.RateLimit.where({ key }).first();

  if (!existing) {
    await db.orm.public.RateLimit.create({
      key,
      count: 1,
      windowStart: new Date(now).toISOString(),
    });
    return true;
  }

  const windowStart = new Date(existing.windowStart).getTime();
  const windowExpired = now - windowStart > windowMs;

  if (windowExpired) {
    await db.orm.public.RateLimit
      .where({ id: existing.id })
      .update({
        count: 1,
        windowStart: new Date(now).toISOString(),
      });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  await db.orm.public.RateLimit
    .where({ id: existing.id })
    .update({ count: existing.count + 1 });

  return true;
}

// Best-effort client IP extraction on Vercel. Falls back to a constant so
// rate limiting still degrades gracefully (shared bucket) rather than
// throwing if headers are ever missing.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
