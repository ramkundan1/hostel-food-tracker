"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Badge = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  earned: boolean;
};

type Stats = {
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  chickenCount: number;
  points: number;
  level: string;
  badges: Badge[];
};

type LeaderboardRow = {
  userId: number;
  displayName: string;
  isYou: boolean;
  points: number;
  level: string;
  currentStreak: number;
  totalEntries: number;
  badges: string[];
};

const medalFor = (rank: number) =>
  rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`;

export default function LeaderboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const [statsRes, boardRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/leaderboard"),
      ]);

      if (statsRes.status === 401 || boardRes.status === 401) {
        router.push("/login");
        return;
      }

      setStats(await statsRes.json());

      const boardData = await boardRes.json();
      setRows(boardData.rows ?? []);

      setLoading(false);
    }

    load();
  }, [router]);

  async function copyRecap() {
    if (!stats) return;

    const rank = rows.findIndex((r) => r.isYou);
    const earned = stats.badges.filter((b) => b.earned).map((b) => b.emoji);

    const lines = [
      "🍽️ My Eatrack Recap",
      rank >= 0 ? `🏆 Rank: ${medalFor(rank)} of ${rows.length}` : null,
      `⭐ Points: ${stats.points} (${stats.level})`,
      `🔥 Current streak: ${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`,
      earned.length > 0 ? `🎖️ Badges: ${earned.join(" ")}` : null,
      "",
      "Track yours at Eatrack 🍛",
    ].filter((line) => line !== null);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Couldn't copy — your browser may be blocking clipboard access.");
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Delete your account permanently? This removes all your meal entries, prices, and points. This can't be undone."
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      "Really sure? There's no way to recover this once it's done."
    );

    if (!doubleConfirmed) return;

    const res = await fetch("/api/auth/delete-account", { method: "POST" });

    if (!res.ok) {
      alert("Something went wrong deleting your account. Try again.");
      return;
    }

    router.push("/login");
  }

  if (loading || !stats) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              🏆 Leaderboard
            </p>
            <h1 className="font-display mt-2 text-3xl font-extrabold">
              Who&apos;s eating best?
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/profile-setup")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold"
            >
              ✏️ Profile
            </button>
            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-semibold"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Your stats */}
        <section className="mt-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 text-center">
          <p className="text-sm text-slate-400">{stats.level}</p>
          <p className="font-display mt-1 text-5xl font-extrabold">
            {stats.points} <span className="text-2xl text-amber-400">pts</span>
          </p>
          <p className="mt-2 text-slate-400">
            🔥 {stats.currentStreak} day{stats.currentStreak === 1 ? "" : "s"}{" "}
            streak · best {stats.longestStreak}
          </p>
        </section>

        {/* Badges */}
        <section className="mt-6">
          <h2 className="font-display text-xl font-bold">🎖️ Badges</h2>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.badges.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-2xl border p-4 text-center ${
                  badge.earned
                    ? "border-amber-700 bg-amber-950/40"
                    : "border-slate-800 bg-slate-900 opacity-40"
                }`}
              >
                <p className="text-3xl">{badge.emoji}</p>
                <p className="mt-1 text-sm font-bold">{badge.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Leaderboard */}
        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-display text-xl font-bold">
            🌍 Everyone ({rows.length})
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            10 pts per meal logged · 50 pts per badge · 5 pts per streak day.
            Only names and points are shown.
          </p>

          <div className="mt-4 space-y-2">
            {rows.map((row, index) => (
              <div
                key={row.userId}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  row.isYou
                    ? "border-emerald-700 bg-emerald-950/30"
                    : "border-slate-800 bg-slate-950"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-8 shrink-0 text-center font-bold">
                    {medalFor(index)}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {row.displayName}
                      {row.isYou ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.level}
                      {row.currentStreak > 0 ? ` · 🔥 ${row.currentStreak}` : ""}
                      {row.badges.length > 0 ? ` · ${row.badges.join("")}` : ""}
                    </p>
                  </div>
                </div>

                <p className="shrink-0 font-bold text-amber-400">
                  {row.points} pts
                </p>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={copyRecap}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 font-bold text-slate-950 transition hover:scale-[1.01] active:scale-[0.98]"
        >
          {copied ? "Copied! Paste it anywhere 🎉" : "📋 Copy Shareable Recap"}
        </button>

        <button
          onClick={deleteAccount}
          className="mt-4 w-full rounded-full border border-red-900 bg-red-950/30 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/50"
        >
          Delete Account
        </button>
      </div>
    </main>
  );
}
