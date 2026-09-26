// Minimal transactional email sender used for account verification.
//
// Uses the Resend HTTP API (https://resend.com) directly via fetch, so no
// extra npm dependency is required. To make this send real emails:
//
//   1. Create a free account at https://resend.com
//   2. Verify a sending domain (or use their shared onboarding domain while
//      testing)
//   3. Create an API key and set it as RESEND_API_KEY in your .env
//   4. Set EMAIL_FROM to an address on your verified domain
//      (e.g. "Hostel Food Tracker <noreply@yourdomain.com>")
//   5. Set APP_URL to your site's public URL (used to build the
//      verification link). Falls back to http://localhost:3000.
//
// Without RESEND_API_KEY set, this does not fail the request — it logs the
// verification link to the server console instead, so you can still test
// the flow locally before wiring up a real provider.

const RESEND_API_URL = "https://api.resend.com/emails";

function getAppUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export function buildVerificationLink(token: string): string {
  return `${getAppUrl()}/api/auth/verify?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetLink(token: string): string {
  return `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fallbackLogLabel: string,
  fallbackLink: string
): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    // Dev fallback: no email provider configured yet. Log the link so the
    // flow is still testable locally.
    console.log(
      `[email] RESEND_API_KEY or EMAIL_FROM not set — ${fallbackLogLabel} for ${to}: ${fallbackLink}`
    );
    return { sent: false };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      console.error(
        `[email] Failed to send email: ${res.status} ${await res.text()}`
      );
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    console.error("[email] Error sending email:", error);
    return { sent: false };
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<{ sent: boolean }> {
  const link = buildVerificationLink(token);

  return sendEmail(
    email,
    "Verify your email — Hostel Food Tracker",
    `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Thanks for signing up for Hostel Food Tracker. Click the button below to verify your email address. This link expires in 24 hours.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#10b981;color:#020617;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;">
            Verify Email
          </a>
        </p>
        <p>Or copy this link into your browser:<br />${link}</p>
      </div>
    `,
    "verification link",
    link
  );
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ sent: boolean }> {
  const link = buildPasswordResetLink(token);

  return sendEmail(
    email,
    "Reset your password — Hostel Food Tracker",
    `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We got a request to reset your Hostel Food Tracker password. Click the button below to choose a new one. This link expires in 1 hour.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#f59e0b;color:#020617;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;">
            Reset Password
          </a>
        </p>
        <p>Or copy this link into your browser:<br />${link}</p>
        <p style="color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      </div>
    `,
    "password reset link",
    link
  );
}
