"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import PageNav from "@/components/PageNav";

type MealTemplate = {
  meal: boolean;
  egg: boolean;
  curd: boolean;
  chicken: boolean;
};

type RewardsData = {
  points: number;
  level: string;
  currentStreak: number;
  autoEntryCredits: number;
  autoEntryEnabled: boolean;
  nextStreakTier: { days: number; credits: number } | null;
  template: { lunch: MealTemplate; dinner: MealTemplate };
};

type Receipt = {
  credits: number;
  pointsRemaining: number;
  enabled: boolean;
  lunch: string;
  dinner: string;
};

const REDEEM_COST = 100;

const EMPTY: MealTemplate = { meal: false, egg: false, curd: false, chicken: false };

function hasItems(t: MealTemplate): boolean {
  return t.meal || t.egg || t.curd || t.chicken;
}

function same(a: MealTemplate, b: MealTemplate): boolean {
  return (
    a.meal === b.meal &&
    a.egg === b.egg &&
    a.curd === b.curd &&
    a.chicken === b.chicken
  );
}

function describe(t: MealTemplate): string {
  const items = [
    t.meal ? "Normal Meal" : "",
    t.egg ? "Egg" : "",
    t.curd ? "Curd" : "",
    t.chicken ? "Chicken" : "",
  ].filter(Boolean);

  return items.length > 0 ? items.join(" + ") : "Nothing selected";
}

function TemplateRow({
  title,
  value,
  onChange,
}: {
  title: string;
  value: MealTemplate;
  onChange: (next: MealTemplate) => void;
}) {
  const items: { key: keyof MealTemplate; label: string }[] = [
    { key: "meal", label: "Normal Meal" },
    { key: "egg", label: "Egg" },
    { key: "curd", label: "Curd" },
    { key: "chicken", label: "Chicken" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="font-medium">{title}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm"
          >
            <input
              type="checkbox"
              checked={value[item.key]}
              onChange={(e) =>
                onChange({ ...value, [item.key]: e.target.checked })
              }
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function RewardsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RewardsData | null>(null);

  // What is currently ticked on screen (may differ from what is saved).
  const [lunch, setLunch] = useState<MealTemplate>(EMPTY);
  const [dinner, setDinner] = useState<MealTemplate>(EMPTY);
  const [enabled, setEnabled] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/rewards");

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    const json: RewardsData = await res.json();

    setData(json);
    setLunch(json.template.lunch);
    setDinner(json.template.dinner);
    setEnabled(json.autoEntryEnabled);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSelection() {
    setSaving(true);
    setError("");

    const res = await fetch("/api/rewards/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, lunch, dinner }),
    });

    if (!res.ok) {
      setSaving(false);
      setError("Couldn't save. Try again.");
      return;
    }

    await load();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function redeem() {
    if (!data) return;

    setRedeeming(true);
    setError("");

    const res = await fetch("/api/rewards/redeem", { method: "POST" });
    const json = await res.json();

    if (!res.ok) {
      setRedeeming(false);
      setConfirming(false);
      setError(json.error ?? "Couldn't redeem.");
      return;
    }

    setReceipt({
      credits: json.autoEntryCredits,
      pointsRemaining: json.pointsRemaining,
      enabled: json.autoEntryEnabled,
      lunch: describe(data.template.lunch),
      dinner: describe(data.template.dinner),
    });

    setConfirming(false);
    await load();
    setRedeeming(false);
  }

  if (loading || !data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white text-slate-900">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  const dirty =
    !same(lunch, data.template.lunch) ||
    !same(dinner, data.template.dinner) ||
    enabled !== data.autoEntryEnabled;

  const savedHasItems =
    hasItems(data.template.lunch) || hasItems(data.template.dinner);

  const pointsShort = Math.max(0, REDEEM_COST - data.points);

  const redeemBlocker = !savedHasItems
    ? "Choose what to auto-log below and save it first."
    : dirty
      ? "Save your changes below first."
      : pointsShort > 0
        ? `You need ${pointsShort} more points.`
        : null;

  const daysToGo = data.nextStreakTier
    ? Math.max(0, data.nextStreakTier.days - data.currentStreak)
    : 0;

  return (
    <main className="min-h-dvh bg-white p-6 text-slate-900">
      <div className="mx-auto max-w-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Brand />
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
              Rewards
            </h1>
          </div>
          <PageNav />
        </div>

        {receipt && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="font-semibold text-emerald-800">Reward added</h2>

            <dl className="mt-3 space-y-2 text-sm text-emerald-900">
              <div className="flex justify-between gap-4">
                <dt>Auto-entry days</dt>
                <dd className="font-medium">
                  +1 (now {receipt.credits} available)
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Lunch will be</dt>
                <dd className="text-right font-medium">{receipt.lunch}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Dinner will be</dt>
                <dd className="text-right font-medium">{receipt.dinner}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Points remaining</dt>
                <dd className="font-medium">{receipt.pointsRemaining}</dd>
              </div>
            </dl>

            {!receipt.enabled && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Auto-entry is switched off right now. Turn it on below and save
                to start using your days.
              </p>
            )}

            <button
              onClick={() => setReceipt(null)}
              className="mt-4 rounded-full border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              Done
            </button>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
          <p className="text-sm text-slate-500">{data.level}</p>
          <p className="font-display mt-1 text-4xl font-semibold tracking-tight">
            {data.points} pts
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {data.currentStreak}-day streak
            {data.nextStreakTier
              ? ` · ${daysToGo} day${daysToGo === 1 ? "" : "s"} to the next reward`
              : " · all streak milestones reached"}
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your auto-entry</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                data.autoEntryEnabled
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {data.autoEntryEnabled ? "On" : "Off"}
            </span>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Days available</dt>
              <dd className="font-medium">{data.autoEntryCredits}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Lunch</dt>
              <dd className="text-right font-medium">
                {describe(data.template.lunch)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Dinner</dt>
              <dd className="text-right font-medium">
                {describe(data.template.dinner)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Once a night (around 10:45 PM Nepal time) we log the meals above for
            you, but only for a meal you haven&apos;t logged yourself that day.
            Each night it runs uses one day.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Earn days: a 7-day streak gives +2, a 30-day streak gives +5, or
            redeem {REDEEM_COST} points for +1. Meals logged for a past date
            don&apos;t count toward points or streaks.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Choose what to auto-log</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Enabled
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <TemplateRow title="Lunch" value={lunch} onChange={setLunch} />
            <TemplateRow title="Dinner" value={dinner} onChange={setDinner} />
          </div>

          {enabled && !hasItems(lunch) && !hasItems(dinner) && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Select at least one item above, or auto-entry won&apos;t log
              anything.
            </p>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={saveSelection}
            disabled={saving || !dirty}
            className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved && !dirty ? "Saved" : "Save selection"}
          </button>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold">Redeem points</h2>
          <p className="mt-1 text-sm text-slate-500">
            {REDEEM_COST} points = 1 auto-entry day. Spending points lowers your
            leaderboard score.
          </p>

          {!confirming ? (
            <>
              <button
                onClick={() => setConfirming(true)}
                disabled={redeemBlocker !== null}
                className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
              >
                Redeem {REDEEM_COST} points
              </button>

              {redeemBlocker && (
                <p className="mt-3 text-sm text-slate-500">{redeemBlocker}</p>
              )}
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium">
                Spend {REDEEM_COST} points for 1 auto-entry day?
              </p>

              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Lunch</dt>
                  <dd className="text-right">{describe(data.template.lunch)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Dinner</dt>
                  <dd className="text-right">{describe(data.template.dinner)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Points</dt>
                  <dd>
                    {data.points} → {data.points - REDEEM_COST}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={redeem}
                  disabled={redeeming}
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {redeeming ? "Redeeming..." : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={redeeming}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
