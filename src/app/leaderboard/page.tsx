"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import nepaliDateConverter from "nepali-date-converter";

const NEPALI_MONTHS = [
  "Baisakh",
  "Jestha",
  "Asar",
  "Shrawan",
  "Bhadra",
  "Aswin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

function formatNepaliMonth(year: number, monthIndex: number) {
  return `${NEPALI_MONTHS[monthIndex] ?? "?"} ${year}`;
}

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
  totalSpent: number;
  chickenCount: number;
  badges: Badge[];
};

type LeaderboardRow = {
  userId: number;
  displayName: string;
  isYou: boolean;
  totalSpent: number;
  entryCount: number;
};

const medalFor = (rank: number) =>
  rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`;

export default function LeaderboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [group, setGroup] = useState<{
    name: string;
    inviteCode: string;
    memberCount: number;
  } | null>(null);

  const todayNepali = useMemo(() => new nepaliDateConverter(), []);
  const [viewYear, setViewYear] = useState(todayNepali.getYear());
  const [viewMonth, setViewMonth] = useState(todayNepali.getMonth());

  useEffect(() => {
    async function load() {
      const authRes = await fetch("/api/auth/me");

      if (!authRes.ok) {
        router.push("/login");
        return;
      }

      const groupRes = await fetch("/api/groups/me");
      const groupData = await groupRes.json();

      setGroup(groupData.group ?? null);

      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      setLoading(false);
    }

    load();
  }, [router]);

  useEffect(() => {
    async function loadLeaderboard() {
      if (!group) return;

      const res = await fetch(
        `/api/leaderboard?year=${viewYear}&month=${viewMonth}`
      );
      const data = await res.json();
      setRows(data.rows ?? []);
    }

    loadLeaderboard();
  }, [viewYear, viewMonth, group]);

  function changeMonth(delta: number) {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setViewMonth(newMonth);
    setViewYear(newYear);
  }

  async function copyRecap() {
    if (!stats) return;

    const you = rows.find((r) => r.isYou);
    const rank = rows.findIndex((r) => r.isYou);

    const lines = [
      `🍽️ My ${formatNepaliMonth(viewYear, viewMonth)} Hostel Food Recap`,
      you ? `💰 Spent: Rs. ${you.totalSpent.toFixed(2)} (${you.entryCount} meals)` : null,
      rank >= 0 ? `🏆 Rank: ${medalFor(rank)} of ${rows.length}` : null,
      `🔥 Current streak: ${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`,
      `⭐ Longest streak: ${stats.longestStreak} days`,
      `🍗 Chicken orders (all-time): ${stats.chickenCount}`,
      "",
      "Track yours at Hostel Food Tracker 🍛",
    ].filter(Boolean);

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
      "Delete your account permanently? This removes all your meal entries, prices, and group membership. This can't be undone."
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
              🏆 Stats & Leaderboard
            </p>
            <h1 className="font-display mt-2 text-3xl font-extrabold">
              How you're doing
            </h1>
          </div>

          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-semibold"
          >
            ← Back
          </button>
        </div>

        {/* Group */}
        {group ? (
          <section className="mt-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div>
              <p className="text-xs text-slate-500">Your group</p>
              <p className="font-bold">
                {group.name} · {group.memberCount} member
                {group.memberCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500">Invite code</p>
              <p className="font-mono font-bold tracking-widest text-amber-400">
                {group.inviteCode}
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-6 flex items-center justify-between rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-4">
            <div>
              <p className="font-semibold">No group yet</p>
              <p className="text-xs text-slate-500">
                Join or create one to compare spend with your roommates.
              </p>
            </div>

            <button
              onClick={() => router.push("/group-setup")}
              className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-bold text-slate-950"
            >
              Join / Create
            </button>
          </section>
        )}

        {/* Streak */}
        <section className="mt-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 text-center">
          <p className="text-6xl">🔥</p>
          <p className="font-display mt-2 text-4xl font-extrabold">
            {stats.currentStreak} day{stats.currentStreak === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-slate-400">
            Current streak — longest ever: {stats.longestStreak} days
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
        {group && (
        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">
              💸 Frugal Leaderboard
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="rounded-lg border border-slate-700 px-2 py-1 text-sm"
              >
                ←
              </button>
              <span className="text-sm text-slate-400">
                {formatNepaliMonth(viewYear, viewMonth)}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="rounded-lg border border-slate-700 px-2 py-1 text-sm"
              >
                →
              </button>
            </div>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Lowest spender wins bragging rights. Only totals are shared — not
            what anyone else actually ate.
          </p>

          <div className="mt-4 space-y-2">
            {rows.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-slate-500">
                No one's logged anything this month yet.
              </p>
            )}

            {rows.map((row, index) => (
              <div
                key={row.userId}
                className={`flex items-center justify-between rounded-xl border p-3 ${
                  row.isYou
                    ? "border-emerald-700 bg-emerald-950/30"
                    : "border-slate-800 bg-slate-950"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center font-bold">
                    {medalFor(index)}
                  </span>
                  <span className="font-semibold">
                    {row.displayName}
                    {row.isYou ? " (you)" : ""}
                  </span>
                </div>

                <div className="text-right">
                  <p className="font-bold text-emerald-400">
                    Rs. {row.totalSpent.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.entryCount} meals
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

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
