"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSetupPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const authRes = await fetch("/api/auth/me");

      if (!authRes.ok) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/profile");
      const data = await res.json();

      setName(data.name ?? "");
      setAge(data.age ? String(data.age) : "");
      setHasProfile(Boolean(data.hasProfile));
      setChecking(false);
    }

    load();
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, age: Number(age) }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            👋 About you
          </p>

          {hasProfile && (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-semibold"
            >
              ← Back
            </button>
          )}
        </div>

        <h1 className="font-display mt-2 text-3xl font-extrabold">
          {hasProfile ? "Edit your profile" : "Tell us who you are"}
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Your name is shown on the public leaderboard, so a nickname is fine.
          Your age is never shown to anyone.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name or nickname"
            required
            minLength={2}
            maxLength={30}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-400"
          />

          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Age"
            required
            min={5}
            max={120}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-400"
          />

          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 font-bold text-slate-950 transition hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Saving..." : hasProfile ? "Save" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
