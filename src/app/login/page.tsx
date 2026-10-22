"use client";

import Brand from "@/components/Brand";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifiedBanner() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");

  if (!verified) return null;

  if (verified === "success") {
    return (
      <p className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
        Your email is verified. You can log in now.
      </p>
    );
  }

  const message =
    verified === "expired"
      ? "That verification link has expired. Request a new one below."
      : "That verification link is invalid. Request a new one below.";

  return (
    <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
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
    <main className="flex min-h-dvh items-center justify-center bg-white p-6 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
        <Brand />

        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
          {mode === "login"
            ? "Log in"
            : mode === "register"
              ? "Create your account"
              : "Reset your password"}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {mode === "login"
            ? "Track your meals and manage shared costs."
            : mode === "register"
              ? "Get started tracking meals and spend."
              : "We'll email you a link to set a new one."}
        </p>

        <Suspense fallback={null}>
          <VerifiedBanner />
        </Suspense>

        {registerMessage || forgotMessage ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
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
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            {mode !== "forgot" && (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                minLength={8}
                required
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            )}

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="-mt-2 block text-sm text-slate-500 hover:text-slate-700"
              >
                Forgot password?
              </button>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p>{error}</p>

                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="mt-2 font-medium text-blue-600 underline disabled:opacity-50"
                  >
                    {resending ? "Sending..." : "Resend verification email"}
                  </button>
                )}
              </div>
            )}

            {resendMessage && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {resendMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
          className="mt-5 w-full text-sm font-medium text-slate-500 hover:text-slate-700"
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
