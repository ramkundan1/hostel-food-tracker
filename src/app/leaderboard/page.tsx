"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Flame } from "lucide-react";
import Brand from "@/components/Brand";
import PageNav from "@/components/PageNav";

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
  backdatedCount?: number;
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
      "My e-tracker Recap",
      rank >= 0 ? `Rank: ${medalFor(rank)} of ${rows.length}` : null,
      `Points: ${stats.points} (${stats.level})`,
      `Current streak: ${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`,
      earned.length > 0 ? `Badges: ${earned.join(" ")}` : null,
      "",
      "Track yours at e-tracker",
    ].filter((line) => line !== null);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Couldn't copy — your browser may be blocking clipboard access.");
    }
  }

  if (loading || !stats) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-slate-900">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Brand />
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
              Leaderboard
            </h1>
          </div>

          <PageNav />
        </div>

        {/* Your stats */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">{stats.level}</p>
          <p className="font-display mt-1 text-5xl font-semibold tracking-tight">
            {stats.points} <span className="text-2xl text-slate-400">pts</span>
          </p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-slate-500">
            <Flame className="h-4 w-4 text-orange-500" />
            {stats.currentStreak} day{stats.currentStreak === 1 ? "" : "s"} streak
            · best {stats.longestStreak}
          </p>

          {(stats.backdatedCount ?? 0) > 0 && (
            <p className="mt-3 text-xs text-slate-400">
              {stats.backdatedCount} meal
              {stats.backdatedCount === 1 ? "" : "s"} logged for a past date
              {stats.backdatedCount === 1 ? " doesn't" : " don't"} count toward
              points or streaks.
            </p>
          )}
        </section>

        {/* Badges */}
        <section className="mt-6">
          <h2 className="font-display text-xl font-semibold tracking-tight">Badges</h2>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.badges.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-2xl border p-4 text-center ${
                  badge.earned
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white opacity-40"
                }`}
              >
                <p className="text-3xl">{badge.emoji}</p>
                <p className="mt-1 text-sm font-semibold">{badge.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Leaderboard */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-slate-400" />
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Everyone ({rows.length})
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            10 pts per meal logged on the day · 50 pts per badge · 5 pts per
            streak day. Only first names and points are shown.
          </p>

          <div className="mt-4 space-y-2">
            {rows.map((row, index) => (
              <div
                key={row.userId}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  row.isYou
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-8 shrink-0 text-center font-semibold">
                    {medalFor(index)}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {row.displayName}
                      {row.isYou ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      {row.level}
                      {row.currentStreak > 0 ? ` · ${row.currentStreak}🔥` : ""}
                      {row.badges.length > 0 ? ` · ${row.badges.join("")}` : ""}
                    </p>
                  </div>
                </div>

                <p className="shrink-0 font-semibold text-slate-900">
                  {row.points} pts
                </p>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={copyRecap}
          className="mt-6 w-full rounded-full bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {copied ? "Copied — paste it anywhere" : "Copy Shareable Recap"}
        </button>
      </div>
    </main>
  );
}
