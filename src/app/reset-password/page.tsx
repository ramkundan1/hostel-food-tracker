"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="rounded-xl border border-amber-800 bg-amber-950 p-4 text-sm text-amber-300">
        This link is missing its reset token. Go back to the login page and
        request a new password reset link.
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      router.push("/login");
    }, 2500);
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-950 p-4 text-sm text-emerald-300">
        🎉 Password updated. Taking you to the login page...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="New password"
        minLength={8}
        required
        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-400"
      />

      <input
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        placeholder="Confirm new password"
        minLength={8}
        required
        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-400"
      />

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          {error}

          {error.toLowerCase().includes("expired") ||
          error.toLowerCase().includes("invalid") ? (
            <Link
              href="/login"
              className="mt-2 block font-semibold text-emerald-400 underline"
            >
              Back to login to request a new link
            </Link>
          ) : null}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 font-bold text-slate-950 transition hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? "Please wait..." : "Update Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
          🍽️ Eatrack
        </p>

        <h1 className="font-display mt-2 text-3xl font-extrabold">
          Choose a new password
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Make it a good one — no more forgetting this time.
        </p>

        <div className="mt-8">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
