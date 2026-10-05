"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

const REDEEM_COST = 100;

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
  const [lunch, setLunch] = useState<MealTemplate>({ meal: false, egg: false, curd: false, chicken: false });
  const [dinner, setDinner] = useState<MealTemplate>({ meal: false, egg: false, curd: false, chicken: false });
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
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

  async function saveTemplate() {
    setSaving(true);
    setError("");

    const res = await fetch("/api/rewards/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, lunch, dinner }),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Couldn't save. Try again.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    load();
  }

  async function redeem() {
    setRedeeming(true);
    setError("");

    const res = await fetch("/api/rewards/redeem", { method: "POST" });
    const json = await res.json();

    setRedeeming(false);

    if (!res.ok) {
      setError(json.error ?? "Couldn't redeem.");
      return;
    }

    load();
  }

  if (loading || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-slate-900">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  const hasTemplate =
    lunch.meal || lunch.egg || lunch.curd || lunch.chicken ||
    dinner.meal || dinner.egg || dinner.curd || dinner.chicken;

  return (
    <main className="min-h-screen bg-white p-6 text-slate-900">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              Eatrack
            </p>
            <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
              Rewards
            </h1>
          </div>
          <button
            onClick={() => router.push("/leaderboard")}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">{data.level}</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{data.points} pts</p>
          <p className="mt-2 text-sm text-slate-500">
            {data.currentStreak}-day streak
            {data.nextStreakTier
              ? ` · ${data.nextStreakTier.days - data.currentStreak > 0 ? data.nextStreakTier.days - data.currentStreak : 0} days to +${data.nextStreakTier.credits} auto-entry days`
              : " · all streak milestones reached"}
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-entry credits</p>
              <p className="text-sm text-slate-500">
                {data.autoEntryCredits} day{data.autoEntryCredits === 1 ? "" : "s"} available
              </p>
            </div>
            <button
              onClick={redeem}
              disabled={redeeming || data.points < REDEEM_COST}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
            >
              Redeem {REDEEM_COST} pts
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Redeeming spends points, which lowers your leaderboard total.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <p className="font-medium">Auto-entry</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Enabled
            </label>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            On days you don't log in, we'll log whichever meals you select
            below — as long as you have credits left.
          </p>

          <div className="mt-4 space-y-3">
            <TemplateRow title="Lunch" value={lunch} onChange={setLunch} />
            <TemplateRow title="Dinner" value={dinner} onChange={setDinner} />
          </div>

          {enabled && !hasTemplate && (
            <p className="mt-3 text-sm text-amber-600">
              Select at least one item above, or auto-entry won't log anything.
            </p>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={saveTemplate}
            disabled={saving}
            className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved" : "Save"}
          </button>
        </section>
      </div>
    </main>
  );
}

