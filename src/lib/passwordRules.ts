// Shared by the register/reset forms (instant feedback) and their API routes
// (the real check, since client-side validation alone can always be skipped).

export type PasswordCheck = { ok: true } | { ok: false; error: string };

export const PASSWORD_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, and a number.";

export function checkPasswordStrength(password: string): PasswordCheck {
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  if (password.length > 72) {
    return { ok: false, error: "Password must be 72 characters or fewer." };
  }

  if (!/[a-z]/.test(password)) {
    return { ok: false, error: "Password must include a lowercase letter." };
  }

  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: "Password must include an uppercase letter." };
  }

  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "Password must include a number." };
  }

  return { ok: true };
}
