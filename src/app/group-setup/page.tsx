"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GroupSetupPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function check() {
      const authRes = await fetch("/api/auth/me");

      if (!authRes.ok) {
        router.push("/login");
        return;
      }

      const groupRes = await fetch("/api/groups/me");
      const groupData = await groupRes.json();

      if (groupData.group) {
        router.push("/");
        return;
      }

      setChecking(false);
    }

    check();
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "create" ? "/api/groups/create" : "/api/groups/join";
    const body = mode === "create" ? { name } : { inviteCode };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
          🏠 One more thing
        </p>

        <h1 className="font-display mt-2 text-3xl font-extrabold">
          Create or join a group
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          A group is your room, flat, PG, or mess — whoever you're sharing
          meals and comparing spend with. Leaderboards and stats only ever
          show people in your own group.
        </p>

        <div className="mt-6 flex gap-2 rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              mode === "create" ? "bg-slate-800 text-white" : "text-slate-500"
            }`}
          >
            Create new
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              mode === "join" ? "bg-slate-800 text-white" : "text-slate-500"
            }`}
          >
            Join existing
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "create" ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Room 4B, Smith Family, Flat 202"
              required
              maxLength={50}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-400"
            />
          ) : (
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Invite code (e.g. K3F9QZ)"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white uppercase tracking-widest outline-none focus:border-emerald-400"
            />
          )}

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
            {loading
              ? "Please wait..."
              : mode === "create"
                ? "Create Group"
                : "Join Group"}
          </button>
        </form>
      </div>
    </main>
  );
}
