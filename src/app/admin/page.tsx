"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import PageNav from "@/components/PageNav";
import { NEPALI_MONTHS } from "@/components/NepaliDatePicker";

type UserRow = {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  joined: string;
  age: number | null;
  points: number;
  level: string;
  entries: number;
  autoEntryCredits: number;
  lastActive: string | null;
};

type Detail = {
  user: {
    id: number;
    email: string;
    emailVerified: boolean;
    isAdmin: boolean;
    name: string;
    firstName: string;
    middleName: string;
    lastName: string;
    dateOfBirth: string;
    age: number | null;
    joined: string;
  };
  stats: {
    points: number;
    level: string;
    currentStreak: number;
    longestStreak: number;
    countedEntries: number;
    backdatedEntries: number;
    allEntries: number;
  };
  rewards: { autoEntryCredits: number; autoEntryEnabled: boolean; pointsSpent: number };
  totals: { food: number; additional: number };
  recentEntries: {
    id: number;
    mealType: string;
    nepaliMonth: number;
    nepaliDate: number;
    meal: boolean;
    egg: boolean;
    curd: boolean;
    chicken: boolean;
    totalCost: number;
  }[];
  recentExpenses: {
    id: number;
    description: string;
    amount: number;
    nepaliMonth: number;
    nepaliDate: number;
  }[];
};

const rs = (value: number) => `Rs. ${value.toFixed(2)}`;

const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const items = (e: { meal: boolean; egg: boolean; curd: boolean; chicken: boolean }) =>
  [e.meal ? "Meal" : "", e.egg ? "Egg" : "", e.curd ? "Curd" : "", e.chicken ? "Chicken" : ""]
    .filter(Boolean)
    .join(" + ") || "—";

function Pill({ tone, children }: { tone: "green" | "amber" | "blue"; children: string }) {
  const style =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {children}
    </span>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [grantDays, setGrantDays] = useState("");
  const [setDays, setSetDays] = useState("");
  const [pointsDelta, setPointsDelta] = useState("");

  async function loadUsers() {
    const res = await fetch("/api/admin/users");

    if (res.status === 401 || res.status === 403) {
      router.push("/");
      return;
    }

    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openUser(id: number) {
    setSelectedId(id);
    setDetail(null);
    setMessage("");

    const res = await fetch(`/api/admin/user?id=${id}`);

    if (!res.ok) {
      setMessage("Couldn't load that user.");
      return;
    }

    setDetail(await res.json());
  }

  async function act(action: string, amount?: number): Promise<boolean> {
    if (!selectedId) return false;

    setBusy(true);
    setMessage("");

    const res = await fetch("/api/admin/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId, action, amount }),
    });

    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setMessage(json.error ?? "That didn't work.");
      return false;
    }

    return true;
  }

  async function runAndRefresh(action: string, amount: number | undefined, done: string) {
    if (!(await act(action, amount)) || !selectedId) return;

    await Promise.all([openUser(selectedId), loadUsers()]);
    setMessage(done);
  }

  async function deleteUser() {
    if (!detail) return;

    const typed = window.prompt(
      `This permanently deletes ${detail.user.email} and all their data.\n\nType DELETE to confirm.`
    );

    if (typed !== "DELETE") return;

    if (await act("deleteUser")) {
      setSelectedId(null);
      setDetail(null);
      await loadUsers();
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return users;

    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
  }, [users, query]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-slate-900">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  const numberInput =
    "w-full min-w-0 rounded-xl border border-slate-300 bg-white p-2.5 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const smallButton =
    "shrink-0 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50";

  return (
    <main className="min-h-dvh bg-slate-50 p-4 pb-16 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Brand />
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Admin
            </h1>
          </div>
          <PageNav />
        </div>

        {selectedId === null ? (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-2xl font-semibold">{users.length}</p>
                <p className="text-xs text-slate-500">Users</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-2xl font-semibold">
                  {users.filter((u) => u.emailVerified).length}
                </p>
                <p className="text-xs text-slate-500">Verified</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-2xl font-semibold">
                  {users.reduce((sum, u) => sum + u.entries, 0)}
                </p>
                <p className="text-xs text-slate-500">Meals logged</p>
              </div>
            </div>

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="mt-5 w-full rounded-xl border border-slate-300 bg-white p-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <div className="mt-4 space-y-2">
              {filtered.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No users match.
                </p>
              )}

              {filtered.map((user) => (
                <button
                  key={user.id}
                  onClick={() => openUser(user.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {user.name || "No name yet"}
                    </p>
                    <p className="truncate text-sm text-slate-500">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {user.isAdmin && <Pill tone="blue">Admin</Pill>}
                      {user.emailVerified ? (
                        <Pill tone="green">Verified</Pill>
                      ) : (
                        <Pill tone="amber">Not verified</Pill>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{user.points} pts</p>
                    <p className="text-xs text-slate-400">{user.entries} meals</p>
                    <p className="text-xs text-slate-400">Joined {day(user.joined)}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setSelectedId(null);
                setDetail(null);
                setMessage("");
              }}
              className="mt-6 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ‹ All users
            </button>

            {message && (
              <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                {message}
              </p>
            )}

            {!detail ? (
              <p className="mt-6 text-sm text-slate-400">Loading...</p>
            ) : (
              <>
                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xl font-semibold">
                    {detail.user.name || "No name yet"}
                  </p>
                  <p className="break-all text-sm text-slate-500">{detail.user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {detail.user.isAdmin && <Pill tone="blue">Admin</Pill>}
                    {detail.user.emailVerified ? (
                      <Pill tone="green">Verified</Pill>
                    ) : (
                      <Pill tone="amber">Not verified</Pill>
                    )}
                  </div>
                </section>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                  {[
                    ["Points", String(detail.stats.points)],
                    ["Level", detail.stats.level],
                    ["Streak", `${detail.stats.currentStreak}d`],
                    ["Meals counted", String(detail.stats.countedEntries)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <p className="text-lg font-semibold">{value}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>

                <Card title="Account">
                  <Line label="First name" value={detail.user.firstName || "—"} />
                  <Line label="Middle name" value={detail.user.middleName || "—"} />
                  <Line label="Last name" value={detail.user.lastName || "—"} />
                  <Line
                    label="Date of birth"
                    value={
                      detail.user.dateOfBirth
                        ? `${detail.user.dateOfBirth} (${detail.user.age ?? "?"} yrs)`
                        : "Not set"
                    }
                  />
                  <Line label="Joined" value={day(detail.user.joined)} />
                  <Line label="User ID" value={String(detail.user.id)} />
                </Card>

                <Card title="Spending">
                  <Line label="Food (all time)" value={rs(detail.totals.food)} />
                  <Line label="Additional purchases (all time)" value={rs(detail.totals.additional)} />
                  <Line label="Meals logged" value={String(detail.stats.allEntries)} />
                  <Line label="Logged for past dates (no points)" value={String(detail.stats.backdatedEntries)} />
                  <Line label="Longest streak" value={`${detail.stats.longestStreak} days`} />
                </Card>

                <Card title="Rewards and controls">
                  <Line label="Auto-entry days" value={String(detail.rewards.autoEntryCredits)} />
                  <Line label="Auto-entry" value={detail.rewards.autoEntryEnabled ? "On" : "Off"} />
                  <Line label="Points spent" value={String(detail.rewards.pointsSpent)} />

                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={grantDays}
                        onChange={(e) => setGrantDays(e.target.value)}
                        placeholder="Add auto-entry days"
                        className={numberInput}
                      />
                      <button
                        disabled={busy}
                        onClick={() => {
                          runAndRefresh("grantCredits", Number(grantDays), "Days added.");
                          setGrantDays("");
                        }}
                        className={smallButton}
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={setDays}
                        onChange={(e) => setSetDays(e.target.value)}
                        placeholder="Set auto-entry days to"
                        className={numberInput}
                      />
                      <button
                        disabled={busy}
                        onClick={() => {
                          runAndRefresh("setCredits", Number(setDays), "Days updated.");
                          setSetDays("");
                        }}
                        className={smallButton}
                      >
                        Set
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={pointsDelta}
                        onChange={(e) => setPointsDelta(e.target.value)}
                        placeholder="Give or remove points (e.g. 100 or -50)"
                        className={numberInput}
                      />
                      <button
                        disabled={busy}
                        onClick={() => {
                          runAndRefresh("adjustPoints", Number(pointsDelta), "Points updated.");
                          setPointsDelta("");
                        }}
                        className={smallButton}
                      >
                        Apply
                      </button>
                    </div>

                    {!detail.user.emailVerified && (
                      <button
                        disabled={busy}
                        onClick={() => runAndRefresh("verifyEmail", undefined, "Email marked as verified.")}
                        className="w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Mark email as verified
                      </button>
                    )}

                    {!detail.user.isAdmin && (
                      <button
                        disabled={busy}
                        onClick={deleteUser}
                        className="w-full rounded-full border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete this user
                      </button>
                    )}
                  </div>
                </Card>

                <Card title="Recent meals">
                  {detail.recentEntries.length === 0 && (
                    <p className="text-sm text-slate-400">No meals logged.</p>
                  )}
                  {detail.recentEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium capitalize">{entry.mealType}</p>
                        <p className="truncate text-xs text-slate-400">
                          {NEPALI_MONTHS[entry.nepaliMonth]} {entry.nepaliDate} · {items(entry)}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium">{rs(entry.totalCost)}</p>
                    </div>
                  ))}
                </Card>

                <Card title="Recent purchases">
                  {detail.recentExpenses.length === 0 && (
                    <p className="text-sm text-slate-400">No purchases added.</p>
                  )}
                  {detail.recentExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{expense.description}</p>
                        <p className="text-xs text-slate-400">
                          {NEPALI_MONTHS[expense.nepaliMonth]} {expense.nepaliDate}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium">{rs(expense.amount)}</p>
                    </div>
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
