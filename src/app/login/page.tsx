"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifiedBanner() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");

  if (!verified) return null;

  if (verified === "success") {
    return (
      <p className="mb-6 rounded-xl border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-300">
        Your email is verified. You can log in now.
      </p>
    );
  }

  const message =
    verified === "expired"
      ? "That verification link has expired. Request a new one below."
      : "That verification link is invalid. Request a new one below.";

  return (
    <p className="mb-6 rounded-xl border border-amber-800 bg-amber-950 p-3 text-sm text-amber-300">
      {message}
    </p>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setError("");
    setNeedsVerification(false);
    setRegisterMessage("");
    setForgotMessage("");
    setResendMessage("");
  }, [mode]);

  async function handleForgotSubmit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setForgotMessage(
      data.message ?? "If an account with that email exists, we've sent a reset link."
    );
  }

  async function handleSubmit(event: FormEvent) {
    if (mode === "forgot") {
      return handleForgotSubmit(event);
    }

    event.preventDefault();

    setError("");
    setNeedsVerification(false);
    setRegisterMessage("");
    setResendMessage("");
    setLoading(true);

    const endpoint =
      mode === "login" ? "/api/auth/login" : "/api/auth/register";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      setNeedsVerification(data.code === "EMAIL_NOT_VERIFIED");
      setLoading(false);
      return;
    }

    if (mode === "register") {
      setRegisterMessage(
        data.message ??
          "Account created. Check your email for a verification link."
      );
      setPassword("");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleResend() {
    if (!email) {
      setError("Enter your email above first.");
      return;
    }

    setResending(true);
    setResendMessage("");

    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    setResendMessage(
      data.message ?? "If that account exists, a new link has been sent."
    );
    setResending(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
          🍽️ Hostel Food Tracker
        </p>

        <h1 className="font-display mt-2 text-3xl font-extrabold">
          {mode === "login"
            ? "Log in to your account"
            : mode === "register"
              ? "Create your account"
              : "Reset your password"}
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          {mode === "login"
            ? "Come see what you've been eating."
            : mode === "register"
              ? "Track it before your roommate \"forgets\" to pay."
              : "We'll email you a link to set a new one."}
        </p>

        <Suspense fallback={null}>
          <VerifiedBanner />
        </Suspense>

        {registerMessage || forgotMessage ? (
          <div className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950 p-4 text-sm text-emerald-300">
            {registerMessage || forgotMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-400"
            />

            {mode !== "forgot" && (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                minLength={8}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-400"
              />
            )}

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="-mt-2 block text-sm text-slate-400 hover:text-slate-300"
              >
                Forgot password?
              </button>
            )}

            {error && (
              <div className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
                <p>{error}</p>

                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="mt-2 font-semibold text-emerald-400 underline disabled:opacity-50"
                  >
                    {resending ? "Sending..." : "Resend verification email"}
                  </button>
                )}
              </div>
            )}

            {resendMessage && (
              <p className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
                {resendMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 font-bold text-slate-950 transition hover:scale-[1.01] hover:from-amber-300 hover:to-orange-400 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Log In"
                  : mode === "register"
                    ? "Create Account"
                    : "Send Reset Link"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "register" || mode === "forgot" ? "login" : "register");
          }}
          className="mt-5 w-full text-sm font-medium text-slate-400 hover:text-slate-300"
        >
          {mode === "login"
            ? "Don't have an account? Create one"
            : mode === "register"
              ? "Already have an account? Log in"
              : "Back to log in"}
        </button>
      </div>
    </main>
  );
}
